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
  /*
    ── ⚠️ Les hôtes que `next/image` a le droit d'optimiser ──────────────────
    Sans cette liste, `<Image src="https://…">` **lève** : « hostname is not
    configured under images ». Ce n'était encore arrivé à personne parce que
    les deux seuls usages d'images distantes — les logos de partenaires et,
    depuis le 13 septembre 2026, les affiches de séances filmées — portent sur
    des collections vides. Le premier logo déposé aurait cassé l'accueil.

    Deux hôtes, et pas un de plus :

      • le magasin de médias, d'où viennent les fichiers déposés dans /admin ;
      • les vignettes de YouTube, que `lib/video.ts` compose à partir d'un
        identifiant vérifié — jamais à partir d'une adresse saisie.

    Ouvrir la liste plus large ferait afficher, et surtout **servir depuis
    notre domaine**, n'importe quelle image d'ailleurs.
  */
  images: {
    remotePatterns: [
      /*
        ⚠️ **Un 400 sur ces images en développement n'est pas cette règle.**
        Next 16 refuse une image dont l'hôte résout vers une adresse qu'il tient
        pour privée, et le journal du serveur le dit en toutes lettres :
        « hostname resolved to private IP ["64:ff9b::…"] ». C'est le NAT64 du
        réseau local, pas le magasin — qui répond 200. La règle, elle, est
        bonne : le matcher de Next l'accepte, et la production ne passe pas par
        ce réseau. Vérifier `/_next/image` **en ligne** avant d'accuser cette
        liste. (Un premier jet de ce commentaire accusait `**` : c'était faux,
        les deux formes correspondent.)
      */
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  // Un <Link> vers une route inexistante casse le build au lieu de livrer un 404.
  typedRoutes: true,
  /*
    ⚠️ La feuille de style est écrite dans le HTML, et c'est ce qui fait le
    premier affichage sur 3G : elle arrivait dernière, après le JavaScript et les
    polices qui ne bloquent rien. Mesuré sur Next 16.3.5 (3G lente, 5 passes) :
    3,0 s → 1,36 s sur l'accueil et sur la fiche DAF, 131 règles appliquées.
    Sur 16.3.1 la même option servait une page sans une seule règle, sans erreur
    au build : vérifier `document.styleSheets` après toute montée de version.
  */
  experimental: { inlineCss: true },
  redirects: redirections,
  /*
    ── Deux en-têtes de durcissement, sur toutes les pages ────────────────────
    Trouvés par un audit des portes le 25 septembre 2026 : aucune protection
    anti-cadrage ni anti-sniff n'était servie.

    ⚠️ `X-Frame-Options: SAMEORIGIN` ferme le clickjacking. Sans lui, une page
    tierce plaçait `/inscription/[reference]` — la page où le contrat se signe —
    ou `/admin` dans une `<iframe>` invisible, et piégeait un clic sur « Signer »
    ou sur une action d'équipe. Il ne touche pas les vidéos YouTube/Vimeo/
    Instagram de `/temoignages` : là c'est **nous** qui encadrons les autres, ce
    que cet en-tête ne régit pas. Il ne concerne que le cadrage de *nos* pages
    par un tiers.

    ⚠️ `X-Content-Type-Options: nosniff` empêche le navigateur de deviner le
    type d'un fichier servi : un dépôt public interprété comme du HTML
    s'exécuterait avec l'origine du site. Les dépôts sont déjà bornés aux trois
    formats matriciels (le SVG est refusé), mais l'en-tête ferme la classe
    entière plutôt qu'un cas.

    Posés ici, et non dans `vercel.json` : le fichier de la plateforme ne
    s'applique pas en développement, et une garde qu'on ne peut pas éprouver
    localement se découvre absente en production — la leçon des redirections.
  */
  headers: async () => [
    {
      source: "/:chemin*",
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    },
  ],
};

export default withPayload(nextConfig);
