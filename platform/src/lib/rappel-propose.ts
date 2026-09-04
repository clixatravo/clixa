/**
 * Si l'on a déjà proposé le rappel à ce visiteur, et ce qu'il en a fait.
 *
 * ⚠️ `localStorage`, comme le consentement : rien n'est envoyé au serveur, et
 * une proposition déjà faite ne doit pas revenir à chaque page.
 *
 * ⚠️ Une clef versionnée, pour la même raison qu'ailleurs : le jour où la
 * proposition changera de nature, un refus ancien ne vaudra plus pour la
 * nouvelle.
 */
export const CLEF_RAPPEL = "clixa.rappel.v1";

/** Combien de temps un refus tient avant qu'on repropose. */
const JOURS_AVANT_DE_REPROPOSER = 30;

type Etat = { reponse: "envoye" | "ferme"; le: number };

function lireEtat(): Etat | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const brut = window.localStorage.getItem(CLEF_RAPPEL);
    if (!brut) return undefined;
    const e = JSON.parse(brut) as Etat;
    return e.reponse === "envoye" || e.reponse === "ferme" ? e : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Vrai si l'on peut encore proposer.
 *
 * ⚠️ Un envoi vaut pour toujours : redemander ses coordonnées à quelqu'un qui
 * vient de les laisser donne l'impression que sa demande s'est perdue. Un
 * refus, lui, se périme — un mois plus tard, la personne revient pour une
 * autre raison, et la question n'est plus la même.
 */
export function peutProposer(): boolean {
  const e = lireEtat();
  if (!e) return true;
  if (e.reponse === "envoye") return false;
  return Date.now() - e.le > JOURS_AVANT_DE_REPROPOSER * 86_400_000;
}

export function retenirReponse(reponse: "envoye" | "ferme"): void {
  try {
    window.localStorage.setItem(CLEF_RAPPEL, JSON.stringify({ reponse, le: Date.now() }));
  } catch {
    // Stockage refusé : la proposition reviendra à la prochaine visite, tant pis.
  }
}

/**
 * Les pages où l'on ne propose rien.
 *
 * ⚠️ Proposer « laissez-nous vos coordonnées » à quelqu'un qui remplit déjà le
 * formulaire d'inscription est au mieux inutile, au pire un obstacle posé
 * devant la conversion qu'on cherche. Même chose sur son dossier, sur son
 * espace, et sur la page de contact — qui *est* le formulaire.
 */
const PAGES_SANS_PROPOSITION = [
  "/inscription",
  "/contact",
  "/compte",
  "/mentions-legales",
  "/confidentialite",
];

export function pageAcceptelaProposition(chemin: string): boolean {
  return !PAGES_SANS_PROPOSITION.some((p) => chemin === p || chemin.startsWith(`${p}/`));
}
