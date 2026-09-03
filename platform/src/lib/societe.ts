/**
 * L'identité légale de la société — une seule fois, comme `reseaux.ts` pour
 * les coordonnées publiques.
 *
 * Vient de la facture officielle, pas d'une déduction. Elle vivait jusqu'ici
 * à l'intérieur de `contrat/route.tsx`, où elle a servi de source pour les
 * mentions légales du contrat. Le certificat a besoin du même nom de gérant
 * pour sa signature « Directeur Général » : le sortir ici évite d'en retaper
 * une seconde copie, qui aurait fini par diverger de la première — c'est
 * exactement ce qui est arrivé au numéro d'admissions et aux moyens de
 * paiement affichés sur la fiche, avant qu'on les ramène chacun à une source.
 */
export const SOCIETE = {
  nom: "CLIXA SARLAU",
  forme: "société de droit marocain",
  siege: "N° 1525, Bureau n° 5, Hay Essalam, Agadir, Maroc",
  rc: "67759",
  ice: "003917718000017",
  if: "71921918",
  gerant: "Mounir MOUKHTARI",
} as const;
