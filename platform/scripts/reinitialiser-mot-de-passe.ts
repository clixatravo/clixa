/**
 * Réinitialiser le mot de passe d'un compte du back-office.
 *
 * L'envoi d'e-mails n'est pas configuré : le lien « Mot de passe oublié » de
 * /admin ne mène nulle part. Ce script produit le même jeton, mais l'affiche
 * dans le terminal au lieu de l'envoyer.
 *
 * Le script ne fixe aucun mot de passe : il ouvre le formulaire de Payload,
 * où la personne saisit le sien. Le jeton expire au bout d'une heure.
 *
 *   npx payload run scripts/reinitialiser-mot-de-passe.ts prenom@exemple.com
 *
 * ⚠️ Il vise la base pointée par .env.local — aujourd'hui celle de production.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const email = process.argv[2];

if (!email) {
  console.error("Usage : npx payload run scripts/reinitialiser-mot-de-passe.ts <email>");
  process.exit(1);
}

const payload = await getPayload({ config });

const { docs } = await payload.find({
  collection: "utilisateurs",
  where: { email: { equals: email } },
  limit: 1,
  overrideAccess: true,
});

const compte = docs[0];

if (!compte) {
  console.error(`Aucun compte pour « ${email} ».`);
  process.exit(1);
}

const jeton = await payload.forgotPassword({
  collection: "utilisateurs",
  data: { email },
  disableEmail: true,
});

// Une seule base sert le local et la production : le compte existe des deux
// côtés. On pointe le back-office public, seul joignable à coup sûr.
const site = "https://clixa-institute.vercel.app";

console.log(`\nCompte : ${compte.nom ?? email} — ${compte.role ?? "sans rôle"}`);
console.log(`\nOuvrir ce lien et choisir un nouveau mot de passe (valable une heure) :\n`);
console.log(`  ${site}/admin/reset/${jeton}\n`);

process.exit(0);
