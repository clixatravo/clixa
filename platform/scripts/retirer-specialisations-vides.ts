/**
 * Retire les spécialisations qui ne classent plus rien.
 *
 * Les catégories d'origine avaient été inventées pour les exemples. Le
 * catalogue réel s'organise autrement, et trois d'entre elles se sont vidées.
 * Les laisser afficherait des filtres qui ne ramènent aucun résultat — un
 * visiteur qui clique sur « Digital & Data » tomberait sur une page vide.
 *
 *   npx payload run scripts/retirer-specialisations-vides.ts
 *
 * Le script ne touche à rien d'autre : une spécialisation qui classe au moins
 * un parcours est laissée en place, même publiée depuis longtemps.
 *
 * ⚠️ Il vise la base pointée par DATABASE_URL et supprime des documents.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });

const { docs } = await payload.find({
  collection: "specialisations",
  limit: 100,
  locale: "fr",
  depth: 0,
  overrideAccess: true,
});

let retirees = 0;

for (const s of docs) {
  const n = await payload.count({
    collection: "programmes",
    where: { specialisation: { equals: s.id } },
    overrideAccess: true,
  });

  if (n.totalDocs > 0) {
    console.log(`  gardée   : ${String(s.nom).padEnd(26)} ${n.totalDocs} parcours`);
    continue;
  }

  await payload.delete({ collection: "specialisations", id: s.id, overrideAccess: true });
  console.log(`  retirée  : ${String(s.nom).padEnd(26)} aucune formation`);
  retirees++;
}

const reste = await payload.count({ collection: "specialisations", overrideAccess: true });
console.log(`\n  ${retirees} retirée(s) — ${reste.totalDocs} spécialisation(s) restante(s).\n`);

process.exit(0);
