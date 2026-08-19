import type { MetadataRoute } from "next";
import { getProgrammes, getSpecialisations, getSessions } from "@/lib/catalogue";
import { getArticles } from "@/lib/blog";
import { SITE_URL } from "@/lib/seo";

/**
 * INT-05 — Plan de site.
 *
 * Généré depuis les données, pas maintenu à la main : une formation ajoutée dans
 * le CMS apparaît ici sans intervention. La date de dernière modification d'un
 * programme suit sa session la plus récemment ouverte.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const maintenant = new Date();

  const statiques: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: maintenant, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/formations`,
      lastModified: maintenant,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    { url: `${SITE_URL}/blog`, lastModified: maintenant, changeFrequency: "weekly", priority: 0.7 },
    {
      url: `${SITE_URL}/a-propos`,
      lastModified: maintenant,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/entreprises`,
      lastModified: maintenant,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/campus`,
      lastModified: maintenant,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: maintenant,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  const programmes: MetadataRoute.Sitemap = getProgrammes().map((p) => {
    const sessions = getSessions(p.slug);
    const derniere = sessions.at(-1)?.debut;
    return {
      url: `${SITE_URL}/formations/${p.slug}`,
      lastModified: derniere ? new Date(derniere) : maintenant,
      changeFrequency: "weekly",
      priority: 0.8,
    };
  });

  const specialisations: MetadataRoute.Sitemap = getSpecialisations().map((s) => ({
    url: `${SITE_URL}/specialisations/${s.slug}`,
    lastModified: maintenant,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const articles: MetadataRoute.Sitemap = getArticles().map((a) => ({
    url: `${SITE_URL}/blog/${a.slug}`,
    lastModified: new Date(a.publieLe),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...statiques, ...programmes, ...specialisations, ...articles];
}
