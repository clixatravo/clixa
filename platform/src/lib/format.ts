/**
 * Mise en forme — prix, dates, durées, libellés.
 *
 * Séparé de la couche d'accès pour une raison précise : `PlanDeCours` est un
 * composant client et n'a besoin que de `formatDuree`. Tant que ces fonctions
 * vivaient dans catalogue.ts, l'import entraînait Payload — et tout son code
 * serveur — dans le paquet envoyé au navigateur. Le build échouait.
 *
 * Ce fichier ne dépend que des types : il peut être importé de partout.
 */
import type { ModeDiffusion, Session, Niveau } from "@/lib/types";

const LOCALE = "fr-FR";

export function formatPrix(centimes: number, devise: Session["devise"] = "EUR"): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: devise,
    maximumFractionDigits: 0,
  }).format(centimes / 100);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatDateCourte(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/** « 09 – 13 nov. 2026 » si même mois, sinon les deux dates complètes. */
export function formatPeriode(debut: string, fin: string): string {
  const d = new Date(debut);
  const f = new Date(fin);
  if (d.getMonth() === f.getMonth() && d.getFullYear() === f.getFullYear()) {
    const jour = new Intl.DateTimeFormat(LOCALE, { day: "2-digit" });
    const suite = new Intl.DateTimeFormat(LOCALE, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `${jour.format(d)} – ${suite.format(f)}`;
  }
  return `${formatDateCourte(debut)} → ${formatDateCourte(fin)}`;
}

/** 90 → « 1 h 30 », 60 → « 1 h 00 ». */
export function formatDuree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

export function dureeModule(lecons: { dureeMinutes: number }[]): number {
  return lecons.reduce((t, l) => t + l.dureeMinutes, 0);
}

/**
 * Le libellé d'un niveau. Il vivait dans la fiche, seule à l'afficher ; la
 * plaquette PDF montrait le code brut — « avance » au lieu d'« Avancé ».
 */
export const libelleNiveau: Record<Niveau, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

export const libelleMode: Record<ModeDiffusion, string> = {
  presentiel: "Présentiel",
  visio: "À distance",
  "en-ligne": "En ligne",
};

export function lieuSession(s: Session): string {
  if (s.mode === "presentiel") return [s.ville, s.pays].filter(Boolean).join(", ");
  if (s.mode === "visio") return "Classe virtuelle";
  return "Accès permanent";
}

/**
 * Nom lisible d'un fuseau. Les fiches annoncent « 13h00–17h00 UTC » : la valeur
 * brute d'un identifiant IANA (« Africa/Casablanca ») ne se montre pas telle
 * quelle à un visiteur.
 */
const FUSEAUX: Record<string, string> = {
  UTC: "UTC",
  GMT: "GMT",
  "Africa/Casablanca": "heure du Maroc",
  "Africa/Abidjan": "heure d'Abidjan",
  "Africa/Dakar": "heure de Dakar",
};

export function libelleFuseau(fuseau: string): string {
  return FUSEAUX[fuseau] ?? fuseau;
}

/**
 * Les dates de chaque séance, déduites de la période et d'un rythme hebdomadaire.
 *
 * La fiche annonce « 8 samedis · 9h00–13h00 » sans dire lesquels : le visiteur
 * doit sortir un calendrier pour savoir s'il sera libre. Or les dates sont
 * calculables — le début, la fin, et une séance par semaine suffisent.
 *
 * Rend `undefined` dès que le compte ne tombe pas juste. Une session de cinq
 * jours d'affilée, ou dont la fin ne coïncide pas avec un multiple de sept
 * jours, n'a pas un rythme hebdomadaire : mieux vaut ne rien afficher que
 * d'inventer un calendrier faux.
 */
const SEMAINE_MS = 7 * 86400000;

export function seancesHebdomadaires(debut: string, fin: string): string[] | undefined {
  const d = new Date(debut).getTime();
  const f = new Date(fin).getTime();
  if (Number.isNaN(d) || Number.isNaN(f) || f <= d) return undefined;

  // Le jour de la semaine doit être le même aux deux bouts.
  const ecart = f - d;
  const semaines = Math.round(ecart / SEMAINE_MS);
  if (semaines < 1 || semaines > 52) return undefined;
  if (Math.abs(ecart - semaines * SEMAINE_MS) > 12 * 3600000) return undefined;

  return Array.from({ length: semaines + 1 }, (_, i) => new Date(d + i * SEMAINE_MS).toISOString());
}

const NUMERO_DU_JOUR: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

/**
 * Les dates de chaque séance, que la session tienne un soir par semaine ou
 * plusieurs.
 *
 * La cohorte du soir de novembre 2026 se donne deux soirs par semaine
 * (« 16 soirées · lundis et mercredis · 19h00–21h00 ») : le début est un
 * lundi, la fin un mercredi, et `seancesHebdomadaires` — qui exige le même
 * jour aux deux bouts — ne rendait rien. La fiche perdait son calendrier,
 * celui que la FAQ annonce « sur la fiche de chaque parcours ».
 *
 * Les jours se lisent dans la cadence, qui fait foi (le crochet de
 * `Sessions.ts` y recale déjà les heures). Une cadence qui ne nomme qu'un
 * jour, ou aucun, garde la règle hebdomadaire.
 *
 * ⚠️ **Rien n'est rendu dès que le compte ne tombe pas juste** : les deux
 * bouts doivent être des jours de séance, et le nombre écrit en tête de la
 * cadence doit égaler celui des dates. Une session qui ajoute deux vendredis
 * à ses mardis et jeudis n'a pas de calendrier déductible — mieux vaut ne
 * rien afficher que d'en inventer un faux.
 */
export function seancesDeLaSession(
  debut: string,
  fin: string,
  cadence?: string | null,
): string[] | undefined {
  const texte = (cadence ?? "").toLowerCase();
  const jours = [
    ...new Set(
      [...texte.matchAll(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)s?\b/g)].map(
        (m) => NUMERO_DU_JOUR[m[1]!]!,
      ),
    ),
  ];
  if (jours.length < 2) return seancesHebdomadaires(debut, fin);

  const d = new Date(debut).getTime();
  const f = new Date(fin).getTime();
  if (Number.isNaN(d) || Number.isNaN(f) || f <= d || f - d > 366 * 86400000) return undefined;

  const dates: string[] = [];
  for (let t = d; t <= f; t += 86400000) {
    if (jours.includes(new Date(t).getUTCDay())) dates.push(new Date(t).toISOString());
  }
  if (dates.length === 0) return undefined;
  if (dates[0]!.slice(0, 10) !== debut.slice(0, 10)) return undefined;
  if (dates.at(-1)!.slice(0, 10) !== new Date(f).toISOString().slice(0, 10)) return undefined;

  const annonce = /^\s*(\d{1,3})\b/.exec(texte);
  if (annonce && Number(annonce[1]) !== dates.length) return undefined;

  return dates;
}

/** « 19 sept. » — assez pour une pastille de calendrier. */
const JOUR_MOIS = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

export function formatJourMois(iso: string): string {
  return JOUR_MOIS.format(new Date(iso));
}
