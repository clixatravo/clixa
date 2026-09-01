/**
 * Les moyens de règlement acceptés — une seule liste, pour toute la maison.
 *
 * ── Le défaut que ce fichier existe pour empêcher ───────────────────────────
 * La fiche d'un parcours annonçait « Western Union · Ria · MoneyGram », et rien
 * d'autre. Le formulaire, lui, en proposait trois : carte bancaire, virement,
 * transfert. Un prospect qui voulait régler par carte lisait donc, sur la page
 * qui décide de son achat, que nous ne prenons que des services de transfert.
 *
 * Les deux listes vivaient à deux endroits : celle de la fiche dans le global
 * `tarifs`, celle du formulaire dans le code. Elles ont divergé le jour où la
 * direction a ouvert la carte et le virement (28 août 2026) — la seconde a
 * suivi, la première est restée telle quelle.
 *
 * ⚠️ **La liste vraie est celle du code, pas celle du CMS**, et ce n'est pas un
 * choix de commodité : chaque moyen commande ce que le participant reçoit par
 * courriel (`ATTENDU` dans `lib/courriel.ts`) et ce que le contrat écrit.
 * Ajouter une ligne dans /admin n'aurait rien fait fonctionner ; cela aurait
 * seulement promis un moyen que le reste du système ne sait pas honorer.
 */

export const MOYENS = [
  {
    valeur: "carte",
    /** Dans le formulaire, où l'on choisit. */
    libelle: "Carte bancaire",
    /** Sur la fiche, où l'on se rassure avant de cliquer. */
    court: "Carte bancaire",
  },
  {
    valeur: "virement",
    libelle: "Virement bancaire",
    court: "Virement bancaire",
  },
  {
    valeur: "transfert",
    libelle: "Western Union · Ria · MoneyGram",
    court: "Western Union · Ria · MoneyGram",
  },
] as const;

export type MoyenSouhaite = (typeof MOYENS)[number]["valeur"];

/** Ce qu'on montre sur une fiche, sous forme de liste cochée. */
export const MOYENS_AFFICHES = MOYENS.map((m) => m.court);
