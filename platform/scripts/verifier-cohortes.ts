/**
 * Les cohortes clôturées : montrées comme telles, jamais prises pour une rentrée.
 *
 *   npx tsx scripts/verifier-cohortes.ts
 *
 * Aucune base, aucun réseau. Ce qui est gardé :
 *
 * - `separerLesSessions` range chaque session d'un seul côté, les ouvertes
 *   de la plus proche à la plus lointaine, les clôturées de la plus récente à
 *   la plus ancienne ;
 * - une cohorte clôturée n'offre aucune place, même si sa capacité en laisse ;
 * - la colonne « Remplissage » de /admin la dit clôturée, pas « 8 restantes » ;
 * - toutes les lectures publiques du catalogue passent par le filtre.
 *
 * ⚠️ Le dernier point lit la source de `lib/catalogue.ts`, faute de pouvoir
 * l'appeler sans base. Le défaut qu'il garde n'est pas une valeur mais un
 * oubli : une lecture qui prendrait `chargerCatalogue().sessions` sans passer
 * par `ouvertes()` remettrait octobre 2025 en tête de l'agenda de l'accueil.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  COHORTES_SANS_DATE,
  historiqueDesCohortes,
  libelleCohorteDuMois,
  separerLesSessions,
} from "@/lib/cohortes";
import { occupationDeLaSession } from "@/lib/occupation";
import { placesRestantes, type Session } from "@/lib/types";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const session = (debut: string, extra: Partial<Session> = {}): Session => ({
  id: debut,
  programmeSlug: "directeur-administratif-et-financier",
  mode: "visio",
  debut: `${debut}T09:00:00.000Z`,
  fin: `${debut}T13:00:00.000Z`,
  capacite: 30,
  placesReservees: 22,
  prixCentimes: 42300,
  devise: "EUR",
  ...extra,
});

// Dans le désordre, exprès : un tri oublié passerait au vert sur une liste déjà rangée.
const toutes = [
  session("2026-02-07", { cloturee: true }),
  session("2026-10-31"),
  session("2025-10-04", { cloturee: true }),
  session("2026-10-03", { cloturee: true }),
  session("2027-01-09"),
  session("2026-06-06", { cloturee: true }),
];

console.log("\n▸ Le partage\n");

const { ouvertes, precedentes } = separerLesSessions(toutes);
const jours = (ss: Session[]) => ss.map((s) => s.debut.slice(0, 10)).join(" · ");

dire(
  "chaque session est d'un côté, et d'un seul",
  ouvertes.length + precedentes.length === toutes.length &&
    !ouvertes.some((s) => precedentes.includes(s)),
);
dire(
  "⚠️ aucune cohorte clôturée parmi les ouvertes",
  ouvertes.every((s) => !s.cloturee),
  jours(ouvertes),
);
dire(
  "les ouvertes vont de la plus proche à la plus lointaine",
  jours(ouvertes) === "2026-10-31 · 2027-01-09",
  jours(ouvertes),
);
dire(
  "les clôturées vont de la plus récente à la plus ancienne",
  jours(precedentes) === "2026-10-03 · 2026-06-06 · 2026-02-07 · 2025-10-04",
  jours(precedentes),
);
dire(
  "⚠️ octobre 2026, clôturé avant son premier samedi, n'est pas la prochaine rentrée",
  ouvertes[0]?.debut.slice(0, 10) === "2026-10-31",
);
dire(
  "sans cohorte clôturée, rien n'est rangé à part",
  separerLesSessions([session("2026-10-31")]).precedentes.length === 0,
);
dire("la liste d'entrée n'est pas réordonnée", toutes[0]?.debut.startsWith("2026-02-07") === true);

console.log("\n▸ Les places\n");

dire(
  "⚠️ une cohorte clôturée n'offre aucune place, même à 22 sur 30",
  placesRestantes(session("2026-10-03", { cloturee: true })) === 0,
);
dire("témoin : la même, ouverte, en offre huit", placesRestantes(session("2026-10-03")) === 8);

console.log("\n▸ La colonne « Remplissage » de /admin\n");

const close = occupationDeLaSession({ capacite: 30, placesReservees: 22, cloturee: true });
dire(
  "⚠️ elle dit « Cohorte clôturée », pas « 8 restantes »",
  close.libelle === "Cohorte clôturée" && close.ton === "cloturee" && close.restantes === 0,
  `${close.compte} · ${close.libelle}`,
);
dire("elle garde ce que la cohorte a réuni", close.compte === "22 / 30");
dire(
  "⚠️ une cohorte tenue ouverte puis clôturée ne se dit plus « cohorte ouverte »",
  occupationDeLaSession({
    capacite: 46,
    placesReservees: 26,
    placesLibresTenues: 20,
    cloturee: true,
  }).ton === "cloturee",
);
const temoin = occupationDeLaSession({ capacite: 30, placesReservees: 22, cloturee: false });
dire("témoin : ouverte, elle dit ce qu'il reste", temoin.libelle === "8 restantes", temoin.libelle);

console.log("\n▸ Les lectures publiques du catalogue\n");

const source = readFileSync(path.join(process.cwd(), "src/lib/catalogue.ts"), "utf8");
const corps = (nom: string) => {
  const debut = source.indexOf(`export async function ${nom}(`);
  if (debut < 0) return "";
  const suite = source.indexOf("\nexport ", debut + 1);
  return source.slice(debut, suite < 0 ? undefined : suite);
};
/*
  `catalogueSansCache` sert le courriel de présentation : sans le filtre, il
  annonçait la rentrée du 3 octobre — clôturée — et la cadence « 8 samedis ».
*/
for (const nom of ["getSessions", "getAgenda", "villesDisponibles", "catalogueSansCache"]) {
  dire(`${nom} passe par le filtre des cohortes clôturées`, /ouvertes\(/.test(corps(nom)));
}
dire(
  "le filtre par modalité ou par ville aussi",
  /ouvertes\(sessions\)\.filter\(\(s\) => s\.programmeSlug === p\.slug\)/.test(
    corps("filtrerProgrammes"),
  ),
);
dire(
  "et les cohortes précédentes se lisent à part",
  /\.precedentes/.test(corps("getCohortesPrecedentes")),
);

console.log("\n▸ Les cohortes connues par leur seul mois\n");

const octobre = session("2026-10-03", { cloturee: true });
const histo = historiqueDesCohortes([octobre]);
dire(
  "octobre 2026 en base, puis juin, avril, février 2026 et octobre 2025",
  histo.map((l) => l.mois).join(",") === "2026-10,2026-06,2026-04,2026-02,2025-10",
  histo.map((l) => l.mois).join(", "),
);
dire("la session en base garde ses dates", histo[0]?.session === octobre);
dire(
  "⚠️ les cohortes d'avant le site ne portent aucune date",
  histo.slice(1).every((l) => l.session === undefined),
);
const juinDate = session("2026-06-06", { cloturee: true });
const sansDoublon = historiqueDesCohortes([octobre, juinDate]);
dire(
  "⚠️ un mois porté par une session n'est pas répété",
  sansDoublon.filter((l) => l.mois === "2026-06").length === 1 &&
    sansDoublon.find((l) => l.mois === "2026-06")?.session === juinDate,
  `${sansDoublon.length} ligne(s)`,
);
dire(
  "témoin : sans session clôturée, les quatre mois restent",
  historiqueDesCohortes([]).length === COHORTES_SANS_DATE.length,
);
dire(
  "« Cohorte d'octobre 2025 », « Cohorte de juin 2026 », « Cohorte d'avril 2026 »",
  libelleCohorteDuMois("2025-10") === "Cohorte d'octobre 2025" &&
    libelleCohorteDuMois("2026-06") === "Cohorte de juin 2026" &&
    libelleCohorteDuMois("2026-04") === "Cohorte d'avril 2026",
  `${libelleCohorteDuMois("2025-10")} · ${libelleCohorteDuMois("2026-06")}`,
);

console.log(manques === 0 ? "\n  ✓ Tout tient.\n" : `\n  ✗ ${manques} contrôle(s) au rouge.\n`);
if (manques > 0) process.exit(1);
