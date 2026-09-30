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
