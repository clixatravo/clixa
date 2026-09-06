/**
 * Si l'on a déjà fait la proposition à ce visiteur, et ce qu'il en a fait.
 *
 * ⚠️ `localStorage`, comme le consentement : rien n'est envoyé au serveur, et
 * une proposition déjà faite ne doit pas revenir à chaque page.
 *
 * ⚠️ Une clef versionnée, pour la même raison qu'ailleurs : le jour où la
 * proposition changera de nature, un refus ancien ne vaudra plus pour la
 * nouvelle.
 */
/*
  ⚠️ **La version a changé le 6 septembre 2026, et c'est la raison d'être du
  numéro.** La fenêtre ne demande plus un numéro de téléphone, elle mène à la
  pré-inscription : ce n'est plus la même question. Un refus donné à l'ancienne
  ne vaut pas pour la nouvelle, et le garder ferait taire la fenêtre pendant
  trente jours devant des gens qui n'ont jamais vu ce qu'on leur propose
  aujourd'hui.
*/
export const CLEF_PROPOSITION = "clixa.proposition.v2";

/** Combien de temps un refus tient avant qu'on repropose. */
const JOURS_AVANT_DE_REPROPOSER = 30;

type Etat = { reponse: "envoye" | "ferme"; le: number };

function lireEtat(): Etat | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const brut = window.localStorage.getItem(CLEF_PROPOSITION);
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
 * ⚠️ Un « oui » vaut pour toujours : reproposer de retenir sa place à
 * quelqu'un qui vient de le faire donne l'impression que son geste s'est
 * perdu. Un refus, lui, se périme — un mois plus tard, la personne revient
 * pour une autre raison, et la question n'est plus la même.
 */
export function peutProposer(): boolean {
  const e = lireEtat();
  if (!e) return true;
  if (e.reponse === "envoye") return false;
  return Date.now() - e.le > JOURS_AVANT_DE_REPROPOSER * 86_400_000;
}

export function retenirReponse(reponse: "envoye" | "ferme"): void {
  try {
    window.localStorage.setItem(CLEF_PROPOSITION, JSON.stringify({ reponse, le: Date.now() }));
  } catch {
    // Stockage refusé : la proposition reviendra à la prochaine visite, tant pis.
  }
}

/**
 * Les pages où l'on ne propose rien.
 *
 * ⚠️ Proposer de se pré-inscrire à quelqu'un qui remplit déjà le formulaire
 * d'inscription est au mieux inutile, au pire un obstacle posé devant la
 * conversion qu'on cherche. Même chose sur son dossier, sur son espace, et sur
 * la page de contact — d'où l'on vient de choisir de parler plutôt que de
 * s'inscrire.
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
