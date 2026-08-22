import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";
import { fr } from "@payloadcms/translations/languages/fr";

import { Utilisateurs } from "@/collections/Utilisateurs";
import { Specialisations } from "@/collections/Specialisations";
import { Tarifs } from "@/collections/Tarifs";
import { Programmes } from "@/collections/Programmes";
import { Sessions } from "@/collections/Sessions";
import { Articles } from "@/collections/Articles";
import { Temoignages } from "@/collections/Temoignages";
import { Partenaires } from "@/collections/Partenaires";
import { Pages } from "@/collections/Pages";
import { Medias } from "@/collections/Medias";
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
export default buildConfig({
  admin: {
    user: Utilisateurs.slug,
    meta: {
      titleSuffix: "— CLIXA",
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
    // Accès
    Utilisateurs,
  ],

  /**
   * Le barème vaut pour tout le catalogue : un réglage, pas une donnée de
   * session. Seule la direction peut le modifier.
   */
  globals: [Tarifs],

  editor: lexicalEditor(),

  /**
   * Sans cette ligne, Payload accepte les images mais saute silencieusement le
   * redimensionnement et la conversion WebP : aucune erreur, aucune variante,
   * et des photos de plusieurs mégaoctets servies telles quelles.
   */
  sharp,

  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
  }),

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
});
