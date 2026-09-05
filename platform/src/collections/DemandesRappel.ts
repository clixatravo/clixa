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
    defaultColumns: ["nom", "programme", "whatsapp", "statut", "createdAt"],
    group: "Admissions",
    description: "Les demandes déposées depuis le site avec accès direct WhatsApp.",
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
        {
          /*
            ── Facultatif depuis le 29 août 2026 ──────────────────────────────
            La demande de rappel se fait au téléphone : le conseiller appelle,
            c'est tout l'objet. Exiger une adresse en plus du numéro ajoutait un
            champ pour un usage qui n'arrive qu'ensuite — et chaque champ de
            plus est une occasion de refermer l'onglet.

            Elle reste dans le modèle : beaucoup la donneront d'eux-mêmes en
            écrivant, et l'équipe la saisit depuis /admin quand elle l'obtient.
          */
          name: "email",
          type: "email",
          label: "E-mail",
          admin: { width: "50%" },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "whatsapp",
          type: "text",
          label: "WhatsApp / Téléphone",
          required: true,
          admin: {
            width: "50%",
            description: "Format international avec indicatif (ex: +212612345678).",
            /*
              Le même bouton que sur les inscriptions : rappeler quelqu'un est
              *le* geste de cette collection, et il demandait d'ouvrir la fiche,
              copier le numéro, changer d'application et écrire depuis le début.

              ⚠️ Il refuse de composer un numéro sans indicatif — « 0689324243 »
              est marocain pour qui le lit, mais `wa.me` sans indicatif ouvre
              une conversation avec un inconnu. Les demandes déjà en base en
              portent de tels : elles s'afficheront en texte, à compléter.
            */
            components: {
              Cell: "@/components/admin/BoutonWhatsapp#BoutonWhatsapp",
            },
          },
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
      name: "planPaiement",
      type: "select",
      label: "Rythme de paiement souhaité",
      options: [
        { label: "En une fois", value: "P1" },
        { label: "En deux fois", value: "P2" },
        { label: "En trois fois", value: "P3" },
      ],
      admin: {
        description:
          "Ce que la personne a choisi sur la fiche. Payer en plusieurs fois coûte plus cher : le savoir avant le rappel évite de découvrir l'écart au téléphone.",
      },
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
