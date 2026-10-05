import type { CollectionConfig } from "payload";
import { lecturePubliee, reserveA } from "@/access/roles";
import { requisEnFrancais } from "@/collections/champs";
import { revaliderVitrine, revaliderVitrineSupprimee } from "@/collections/revalider";
import { OPTIONS_COHORTE } from "@/lib/temoignages";

/**
 * BE-05 — Témoignages d'anciens participants.
 *
 * Repris d'index.html (carrousel « Ils ont transformé leur trajectoire »). Ils
 * s'affichent sur l'accueil, sur la fiche du parcours cité, et sur
 * `/temoignages` — la page que la direction a demandée le 13 septembre 2026.
 *
 * Depuis le 30 septembre 2026, les anciens participants les déposent eux-mêmes
 * (`/laisser-un-temoignage`). Un dépôt arrive **en brouillon** : rien ne
 * paraît tant que l'équipe ne l'a pas relu et publié. Voir `lib/temoignages.ts`.
 */
export const Temoignages: CollectionConfig = {
  slug: "temoignages",
  labels: { singular: "Témoignage", plural: "Témoignages" },
  // Le plus récent d'abord : c'est le dernier déposé qu'on vient relire.
  defaultSort: "-createdAt",
  admin: {
    useAsTitle: "auteur",
    defaultColumns: ["auteur", "cohorte", "programme", "fonction", "_status", "createdAt"],
    group: "Éditorial",
    /*
      Le bandeau « Par cohorte » (demandé par la direction le 5 octobre 2026) :
      une carte par cohorte, ce qui attend d'être relu et ce qui est en ligne,
      et un clic filtre la liste. Voir `repartitionParCohorte`.
    */
    components: {
      beforeList: ["@/components/admin/TemoignagesParCohorte#TemoignagesParCohorte"],
    },
    description:
      "Paroles d'anciens participants. Ceux déposés depuis le site arrivent en brouillon : relisez, puis publiez.",
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
  hooks: {
    afterChange: [revaliderVitrine],
    afterDelete: [revaliderVitrineSupprimee],
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
    {
      name: "cohorte",
      type: "select",
      label: "Cohorte",
      options: OPTIONS_COHORTE,
      admin: { position: "sidebar" },
    },
    {
      /*
        L'accord de publication, daté. Posé par la route au dépôt, jamais à la
        main : une date saisie ici ne prouverait aucun accord. Vide sur un
        témoignage saisi par l'équipe — c'est elle qui a recueilli l'accord.
      */
      name: "consentementLe",
      type: "date",
      label: "Accord de publication donné le",
      admin: {
        position: "sidebar",
        readOnly: true,
        date: { pickerAppearance: "dayAndTime" },
        description:
          "Rempli quand la personne a déposé son témoignage depuis le site et accepté qu'il soit publié avec son nom et sa fonction.",
      },
    },
  ],
};
