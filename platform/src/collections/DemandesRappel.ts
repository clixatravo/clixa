import type { CollectionConfig } from "payload";
import { connecte } from "@/access/roles";

/**
 * BE-12 — Demandes de rappel.
 *
 * Ce que remplit un visiteur depuis /contact, et la seule conversion possible
 * tant que le paiement n'existe pas (phase 02).
 *
 * ── Écriture publique, lecture fermée ───────────────────────────────────────
 * N'importe qui peut déposer une demande — c'est un formulaire public. Mais
 * personne ne peut les relire sans être connecté : ce sont des coordonnées
 * personnelles.
 *
 * ── La base d'abord, l'e-mail ensuite ───────────────────────────────────────
 * La demande est enregistrée avant toute notification. Un service d'e-mail
 * indisponible ne doit jamais faire perdre un prospect.
 */
export const DemandesRappel: CollectionConfig = {
  slug: "demandes-rappel",
  labels: { singular: "Demande de rappel", plural: "Demandes de rappel" },
  admin: {
    useAsTitle: "nom",
    defaultColumns: ["nom", "programme", "statut", "createdAt"],
    group: "Admissions",
    description: "Les demandes déposées depuis le site.",
  },
  access: {
    // Formulaire public : le dépôt est ouvert.
    create: () => true,
    read: connecte,
    update: connecte,
    delete: connecte,
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "nom",
          type: "text",
          label: "Nom complet",
          required: true,
          admin: { width: "50%" },
        },
        { name: "email", type: "email", label: "E-mail", required: true, admin: { width: "50%" } },
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
          admin: { width: "50%" },
        },
        { name: "pays", type: "text", label: "Pays", required: true, admin: { width: "50%" } },
      ],
    },
    {
      name: "programme",
      type: "relationship",
      relationTo: "programmes",
      label: "Formation qui intéresse",
      admin: { description: "Vide si la personne ne savait pas encore." },
    },
    {
      name: "message",
      type: "textarea",
      label: "Message",
    },
    {
      name: "statut",
      type: "select",
      label: "Suivi",
      required: true,
      defaultValue: "nouvelle",
      options: [
        { label: "Nouvelle", value: "nouvelle" },
        { label: "Rappelée", value: "rappelee" },
        { label: "Devis envoyé", value: "devis" },
        { label: "Inscrite", value: "inscrite" },
        { label: "Sans suite", value: "sans-suite" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notes internes",
      admin: {
        position: "sidebar",
        description: "Jamais affichées au visiteur.",
      },
    },
    {
      name: "origine",
      type: "text",
      label: "Page d'origine",
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "D'où venait la personne au moment de la demande.",
      },
    },
  ],
};
