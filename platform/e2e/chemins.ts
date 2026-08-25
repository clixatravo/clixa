/**
 * Les pages du site public, en un seul endroit.
 *
 * Partagées entre la chauffe et les épreuves de mise en page : une page ajoutée
 * ici est compilée d'avance et vérifiée, sans qu'on ait à y penser deux fois.
 */
export const CHEMINS = [
  "/",
  "/formations",
  "/formations?q=audit",
  "/formations/directeur-audit-interne",
  "/inscription?formation=directeur-audit-interne",
  "/compte/connexion",
  "/compte/creer",
  "/contact",
  "/a-propos",
  "/entreprises",
  "/campus",
  "/blog",
  "/skillafrique",
  "/specialisations/finance-controle",
] as const;
