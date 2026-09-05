import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";
import { fr } from "@payloadcms/translations/languages/fr";

import { Utilisateurs } from "@/collections/Utilisateurs";
import { Specialisations } from "@/collections/Specialisations";
import { Tarifs } from "@/collections/Tarifs";
import { Disponibilites } from "@/collections/Disponibilites";
import { RendezVous } from "@/collections/RendezVous";
import { Inscriptions } from "@/collections/Inscriptions";
import { Apprenants } from "@/collections/Apprenants";
import { Programmes } from "@/collections/Programmes";
import { Sessions } from "@/collections/Sessions";
import { Articles } from "@/collections/Articles";
import { Temoignages } from "@/collections/Temoignages";
import { Partenaires } from "@/collections/Partenaires";
import { Pages } from "@/collections/Pages";
import { Medias } from "@/collections/Medias";
import { Recus } from "@/collections/Recus";
import { DemandesRappel } from "@/collections/DemandesRappel";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * BE-01 — Configuration Payload.
 *
 * Le CMS vit dans la même application que le site public : mêmes types, même
 * base, aucune synchronisation entre deux systèmes. C'est la condition posée
 * en phase 00 (décision n° 8) — le contenu reste dans notre PostgreSQL.
 *
 * Les collections du catalogue arrivent en BE-02.
 */
/*
  L'origine du site, celle qui a le droit de porter un cookie de session.

  ⚠️ Sans `csrf`, la garde de Payload s'efface au lieu de refuser.

  Son extraction de jeton dit, mot pour mot :
  « si la liste est vide OU si l'origine y figure, on accepte le cookie ».
  Liste vide veut donc dire : n'importe quelle origine. Une page hébergée
  ailleurs pouvait faire une requête créditée vers l'API et Payload honorait la
  session du visiteur. Le `SameSite: Lax` du cookie empêchait l'essentiel côté
  navigateur — mais une protection qui ne tient qu'au réglage par défaut d'une
  autre couche n'est pas une protection, c'est une chance. Même défaut que
  `/api/relances`, qui refusait le service seulement quand le secret était
  présent.

  `serverURL` sert aussi les liens que Payload compose lui-même — celui de
  « mot de passe oublié », notamment, qui pointait sur rien.
*/
const ORIGINE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default buildConfig({
  serverURL: ORIGINE,
  /*
    Les origines autorisées à présenter un cookie. La liste est explicite : y
    ajouter un aperçu de branche demande d'y penser, ce qui est le but.
  */
  csrf: [ORIGINE],
  /*
    Aucune origine tierce ne lit l'API depuis un navigateur. Le site est servi
    par le même domaine que Payload ; le jour où une application séparée devra
    l'interroger, c'est ici qu'on l'autorisera, nommément.
  */
  cors: [ORIGINE],
  admin: {
    user: Utilisateurs.slug,
    theme: "dark",
    meta: {
      titleSuffix: "— CLIXA",
    },
    /*
      Le back-office porte la marque de la maison plutôt que celle de l'outil :
      l'équipe s'y connecte tous les matins. Les deux thèmes de Payload restent
      offerts — on ne choisit pas à sa place entre clair et sombre pour une
      interface où l'on passe la journée à lire des formulaires.
    */
    components: {
      graphics: {
        Logo: "@/components/admin/Marque#Logo",
        Icon: "@/components/admin/Marque#Icone",
      },
      /*
        Le tableau de bord de Payload dit où aller, jamais s'il faut y aller.
        Ce bandeau le dit — et se tait quand il n'y a rien.
      */
      beforeDashboard: ["@/components/admin/Veille#Veille"],
    },
  },

  collections: [
    // Catalogue
    Specialisations,
    Programmes,
    Sessions,
    // Éditorial
    Articles,
    Temoignages,
    Partenaires,
    Pages,
    Medias,
    // Admissions
    DemandesRappel,
    RendezVous,
    Inscriptions,
    Apprenants,
    Recus,
    // Accès
    Utilisateurs,
  ],

  /**
   * Le barème vaut pour tout le catalogue : un réglage, pas une donnée de
   * session. Seule la direction peut le modifier.
   */
  globals: [Tarifs, Disponibilites],

  editor: lexicalEditor(),

  /**
   * Sans cette ligne, Payload accepte les images mais saute silencieusement le
   * redimensionnement et la conversion WebP : aucune erreur, aucune variante,
   * et des photos de plusieurs mégaoctets servies telles quelles.
   */
  sharp,

  db: postgresAdapter({
    /*
      ── Le schéma ne bouge que si on le demande, à voix haute ────────────────
      Payload alignait le schéma tout seul hors production : une modification
      faite en local partait sur la base partagée sans que personne la
      décide. Depuis que dev et production sont deux bases, c'est fermé.

      ⚠️ La conséquence est sévère et vaut d'être connue : un champ ajouté au
      modèle n'existe dans aucune base tant que personne ne l'y met, et le build
      de production échoue en cherchant la colonne — sans faire tomber le site,
      sans que la CI le voie.

      La variable remplace le va-et-vient qu'on faisait ici à la main
      (`push: true`, pousser, remettre `false`). Un interrupteur qu'on rouvre à
      chaque fois finit par rester ouvert ; celui-ci ne vaut que le temps d'une
      commande :

        PAYLOAD_PUSH=1 npx payload run scripts/pousser-schema.ts
    */
    push: process.env.PAYLOAD_PUSH === "1",
    /*
      ⚠️ Sans délais, une connexion morte fait attendre sans fin.

      Neon suspend le calcul après quelques minutes sans requête. La socket
      reste dans la réserve, le serveur ne répond plus, et le pilote attend —
      indéfiniment, faute de limite. Observé en local : une page a mis onze
      minutes et quarante-huit secondes à ne pas se charger. En production, la
      durée maximale d'une fonction masque le problème sans le régler.

      `idleTimeoutMillis` ferme la socket avant que Neon ne la coupe ;
      `connectionTimeoutMillis` renonce plutôt que d'attendre une connexion qui
      ne viendra pas.

      ⚠️ Pas de `statement_timeout` : Payload interroge le schéma au démarrage,
      ce qui prend près d'une minute contre Neon. Une limite par requête
      tuerait chaque script au lancement.
    */
    pool: {
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    },
  }),

  /**
   * L'envoi de courriels, quand il est configuré.
   *
   * Sans clé, l'adaptateur n'est pas branché : Payload écrit alors les messages
   * dans la console. C'est délibéré — le tunnel d'inscription doit tourner en
   * développement sans qu'aucun message ne parte pour de vrai, et une clé
   * absente en production ne doit pas empêcher le site de démarrer.
   *
   * L'expéditeur doit appartenir à un domaine vérifié chez Resend.
   */
  ...(process.env.RESEND_API_KEY
    ? {
        email: resendAdapter({
          defaultFromAddress: process.env.EMAIL_EXPEDITEUR ?? "onboarding@resend.dev",
          defaultFromName: "CLIXA Institute",
          apiKey: process.env.RESEND_API_KEY,
        }),
      }
    : {}),

  secret: process.env.PAYLOAD_SECRET ?? "",

  // Payload génère les types du contenu ici ; ils seront consommés par src/lib/
  // au moment de la bascule (INT-01).
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },

  /**
   * Le back-office parle français.
   *
   * Sans ce réglage, l'interface s'affichait en anglais et Payload enregistrait
   * le contenu dans la locale « en » : une fiche saisie de bonne foi restait
   * invisible côté site, qui lit le français. C'est arrivé dès le premier essai.
   */
  i18n: {
    fallbackLanguage: "fr",
    // Français uniquement : tant que l'anglais restait proposé, le navigateur
    // de l'éditeur suffisait à basculer l'interface — et le contenu partait
    // dans la mauvaise locale sans que personne ne s'en aperçoive.
    supportedLanguages: { fr },
  },

  localization: {
    // Libellés explicites : « fr » / « en » dans le sélecteur ne dit pas assez
    // clairement dans quelle langue on est en train d'écrire.
    locales: [
      { label: "Français", code: "fr" },
      { label: "English", code: "en" },
    ],
    defaultLocale: "fr",
    fallback: true,
  },

  /*
    ── Les dépôts vont au magasin, jamais sur le disque ─────────────────────
    `Medias` écrivait dans `staticDir`, c'est-à-dire **dans le paquet déployé**
    — en lecture seule à l'exécution sur Vercel. Un fichier déposé depuis
    /admin disparaissait donc sans la moindre erreur : la fiche était créée, la
    vignette cassée, et rien ne le disait. La collection n'a jamais reçu un
    seul fichier en production, et personne ne s'en était aperçu faute d'avoir
    essayé. Vercel le répétait pourtant à chaque démarrage, dans un
    avertissement que rien ne lisait.

    ⚠️ Accès **public**, et c'est correct ici : ce sont les images du site —
    illustrations de parcours, logos de partenaires, visuels d'articles. Elles
    sont faites pour être servies à des visiteurs.

    C'est justement ce que `lib/recus.ts` ne pouvait pas faire : un justificatif
    de versement porte un nom, un montant, parfois un numéro de compte. Ce
    greffon ne sait écrire qu'en public — son propre type le dit — d'où le SDK
    `@vercel/blob` appelé à la main de ce côté-là, avec `access: "private"`.

    ⚠️ **Il faut un second magasin, et la variable porte un autre nom.**
    `BLOB_READ_WRITE_TOKEN` désigne le magasin **privé** créé pour les
    justificatifs de versement, et ce greffon s'y casse le nez sans détour :
    « Cannot use public access on a private store ». Les deux besoins sont
    opposés — des images faites pour être vues, des reçus faits pour ne pas
    l'être — et un magasin ne porte qu'un seul régime.

    Tant que `BLOB_MEDIAS_TOKEN` n'existe pas, le greffon n'est pas branché et
    rien ne change : le dépôt retombe sur le disque. C'est juste en
    développement, où le disque s'écrit ; **c'est faux en production**, où le
    fichier disparaît sans erreur. `verifier-medias.ts` le dit en toutes
    lettres au lieu de laisser croire que tout va bien.
  */
  plugins: process.env.BLOB_MEDIAS_TOKEN
    ? [
        vercelBlobStorage({
          /*
            ⚠️ `disablePayloadAccessControl` sert le fichier depuis le magasin,
            et non par une route de Payload. Sans lui, chaque image du site
            passait par une fonction serverless : plus lent qu'un CDN, facturé
            à l'exécution, et pour rien — ce sont des visuels publics, dont la
            protection ne veut rien dire.

            Ce réglage n'aurait aucun sens sur les justificatifs, eux privés :
            c'est précisément ce contrôle qui les protège, et `lib/recus.ts` ne
            passe pas par ce greffon.
          */
          collections: { medias: { disablePayloadAccessControl: true } },
          token: process.env.BLOB_MEDIAS_TOKEN,
        }),
      ]
    : [],
});
