/**
 * Enregistrer les cohortes déjà données, clôturées, à partir d'une liste fournie
 * par la direction.
 *
 *   npx payload run scripts/cohortes-passees.ts cohortes.json            # montre
 *   ECRIRE=1 npx payload run scripts/cohortes-passees.ts cohortes.json   # écrit
 *
 * Demandé le 30 septembre 2026 : octobre 2025, février, avril et juin 2026
 * doivent paraître sur les fiches, sous « Cohortes précédentes ».
 *
 * ── Le fichier ──────────────────────────────────────────────────────────────
 *
 *   [
 *     { "formation": "directeur-administratif-et-financier",
 *       "debut": "2025-10-04",
 *       "cadence": "8 samedis · 9h00–13h00" }
 *   ]
 *
 * ⚠️ **Rien n'est deviné.** Quels parcours ont été donnés à chaque cohorte, à
 * quelle date et à quel rythme, c'est une donnée de la direction : le script ne
 * la complète pas. Une fiche qui affiche « Cohorte d'avril 2026 · clôturée »
 * sous un parcours qui ne s'est jamais tenu atteste un fait faux — sur la page
 * même où le visiteur décide d'acheter.
 *
 * - Un parcours inconnu, une date mal formée ou une date à venir font renoncer
 *   **tout** le fichier : on n'écrit pas la moitié d'une liste qu'on sait
 *   fausse ailleurs.
 * - La cadence est exigée : c'est elle qui donne le nombre de séances, donc la
 *   date de fin, et le crochet de `Sessions.ts` en tire les heures.
 * - **Rejouable** : une session qui démarre le même jour pour le même parcours
 *   n'est pas recréée.
 * - Aucun dossier n'y est rattaché : la capacité est posée à 30 pour que la
 *   colonne de /admin se lise, et le décompte reste à zéro.
 */
import { readFileSync } from "node:fs";
import { getPayload } from "payload";
import config from "@payload-config";

const ECRIRE = process.env.ECRIRE === "1";
const fichier = process.argv.find((a) => String(a).endsWith(".json"));

interface Ligne {
  formation: string;
  debut: string;
  cadence: string;
}

if (!fichier) {
  console.log("\n  ✗ Donner le fichier des cohortes (…/cohortes.json). Rien n'est écrit.\n");
  process.exit(1);
}

const lignes = JSON.parse(readFileSync(String(fichier), "utf8")) as Ligne[];
const aujourdhui = new Date().toISOString().slice(0, 10);

const payload = await getPayload({ config });
const { docs: programmes } = await payload.find({
  collection: "programmes",
  limit: 200,
  locale: "fr",
  depth: 0,
  overrideAccess: true,
});
const parSlug = new Map(programmes.map((p) => [String(p.slug), p]));

const fautes: string[] = [];
for (const [i, l] of lignes.entries()) {
  const ou = `ligne ${i + 1}`;
  if (!parSlug.has(l.formation)) fautes.push(`${ou} : parcours inconnu « ${l.formation} »`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(l.debut ?? "")) fautes.push(`${ou} : date « ${l.debut} »`);
  else if (l.debut >= aujourdhui) fautes.push(`${ou} : ${l.debut} n'est pas passée`);
  if (!/^\d+\s+\S+.*\d{1,2}h\d{2}\s*[–-]\s*\d{1,2}h\d{2}/.test(l.cadence ?? ""))
    fautes.push(`${ou} : cadence « ${l.cadence} » (attendu : « 8 samedis · 9h00–13h00 »)`);
}
if (fautes.length > 0) {
  console.log("\n  ✗ Le fichier ne tient pas — rien n'est écrit :");
  for (const f of fautes) console.log(`    · ${f}`);
  console.log("");
  process.exit(1);
}

console.log(
  `\n  ${ECRIRE ? "ÉCRITURE" : "Aperçu (rien n'est écrit)"} — ${lignes.length} cohorte(s)\n`,
);

let creees = 0;
let deja = 0;
for (const l of lignes) {
  const p = parSlug.get(l.formation)!;
  const [, n, h1, m1, h2, m2] =
    /^(\d+)\s.*?(\d{1,2})h(\d{2})\s*[–-]\s*(\d{1,2})h(\d{2})/.exec(l.cadence) ?? [];
  const seances = Number(n);
  const debut = new Date(`${l.debut}T${h1!.padStart(2, "0")}:${m1}:00.000Z`);
  const dernierJour = new Date(debut.getTime() + 7 * (seances - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const fin = new Date(`${dernierJour}T${h2!.padStart(2, "0")}:${m2}:00.000Z`);

  const { totalDocs } = await payload.count({
    collection: "sessions",
    where: {
      and: [
        { programme: { equals: p.id } },
        { debut: { greater_than_equal: `${l.debut}T00:00:00.000Z` } },
        { debut: { less_than_equal: `${l.debut}T23:59:59.999Z` } },
      ],
    },
    overrideAccess: true,
  });
  if (totalDocs > 0) {
    console.log(`  = ${String(p.titre).padEnd(42)} ${l.debut}  déjà enregistrée`);
    deja += 1;
    continue;
  }

  console.log(`  + ${String(p.titre).padEnd(42)} ${l.debut} → ${dernierJour}  ${l.cadence}`);
  if (ECRIRE) {
    await payload.create({
      collection: "sessions",
      locale: "fr",
      overrideAccess: true,
      data: {
        reference: `${l.formation}-${l.debut}`,
        programme: p.id,
        mode: "visio",
        debut: debut.toISOString(),
        fin: fin.toISOString(),
        cadence: l.cadence,
        fuseau: "UTC",
        capacite: 30,
        placesReservees: 0,
        prix: 423,
        devise: "EUR",
        cloturee: true,
      },
    });
  }
  creees += 1;
}

console.log(`\n  ${creees} à créer, ${deja} déjà enregistrée(s).`);
if (!ECRIRE) console.log("  Relancer avec ECRIRE=1 pour écrire.");
console.log("");
process.exit(0);
