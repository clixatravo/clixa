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

/**
 * Le domaine d'exercice, demandé par la direction le 20 septembre 2026.
 *
 * ── ⚠️ Pourquoi une liste, quand le poste est déjà un texte libre ───────────
 * Ce n'est pas la même question posée deux fois — le journal garde le souvenir
 * du champ « Pays » qui doublait l'indicatif, et la leçon vaut : deux saisies
 * pour un même fait finissent par se contredire. Ici les deux ne servent pas au
 * même moment.
 *
 * - **Le poste** dit *à qui l'on parle* : « Mécanicien automobile », « Aide
 *   soignant » — deux vrais dossiers du 18 septembre. On le lit avant
 *   d'appeler, et il ne se compte pas.
 * - **Le domaine** dit *combien* : c'est le seul des deux qui se filtre et
 *   s'additionne. « Sur cent quinze dossiers, combien viennent de la finance ? »
 *   ne se répond pas sur du texte libre, où « DAF », « Directeur Administratif
 *   et Financier » et « daf » sont trois réponses différentes.
 *
 * ⚠️ **« Autre » n'ouvre pas de champ libre**, contrairement au sélecteur de
 * pays. Il n'y a rien à préciser : le poste, juste au-dessus, l'a déjà dit en
 * toutes lettres. Ajouter une case reviendrait à demander deux fois la même
 * chose — la faute exacte qu'on a corrigée le 7 septembre.
 *
 * Et il ne se retire pas : une liste fermée renverrait sans recours quelqu'un
 * dont le métier n'y figure pas, pour une lacune qui est la nôtre.
 */
export const DOMAINES = [
  { valeur: "finance", libelle: "Finance" },
  { valeur: "comptabilite", libelle: "Comptabilité" },
  { valeur: "audit", libelle: "Audit" },
  { valeur: "controle-gestion", libelle: "Contrôle de gestion" },
  { valeur: "tresorerie", libelle: "Trésorerie" },
  { valeur: "direction", libelle: "Direction" },
  { valeur: "autre", libelle: "Autre" },
] as const;

export type Domaine = (typeof DOMAINES)[number]["valeur"];

export const OPTIONS_DOMAINE = DOMAINES.map((d) => ({ label: d.libelle, value: d.valeur }));

/**
 * Le domaine correspondant, ou `undefined`.
 *
 * ⚠️ Même règle que pour l'expérience : on ne rattrape pas. Un domaine inventé
 * rangerait le dossier dans une case que personne n'a cochée, et c'est sur ces
 * cases que se comptent les cohortes à venir.
 */
export function domaineValide(valeur: string): Domaine | undefined {
  return DOMAINES.find((d) => d.valeur === valeur)?.valeur;
}

/** L'intitulé à afficher, ou le tiret de « rien n'a été demandé ». */
export function libelleDomaine(valeur?: string | null): string {
  if (!valeur) return "—";
  return DOMAINES.find((d) => d.valeur === valeur)?.libelle ?? String(valeur);
}

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
