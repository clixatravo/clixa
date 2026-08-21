/**
 * Supprimer un compte du back-office.
 *
 * Sert surtout à un cas précis : plus aucun compte ne permet d'entrer. Quand la
 * collection est vide, /admin affiche l'écran « Créer le premier utilisateur »,
 * où l'on choisit soi-même l'adresse et le mot de passe — sans jeton, sans
 * envoi d'e-mail.
 *
 *   npx payload run scripts/supprimer-compte.ts prenom@exemple.com
 *
 * Le script ne touche qu'à la collection « utilisateurs ». Les formations, les
 * sessions et les articles ne bougent pas : il recompte tout à la fin pour le
 * montrer.
 *
 * ⚠️ Il vise la base pointée par .env.local — aujourd'hui celle de production.
 */
import { getPayload } from "payload";
import config from "@payload-config";

// `payload run` place l'argument en argv[2] ; on cherche l'adresse pour ne pas
// dépendre de cette position.
const email = process.argv.find((a) => a.includes("@"));

if (!email) {
  console.error("Usage : npx payload run scripts/supprimer-compte.ts <email>");
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

await payload.delete({ collection: "utilisateurs", id: compte.id, overrideAccess: true });
console.log(`\nSupprimé : ${compte.email} — ${compte.nom ?? "sans nom"} (${compte.role})`);

const restants = await payload.count({ collection: "utilisateurs", overrideAccess: true });
console.log(`Comptes restants : ${restants.totalDocs}`);

if (restants.totalDocs === 0) {
  // Une seule base sert le local et la production : le compte existe des deux
  // côtés. On pointe le back-office public, seul joignable à coup sûr.
  const site = "https://clixa-institute.vercel.app";
  console.log(`\nOuvrir ${site}/admin pour créer le premier compte.\n`);
}

console.log("Le contenu est intact :");
for (const c of ["specialisations", "programmes", "sessions", "articles"] as const) {
  const n = await payload.count({ collection: c, overrideAccess: true });
  console.log(`  ${c.padEnd(18)} ${n.totalDocs}`);
}

process.exit(0);
