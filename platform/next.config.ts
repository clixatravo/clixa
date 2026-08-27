import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

/**
 * INT-06 — Redirections.
 *
 * Elles vivent ici plutôt que dans `vercel.json` : le fichier de la plateforme
 * ne s'applique pas en développement, et une redirection qu'on ne peut pas
 * éprouver localement se découvre cassée en production.
 *
 * Deux familles seulement, et chacune répond à un fait constaté — pas à une
 * liste d'adresses qu'on imagine. Une redirection inventée ne coûte rien mais
 * ne sert à personne, et la prochaine lecture ne saura plus laquelle protège
 * quoi.
 */
const redirections = async () => [
  /*
    ── L'héritage du site statique ──────────────────────────────────────────
    Le dépôt porte encore `index.html`, `mentions-legales.html` et
    `politique-confidentialite.html` à sa racine : ce sont les adresses que la
    vitrine publiait avant Next. Un lien ancien, un signet, un document qui
    circule encore — tout cela pointe vers un `.html` que le nouveau site ne
    sert plus.

    Permanentes (308) : ces pages ne reviendront pas sous cette forme.

    ⚠️ Les deux cibles légales répondent 404 aujourd'hui — les pages sont en
    brouillon, il leur manque seize mentions que seule la direction peut
    fournir. La redirection est écrite d'avance et commencera à servir le jour
    de leur publication ; l'inverse aurait voulu qu'on y repense ce jour-là.
  */
  { source: "/index.html", destination: "/", permanent: true },
  { source: "/mentions-legales.html", destination: "/mentions-legales", permanent: true },
  {
    source: "/politique-confidentialite.html",
    destination: "/confidentialite",
    permanent: true,
  },

  /*
    ── Ce que le visiteur tape quand l'intitulé n'est pas l'adresse ─────────
    Le menu affiche « Mon espace » et « Nous contacter » ; les pages vivent en
    `/compte` et `/contact`. Qui note une adresse de mémoire, ou la dicte au
    téléphone, écrit l'intitulé qu'il a vu. Les deux répondaient 404.

    Le reste de la navigation n'a pas cet écart — « Formations » mène bien à
    `/formations` — et n'a donc rien à rattraper.
  */
  { source: "/mon-espace", destination: "/compte", permanent: true },
  { source: "/nous-contacter", destination: "/contact", permanent: true },

  /*
    Le singulier, seule variante que l'on écrit vraiment à la place du pluriel.
    Temporaire (307) : ce n'est pas une ancienne adresse du site, seulement une
    façon de se tromper — rien ne justifie de l'inscrire durablement chez les
    moteurs.
  */
  { source: "/formation", destination: "/formations", permanent: false },
  { source: "/formation/:slug", destination: "/formations/:slug", permanent: false },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Un <Link> vers une route inexistante casse le build au lieu de livrer un 404.
  typedRoutes: true,
  redirects: redirections,
};

export default withPayload(nextConfig);
