import type { CollectionConfig } from "payload";
import { lectureLibre, reserveA } from "@/access/roles";
import { auMoinsUnEnFrancais, requisEnFrancais } from "@/collections/champs";

/**
 * BE-05 — Articles du blog.
 *
 * Miroir du type `Article` de src/data/blog.ts.
 *
 * Le corps est composé de blocs — paragraphe, intertitre, liste, citation —
 * et non d'un éditeur riche libre. Deux raisons :
 *
 * 1. Le rendu existant (BlocRendu, dans src/app/(frontend)/blog/[slug]) attend
 *    exactement ces quatre formes. Le CMS livre donc la structure que le site
 *    sait déjà afficher, sans conversion.
 * 2. Un éditeur libre laisse coller du HTML importé de Word, avec ses polices
 *    et ses couleurs. Des blocs typés garantissent que tous les articles se
 *    ressemblent, quel que soit l'auteur.
 */
export const Articles: CollectionConfig = {
  slug: "articles",
  labels: { singular: "Article", plural: "Articles" },
  admin: {
    useAsTitle: "titre",
    defaultColumns: ["titre", "categorie", "publieLe", "updatedAt"],
    group: "Éditorial",
    description: "Les articles du blog.",
    /** Ouvre la page publique en mode brouillon (voir api/apercu). */
    preview: (doc: Record<string, unknown>) =>
      typeof doc?.slug === "string"
        ? `/api/apercu?chemin=${encodeURIComponent(`/blog/${doc.slug}`)}`
        : null,
  },
  access: {
    read: lectureLibre,
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
      name: "titre",
      type: "text",
      label: "Titre",
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
      admin: { position: "sidebar", description: "Apparaît dans l'adresse : /blog/mon-article" },
      validate: (valeur: string | null | undefined) =>
        typeof valeur === "string" && /^[a-z0-9-]+$/.test(valeur)
          ? true
          : "Uniquement des minuscules, des chiffres et des tirets.",
    },
    {
      name: "categorie",
      type: "select",
      label: "Catégorie",
      required: true,
      defaultValue: "certifications",
      options: [
        { label: "Certifications", value: "certifications" },
        { label: "Finance", value: "finance" },
        { label: "Management", value: "management" },
        { label: "Carrière", value: "carriere" },
        { label: "Vie de l'institut", value: "institut" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "publieLe",
      type: "date",
      label: "Date de publication",
      required: true,
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" },
      },
    },
    {
      name: "auteur",
      type: "text",
      label: "Signature",
      required: true,
      defaultValue: "Direction pédagogique CLIXA",
      admin: { position: "sidebar" },
    },
    {
      name: "lectureMinutes",
      type: "number",
      label: "Temps de lecture (min)",
      required: true,
      min: 1,
      admin: { position: "sidebar", description: "Environ 200 mots par minute." },
    },
    {
      name: "programmeLie",
      type: "relationship",
      relationTo: "programmes",
      label: "Formation associée",
      admin: {
        position: "sidebar",
        description:
          "Affichée en encadré à la fin de l'article. C'est ce qui transforme une lecture en demande de renseignement.",
      },
    },

    {
      name: "couverture",
      type: "upload",
      relationTo: "medias",
      label: "Image de couverture",
      admin: {
        description: "Reprise sur les cartes du blog et dans les partages WhatsApp.",
      },
    },
    {
      name: "chapo",
      type: "textarea",
      label: "Chapô",
      validate: requisEnFrancais,
      localized: true,
      admin: { description: "Deux ou trois lignes, reprises sur les cartes et dans les partages." },
    },
    {
      name: "contenu",
      type: "blocks",
      label: "Corps de l'article",
      localized: true,
      validate: auMoinsUnEnFrancais,
      blocks: [
        {
          slug: "paragraphe",
          labels: { singular: "Paragraphe", plural: "Paragraphes" },
          fields: [{ name: "texte", type: "textarea", label: "Texte", required: true }],
        },
        {
          slug: "intertitre",
          labels: { singular: "Intertitre", plural: "Intertitres" },
          fields: [{ name: "texte", type: "text", label: "Intertitre", required: true }],
        },
        {
          slug: "liste",
          labels: { singular: "Liste à puces", plural: "Listes à puces" },
          fields: [
            {
              name: "items",
              type: "array",
              label: "Éléments",
              minRows: 1,
              fields: [{ name: "valeur", type: "text", label: "Élément", required: true }],
            },
          ],
        },
        {
          slug: "citation",
          labels: { singular: "Citation", plural: "Citations" },
          fields: [
            { name: "texte", type: "textarea", label: "Citation", required: true },
            { name: "auteur", type: "text", label: "Attribuée à", required: true },
          ],
        },
      ],
    },
  ],
};
