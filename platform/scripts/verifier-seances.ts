/**
 * Le calendrier des séances, quand une session tient plusieurs soirs par semaine.
 *
 *   npx tsx scripts/verifier-seances.ts
 *
 * Aucune base, aucun réseau. La cohorte du soir de novembre 2026 se donne deux
 * soirs par semaine : la fiche doit en montrer les seize dates, pas zéro, et
 * jamais une de trop.
 *
 * Ce qui est gardé :
 * - deux jours nommés dans la cadence donnent toutes leurs dates, du premier
 *   au dernier soir, à l'heure de la session ;
 * - des soirées en plus, datées dans la cadence (« et les vendredis 11 et
 *   18 déc. »), rejoignent le calendrier — c'est la préparation PMP® ;
 * - un compte qui ne tombe pas juste ne rend rien — ni un nombre annoncé qui
 *   diffère, ni une fin qui n'est pas un jour de séance, ni des soirées en
 *   plus que la cadence ne date pas, ni une date qui ne tombe pas le jour
 *   qu'elle dit ;
 * - témoin : une cadence d'un seul jour garde la règle hebdomadaire. Sans lui,
 *   une fonction qui ne rendrait plus rien pour les samedis passerait au vert.
 */
import { planDesSeances, seancesDeLaSession } from "@/lib/format";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const JOURS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const jourDe = (iso: string) => JOURS[new Date(iso).getUTCDay()];

console.log("\n▸ Deux soirs par semaine\n");

const lunMer = seancesDeLaSession(
  "2026-11-02T19:00:00.000Z",
  "2026-12-23T21:00:00.000Z",
  "16 soirées · lundis et mercredis · 19h00–21h00",
);
dire("lundi et mercredi : seize dates", lunMer?.length === 16, `${lunMer?.length ?? "rien"}`);
dire(
  "toutes un lundi ou un mercredi",
  Boolean(lunMer?.every((d) => ["lun", "mer"].includes(jourDe(d)!))),
);
dire(
  "du 2 novembre au 23 décembre",
  lunMer?.[0]?.slice(0, 10) === "2026-11-02" && lunMer?.at(-1)?.slice(0, 10) === "2026-12-23",
);
dire("à l'heure de la session", Boolean(lunMer?.every((d) => d.slice(11, 16) === "19:00")));

const marJeu = seancesDeLaSession(
  "2026-11-03T19:00:00.000Z",
  "2026-12-24T21:00:00.000Z",
  "16 soirées · mardis et jeudis · 19h00–21h00",
);
dire("mardi et jeudi : seize dates", marJeu?.length === 16, `${marJeu?.length ?? "rien"}`);
dire(
  "du 3 novembre au 24 décembre",
  marJeu?.[0]?.slice(0, 10) === "2026-11-03" && marJeu?.at(-1)?.slice(0, 10) === "2026-12-24",
);

console.log("\n▸ Des soirées en plus, datées dans la cadence\n");

const CADENCE_PMP = "18 soirées · mardis et jeudis, et les vendredis 11 et 18 déc. · 19h00–21h00";
const pmp = planDesSeances("2026-11-03T19:00:00.000Z", "2026-12-24T21:00:00.000Z", CADENCE_PMP);
dire(
  "PMP® : seize soirées régulières",
  pmp?.regulieres.length === 16,
  `${pmp?.regulieres.length ?? "rien"}`,
);
dire(
  "et deux en plus, les vendredis 11 et 18 décembre",
  pmp?.enPlus.map((d) => d.slice(0, 10)).join(",") === "2026-12-11,2026-12-18",
  pmp?.enPlus.map((d) => d.slice(0, 10)).join(", "),
);
dire("à l'heure de la session", Boolean(pmp?.enPlus.every((d) => d.slice(11, 16) === "19:00")));
dire("les jours réguliers restent mardi et jeudi", pmp?.jours.sort().join(",") === "2,4");
dire(
  "dix-huit dates en tout, dans l'ordre",
  seancesDeLaSession("2026-11-03T19:00:00.000Z", "2026-12-24T21:00:00.000Z", CADENCE_PMP)
    ?.length === 18,
);

console.log("\n▸ Ce qui ne tombe pas juste ne rend rien\n");

dire(
  "⚠️ une date en plus qui ne tombe pas le jour qu'elle dit",
  seancesDeLaSession(
    "2026-11-03T19:00:00.000Z",
    "2026-12-24T21:00:00.000Z",
    "18 soirées · mardis et jeudis, et les vendredis 12 et 18 déc. · 19h00–21h00",
  ) === undefined,
);
dire(
  "⚠️ une date en plus hors de la période",
  seancesDeLaSession(
    "2026-11-03T19:00:00.000Z",
    "2026-12-24T21:00:00.000Z",
    "18 soirées · mardis et jeudis, et les vendredis 18 et 25 déc. · 19h00–21h00",
  ) === undefined,
);

dire(
  "⚠️ un nombre annoncé qui diffère",
  seancesDeLaSession(
    "2026-11-02T19:00:00.000Z",
    "2026-12-23T21:00:00.000Z",
    "15 soirées · lundis et mercredis · 19h00–21h00",
  ) === undefined,
);
dire(
  "⚠️ une fin qui n'est pas un jour de séance",
  seancesDeLaSession(
    "2026-11-02T19:00:00.000Z",
    "2026-12-24T21:00:00.000Z",
    "16 soirées · lundis et mercredis · 19h00–21h00",
  ) === undefined,
);
dire(
  "⚠️ deux vendredis en plus, que la cadence ne date pas",
  seancesDeLaSession(
    "2026-11-03T19:00:00.000Z",
    "2026-12-24T21:00:00.000Z",
    "18 soirées · mardis et jeudis, et deux vendredis · 19h00–21h00",
  ) === undefined,
);
dire(
  "une date illisible",
  seancesDeLaSession(
    "pas une date",
    "2026-12-24T21:00:00.000Z",
    "16 soirées · mardis et jeudis",
  ) === undefined,
);

console.log("\n▸ Témoin : un seul jour garde la règle hebdomadaire\n");

const samedis = seancesDeLaSession(
  "2026-10-31T09:00:00.000Z",
  "2026-12-19T13:00:00.000Z",
  "8 samedis · 9h00–13h00",
);
dire("8 samedis : huit dates", samedis?.length === 8, `${samedis?.length ?? "rien"}`);
dire(
  "sans cadence : la règle hebdomadaire aussi",
  seancesDeLaSession("2026-10-31T09:00:00.000Z", "2026-12-19T13:00:00.000Z")?.length === 8,
);

console.log(manques === 0 ? "\n  ✓ Tout tient.\n" : `\n  ✗ ${manques} contrôle(s) au rouge.\n`);
if (manques > 0) process.exit(1);
