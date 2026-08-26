import type { CollectionConfig } from "payload";
import { connecte, reserveA } from "@/access/roles";

/**
 * BE-18 — Les comptes des participants.
 *
 * Distincts des `Utilisateurs`, qui sont les comptes du back-office. La
 * séparation n'est pas cosmétique : `admin.user` ne désigne qu'une collection,
 * et c'est celle du personnel. Un participant ne peut donc pas atteindre
 * /admin, quoi qu'il tente — la garantie tient à la configuration, pas à une
 * règle qu'on aurait pu oublier d'écrire.
 *
 * ── Pourquoi le compte vient après, jamais avant ────────────────────────────
 * Le tunnel d'inscription n'en demande pas. Un mot de passe à retenir avant
 * même d'avoir payé écarte des inscrits, et la référence du dossier suffit à y
 * revenir. Le compte se crée ensuite, pour qui veut retrouver plusieurs
 * dossiers au même endroit — et ses inscriptions passées s'y rattachent
 * d'elles-mêmes, par l'adresse.
 *
 * ── Ce que le compte ne fait pas ────────────────────────────────────────────
 * Il ne donne accès à aucun contenu de formation : le LMS n'est pas au
 * programme cette année (décision A). Il montre des dossiers, des échéances et
 * des dates.
 */
export const Apprenants: CollectionConfig = {
  slug: "apprenants",
  labels: { singular: "Participant", plural: "Participants" },
  auth: {
    // Une session qui dure : personne ne revient sur son dossier chaque jour.
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 10,
    lockTime: 10 * 60 * 1000,
  },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "nom", "pays"],
    group: "Admissions",
    description:
      "Les comptes que les participants créent eux-mêmes. Le personnel les consulte, il ne les crée pas.",
  },
  access: {
    /*
      Le personnel lit tout ; un participant ne lit que sa propre fiche.
      Sans la seconde branche, il ne pourrait pas consulter son compte ; sans la
      première, l'équipe ne pourrait pas l'aider au téléphone.
    */
    read: ({ req }) => {
      if (!req.user) return false;
      if (req.user.collection === "utilisateurs") return true;
      return { id: { equals: req.user.id } };
    },
    // La création passe par le formulaire public, qui appelle l'API en interne.
    create: () => false,
    update: ({ req }) => {
      if (!req.user) return false;
      if (req.user.collection === "utilisateurs") return true;
      return { id: { equals: req.user.id } };
    },
    delete: reserveA(),
    // Sécurité de fond : jamais d'accès au back-office depuis ce compte.
    admin: () => false,
    unlock: connecte,
  },
  fields: [
    {
      name: "nom",
      type: "text",
      label: "Nom complet",
      required: true,
    },
    {
      type: "row",
      fields: [
        {
          name: "telephone",
          type: "text",
          label: "WhatsApp",
          admin: { width: "50%" },
        },
        {
          name: "pays",
          type: "text",
          label: "Pays",
          admin: { width: "50%" },
        },
      ],
    },
    {
      /*
        L'identifiant Google du participant, quand il s'est connecté ainsi.

        C'est lui la clef du rattachement, jamais l'adresse : Google laisse
        changer l'adresse d'un compte, et quelqu'un peut récupérer une adresse
        abandonnée par un autre. L'identifiant, lui, ne se réattribue pas.

        Vide pour qui s'est inscrit avec un mot de passe. Les deux chemins
        mènent au même compte — voir `lib/google.ts`.
      */
      name: "googleId",
      type: "text",
      label: "Identifiant Google",
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: "Renseigné automatiquement à la première connexion Google.",
      },
    },
    {
      /*
        Une adresse vérifiée par Google est une adresse prouvée — ce que le
        formulaire, lui, ne prouve pas. C'est ce drapeau qui autorise à
        rattacher un dossier sur la seule adresse, sans demander la référence.
      */
      name: "emailVerifie",
      type: "checkbox",
      label: "Adresse vérifiée",
      defaultValue: false,
      admin: {
        readOnly: true,
        description: "Vraie quand Google a confirmé l'adresse.",
      },
    },
  ],
};
