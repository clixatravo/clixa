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

/** Une ligne d'une répartition, telle que le tableau de bord la rend. */
export interface LigneRepartition<V extends string = string> {
  valeur: V;
  libelle: string;
  nombre: number;
  /** Largeur de la barre, en pourcentage **de la valeur la plus fournie**. */
  barre: number;
}

export type LigneDomaine = LigneRepartition<Domaine>;

export interface Repartition<V extends string = string> {
  lignes: LigneRepartition<V>[];
  /** Combien de dossiers ont répondu. */
  declares: number;
  /** Combien de dossiers ont été regardés. */
  total: number;
}

/**
 * Combien de dossiers par valeur d'une liste fermée — le domaine d'exercice,
 * et depuis le 26 septembre 2026 la provenance (`lib/provenance.ts`).
 *
 * ── ⚠️ Ce que cette fonction refuse de faire, et pourquoi ───────────────────
 * **Elle ne rend pas de part du total.** Un champ neuf n'est porté que par les
 * dossiers déposés depuis sa mise en ligne : le jour du domaine, 124 dossiers
 * vivants et **aucun** ne le portait. Trois réponses plus tard, « Finance
 * 67 % » serait arithmétiquement juste et complètement faux — il se lirait
 * « deux tiers de mes inscrits viennent de la finance » quand il veut dire
 * « deux des trois qui ont répondu ».
 *
 * C'est le défaut de « Places au total : 30 » sous une autre forme : un chiffre
 * juste au mauvais endroit se lit comme un chiffre faux, et celui-ci se lirait
 * sur l'écran depuis lequel on décide d'ouvrir une cohorte — ou de payer une
 * campagne.
 *
 * La barre est donc proportionnelle **à la valeur la plus fournie**, pas au
 * total : elle répond à « laquelle domine », jamais à « quelle proportion ». Et
 * `declares` / `total` accompagnent toujours le rendu, pour que personne ne
 * prenne la partie pour le tout.
 *
 * ⚠️ **Une valeur hors table est ignorée, pas rangée dans « Autre ».** Elle ne
 * peut venir que d'une écriture faite à la main en base ou d'une valeur retirée
 * de la liste ; la compter parmi « Autre » inventerait une réponse. Elle
 * disparaît donc du décompte — et l'écart entre `declares` et la somme des
 * lignes est ce qui la rendrait visible.
 */
export function repartitionSur<V extends string>(
  table: readonly { valeur: V; libelle: string }[],
  valeurs: readonly (string | null | undefined)[],
): Repartition<V> {
  const compte = new Map<V, number>();
  for (const v of valeurs) {
    const connue = v ? table.find((t) => t.valeur === String(v))?.valeur : undefined;
    if (connue) compte.set(connue, (compte.get(connue) ?? 0) + 1);
  }

  const maximum = Math.max(0, ...compte.values());

  const lignes = table
    .filter((t) => (compte.get(t.valeur) ?? 0) > 0)
    .map((t) => {
      const nombre = compte.get(t.valeur) ?? 0;
      return {
        valeur: t.valeur,
        libelle: t.libelle,
        nombre,
        barre: maximum > 0 ? Math.round((nombre / maximum) * 100) : 0,
      };
    })
    /*
      La plus fournie d'abord : c'est ce que l'écran sert à voir. À égalité,
      l'ordre de la liste tranche — `sort` est stable — sans quoi deux valeurs
      à deux dossiers changeraient de place d'une visite à l'autre, comme les
      trois cohortes rendues au hasard par un tri sur une égalité.
    */
    .sort((a, b) => b.nombre - a.nombre);

  return {
    lignes,
    declares: lignes.reduce((t, l) => t + l.nombre, 0),
    total: valeurs.length,
  };
}

/** Combien de dossiers par domaine — demandé par la direction le 20 septembre 2026. */
export function repartitionParDomaine(
  valeurs: readonly (string | null | undefined)[],
): Repartition<Domaine> {
  return repartitionSur(DOMAINES, valeurs);
}
