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
];

/**
 * Les gestionnaires de route, à faire compiler eux aussi.
 *
 * Une page visitée en amont ne compile pas la route qu'elle appelle : la
 * première épreuve qui envoyait un transfert attendait `/api/transfert`
 * pendant sa compilation, et échouait une fois sur quelques séries. Un GET
 * suffit — Next compile le module puis répond 405, sans exécuter le POST.
 */
export const ROUTES = ["/api/transfert", "/api/inscription", "/api/compte"] as const;
