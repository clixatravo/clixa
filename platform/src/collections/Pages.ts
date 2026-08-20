import type { CollectionConfig } from "payload";
import { lecturePubliee, reserveA } from "@/access/roles";
import { auMoinsUnEnFrancais, requisEnFrancais } from "@/collections/champs";

/**
 * BE-05 — Pages de contenu simple.
 *
 * Destinées d'abord aux pages légales — mentions, confidentialité, CGV — qui
 * manquent au site et relèvent de RIS-06. Les modèles existants du site
 * statique portent encore des champs « [à compléter] » et un avertissement :
 * ils doivent être complétés puis relus par un juriste avant publication.
 *
 * Cette collection leur donne un endroit où atterrir le jour où ils sont prêts,
 * sans qu'un développeur ait à créer une route.
 *
 * Les pages structurées du site — accueil, campus, entreprises — restent des
 * gabarits de code : leur mise en page est trop spécifique pour un éditeur.
 */
export const Pages: CollectionConfig = {
  slug: "pages",
  labels: { singular: "Page", plural: "Pages" },
  admin: {
    useAsTitle: "titre",
    defaultColumns: ["titre", "slug", "_status", "updatedAt"],
    group: "Éditorial",
    description:
      "Pages de texte : mentions légales, confidentialité, CGV. Ne publier qu'après relecture juridique.",
    /** Ouvre la page publique en mode brouillon (voir api/apercu). */
    preview: (doc: Record<string, unknown>) =>
      typeof doc?.slug === "string"
        ? `/api/apercu?chemin=${encodeURIComponent(`/${doc.slug}`)}`
        : null,
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
      admin: { position: "sidebar", description: "Apparaît dans l'adresse : /mentions-legales" },
      validate: (valeur: string | null | undefined) =>
        typeof valeur === "string" && /^[a-z0-9-]+$/.test(valeur)
          ? true
          : "Uniquement des minuscules, des chiffres et des tirets.",
    },
    {
      name: "miseAJour",
      type: "date",
      label: "Dernière mise à jour",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" },
        description: "Affichée en haut de page — attendu sur un document juridique.",
      },
    },
    {
      name: "contenu",
      type: "blocks",
      label: "Contenu",
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
      ],
    },
  ],
};
