/**
 * Couche d'accès à l'éditorial.
 *
 * INT-01 — Même bascule que le catalogue : la source est désormais Payload,
 * les signatures sont inchangées.
 */
import { cache } from "react";

import { categories, type Article, type Bloc, type CategorieArticle } from "@/data/blog";
import { payloadClient, versArticle } from "@/lib/payload";

/**
 * Les types du domaine éditorial sont ré-exportés ici pour que les pages et
 * composants n'aient jamais à importer src/data/ — la règle no-restricted-imports
 * fait respecter cette étanchéité.
 *
 * Les catégories restent en dur : ce sont des valeurs de code, reprises à
 * l'identique dans le champ « Catégorie » du CMS. Les rendre modifiables
 * demanderait une collection dédiée, sans bénéfice tant qu'elles ne bougent pas.
 */
export type { Article, Bloc, CategorieArticle };

const chargerArticles = cache(async (): Promise<Article[]> => {
  const payload = await payloadClient();
  const { docs } = await payload.find({
    collection: "articles",
    limit: 500,
    locale: "fr",
    depth: 1,
    sort: "-publieLe",
    overrideAccess: false,
  });
  return docs.map(versArticle);
});

export async function getArticles(): Promise<Article[]> {
  return chargerArticles();
}

export async function getArticle(slug: string): Promise<Article | undefined> {
  return (await chargerArticles()).find((a) => a.slug === slug);
}

export async function getArticlesParCategorie(cat: string): Promise<Article[]> {
  return (await chargerArticles()).filter((a) => a.categorie === cat);
}

export function getCategories() {
  return categories;
}

export function getCategorie(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function nomCategorie(slug: CategorieArticle): string {
  return categories.find((c) => c.slug === slug)?.nom ?? slug;
}

/** Articles proches : même catégorie d'abord, complétés par les plus récents. */
export async function getArticlesLies(slug: string, limite = 3): Promise<Article[]> {
  const tous = await chargerArticles();
  const courant = tous.find((a) => a.slug === slug);
  if (!courant) return [];

  const memeCategorie = tous.filter((a) => a.slug !== slug && a.categorie === courant.categorie);
  const autres = tous.filter((a) => a.slug !== slug && a.categorie !== courant.categorie);

  return [...memeCategorie, ...autres].slice(0, limite);
}

export function formatDateArticle(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}
