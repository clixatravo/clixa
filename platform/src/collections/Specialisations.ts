import type { CollectionConfig } from "payload";
import { lectureLibre, reserveA } from "@/access/roles";
import { requisEnFrancais } from "@/collections/champs";

/**
 * BE-02 — Spécialisations (filières métier).
 *
 * Miroir du type `Specialisation` de src/lib/types.ts. Chaque champ affiché au
 * visiteur est traduisible (BE-06) ; le slug ne l'est pas, c'est l'identifiant
 * qui sert d'URL et il doit rester stable d'une langue à l'autre.
 */
export const Specialisations: CollectionConfig = {
  slug: "specialisations",
  labels: { singular: "Spécialisation", plural: "Spécialisations" },
  admin: {
    useAsTitle: "nom",
    defaultColumns: ["nom", "slug", "updatedAt"],
    group: "Catalogue",
    description: "Les filières métier qui regroupent les formations.",
    /** Ouvre la page publique en mode brouillon (voir api/apercu). */
    preview: (doc: Record<string, unknown>) =>
      typeof doc?.slug === "string"
        ? `/api/apercu?chemin=${encodeURIComponent(`/specialisations/${doc.slug}`)}`
        : null,
  },
  access: {
    read: lectureLibre,
    create: reserveA("pedagogie"),
    update: reserveA("pedagogie"),
    delete: reserveA("pedagogie"),
  },
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
  fields: [
    {
      name: "nom",
      type: "text",
      label: "Nom",
      validate: requisEnFrancais,
      localized: true,
    },
    {
      name: "slug",
      type: "text",
      label: "Identifiant d'URL",
      required: true,
      unique: true,
      index: true,
      admin: {
        description: "Apparaît dans l'adresse : /specialisations/finance-comptabilite",
        position: "sidebar",
      },
      validate: (valeur: string | null | undefined) =>
        typeof valeur === "string" && /^[a-z0-9-]+$/.test(valeur)
          ? true
          : "Uniquement des minuscules, des chiffres et des tirets.",
    },
    {
      name: "accroche",
      type: "text",
      label: "Accroche",
      validate: requisEnFrancais,
      localized: true,
      admin: { description: "Une phrase courte, affichée sur les cartes et en titre de section." },
    },
    {
      name: "description",
      type: "textarea",
      label: "Description",
      validate: requisEnFrancais,
      localized: true,
    },
    {
      name: "debouches",
      type: "array",
      label: "Débouchés",
      labels: { singular: "Débouché", plural: "Débouchés" },
      minRows: 1,
      fields: [
        {
          name: "titre",
          type: "text",
          label: "Métier",
          validate: requisEnFrancais,
          localized: true,
        },
        {
          name: "description",
          type: "text",
          label: "En quoi consiste ce métier",
          validate: requisEnFrancais,
          localized: true,
        },
      ],
    },
  ],
};
