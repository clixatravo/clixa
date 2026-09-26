/**
 * Par où l'on nous a connus — demandé par la direction le 26 septembre 2026 :
 * « linkedin, facebook, instagram, email, entourage, autres — zidhom f pre
 * inscription bach n3arfo l clien mnine jay ».
 *
 * ── Pourquoi une liste fermée ────────────────────────────────────────────────
 * Pour la même raison que le domaine (`lib/profil.ts`) : c'est une question qui
 * se **compte**. « Combien de dossiers la campagne Facebook a-t-elle amenés ce
 * mois-ci ? » ne se répond pas sur du texte libre, où « fb », « Facebook » et
 * « une pub » sont trois réponses différentes. C'est ce chiffre qui décide où
 * va l'argent de la prochaine campagne.
 *
 * ⚠️ **Ce n'est pas la mesure du pixel, et les deux ne se remplacent pas.** Le
 * pixel Meta ne compte que ceux qui ont accepté les traceurs, et ne voit ni
 * LinkedIn, ni le courriel, ni le bouche-à-oreille. Ici c'est la personne qui
 * répond, pour tous les canaux — ce qu'elle *croit* se rappeler, avec les
 * approximations que cela suppose : quelqu'un qui a vu l'annonce Facebook puis
 * qu'un collègue a convaincu répondra l'un ou l'autre.
 *
 * ⚠️ **« Autre » n'ouvre pas de champ libre.** La direction a donné six choix ;
 * une case à préciser rendrait du texte qu'il faudrait relire à la main, et
 * c'est exactement ce que la liste existe pour éviter. Si « Autre » grossit, ce
 * sera le signe qu'il manque une entrée — Google, un salon, un partenaire —, et
 * c'est à la liste qu'on l'ajoutera.
 *
 * ⚠️ **Les valeurs stockées ne sont pas les intitulés** — `entourage` en base,
 * « Entourage » à l'écran. Et l'on ne retire pas d'un type énuméré une valeur
 * que des lignes utilisent : elles deviendraient invalides à la première
 * écriture du dossier (la leçon d'`appel` et d'`accueil`).
 */
import { LOGOS, type Logo } from "./logos";
import { repartitionSur, type Repartition } from "./profil";

export const PROVENANCES = [
  { valeur: "linkedin", libelle: "LinkedIn", couleur: "#0a66c2", logo: LOGOS.linkedin },
  { valeur: "facebook", libelle: "Facebook", couleur: "#1877f2", logo: LOGOS.facebook },
  { valeur: "instagram", libelle: "Instagram", couleur: "#e1306c", logo: LOGOS.instagram },
  /*
    « E-mail », comme le reste du formulaire (« E-mail » est déjà l'intitulé du
    champ d'adresse). L'or : c'est le canal qui part de chez nous — le message
    de présentation, l'annonce de démarrage.
  */
  { valeur: "email", libelle: "E-mail", couleur: "#c9a24c", logo: LOGOS.courriel },
  /*
    L'émeraude : une recommandation est la seule provenance qui dit qu'un
    participant a été content de nous. Aucune marque à imiter ici.
  */
  { valeur: "entourage", libelle: "Entourage", couleur: "#2fa37d", logo: LOGOS.entourage },
  { valeur: "autre", libelle: "Autre", couleur: "#a7a293", logo: LOGOS.autre },
] as const satisfies readonly {
  valeur: string;
  libelle: string;
  /** La couleur de la marque, en hexadécimal : elle sert aussi dans /admin. */
  couleur: string;
  logo: Logo;
}[];

export type Provenance = (typeof PROVENANCES)[number]["valeur"];

/** Ce que Payload attend pour un champ `select`. */
export const OPTIONS_PROVENANCE = PROVENANCES.map((p) => ({ label: p.libelle, value: p.valeur }));

/**
 * La provenance correspondante, ou `undefined`.
 *
 * ⚠️ **On ne devine pas.** Une valeur hors table vient d'un formulaire forgé ;
 * la ranger dans « Autre » inventerait une réponse, et c'est sur ces cases que
 * se décidera la prochaine campagne.
 */
export function provenanceValide(valeur: string): Provenance | undefined {
  return PROVENANCES.find((p) => p.valeur === valeur)?.valeur;
}

/** L'intitulé à afficher, ou le tiret de « rien n'a été demandé ». */
export function libelleProvenance(valeur?: string | null): string {
  if (!valeur) return "—";
  return PROVENANCES.find((p) => p.valeur === valeur)?.libelle ?? String(valeur);
}

/** La fiche complète d'une provenance — pour dessiner son logo. */
export function ficheProvenance(valeur: string) {
  return PROVENANCES.find((p) => p.valeur === valeur);
}

/**
 * Combien de dossiers par provenance. Même règle que le domaine : la barre est
 * relative à la provenance la plus fournie, jamais une part du total — les
 * dossiers d'avant le 26 septembre 2026 ne portent pas ce champ.
 */
export function repartitionParProvenance(
  valeurs: readonly (string | null | undefined)[],
): Repartition<Provenance> {
  return repartitionSur(PROVENANCES, valeurs);
}
