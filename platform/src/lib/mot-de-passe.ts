import { APIError, type CollectionBeforeOperationHook } from "payload";

/**
 * La longueur minimale d'un mot de passe, pour les deux sortes de comptes.
 *
 * ⚠️ **Trouvé en audit le 1er octobre 2026.** Le formulaire de création de
 * compte exigeait huit caractères, mais c'était la seule porte qui le faisait.
 * Payload, lui, n'en demande que **trois** — et sa règle n'est pas réglable :
 * elle vit dans sa fonction de hachage. Un compte d'équipe créé dans /admin, un
 * mot de passe changé par l'API ou posé par le lien « mot de passe oublié »
 * acceptaient donc « abc ». Sur un compte d'équipe, cela ouvre le fichier
 * clients entier.
 */
export const MOT_DE_PASSE_MIN = 8;

/** Vrai si le mot de passe proposé est assez long. Rien n'est changé quand il n'y en a pas. */
export function motDePasseAcceptable(motDePasse: unknown): boolean {
  if (motDePasse === undefined || motDePasse === null || motDePasse === "") return true;
  return typeof motDePasse === "string" && motDePasse.length >= MOT_DE_PASSE_MIN;
}

/**
 * La règle, posée avant l'opération et non avant l'écriture.
 *
 * ⚠️ `beforeChange` ne suffirait pas : la réinitialisation par lien ne passe
 * pas par lui, elle hache et écrit directement. `beforeOperation` est appelé
 * pour la création, la mise à jour **et** `resetPassword`, avec le mot de passe
 * encore en clair dans `args.data`.
 */
export const exigerUnMotDePasseSolide: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (operation !== "create" && operation !== "update" && operation !== "resetPassword") {
    return args;
  }
  const donnees = (args as { data?: Record<string, unknown> }).data;
  if (donnees && !motDePasseAcceptable(donnees.password)) {
    throw new APIError(
      `Le mot de passe doit compter au moins ${MOT_DE_PASSE_MIN} caractères.`,
      400,
      undefined,
      true,
    );
  }
  return args;
};
