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

/**
 * La devise de la marque — celle qui explique le nom.
 *
 * ⚠️ **Le X majuscule n'est pas une coquette.** CLIXA se lit dans cette
 * phrase : **C**enter of **L**eadership, **I**nnovation & e**X**cellence in
 * **A**frica. Écrite « Excellence », elle cesse d'expliquer quoi que ce soit —
 * il reste une devise en anglais sous un nom qu'elle ne justifie plus.
 *
 * Le site l'écrivait ainsi à trois endroits — le pied de page, le chapeau de
 * la page « À propos » et sa description pour les moteurs — quand le
 * certificat de la direction porte bien le X. Trois copies d'une même phrase,
 * et c'est la copie qui avait raison qui était minoritaire.
 *
 * ⚠️ Le certificat garde sa propre formulation, « **Centre** de Leadership »,
 * et ne lit donc pas cette constante. Il reproduit un document que la
 * direction délivre à la main : en aligner la langue serait retoucher son
 * document, pas corriger le site. L'écart Center / Centre lui revient.
 */
export const DEVISE = "Center of Leadership, Innovation & eXcellence in Africa";
