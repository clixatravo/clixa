import path from "path";
import { fileURLToPath } from "url";
import { APIError, type CollectionConfig } from "payload";
import { connecte, lectureLibre } from "@/access/roles";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * ⚠️ **Quatre mégaoctets, et ce n'est pas nous qui le décidons.**
 *
 * Vercel refuse tout corps de requête au-delà de **4,5 Mo** : un envoi depuis
 * /admin traverse une fonction serverless, et le fichier est refusé avant même
 * d'arriver ici. Ce plafond n'existe pas en développement — d'où une limite
 * posée dans le logiciel, un peu en dessous, pour que le refus arrive **avec sa
 * raison** au lieu d'une erreur de plateforme que personne ne sait lire.
 *
 * Quatre mégaoctets valent une quinzaine de secondes de vidéo prise au
 * téléphone. C'est tout, et c'est pourquoi le champ dit d'aller sur YouTube
 * au-delà plutôt que de laisser essayer.
 */
const PLAFOND = 4 * 1024 * 1024;

/**
 * Les clips courts déposés directement, à côté des liens YouTube.
 *
 * ── Pourquoi une collection à part de `Medias` ──────────────────────────────
 * `Medias` porte des images : elle les convertit en WebP et en fabrique trois
 * tailles. Une vidéo n'a rien à faire dans ce moulin — `sharp` ne la lit pas,
 * et les variantes n'ont pas de sens. Les deux besoins partagent le magasin,
 * pas les règles.
 *
 * ⚠️ **Pas de conversion, pas de vignette automatique.** Extraire une image
 * d'une vidéo demande ffmpeg, que la fonction serverless n'a pas. C'est
 * l'affiche déposée à côté, dans la réalisation, qui tient ce rôle — sans elle
 * le lecteur montre un carré noir, ce qui se lit comme une vidéo cassée.
 */
export const Videos: CollectionConfig = {
  slug: "videos",
  labels: { singular: "Vidéo", plural: "Vidéos" },
  admin: {
    useAsTitle: "titre",
    defaultColumns: ["titre", "filename", "updatedAt"],
    group: "Éditorial",
    description: "Clips courts déposés sur le site. Au-delà de 4 Mo, passer par YouTube.",
  },
  access: {
    read: lectureLibre,
    // Comme les médias : verser demande une session, mais pas un rôle.
    create: connecte,
    update: connecte,
    delete: connecte,
  },
  hooks: {
    beforeValidate: [
      ({ req }) => {
        const fichier = req.file;
        if (fichier && fichier.size > PLAFOND) {
          throw new APIError(
            `Cette vidéo pèse ${Math.round(fichier.size / 1024 / 1024)} Mo. ` +
              `L'hébergeur refuse tout envoi au-delà de 4,5 Mo — au-delà, mettez la vidéo ` +
              `sur YouTube et collez son lien dans la réalisation.`,
            413,
          );
        }
      },
    ],
  },
  upload: {
    staticDir: path.resolve(dirname, "../../public/videos"),
    /*
      ⚠️ Trois conteneurs, et pas un de plus. Le lecteur du navigateur lit MP4
      partout ; WebM tient sur ordinateur ; QuickTime est ce que rend un iPhone
      sans conversion. Ouvrir la liste plus large ferait déposer des fichiers
      que la moitié des visiteurs ne pourrait pas lire — et cela ne se
      découvrirait que sur leur téléphone.
    */
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
  },
  fields: [
    {
      name: "titre",
      type: "text",
      label: "Titre",
      required: true,
      admin: {
        description:
          "Pour retrouver le fichier dans cette liste. Ce n'est pas ce que lit le visiteur.",
      },
    },
  ],
};
