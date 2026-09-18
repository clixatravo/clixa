/**
 * Qui demande sa place : son métier, et depuis combien de temps.
 *
 * ── Pourquoi ces deux-là, et pas d'autres ───────────────────────────────────
 * Demandé par la direction le 18 septembre 2026 : « zid la profession o number
 * anne de l'experience bach ibano nass li m'ahelin mn nass li rire
 * kaytfelaw ». Le formulaire ne disait rien de la personne — un nom, une
 * adresse, un numéro. Devant cent onze dossiers, rien ne distinguait un
 * directeur financier en poste de quelqu'un qui remplit pour voir.
 *
 * Ce ne sont pas des champs de confort : ils changent **ce qu'on fait du
 * dossier**. On n'appelle pas de la même façon un contrôleur de gestion de
 * douze ans d'expérience et un étudiant, et l'équipe décidait jusqu'ici sans
 * rien savoir.
 *
 * ── ⚠️ L'expérience est une tranche, jamais un nombre exact ─────────────────
 * Trois raisons, dans cet ordre :
 *
 * - **on la lit d'un coup d'œil** — trente lignes de « 3 · 12 · 7 · 0 » se
 *   trient mais ne se lisent pas, quand « 5 à 10 ans » se voit ;
 * - **elle ne se saisit pas de travers** — un champ numérique sur un téléphone
 *   invite à taper l'année en cours, et « 2026 ans d'expérience » est arrivé
 *   dans assez de formulaires pour qu'on n'ait pas à l'apprendre ici ;
 * - **elle ne vieillit pas** — un nombre écrit aujourd'hui sera faux dans deux
 *   ans, et personne ne le corrigera.
 *
 * ── ⚠️ Les valeurs stockées ne sont pas les intitulés ───────────────────────
 * `moins-2` en base, « Moins de 2 ans » à l'écran. Ranger l'intitulé
 * reviendrait à figer une formulation qu'on voudra changer, et à rendre
 * invalides toutes les lignes le jour où on la change — la leçon d'`appel` et
 * d'`accueil` dans le journal des relances : **on ne retire pas d'un type
 * énuméré une valeur que des lignes utilisent.**
 */

/** Les tranches offertes, dans l'ordre où on les lit. */
export const EXPERIENCES = [
  { valeur: "moins-2", libelle: "Moins de 2 ans" },
  { valeur: "2-5", libelle: "2 à 5 ans" },
  { valeur: "5-10", libelle: "5 à 10 ans" },
  { valeur: "plus-10", libelle: "Plus de 10 ans" },
] as const;

export type Experience = (typeof EXPERIENCES)[number]["valeur"];

/** Ce que Payload attend pour un champ `select`. */
export const OPTIONS_EXPERIENCE = EXPERIENCES.map((e) => ({
  label: e.libelle,
  value: e.valeur,
}));

/**
 * La tranche correspondante, ou `undefined`.
 *
 * ⚠️ **On ne devine pas.** Une valeur hors table vient d'un formulaire forgé
 * ou d'un lien trafiqué ; la ramener à la tranche la plus proche écrirait dans
 * le dossier une expérience que personne n'a déclarée — et c'est sur elle que
 * l'équipe décidera qui rappeler en premier.
 */
export function experienceValide(valeur: string): Experience | undefined {
  return EXPERIENCES.find((e) => e.valeur === valeur)?.valeur;
}

/** L'intitulé à afficher, ou le tiret de « rien n'a été demandé ». */
export function libelleExperience(valeur?: string | null): string {
  if (!valeur) return "—";
  return EXPERIENCES.find((e) => e.valeur === valeur)?.libelle ?? String(valeur);
}
