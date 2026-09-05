/**
 * Ce que le robot a le droit de promettre.
 *
 * `prochainsCreneaux` est pure : elle ne touche ni la base ni le réseau, et
 * cette épreuve non plus. On lui donne un instant, des heures d'ouverture et
 * un agenda, et l'on regarde ce qu'elle propose.
 *
 * ⚠️ **C'est le seul endroit qui décide de ce qu'on promet à quelqu'un.** Un
 * créneau proposé est un rendez-vous que le prospect note dans son téléphone.
 * Se tromper ici n'écrit rien de faux en base : cela fait attendre quelqu'un
 * devant un téléphone qui ne sonnera pas.
 *
 *   npx payload run scripts/verifier-creneaux.ts
 */
import { prochainsCreneaux, type Reglages } from "@/lib/creneaux";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

/** « lun. 06 oct. 09:00 » — de quoi lire un résultat sans le décoder. */
const LIRE = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);

const dire3 = (l: Date[]) => l.map(LIRE).join(" · ") || "aucun";

/** Un lundi, à 08:00 UTC. */
const LUNDI = new Date("2026-10-05T08:00:00.000Z");

const OUVERT: Reglages = {
  actif: true,
  dureeMinutes: 20,
  delaiMinimumHeures: 2,
  semaine: [
    { jour: "1", debut: "09:00", fin: "12:00" },
    { jour: "2", debut: "14:00", fin: "16:00" },
  ],
};

console.log("\n  Ce que le robot peut proposer\n");

// ── 1. Le cas courant ───────────────────────────────────────────────────────
const base = prochainsCreneaux(OUVERT, [], LUNDI);
dire(
  "trois créneaux, dans l'ordre, à partir du délai minimum",
  base.length === 3 && LIRE(base[0]!).includes("10:00"),
  dire3(base),
);

/*
  ⚠️ Le délai minimum n'est pas décoratif. À 08:00 avec deux heures de
  prévenance, 09:00 et 09:40 sont hors jeu : le premier créneau est 10:00.
*/
dire(
  "⚠️ rien avant le délai de prévenance",
  base.every((d) => d.getTime() >= LUNDI.getTime() + 2 * 3600_000),
  `le premier est ${LIRE(base[0]!)}`,
);

// ── 2. L'interrupteur ───────────────────────────────────────────────────────
dire(
  "⚠️ rien tant que la direction n'a pas ouvert les rendez-vous",
  prochainsCreneaux({ ...OUVERT, actif: false }, [], LUNDI).length === 0,
);

// ── 3. Ce qui est déjà pris ─────────────────────────────────────────────────
const avecUnAppel = prochainsCreneaux(
  OUVERT,
  [{ debut: "2026-10-05T10:00:00.000Z", dureeMinutes: 20 }],
  LUNDI,
);
dire(
  "un créneau déjà convenu n'est pas reproposé",
  !avecUnAppel.some((d) => d.toISOString() === "2026-10-05T10:00:00.000Z"),
  dire3(avecUnAppel),
);

/*
  ⚠️ **Le chevauchement, pas l'égalité.** Un appel commencé à 10:10 occupe
  aussi 10:20 : comparer des heures de début laisserait proposer 10:20 et
  mettrait deux personnes au même téléphone. C'est le contrôle qui distingue
  une vraie disponibilité d'une coïncidence.
*/
const chevauche = prochainsCreneaux(
  OUVERT,
  [{ debut: "2026-10-05T10:10:00.000Z", dureeMinutes: 20 }],
  LUNDI,
);
dire(
  "⚠️ ni celui qui le chevauche, même s'il ne commence pas à la même minute",
  !chevauche.some(
    (d) =>
      d.toISOString() === "2026-10-05T10:00:00.000Z" ||
      d.toISOString() === "2026-10-05T10:20:00.000Z",
  ),
  dire3(chevauche),
);

// ── 4. Les jours fermés ─────────────────────────────────────────────────────
const ferme = prochainsCreneaux(
  { ...OUVERT, fermetures: [{ jour: "2026-10-05T12:00:00.000Z" }] },
  [],
  LUNDI,
);
dire(
  "un jour fermé ne propose rien, et l'on passe au suivant",
  ferme.length > 0 && !ferme.some((d) => d.toISOString().startsWith("2026-10-05")),
  dire3(ferme),
);

// ── 5. Ce qu'on ne devine pas ───────────────────────────────────────────────
dire(
  "⚠️ une plage à l'envers est ignorée, pas retournée",
  prochainsCreneaux(
    { ...OUVERT, semaine: [{ jour: "1", debut: "12:00", fin: "09:00" }] },
    [],
    LUNDI,
  ).length === 0,
);
dire(
  "⚠️ une heure mal saisie est ignorée, pas devinée",
  prochainsCreneaux({ ...OUVERT, semaine: [{ jour: "1", debut: "9h", fin: "12h" }] }, [], LUNDI)
    .length === 0,
);
dire(
  "sans aucune plage, rien n'est promis",
  prochainsCreneaux({ ...OUVERT, semaine: [] }, [], LUNDI).length === 0,
);

// ── 6. Le créneau tient dans la plage ───────────────────────────────────────
/*
  Une plage de 09:00 à 09:30 avec des appels de vingt minutes ne donne qu'un
  créneau : 09:00. Le second déborderait, et un rendez-vous qui déborde de
  l'heure d'ouverture est un rendez-vous que personne ne tiendra.
*/
const courte = prochainsCreneaux(
  {
    ...OUVERT,
    delaiMinimumHeures: 0,
    semaine: [{ jour: "1", debut: "09:00", fin: "09:30" }],
  },
  [],
  new Date("2026-10-05T00:00:00.000Z"),
);
/*
  ⚠️ On compte les créneaux **de ce jour-là**, pas tous ceux rendus : la
  fonction continue d'explorer et trouve le lundi suivant, ce qui est juste.
  Un premier jet attendait « exactement un » et accusait le calcul d'un défaut
  qui n'était que dans l'épreuve.
*/
const ceLundi = courte.filter((d) => d.toISOString().startsWith("2026-10-05"));
dire(
  "un créneau ne déborde jamais de sa plage",
  ceLundi.length === 1 && ceLundi[0]!.toISOString().endsWith("T09:00:00.000Z"),
  dire3(courte),
);

// ── 7. La semaine suivante ──────────────────────────────────────────────────
/*
  Un vendredi soir, les prochaines plages sont lundi et mardi. La fonction
  doit franchir le week-end sans qu'on le lui dise.
*/
const vendredi = prochainsCreneaux(OUVERT, [], new Date("2026-10-09T18:00:00.000Z"));
dire(
  "on franchit les jours sans plage jusqu'au prochain ouvert",
  vendredi.length === 3 && vendredi[0]!.toISOString().startsWith("2026-10-12"),
  dire3(vendredi),
);

console.log(
  manques === 0
    ? "\n  Le robot ne promet que des heures tenables.\n"
    : `\n  ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
