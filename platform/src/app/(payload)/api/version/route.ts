/**
 * Ce que la production sert vraiment.
 *
 * ── Pourquoi cette route existe ─────────────────────────────────────────────
 * Un déploiement qui échoue ne remplace pas celui qui sert. Le site reste
 * debout, répond 200 partout, et la recette elle-même passe — elle interroge
 * le dernier build valide. Rien ne signale que les poussées ne sortent plus.
 *
 * Le 27 août 2026, sept déploiements ont échoué d'affilée pour un schéma en
 * retard d'une colonne. Deux heures de travail sont restées à quai, et
 * l'indice n'est venu ni du site ni des épreuves mais d'un fichier de
 * `public/` qui répondait 404.
 *
 * Cette route dit quel commit est en ligne. La recette le compare à ce que
 * porte le dépôt : si les deux diffèrent, c'est que le dernier build n'est pas
 * sorti, et on le sait en une seconde plutôt qu'en deux heures.
 *
 * ⚠️ Le dépôt est public — le numéro de commit ne révèle rien qu'on ne puisse
 * déjà lire. Rien d'autre n'est exposé : ni variables, ni chemins, ni versions
 * de dépendances.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      // Posé par Vercel à la construction. Absent en développement, où la
      // question ne se pose pas.
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
      construit: process.env.VERCEL_DEPLOYMENT_ID ? true : false,
      environnement: process.env.NEXT_PUBLIC_SITE_ENV ?? "inconnu",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
