/**
 * Ce que le visiteur a répondu au sujet de la mesure d'audience.
 *
 * ── Une seule source, lue de deux endroits ──────────────────────────────────
 * Le bandeau écrit la réponse ; `Analytics` la lit avant de charger quoi que
 * ce soit. Deux copies de cette règle finiraient par diverger — et le jour où
 * elles divergent, c'est un traceur qui part sans accord.
 *
 * ⚠️ `localStorage`, pas un cookie. Poser un cookie pour retenir un refus de
 * cookies est le genre de contradiction qu'on remarque. `localStorage` n'est
 * pas envoyé au serveur et ne sert qu'ici.
 *
 * ⚠️ Et une clef versionnée. Le jour où l'on mesurera autre chose que des
 * pages vues, l'accord donné aujourd'hui ne portera plus sur la même chose :
 * changer le numéro repose la question à tout le monde, plutôt que de faire
 * passer un consentement ancien pour un consentement neuf.
 */
export const CLEF_CONSENTEMENT = "clixa.mesure.v1";

export type Consentement = "accepte" | "refuse";

/**
 * Lit la réponse, ou `undefined` si la question n'a pas encore été posée.
 *
 * ⚠️ `localStorage` lève dans une fenêtre privée, ou quand le navigateur
 * refuse le stockage. On rend alors `undefined` : le bandeau se represente, ce
 * qui est gênant mais juste — mieux vaut redemander que mesurer sans accord.
 */
export function lireConsentement(): Consentement | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const v = window.localStorage.getItem(CLEF_CONSENTEMENT);
    return v === "accepte" || v === "refuse" ? v : undefined;
  } catch {
    return undefined;
  }
}

/** Enregistre la réponse et prévient la page — `Analytics` écoute. */
export function ecrireConsentement(valeur: Consentement): void {
  try {
    window.localStorage.setItem(CLEF_CONSENTEMENT, valeur);
  } catch {
    /*
      Stockage refusé : on continue quand même à prévenir la page. La mesure
      démarrera pour cette visite, et la question sera reposée à la suivante —
      c'est le comportement le moins surprenant des deux.
    */
  }
  window.dispatchEvent(new CustomEvent(EVENEMENT_CONSENTEMENT, { detail: valeur }));
}

/** Le nom de l'événement, pour que le bandeau et la mesure se parlent. */
export const EVENEMENT_CONSENTEMENT = "clixa:consentement";

/**
 * De quoi lire cette valeur avec `useSyncExternalStore`.
 *
 * ⚠️ C'est le primitif prévu pour ça : une valeur que seul le navigateur
 * connaît, avec un instantané serveur explicite. `useState` rempli dans un
 * effet ferait la même chose en apparence, mais rendrait deux fois et
 * déclenche `react-hooks/set-state-in-effect`.
 *
 * ⚠️ L'instantané doit rester stable d'un appel à l'autre. Une chaîne ou
 * `undefined` le sont ; un objet reconstruit à chaque lecture ferait boucler
 * React sans fin.
 */
export function souscrireConsentement(prevenir: () => void): () => void {
  window.addEventListener(EVENEMENT_CONSENTEMENT, prevenir);
  // Un autre onglet a pu répondre : `storage` ne se déclenche que chez les voisins.
  window.addEventListener("storage", prevenir);
  return () => {
    window.removeEventListener(EVENEMENT_CONSENTEMENT, prevenir);
    window.removeEventListener("storage", prevenir);
  };
}

/** L'instantané côté serveur : personne n'a encore répondu, on ne sait rien. */
export function consentementAuServeur(): undefined {
  return undefined;
}
