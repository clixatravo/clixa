import type { Validate } from "payload";

/**
 * BE-06 — Obligation limitée à la langue de référence.
 *
 * ── Le problème ─────────────────────────────────────────────────────────────
 * `required: true` sur un champ traduisible s'applique à *chaque* langue. Pour
 * ajouter un titre anglais à un programme, il fallait donc renseigner d'un seul
 * coup l'accroche, les objectifs, le rythme, les pré-requis, chaque compétence,
 * chaque titre de module et chaque titre de leçon — en anglais. Impossible de
 * traduire progressivement, ni d'enregistrer un travail en cours.
 *
 * ── La règle retenue ────────────────────────────────────────────────────────
 * Le français est la langue de référence : il reste obligatoire et complet.
 * Les autres langues sont facultatives, champ par champ. Le repli configuré
 * dans payload.config.ts (`fallback: true`) affiche le français partout où la
 * traduction manque — une fiche n'est donc jamais vide, seulement bilingue à
 * des degrés divers.
 *
 * Ces validations remplacent `required: true` sur les champs traduisibles :
 * laisser les deux ferait resurgir le blocage.
 */
const LANGUE_DE_REFERENCE = "fr";

function estLangueDeReference(locale: string | undefined): boolean {
  // Hors requête localisée (imports, seed), on applique la règle stricte.
  return locale === undefined || locale === LANGUE_DE_REFERENCE;
}

/** Obligatoire en français, facultatif dans les autres langues. */
export const requisEnFrancais: Validate = (valeur, { req }) => {
  if (!estLangueDeReference(req?.locale)) return true;
  if (typeof valeur === "string" && valeur.trim() !== "") return true;
  if (valeur !== undefined && valeur !== null && typeof valeur !== "string") return true;
  return "Ce champ est obligatoire en français.";
};

/**
 * Au moins un élément en français, aucune contrainte dans les autres langues.
 * Remplace `minRows`, qui s'applique lui aussi à chaque langue.
 */
export const auMoinsUnEnFrancais: Validate = (valeur, { req }) => {
  if (!estLangueDeReference(req?.locale)) return true;
  return Array.isArray(valeur) && valeur.length > 0
    ? true
    : "Ajoutez au moins un élément en français.";
};
