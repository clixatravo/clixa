/**
 * INT-03 / INT-04 — Métadonnées et données structurées.
 *
 * L'écart décisif avec le concurrent analysé se joue ici : chez IPM, l'essentiel
 * du contenu des programmes est enfermé dans des images, donc illisible pour un
 * moteur. Ici chaque programme expose un objet Course complet, avec ses sessions,
 * ses dates et ses prix — ce qui rend éligible aux résultats enrichis.
 */

import type { Programme, Session } from "@/lib/types";
import type { Article } from "@/lib/blog";
import { lieuSession } from "@/lib/catalogue";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://clixa-institute.org").replace(
  /\/$/,
  "",
);

export const SITE_NOM = "CLIXA Institute";

/**
 * Vrai uniquement quand NEXT_PUBLIC_SITE_ENV vaut explicitement "production".
 * Toute préversion est donc désindexée par défaut — voir src/app/robots.ts.
 */
export const estProduction = process.env.NEXT_PUBLIC_SITE_ENV === "production";

/** Reprend les informations déjà publiées dans index.html — pas d'invention. */
export const organisation = {
  "@type": "EducationalOrganization",
  "@id": `${SITE_URL}/#organisation`,
  name: SITE_NOM,
  alternateName: "SkillAfrique",
  url: SITE_URL,
  /*
    Google lit `logo` pour illustrer le site dans ses résultats et son panneau
    de connaissance. Sans lui, il n'a rien à montrer — d'où le globe gris.

    L'enseigne est rendue en image plutôt qu'en texte comme sur le site : un
    moteur ne compose pas une police, il affiche un fichier. Il vit dans
    `public/` pour garder une adresse stable ; une image générée à la volée
    changerait d'URL à chaque construction, et Google la reprendrait à zéro.
  */
  logo: `${SITE_URL}/logo-clixa.png`,
  email: "contact@clixa-institute.org",
  telephone: "+212669303467",
  address: {
    "@type": "PostalAddress",
    streetAddress: "N° 1525, Bureau n° 5, Hay Essalam",
    addressLocality: "Agadir",
    addressCountry: "MA",
  },
} as const;

export function jsonLdOrganisation() {
  return { "@context": "https://schema.org", ...organisation };
}

/** ISO 8601 : 40 heures → « PT40H ». Attendu par Google pour courseWorkload. */
function dureeISO(heures: number): string {
  return `PT${heures}H`;
}

function modeSchema(s: Session): string {
  return s.mode === "presentiel" ? "Onsite" : "Online";
}

export function jsonLdCourse(programme: Programme, sessions: Session[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: programme.titre,
    description: programme.accroche,
    url: `${SITE_URL}/formations/${programme.slug}`,
    inLanguage: "fr",
    provider: { "@id": `${SITE_URL}/#organisation` },
    ...(programme.certification && {
      educationalCredentialAwarded: programme.certification,
    }),
    teaches: programme.competences,
    coursePrerequisites: programme.prerequis,
    hasCourseInstance: sessions.map((s) => ({
      "@type": "CourseInstance",
      courseMode: modeSchema(s),
      courseWorkload: dureeISO(programme.dureeHeures),
      startDate: s.debut,
      endDate: s.fin,
      inLanguage: "fr",
      ...(s.mode === "presentiel" && s.ville
        ? {
            location: {
              "@type": "Place",
              name: lieuSession(s),
              address: {
                "@type": "PostalAddress",
                addressLocality: s.ville,
                addressCountry: s.pays,
              },
            },
          }
        : { location: { "@type": "VirtualLocation", name: "Classe virtuelle" } }),
      offers: {
        "@type": "Offer",
        price: (s.prixCentimes / 100).toFixed(2),
        priceCurrency: s.devise,
        availability:
          s.capacite - s.placesReservees > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/SoldOut",
        url: `${SITE_URL}/formations/${programme.slug}`,
      },
    })),
  };
}

export function jsonLdArticle(article: Article) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.titre,
    description: article.chapo,
    url: `${SITE_URL}/blog/${article.slug}`,
    datePublished: article.publieLe,
    dateModified: article.publieLe,
    inLanguage: "fr",
    author: { "@type": "Organization", name: article.auteur },
    publisher: { "@id": `${SITE_URL}/#organisation` },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${article.slug}` },
  };
}

export function jsonLdFilAriane(items: { href?: string; label: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.label,
      ...(m.href && { item: `${SITE_URL}${m.href}` }),
    })),
  };
}
