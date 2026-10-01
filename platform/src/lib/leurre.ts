/**
 * Le champ piège des formulaires publics : invisible pour un humain, rempli par
 * la plupart des robots. Un envoi qui le porte rempli est ignoré.
 *
 * ── ⚠️ Pourquoi il a changé de nom le 1er octobre 2026 ──────────────────────
 * Il s'appelait `site_web`. Une candidature de formateur envoyée en production
 * ce jour-là n'est jamais arrivée — ni en base, ni par courriel — et rien ne
 * disait pourquoi : la route avait répondu par une redirection, avant même de
 * toucher la base. Deux causes restaient possibles, sans moyen de trancher :
 * un refus de validation, ou ce piège rempli par le navigateur lui-même.
 * « site web » est exactement le genre de champ que le remplissage
 * automatique reconnaît, et une fiche de contact qui porte un site suffit à le
 * remplir — c'est-à-dire à faire passer une vraie personne pour un robot, en
 * lui affichant « merci » et en jetant son envoi.
 *
 * D'où un nom sans aucun sens pour un navigateur, les attributs que les
 * gestionnaires de mots de passe lisent pour s'abstenir, et surtout une ligne
 * de journal à chaque envoi ignoré. **Le premier défaut était le silence** :
 * un piège qui se déclenche sans laisser de trace ne se distingue pas d'une
 * panne.
 */
export const NOM_DU_LEURRE = "clx_hp_k7";

/**
 * Vrai si le piège est rempli — l'envoi doit alors être ignoré.
 *
 * ⚠️ La valeur n'est jamais écrite au journal : si c'est le navigateur qui l'a
 * remplie, elle vient de la fiche de contact de quelqu'un.
 */
export function leurreRempli(form: FormData, route: string): boolean {
  const valeur = (form.get(NOM_DU_LEURRE) ?? "").toString().trim();
  if (valeur === "") return false;
  console.warn(`[${route}] champ piège rempli (${valeur.length} caractères) : envoi ignoré`);
  return true;
}
