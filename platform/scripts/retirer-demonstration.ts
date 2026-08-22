/**
 * Retire le catalogue de démonstration et publie le catalogue réel.
 *
 * Les huit formations d'origine avaient été écrites pour construire la
 * plateforme. Elles sont remplacées par les douze parcours transmis par la
 * direction. Quatre choses tiennent à elles et doivent être traitées avant la
 * suppression : leurs sessions, les articles qui les citent, les témoignages
 * qui s'y rattachent et les demandes de rappel déjà reçues.
 *
 *   npx payload run scripts/retirer-demonstration.ts
 *
 * ⚠️ Il vise la base pointée par .env.local. Il supprime des documents.
 */
import { getPayload } from "payload";
import config from "@payload-config";

/** Les douze parcours réels, reconnus à leur intitulé. */
const REELS = /^(Directeur|Préparation à la certification PMP)/;

const payload = await getPayload({ config });

const { docs: programmes } = await payload.find({
  collection: "programmes",
  limit: 200,
  locale: "fr",
  depth: 0,
  overrideAccess: true,
  draft: true,
});

const reels = programmes.filter((p) => REELS.test(p.titre ?? ""));
const demo = programmes.filter((p) => !REELS.test(p.titre ?? ""));

console.log(`  ${reels.length} parcours réels, ${demo.length} de démonstration\n`);

/* ── Publier le catalogue réel ────────────────────────────────────────── */

for (const p of reels) {
  if (p._status === "published") continue;
  await payload.update({
    collection: "programmes",
    id: p.id,
    locale: "fr",
    overrideAccess: true,
    data: { _status: "published" },
  });
  console.log(`  publié : ${p.titre}`);
}

/* ── Détacher ce qui pointe vers la démonstration ─────────────────────── */

const aSupprimer = new Set(demo.map((p) => p.id));
let detaches = 0;

for (const coll of ["articles", "temoignages"] as const) {
  const champ = coll === "articles" ? "programmeLie" : "programme";
  const { docs } = await payload.find({
    collection: coll,
    limit: 200,
    overrideAccess: true,
    depth: 0,
    draft: true,
  });
  for (const d of docs) {
    const lien = (d as unknown as Record<string, unknown>)[champ];
    const id = typeof lien === "object" && lien !== null ? (lien as { id?: unknown }).id : lien;
    if (id == null || !aSupprimer.has(id as never)) continue;
    await payload.update({
      collection: coll,
      id: d.id,
      overrideAccess: true,
      data: { [champ]: null },
    });
    detaches++;
  }
}
console.log(`\n  ${detaches} rattachement(s) détaché(s) avant suppression`);

/* ── Supprimer sessions puis programmes ───────────────────────────────── */

let sessions = 0;
for (const p of demo) {
  const { docs } = await payload.find({
    collection: "sessions",
    where: { programme: { equals: p.id } },
    limit: 100,
    overrideAccess: true,
    depth: 0,
  });
  for (const s of docs) {
    await payload.delete({ collection: "sessions", id: s.id, overrideAccess: true });
    sessions++;
  }
}
console.log(`  ${sessions} session(s) de démonstration supprimée(s)`);

for (const p of demo) {
  await payload.delete({ collection: "programmes", id: p.id, overrideAccess: true });
  console.log(`  supprimé : ${p.titre}`);
}

/* ── Les spécialisations devenues vides ───────────────────────────────── */

const { docs: specs } = await payload.find({
  collection: "specialisations",
  limit: 100,
  locale: "fr",
  depth: 0,
  overrideAccess: true,
});
console.log("");
for (const s of specs) {
  const n = await payload.count({
    collection: "programmes",
    where: { specialisation: { equals: s.id } },
    overrideAccess: true,
  });
  console.log(`  ${String(s.nom).padEnd(26)} ${n.totalDocs} parcours`);
}

process.exit(0);
