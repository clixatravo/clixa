/**
 * Retire les deux réalisations qui faisaient double emploi avec le bandeau vidéo.
 *
 * ── Pourquoi ────────────────────────────────────────────────────────────────
 * Les deux reels de la cohorte DAF ont paru un moment dans **deux** blocs de
 * `/temoignages` : le bandeau `TrailerImmersion`, qui sert les fichiers depuis
 * notre domaine, et la galerie, qui les encadrait depuis Instagram. Même vidéo,
 * même page, deux sources — celles-ci finissent toujours par diverger, et l'une
 * des deux serait morte le jour où le post Instagram change.
 *
 * Le bandeau garde les deux séances mises en avant ; la galerie ne montre plus
 * que **les autres**, celles que la rédaction ajoutera depuis /admin.
 *
 * ⚠️ **Il retire aussi l'affiche déposée avec elles** — un média orphelin
 * encombre le magasin et reparaît dans le sélecteur d'images de /admin, où
 * quelqu'un finirait par le choisir sans savoir d'où il vient.
 *
 * ⚠️ **Rien sans `ECRIRE=1`.** C'est du contenu en ligne.
 *
 *   cd platform && set -a && . ./.env.prod && set +a \
 *     && ECRIRE=1 npx payload run scripts/retirer-les-reels.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";

const ECRIRE = process.env.ECRIRE === "1";

const LIENS = [
  "https://www.instagram.com/reel/DdNOvrLuj7-/",
  "https://www.instagram.com/reel/DdMoJOKsIbe/",
];
const AFFICHE =
  "Diapositive « Missions cœur du DAF » projetée pendant la séance, avec l'intervenant en médaillon";

const payload = await getPayload({ config });

const { docs: realisations } = await payload.find({
  collection: "realisations",
  where: { lien: { in: LIENS } },
  depth: 0,
  limit: 10,
  overrideAccess: true,
  locale: "fr",
});
const { docs: medias } = await payload.find({
  collection: "medias",
  where: { alt: { equals: AFFICHE } },
  depth: 0,
  limit: 10,
  overrideAccess: true,
});

console.log(`\n  ${realisations.length} réalisation(s) et ${medias.length} média(s) visés\n`);
for (const r of realisations) console.log(`  · réalisation #${r.id} — ${r.titre}`);
for (const m of medias) console.log(`  · média #${m.id} — ${m.filename}`);

/*
  ⚠️ **On vérifie qu'aucune autre réalisation ne se sert de l'affiche** avant de
  la supprimer. Elle n'a servi qu'à ces deux-là, mais une image retirée sous une
  carte qui l'affiche encore laisse un cadre vide que rien ne signale.
*/
for (const m of medias) {
  const { totalDocs } = await payload.find({
    collection: "realisations",
    where: { affiche: { equals: m.id }, lien: { not_in: LIENS } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  });
  if (totalDocs > 0) {
    console.log(`\n  ✗ le média #${m.id} sert encore à ${totalDocs} autre(s) carte(s) — gardé\n`);
    process.exit(1);
  }
}

if (!ECRIRE) {
  console.log("\n  (rien n'a été retiré — poser ECRIRE=1)\n");
  process.exit(0);
}

for (const r of realisations) {
  await payload.delete({ collection: "realisations", id: r.id, overrideAccess: true });
  console.log(`  ✓ réalisation #${r.id} retirée`);
}
for (const m of medias) {
  await payload.delete({ collection: "medias", id: m.id, overrideAccess: true });
  console.log(`  ✓ média #${m.id} retiré (le fichier quitte aussi le magasin)`);
}

const { totalDocs } = await payload.find({
  collection: "realisations",
  depth: 0,
  limit: 0,
  overrideAccess: true,
});
console.log(`\n  Il reste ${totalDocs} réalisation(s) en base.\n`);
process.exit(0);
