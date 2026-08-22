/**
 * Vérifie que le catalogue en base se tient.
 *
 * Remplace `verifier-semis.ts`, qui comparait la base au jeu d'exemples de
 * `src/data/`. Ce jeu a disparu du site le 22 août 2026 : la suite mesurait
 * depuis un écart avec une référence morte.
 *
 * Celle-ci ne compare plus la base à un document extérieur — elle regarde si
 * ce qu'elle contient est publiable : rubriques remplies, plan de cours entier,
 * barème cohérent, rien d'orphelin.
 *
 *   npx payload run scripts/verifier-catalogue.ts
 *
 * Elle ne crée ni ne supprime rien : elle lit.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });

let passes = 0;
let echecs = 0;

const ok = (m: string) => {
  console.log(`  ✓ ${m}`);
  passes++;
};
const ko = (m: string) => {
  console.log(`  ✗ ${m}`);
  echecs++;
};
const verifier = (condition: boolean, m: string) => (condition ? ok(m) : ko(m));
const titre = (t: string) => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 44 - t.length))}`);

/* ── Le catalogue ─────────────────────────────────────────────────────── */

titre("Le catalogue");

const { docs: programmes } = await payload.find({
  collection: "programmes",
  limit: 200,
  locale: "fr",
  depth: 1,
  sort: "id",
  overrideAccess: true,
});

verifier(programmes.length > 0, `${programmes.length} parcours en base`);

const publies = programmes.filter((p) => p._status === "published");
verifier(
  publies.length === programmes.length,
  `tous publiés (${publies.length}/${programmes.length})`,
);

const slugs = programmes.map((p) => p.slug);
verifier(new Set(slugs).size === slugs.length, "aucune adresse en double");

/* ── Ce que chaque fiche doit porter ──────────────────────────────────── */

titre("Les rubriques, parcours par parcours");

const manquants: string[] = [];
for (const p of programmes) {
  const trous: string[] = [];
  if (!p.titre?.trim()) trous.push("titre");
  if (!p.accroche?.trim()) trous.push("accroche");
  if (!p.objectifs?.trim()) trous.push("objectifs");
  if (!p.prerequis?.trim()) trous.push("prérequis");
  if (!p.dureeHeures) trous.push("durée");
  if (!(p.publicVise ?? []).length) trous.push("public visé");
  if (!(p.competences ?? []).length) trous.push("compétences");
  if (!(p.debouches ?? []).length) trous.push("résultats");
  if (!(p.modules ?? []).length) trous.push("plan de cours");
  if (!p.specialisation) trous.push("spécialisation");
  if (trous.length) manquants.push(`${p.titre} → ${trous.join(", ")}`);
}
verifier(manquants.length === 0, "aucune rubrique obligatoire vide");
manquants.slice(0, 5).forEach((m) => console.log(`      ${m}`));

/* ── Le plan de cours ─────────────────────────────────────────────────── */

titre("Le plan de cours");

const modules = programmes.flatMap((p) => p.modules ?? []);
verifier(modules.length > 0, `${modules.length} séances au total`);
verifier(
  modules.every((m) => m.titre?.trim()),
  "chaque séance porte un titre",
);
verifier(
  modules.every((m) => (m.lecons ?? []).length > 0),
  "chaque séance porte au moins un point",
);
verifier(
  modules.every((m) => (m.lecons ?? []).every((l) => l.dureeMinutes > 0)),
  "chaque point porte une durée",
);

const sansObjectif = modules.filter((m) => !m.objectif?.trim()).length;
verifier(sansObjectif === 0, `chaque séance annonce son objectif (${sansObjectif} sans)`);

const sansLivrable = modules.filter((m) => !m.livrables?.trim()).length;
verifier(sansLivrable === 0, `chaque séance annonce ses livrables (${sansLivrable} sans)`);

/* ── Le barème ────────────────────────────────────────────────────────── */

titre("Le barème");

const tarifs = await payload.findGlobal({ slug: "tarifs", locale: "fr", overrideAccess: true });

verifier(
  (tarifs.prixComptant ?? 0) > 0,
  `prix comptant renseigné (${tarifs.prixComptant} ${tarifs.devise})`,
);
verifier((tarifs.plans ?? []).length > 0, `${(tarifs.plans ?? []).length} plans de paiement`);

for (const plan of tarifs.plans ?? []) {
  const somme = (plan.echeances ?? []).reduce((t, e) => t + (e.montant ?? 0), 0);
  verifier(
    somme === plan.total,
    `${plan.code} : les échéances font bien le total (${somme} = ${plan.total})`,
  );
}

// Étaler le paiement ne doit jamais revenir moins cher que payer comptant :
// l'inverse serait une erreur de saisie qui coûterait de l'argent à chaque vente.
const comptant = tarifs.prixComptant ?? 0;
const anomalies = (tarifs.plans ?? []).filter(
  (p) => (p.echeances ?? []).length > 1 && (p.total ?? 0) < comptant,
);
verifier(anomalies.length === 0, "aucun plan échelonné moins cher que le comptant");

verifier((tarifs.moyensPaiement ?? []).length > 0, "au moins un moyen de paiement annoncé");

/* ── Les rattachements ────────────────────────────────────────────────── */

titre("Les rattachements");

const { docs: specs } = await payload.find({
  collection: "specialisations",
  limit: 100,
  locale: "fr",
  depth: 0,
  overrideAccess: true,
});

const vides: string[] = [];
for (const s of specs) {
  const n = await payload.count({
    collection: "programmes",
    where: { specialisation: { equals: s.id } },
    overrideAccess: true,
  });
  if (n.totalDocs === 0) vides.push(String(s.nom));
}
// Une spécialisation sans parcours produit un filtre qui ne ramène rien.
verifier(
  vides.length === 0,
  `aucune spécialisation vide${vides.length ? ` (${vides.join(", ")})` : ""}`,
);

const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 500,
  depth: 0,
  overrideAccess: true,
});
verifier(
  sessions.every((s) => s.programme),
  "aucune session orpheline",
);

const maintenant = new Date().toISOString();
const passees = sessions.filter((s) => s.fin && s.fin < maintenant);
verifier(passees.length === 0, `aucune session déjà terminée à l'affiche (${passees.length})`);

/* ── Verdict ──────────────────────────────────────────────────────────── */

console.log("");
if (echecs === 0) {
  console.log(`✅ Le catalogue se tient — ${passes} contrôles.\n`);
  process.exit(0);
}
console.log(`❌ ${echecs} contrôle(s) en échec sur ${passes + echecs}.\n`);
process.exit(1);
