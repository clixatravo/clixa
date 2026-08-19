import type { MetadataRoute } from "next";
import { SITE_URL, estProduction } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  /**
   * Garde-fou : tant que NEXT_PUBLIC_SITE_ENV ne vaut pas "production", le site
   * est intégralement interdit aux moteurs.
   *
   * Raison : les préversions servent à faire valider le design, mais elles
   * contiennent des données de démonstration — prix, dates de sessions, articles.
   * Une préversion indexée ferait apparaître des tarifs inventés dans Google,
   * associés aux coordonnées réelles de CLIXA.
   */
  if (!estProduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Les combinaisons de filtres sont utiles aux visiteurs mais créent des
      // pages quasi dupliquées : on laisse indexer le catalogue nu.
      disallow: ["/formations?", "/blog?"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
