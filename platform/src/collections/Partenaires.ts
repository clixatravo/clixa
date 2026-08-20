import type { CollectionConfig } from "payload";
import { lecturePubliee, reserveA } from "@/access/roles";

/**
 * BE-05 — Référentiels, partenaires et accréditations.
 *
 * Repris de index.html, où ils figurent sous la mention « Référentiels,
 * standards et certifications visés par nos parcours » — formulation prudente
 * qu'il faut conserver telle quelle : elle dit que les parcours visent ces
 * standards, pas que les organismes cautionnent CLIXA.
 *
 * Les logos arrivent avec BE-08 (gestion des médias) : pour l'instant, seul le
 * nom est affiché, comme sur le site actuel.
 */
export const Partenaires: CollectionConfig = {
  slug: "partenaires",
  labels: { singular: "Partenaire", plural: "Partenaires" },
  admin: {
    useAsTitle: "nom",
    defaultColumns: ["nom", "nature", "ordre", "_status"],
    group: "Éditorial",
    description: "Référentiels et standards visés par les parcours.",
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
  defaultSort: "ordre",
  fields: [
    {
      name: "nom",
      type: "text",
      label: "Nom",
      required: true,
      admin: { placeholder: "EC-Council" },
    },
    {
      name: "nature",
      type: "select",
      label: "Nature",
      required: true,
      defaultValue: "referentiel",
      options: [
        { label: "Référentiel ou standard", value: "referentiel" },
        { label: "Organisme certificateur", value: "certificateur" },
        { label: "Institution partenaire", value: "institution" },
      ],
    },
    {
      name: "logo",
      type: "upload",
      relationTo: "medias",
      label: "Logo",
      admin: {
        description:
          "Facultatif. Le site affiche le nom en toutes lettres si aucun logo n'est fourni.",
      },
    },
    {
      name: "lien",
      type: "text",
      label: "Site officiel",
      admin: { placeholder: "https://…" },
    },
    {
      name: "ordre",
      type: "number",
      label: "Ordre d'affichage",
      required: true,
      defaultValue: 100,
      admin: { description: "Le plus petit apparaît en premier." },
    },
  ],
};
