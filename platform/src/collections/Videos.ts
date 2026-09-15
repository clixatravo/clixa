import path from "path";
import { fileURLToPath } from "url";
import { APIError, type CollectionConfig } from "payload";
import { connecte, lectureLibre } from "@/access/roles";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * ⚠️ **Le plafond a changé de nature le 15 septembre 2026, et de chiffre.**
 *
 * Il valait **4 Mo**, et ce n'était pas notre décision : Vercel refuse tout
 * corps de requête au-delà de 4,5 Mo, or un envoi depuis /admin traversait une
 * fonction serverless. Quatre mégaoctets valent une quinzaine de secondes de
 * vidéo — si bien que la direction ne pouvait rien verser depuis le back-office
 * (« briit n hot des vedio akhrin b quality tal3a, li sghar max 1min,
 * makaythatox ») et que tout passait par un script en ligne de commande.
 *
 * Depuis que `clientUploads` est posé sur le greffon (voir `payload.config.ts`),
 * **le navigateur verse directement dans le magasin** : aucun fichier ne
 * traverse plus de fonction, et la limite de la plateforme ne s'applique plus.
 *
 * ── Ce qu'un plafond garde encore ───────────────────────────────────────────
 * Une raison demeure, et elle n'a rien d'une contrainte technique : **ce qu'on
 * verse ici est servi à des téléphones**, souvent sur un forfait mobile. Un
 * fichier déposé par mégarde — un enregistrement d'une heure, un export non
 * compressé — se paierait sur la facture et sur l'attente du visiteur. Cent
 * mégaoctets laissent passer plusieurs minutes de 1080p (l'extrait DAF en pèse
 * 33 pour 2 min 50) et arrêtent l'accident.
 *
 * ⚠️ **La taille se lit à deux endroits, et il faut les deux.** Quand le fichier
 * traverse encore le serveur — un script, l'API locale — elle est dans
 * `req.file`. Quand le navigateur l'a versé lui-même, le serveur ne voit jamais
 * les octets : seule la fiche porte `filesize`. Ne regarder que le premier
 * ferait un plafond qui ne s'applique plus à personne, **sans que rien ne le
 * dise** — exactement le genre de garde qui s'efface en silence.
 */
const PLAFOND = 100 * 1024 * 1024;

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
    description: "Clips déposés sur le site. Au-delà de 100 Mo, passer par YouTube.",
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
      ({ data, req }) => {
        /*
          Deux sources, parce qu'il y a deux chemins : le fichier passé au
          serveur, et la fiche que le navigateur renvoie après avoir versé
          lui-même. La plus grande des deux fait foi — une seule des deux est
          renseignée à la fois.
        */
        const octets = Math.max(
          req.file?.size ?? 0,
          typeof data?.filesize === "number" ? data.filesize : 0,
        );
        if (octets > PLAFOND) {
          throw new APIError(
            `Cette vidéo pèse ${Math.round(octets / 1024 / 1024)} Mo, et le site en accepte ` +
              `${PLAFOND / 1024 / 1024} au plus — elle serait servie telle quelle à des ` +
              `téléphones. Au-delà, mettez-la sur YouTube et collez son lien dans la ` +
              `réalisation.`,
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
