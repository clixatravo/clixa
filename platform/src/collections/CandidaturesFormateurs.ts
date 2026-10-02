import type { CollectionConfig } from "payload";
import { connecte, reserveA } from "@/access/roles";
import {
  OPTIONS_DEVISE_TAUX,
  OPTIONS_EXPERIENCE_FORMATION,
  OPTIONS_SPECIALITE,
  STATUTS_CANDIDATURE,
} from "@/lib/candidatures";
import { retirerCv } from "@/lib/cv";

/**
 * Les candidatures des formateurs, déposées depuis « Devenir formateur ».
 *
 * Demandé par la direction le 30 septembre 2026. Les candidatures arrivaient
 * par WhatsApp, sans trace : l'équipe ne savait ni qui avait écrit, ni si
 * quelqu'un avait répondu. Elles arrivent ici, une par ligne, avec un statut.
 *
 * ── Qui écrit quoi ──────────────────────────────────────────────────────────
 * ⚠️ **Création fermée.** Le dépôt passe par `api/candidature`, qui vérifie
 * chaque champ et dépose le CV dans le magasin privé avant d'écrire. Ouverte en
 * création, la collection serait un second formulaire public, sans ces
 * contrôles.
 *
 * L'équipe ne modifie que le statut et ses notes. Le reste est ce que le
 * candidat a écrit, et le réécrire ferait dire à sa candidature autre chose que
 * ce qu'il a envoyé.
 */
export const CandidaturesFormateurs: CollectionConfig = {
  slug: "candidatures-formateurs",
  labels: { singular: "Candidature formateur", plural: "Candidatures formateurs" },
  admin: {
    useAsTitle: "nom",
    defaultColumns: [
      "nom",
      "specialite",
      "experience",
      "tauxHoraire",
      "tauxDevise",
      "pays",
      "statut",
      "createdAt",
    ],
    group: "Recrutement",
    description:
      "Les candidatures déposées depuis la page « Devenir formateur ». Le CV ne s'ouvre que d'ici.",
  },
  defaultSort: "-createdAt",
  access: {
    read: connecte,
    create: () => false,
    update: connecte,
    delete: reserveA(),
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "statut",
          type: "select",
          label: "Statut",
          required: true,
          defaultValue: "nouvelle",
          options: [...STATUTS_CANDIDATURE],
          admin: { width: "34%" },
        },
        {
          name: "specialite",
          type: "select",
          label: "Domaine",
          options: OPTIONS_SPECIALITE,
          admin: { width: "33%", readOnly: true },
        },
        {
          name: "experience",
          type: "select",
          label: "Expérience de formateur",
          options: OPTIONS_EXPERIENCE_FORMATION,
          admin: { width: "33%", readOnly: true },
        },
      ],
    },
    /*
      Le taux horaire brut demandé, saisi par le candidat (2 octobre 2026).
      ⚠️ Jamais `required` ici : la règle est vérifiée par la route. Exigé dans
      la collection, il ferait refuser toute écriture des candidatures déposées
      avant — un changement de statut, une note — sur un champ qu'elles n'ont
      pas. La leçon du champ « Pays » des inscriptions.
    */
    {
      type: "row",
      fields: [
        {
          name: "tauxHoraire",
          type: "number",
          label: "Taux horaire brut demandé",
          admin: { width: "33%", readOnly: true, description: "Brut, par heure de formation." },
        },
        {
          name: "tauxDevise",
          type: "select",
          label: "Devise",
          options: OPTIONS_DEVISE_TAUX,
          admin: { width: "33%", readOnly: true },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "nom",
          type: "text",
          label: "Nom complet",
          required: true,
          admin: { width: "50%", readOnly: true },
        },
        {
          name: "email",
          type: "email",
          label: "E-mail",
          required: true,
          admin: { width: "50%", readOnly: true },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "whatsapp",
          type: "text",
          label: "WhatsApp",
          required: true,
          admin: { width: "50%", readOnly: true },
        },
        { name: "pays", type: "text", label: "Pays", admin: { width: "50%", readOnly: true } },
      ],
    },
    {
      name: "linkedin",
      type: "text",
      label: "Profil LinkedIn",
      admin: { readOnly: true },
    },
    {
      name: "parcours",
      type: "ui",
      label: "Le parcours du candidat",
      admin: { components: { Field: "@/components/admin/LienCv#LienCv" } },
    },
    {
      name: "message",
      type: "textarea",
      label: "Son message",
      admin: { readOnly: true },
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notes de l'équipe",
      admin: {
        description: "Ce qui s'est dit, ce qui est prévu. Le candidat ne voit rien de ce champ.",
      },
    },
    {
      /*
        La trace du fichier. Le chemin ne suffit pas à l'ouvrir — le magasin est
        privé — mais il n'a aucune raison d'être modifiable : le changer perdrait
        le fichier.
      */
      type: "collapsible",
      label: "Fichier du CV",
      admin: { initCollapsed: true },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "cvNom",
              type: "text",
              label: "Nom du fichier",
              admin: { width: "40%", readOnly: true },
            },
            {
              name: "cvType",
              type: "text",
              label: "Type",
              admin: { width: "30%", readOnly: true },
            },
            {
              name: "cvTaille",
              type: "number",
              label: "Taille (octets)",
              admin: { width: "30%", readOnly: true },
            },
          ],
        },
        {
          name: "cvChemin",
          type: "text",
          label: "Chemin dans le magasin",
          admin: { readOnly: true },
        },
      ],
    },
  ],
  hooks: {
    afterDelete: [
      async ({ doc, req }) => {
        /*
          Le CV ne survit pas à sa candidature : une candidature supprimée ne
          doit pas laisser dans le magasin l'adresse et le numéro de quelqu'un.
          On n'échoue pas si le retrait rate — la fiche est déjà partie — mais
          on le journalise, pour qu'un fichier orphelin se voie.
        */
        const chemin = (doc as { cvChemin?: string })?.cvChemin;
        if (!chemin) return;
        try {
          await retirerCv(chemin);
        } catch (e) {
          req.payload.logger.error({ err: e, chemin }, "[candidatures] CV non retiré du magasin");
        }
      },
    ],
  },
};
