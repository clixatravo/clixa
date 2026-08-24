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
 * Il cherche dans les deux collections qui portent une identité : « utilisateurs »
 * pour l'équipe, « apprenants » pour les participants. Il ne visait que la
 * première, écrite avant que les comptes clients existent ; demander à retirer
 * un participant répondait « aucun compte », ce qui était faux.
 *
 * Les formations, les sessions et les articles ne bougent pas : il recompte
 * tout à la fin pour le montrer.
 *
 * ⚠️ Il vise la base pointée par DATABASE_URL. Depuis la séparation des deux
 * branches Neon, c'est celle du poste de travail sauf à charger .env.prod :
 *
 *   set -a && . ./.env.prod && set +a && npx payload run scripts/supprimer-compte.ts <email>
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

const OU = ["utilisateurs", "apprenants"] as const;

let trouve: { collection: (typeof OU)[number]; doc: Record<string, unknown> } | undefined;

for (const collection of OU) {
  const { docs } = await payload.find({
    collection,
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });
  if (docs[0]) {
    trouve = { collection, doc: docs[0] as unknown as Record<string, unknown> };
    break;
  }
}

if (!trouve) {
  console.error(`Aucun compte pour « ${email} », ni dans l'équipe ni chez les participants.`);
  process.exit(1);
}

const { collection, doc: compte } = trouve;
const quoi = collection === "utilisateurs" ? "équipe" : "participant";

await payload.delete({ collection, id: compte.id as string | number, overrideAccess: true });
console.log(`\nSupprimé (${quoi}) : ${compte.email} — ${compte.nom ?? "sans nom"}`);

/*
  Un dossier ne disparaît pas avec le compte : il reste joignable par sa
  référence, comme il l'était avant que son propriétaire en crée un. C'est
  voulu — supprimer un accès n'est pas annuler une inscription.
*/
if (collection === "apprenants") {
  const rattaches = await payload.count({
    collection: "inscriptions",
    where: { apprenant: { equals: compte.id as string | number } },
    overrideAccess: true,
  });
  if (rattaches.totalDocs > 0) {
    console.log(
      `${rattaches.totalDocs} dossier(s) étaient rattachés : ils restent accessibles par leur référence.`,
    );
  }
}

const restants = await payload.count({ collection, overrideAccess: true });
console.log(`Comptes restants dans « ${collection} » : ${restants.totalDocs}`);

if (collection === "utilisateurs" && restants.totalDocs === 0) {
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
