/**
 * Couche d'accès à l'éditorial — même couture que src/lib/catalogue.ts.
 * En INT-01, le corps de ces fonctions passe sur Payload sans toucher aux pages.
 */

import { articles, categories, type Article, type Bloc, type CategorieArticle } from "@/data/blog";

/**
 * Les types du domaine éditorial sont ré-exportés ici pour que les pages et
 * composants n'aient jamais à importer src/data/ — la règle no-restricted-imports
 * fait respecter cette étanchéité, qui est ce qui rendra la bascule Payload indolore.
 */
export type { Article, Bloc, CategorieArticle };

export function getArticles(): Article[] {
  return [...articles].sort((a, b) => b.publieLe.localeCompare(a.publieLe));
}

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getArticlesParCategorie(cat: string): Article[] {
  return getArticles().filter((a) => a.categorie === cat);
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
export function getArticlesLies(slug: string, limite = 3): Article[] {
  const courant = getArticle(slug);
  if (!courant) return [];

  const memeCategorie = getArticles().filter(
    (a) => a.slug !== slug && a.categorie === courant.categorie,
  );
  const autres = getArticles().filter((a) => a.slug !== slug && a.categorie !== courant.categorie);

  return [...memeCategorie, ...autres].slice(0, limite);
}

export function formatDateArticle(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}
