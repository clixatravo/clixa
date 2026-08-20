import type { CollectionConfig } from "payload";
import { lecturePubliee, reserveA } from "@/access/roles";
import { requisEnFrancais } from "@/collections/champs";

/**
 * BE-05 — Témoignages d'anciens participants.
 *
 * Présents dans index.html (carrousel « Ils ont transformé leur trajectoire »),
 * ils n'ont pas encore été repris sur le nouveau site : la collection existe,
 * l'affichage reste à faire côté front.
 */
export const Temoignages: CollectionConfig = {
  slug: "temoignages",
  labels: { singular: "Témoignage", plural: "Témoignages" },
  admin: {
    useAsTitle: "auteur",
    defaultColumns: ["auteur", "fonction", "programme", "_status"],
    group: "Éditorial",
    description: "Paroles d'anciens participants.",
  },
  access: {
    read: lecturePubliee,
    create: reserveA("redaction"),
    update: reserveA("redaction"),
    delete: reserveA("redaction"),
  },
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
  fields: [
    {
      name: "texte",
      type: "textarea",
      label: "Témoignage",
      validate: requisEnFrancais,
      localized: true,
      admin: { description: "Deux à quatre lignes. Au-delà, personne ne lit." },
    },
    {
      type: "row",
      fields: [
        {
          name: "auteur",
          type: "text",
          label: "Nom",
          required: true,
          admin: { width: "50%" },
        },
        {
          name: "fonction",
          type: "text",
          label: "Fonction et entreprise",
          validate: requisEnFrancais,
          localized: true,
          admin: { width: "50%", placeholder: "Directrice financière, groupe agroalimentaire" },
        },
      ],
    },
    {
      name: "programme",
      type: "relationship",
      relationTo: "programmes",
      label: "Formation suivie",
      admin: { position: "sidebar" },
    },
  ],
};
