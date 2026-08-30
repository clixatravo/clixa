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

/**
 * Refuse une date postérieure à aujourd'hui.
 *
 * ── Ce que cela protège ─────────────────────────────────────────────────────
 * `coordonneesEnvoyeesLe` n'est pas une trace interne : le participant la voit
 * sur la page de son dossier, et c'est **la seule vérification qu'on puisse lui
 * offrir** contre un faux message réclamant un paiement. Un lien bancaire reçu
 * par courriel ressemble trait pour trait à un hameçonnage ; comparer deux
 * dates est tout ce qu'il a.
 *
 * ⚠️ Une date au lendemain casse cette garantie **dans le mauvais sens** : le
 * courriel part aujourd'hui, la page annonce demain, et notre propre message ne
 * correspond à rien. Le participant bien avisé — celui qui fait exactement ce
 * qu'on lui demande — conclut qu'on essaie de l'escroquer. C'est arrivé le
 * 30 août 2026 sur un dossier réel : un jour de trop au calendrier.
 *
 * Le bouton du bandeau pose toujours le jour même ; c'est la saisie à la main
 * qui glisse. On la borne plutôt que de compter sur l'attention.
 *
 * ⚠️ On compare des **jours**, pas des instants. Avec `pickerAppearance:
 * "dayOnly"`, Payload enregistre midi UTC : à neuf heures du matin, la date
 * d'aujourd'hui serait « dans le futur » pour une comparaison à la seconde, et
 * le bouton se refuserait lui-même.
 */
export const pasDansLeFutur: Validate = (valeur) => {
  if (!valeur) return true;
  const jour = new Date(valeur as string | number | Date);
  if (Number.isNaN(jour.getTime())) return true;

  const enJours = (d: Date) => d.toISOString().slice(0, 10);
  if (enJours(jour) > enJours(new Date())) {
    return "Cette date ne peut pas être dans le futur : le participant la voit sur son dossier, et c'est elle qui lui permet de reconnaître nos courriels.";
  }
  return true;
};
