/**
 * L'emploi du temps public : ce que la page `/emploi-du-temps` affirme suit
 * les sessions, soir par soir.
 *
 *   npx tsx scripts/verifier-emploi.ts
 *
 * Aucune base, aucun réseau. On lui donne la cohorte du soir de novembre 2026
 * telle qu'elle est en base — douze sessions, deux rythmes, la PMP® et ses
 * deux vendredis — et l'on vérifie :
 *
 * - deux rythmes, chacun avec ses six formations, dans l'ordre du catalogue ;
 * - chaque soir porte le bon rythme et le bon numéro de soirée ;
 * - les vendredis 11 et 18 décembre portent la PMP® en plus, et elle seule ;
 * - le vendredi reste une colonne, même sans cours régulier ;
 * - une session dont le calendrier ne se déduit pas est rendue à part, et
 *   n'entre dans aucun rythme ;
 * - témoin : sans session datable, rien n'est composé — une page vide se
 *   lirait comme une page cassée.
 */
import { composerEmploi } from "@/lib/emploi";
import type { Programme, Session } from "@/lib/types";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const LUN_MER = [
  "directeur-administratif-et-financier",
  "directeur-audit-interne",
  "directeur-controle-de-gestion",
  "directeur-de-production",
  "directeur-de-maintenance",
  "directeur-industriel",
];
const MAR_JEU = [
  "directeur-commercial",
  "directeur-marketing",
  "directeur-des-ressources-humaines",
  "directeur-qhse",
  "directeur-de-projets",
];
const PMP = "preparation-a-la-certification-pmp";

const programmes = [...LUN_MER, ...MAR_JEU, PMP].map(
  (slug) => ({ slug, titre: slug, specialisation: "finance", modules: [] }) as unknown as Programme,
);

const session = (slug: string, debut: string, fin: string, cadence: string): Session =>
  ({
    id: slug,
    programmeSlug: slug,
    mode: "visio",
    debut: `${debut}T19:00:00.000Z`,
    fin: `${fin}T21:00:00.000Z`,
    cadence,
    fuseau: "UTC",
    capacite: 30,
    placesReservees: 0,
    prixCentimes: 42300,
    devise: "EUR",
  }) as unknown as Session;

const sessions: Session[] = [
  ...LUN_MER.map((s) =>
    session(s, "2026-11-02", "2026-12-23", "16 soirées · lundis et mercredis · 19h00–21h00"),
  ),
  ...MAR_JEU.map((s) =>
    session(s, "2026-11-03", "2026-12-24", "16 soirées · mardis et jeudis · 19h00–21h00"),
  ),
  session(
    PMP,
    "2026-11-03",
    "2026-12-24",
    "18 soirées · mardis et jeudis, et les vendredis 11 et 18 déc. · 19h00–21h00",
  ),
];

const emploi = composerEmploi(sessions, programmes);

console.log("\n▸ Les rythmes\n");
dire("deux rythmes", emploi?.rythmes.length === 2, `${emploi?.rythmes.length ?? "rien"}`);
const [a, b] = emploi?.rythmes ?? [];
dire("le premier : lundi et mercredi", a?.libelle === "Lundi et mercredi", a?.libelle);
dire("le second : mardi et jeudi", b?.libelle === "Mardi et jeudi", b?.libelle);
dire("l'horaire lu dans la cadence", a?.horaire === "19h00–21h00", a?.horaire);
dire(
  "six formations chacun, dans l'ordre du catalogue",
  a?.formations.map((f) => f.slug).join() === LUN_MER.join() &&
    b?.formations.map((f) => f.slug).join() === [...MAR_JEU, PMP].join(),
);
dire(
  "seize soirées régulières par rythme",
  a?.regulieres.length === 16 && b?.regulieres.length === 16,
);
const pmp = b?.formations.find((f) => f.slug === PMP);
dire("la PMP® compte dix-huit soirées", pmp?.soirees === 18, `${pmp?.soirees ?? "rien"}`);
dire("deux couleurs différentes", Boolean(a?.couleur && b?.couleur && a.couleur !== b.couleur));

console.log("\n▸ Le calendrier\n");
const jour = (j: string) => emploi?.semaines.flatMap((s) => s.jours).find((x) => x.jour === j);
dire(
  "du lundi 2 novembre au jeudi 24 décembre",
  emploi?.debut === "2026-11-02" && emploi?.fin === "2026-12-24",
  `${emploi?.debut} → ${emploi?.fin}`,
);
dire("huit semaines", emploi?.semaines.length === 8, `${emploi?.semaines.length ?? "rien"}`);
dire(
  "cinq colonnes, du lundi au vendredi",
  emploi?.colonnes.join() === "1,2,3,4,5",
  emploi?.colonnes.join(),
);
const lundi9 = jour("2026-11-09");
dire(
  "lundi 9 novembre : lundi-mercredi, soirée 3/16",
  lundi9?.rythmes.length === 1 && lundi9.rythmes[0]!.index === 0 && lundi9.rythmes[0]!.n === 3,
  JSON.stringify(lundi9?.rythmes),
);
const jeudi24 = jour("2026-12-24");
dire(
  "jeudi 24 décembre : mardi-jeudi, soirée 16/16",
  jeudi24?.rythmes[0]?.index === 1 &&
    jeudi24.rythmes[0]!.n === 16 &&
    jeudi24.rythmes[0]!.total === 16,
);
const vendredi11 = jour("2026-12-11");
dire(
  "⚠️ vendredi 11 décembre : la PMP® en plus, 1/2, et rien d'autre",
  vendredi11?.rythmes.length === 0 &&
    vendredi11.enPlus.length === 1 &&
    vendredi11.enPlus[0]!.titre === PMP &&
    vendredi11.enPlus[0]!.n === 1,
  JSON.stringify(vendredi11),
);
dire("vendredi 18 décembre : la PMP® en plus, 2/2", jour("2026-12-18")?.enPlus[0]?.n === 2);
const vendredi6 = jour("2026-11-06");
dire(
  "un vendredi ordinaire reste une colonne, vide",
  Boolean(vendredi6) && vendredi6!.rythmes.length === 0 && vendredi6!.enPlus.length === 0,
);

console.log("\n▸ Ce qui ne se date pas n'est pas deviné\n");
const avecIndatable = composerEmploi(
  [
    ...sessions,
    session(
      "orpheline",
      "2026-11-03",
      "2026-12-24",
      "18 soirées · mardis et jeudis, et deux vendredis",
    ),
  ],
  [...programmes, { slug: "orpheline", titre: "Orpheline", modules: [] } as unknown as Programme],
);
dire(
  "⚠️ elle est rendue à part",
  avecIndatable?.nonDatees.map((x) => x.slug).join() === "orpheline",
);
dire(
  "⚠️ et n'entre dans aucun rythme",
  !avecIndatable?.rythmes.some((r) => r.formations.some((f) => f.slug === "orpheline")),
);
dire(
  "témoin : sans session datable, rien n'est composé",
  composerEmploi([], programmes) === undefined,
);

console.log(manques === 0 ? "\n  ✓ Tout tient.\n" : `\n  ✗ ${manques} contrôle(s) au rouge.\n`);
if (manques > 0) process.exit(1);
