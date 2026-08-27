import { APIError } from "payload";
import path from "path";
import { fileURLToPath } from "url";
import type { CollectionConfig } from "payload";
import { connecte, lectureLibre } from "@/access/roles";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * BE-08 — Médias.
 *
 * ── Le texte alternatif est obligatoire ─────────────────────────────────────
 * Sans lui, une image est muette pour un lecteur d'écran et invisible pour un
 * moteur. Le rendre facultatif revient à ne jamais l'avoir : on le bloque à
 * l'enregistrement plutôt que de le rappeler dans une consigne que personne ne
 * lit.
 *
 * ── Trois tailles, générées à l'envoi ───────────────────────────────────────
 * Une photo sortie d'un téléphone pèse 4 à 8 Mo. Servie telle quelle sur une
 * connexion 3G, elle ruine à elle seule l'objectif d'affichage sous 2,5 s.
 * Payload produit donc trois variantes en WebP, et le site sert la plus petite
 * qui convienne.
 *
 * ── Stockage ────────────────────────────────────────────────────────────────
 * Sur disque en développement. En production, la bascule vers Cloudflare R2
 * (prévue dans la stack) se fait en ajoutant un adaptateur : les collections et
 * les composants ne changent pas.
 */
const PLAFOND = 5 * 1024 * 1024;

export const Medias: CollectionConfig = {
  slug: "medias",
  labels: { singular: "Média", plural: "Médias" },
  admin: {
    useAsTitle: "alt",
    defaultColumns: ["filename", "alt", "updatedAt"],
    group: "Éditorial",
    description: "Images du site. Le texte alternatif est obligatoire.",
  },
  access: {
    read: lectureLibre,
    // Tout le monde peut verser une image ; personne ne peut le faire sans être
    // connecté — sinon l'endpoint d'upload serait ouvert à tous.
    create: connecte,
    update: connecte,
    delete: connecte,
  },
  hooks: {
    /*
      Cinq mégaoctets, vérifiés à l'entrée.

      Vercel refuse déjà les corps de requête au-delà de 4,5 Mo, ce qui borne
      la question en production ; mais ce plafond-là n'existe pas en
      développement, et une limite qui dépend de l'hébergeur n'est pas une
      limite du logiciel. Au-delà, c'est une photo brute qu'on n'a pas préparée
      — et le redimensionnement occupe la fonction le temps de la lire.
    */
    beforeValidate: [
      ({ req }) => {
        const fichier = req.file;
        if (fichier && fichier.size > PLAFOND) {
          throw new APIError(
            `Ce fichier pèse ${Math.round(fichier.size / 1024 / 1024)} Mo. Le maximum est de ${PLAFOND / 1024 / 1024} Mo.`,
            413,
          );
        }
      },
    ],
  },
  upload: {
    staticDir: path.resolve(dirname, "../../public/medias"),
    /*
      ⚠️ Pas de SVG.

      Un SVG est un document XML : il accepte `<script>` et des gestionnaires
      d'événements. Servi depuis `/medias/`, donc depuis notre propre origine,
      il s'exécuterait avec les droits du site pour qui l'ouvre — l'équipe, la
      plupart du temps, puisque c'est elle qui verse les fichiers. Les trois
      formats matriciels couvrent tout ce que le contenu demande ; l'enseigne,
      elle, vit dans `public/` et ne passe pas par ici.
    */
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],

    formatOptions: {
      format: "webp",
      options: { quality: 82 },
    },
    imageSizes: [
      { name: "vignette", width: 400, height: undefined, position: "centre" },
      { name: "carte", width: 800, height: undefined, position: "centre" },
      { name: "large", width: 1600, height: undefined, position: "centre" },
    ],
    adminThumbnail: "vignette",
  },
  fields: [
    {
      name: "alt",
      type: "text",
      label: "Texte alternatif",
      required: true,
      localized: true,
      admin: {
        description:
          "Ce que dirait quelqu'un qui décrit l'image à une personne qui ne la voit pas. « Logo EC-Council », pas « image1 ».",
      },
    },
    {
      name: "credit",
      type: "text",
      label: "Crédit ou source",
      admin: {
        description: "À renseigner pour toute image dont CLIXA n'est pas l'auteur.",
      },
    },
  ],
};
