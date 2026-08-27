/**
 * Coordonnées officielles et liens vers les réseaux sociaux.
 *
 * ⚠️ Ces adresses ont été vérifiées le 27 août 2026 en les ouvrant. Les deux
 * premières versions avaient été devinées à partir du nom de la marque —
 * `clixa-institute` et `clixa.institute` — et répondaient l'une 404, l'autre
 * 400. Un lien mort en pied de page est plus coûteux qu'un lien absent : le
 * visiteur qui le suit conclut que la structure n'existe plus.
 *
 * Ne pas déduire une adresse : l'ouvrir.
 *
 * Facebook et Instagram portent le nom SkillAfrique : c'est la même maison,
 * CLIXA en est issue. Les intitulés ne distinguent donc pas les deux — décision
 * de la direction, le 27 août 2026. Ne pas les « corriger » en croyant repérer
 * une incohérence de marque.
 */

export const RESEAUX_CLIXA = {
  whatsapp: {
    url: "https://wa.me/212669303467",
    numeroAffiche: "+212 6 69 30 34 67",
    label: "WhatsApp Admissions",
    description: "Échange direct avec un conseiller pédagogique",
  },
  linkedin: {
    url: "https://www.linkedin.com/company/clixainstitute/",
    label: "LinkedIn",
    titre: "Page LinkedIn de CLIXA Institute",
    description: "Actualités institutionnelles & réseau des alumni",
  },
  facebook: {
    /*
      L'adresse canonique, pas le lien de partage.

      La direction avait transmis `facebook.com/share/19JzLkmHWq/`. Un lien de
      partage porte un jeton de suivi propre au partage et redirige vers la
      page : le publier reviendrait à faire passer chaque visiteur par une
      indirection qui peut cesser de fonctionner. Résolu une fois, ici.
    */
    url: "https://www.facebook.com/formationskillafrique",
    label: "Facebook",
    titre: "Page Facebook",
    description: "Communauté & événements en direct",
  },
  instagram: {
    url: "https://www.instagram.com/skillafrique",
    label: "Instagram",
    titre: "Compte Instagram",
    description: "Coulisses des sessions et portraits de participants",
  },
  email: {
    url: "mailto:contact@clixa.africa",
    adresse: "contact@clixa.africa",
    label: "Courriel officiel",
  },
} as const;
