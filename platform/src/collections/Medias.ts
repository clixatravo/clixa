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
  upload: {
    staticDir: path.resolve(dirname, "../../public/medias"),
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
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
