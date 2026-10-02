import type { Session } from "@/lib/types";

/**
 * Les sessions d'un parcours, séparées en deux : celles qu'on peut encore
 * rejoindre, et les cohortes clôturées.
 *
 * Demandé par la direction le 30 septembre 2026 : qui visite une fiche doit
 * voir les cohortes déjà données (octobre 2025, février, avril, juin 2026, et
 * octobre 2026), marquées « Clôturée ». Elles prouvent que le parcours a eu
 * lieu ; elles ne doivent jamais passer pour une rentrée.
 *
 * ── Pourquoi une fonction, et pas un `filter` à chaque endroit ──────────────
 * Les cohortes clôturées restent en base, et une liste de sessions triée par
 * date commence désormais par la plus ancienne — octobre 2025. Chaque endroit
 * qui prenait « la première session » (la plaquette, la FAQ, l'inscription,
 * l'agenda de l'accueil) annonçait alors une rentrée passée. Un seul endroit
 * tranche ce qui est ouvert ; `verifier-cohortes.ts` l'éprouve sans base.
 */
export function separerLesSessions(sessions: Session[]): {
  /** Les sessions qu'on peut rejoindre ou attendre, de la plus proche à la plus lointaine. */
  ouvertes: Session[];
  /** Les cohortes clôturées, de la plus récente à la plus ancienne. */
  precedentes: Session[];
} {
  const ouvertes = sessions
    .filter((s) => !s.cloturee)
    .sort((a, b) => a.debut.localeCompare(b.debut));
  const precedentes = sessions
    .filter((s) => s.cloturee)
    .sort((a, b) => b.debut.localeCompare(a.debut));
  return { ouvertes, precedentes };
}

/**
 * Les cohortes déjà données avant que le site ne tienne ses sessions en base.
 *
 * Demandé par la direction le 30 septembre 2026, précisé le 2 octobre : la
 * fiche montre les cohortes d'octobre 2025, février, avril et juin 2026,
 * **sans date précise** (« bla date mohadada ») — les dates exactes ne sont
 * pas connues, et on ne les invente pas. Seul le mois est annoncé.
 *
 * ⚠️ **Une liste tenue à la main**, dans l'ordre où les cohortes ont eu lieu.
 * Une cohorte dont la session est en base (octobre 2026, avec ses dates) n'a
 * pas à y figurer : elle s'y trouverait de toute façon écartée, la vraie
 * session l'emportant sur la mention du mois. Le jour où la direction donne les
 * dates d'une cohorte d'ici, `scripts/cohortes-passees.ts` l'enregistre comme
 * session, et la mention s'efface d'elle-même.
 */
export const COHORTES_SANS_DATE = ["2025-10", "2026-02", "2026-04", "2026-06"] as const;

const MOIS_LONG = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** « Octobre 2025 » pour « 2025-10 ». */
export function libelleDuMois(mois: string): string {
  const texte = MOIS_LONG.format(new Date(`${mois}-15T12:00:00.000Z`));
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** « Cohorte d'octobre 2025 », « Cohorte de juin 2026 » : l'élision suit la voyelle. */
export function libelleCohorteDuMois(mois: string): string {
  const m = libelleDuMois(mois).toLowerCase();
  return /^[aeiouyéè]/.test(m) ? `Cohorte d'${m}` : `Cohorte de ${m}`;
}

/** Une ligne du bloc « Cohortes précédentes » : une session datée, ou un mois. */
export type LigneDeCohorte =
  { mois: string; session: Session } | { mois: string; session?: undefined };

/**
 * L'historique d'un parcours : ses sessions clôturées, et les cohortes connues
 * par leur seul mois, de la plus récente à la plus ancienne.
 *
 * ⚠️ **Un mois déjà porté par une session n'est pas répété.** La session dit
 * davantage — ses dates, son rythme — et deux lignes pour une même cohorte se
 * liraient comme deux cohortes.
 */
export function historiqueDesCohortes(
  precedentes: Session[],
  sansDate: readonly string[] = COHORTES_SANS_DATE,
): LigneDeCohorte[] {
  const datees: LigneDeCohorte[] = precedentes.map((s) => ({
    mois: s.debut.slice(0, 7),
    session: s,
  }));
  const couverts = new Set(datees.map((l) => l.mois));
  const mois: LigneDeCohorte[] = [...new Set(sansDate)]
    .filter((m) => !couverts.has(m))
    .map((m) => ({ mois: m }));
  return [...datees, ...mois].sort(
    (a, b) =>
      b.mois.localeCompare(a.mois) ||
      (b.session?.debut ?? "").localeCompare(a.session?.debut ?? ""),
  );
}
