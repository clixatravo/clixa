import type { CollectionConfig } from "payload";
import { connecte } from "@/access/roles";

/**
 * Un appel convenu avec un prospect.
 *
 * ── Ce que c'est, et ce que ce n'est pas ────────────────────────────────────
 * Une demande de rappel dit « appelez-moi ». Un rendez-vous dit **quand**.
 * Les deux existent séparément parce qu'ils ne meurent pas ensemble : une
 * demande reste vraie même si le rendez-vous est annulé, et l'on peut convenir
 * de deux appels avec la même personne.
 *
 * ── ⚠️ L'instant est en UTC, et il n'est écrit qu'ici ───────────────────────
 * Pas de champ « heure affichée » à côté. C'est exactement la faute qui a
 * produit une séance de zéro minute sur les sessions : un horaire déclaré deux
 * fois, et rien qui les confronte. Ce que lit le prospect se compose à partir
 * de cet instant, jamais l'inverse.
 *
 * ── Écriture fermée ─────────────────────────────────────────────────────────
 * Contrairement aux demandes de rappel, personne ne dépose un rendez-vous
 * depuis un formulaire public : ils naissent du robot, qui ne propose que des
 * créneaux calculés au serveur. Un `create` ouvert laisserait n'importe qui
 * remplir l'agenda.
 */
export const RendezVous: CollectionConfig = {
  slug: "rendez-vous",
  labels: { singular: "Rendez-vous", plural: "Rendez-vous" },
  admin: {
    useAsTitle: "intitule",
    defaultColumns: ["intitule", "debut", "statut", "whatsapp"],
    group: "Admissions",
    description: "Les appels convenus avec les prospects, par le robot ou à la main.",
  },
  access: {
    create: connecte,
    read: connecte,
    update: connecte,
    delete: connecte,
  },
  hooks: {
    beforeChange: [
      /**
       * Un intitulé lisible dans les listes.
       *
       * Sans lui, l'agenda s'affiche par identifiant : impossible de
       * distinguer deux rendez-vous du même jour. Même motif que sur les
       * sessions, et recomposé de la même façon — à chaque écriture, pour
       * qu'il ne puisse pas mentir sur ce qu'il décrit.
       */
      ({ data }) => {
        if (!data.debut) return data;
        const quand = new Intl.DateTimeFormat("fr-FR", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }).format(new Date(data.debut));
        return { ...data, intitule: `${data.nom ?? "Prospect"} — ${quand} UTC` };
      },
    ],
  },
  fields: [
    {
      name: "intitule",
      type: "text",
      label: "Intitulé",
      admin: {
        readOnly: true,
        description: "Composé à partir du nom et de la date. Ne pas saisir.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "nom",
          type: "text",
          label: "Nom du prospect",
          required: true,
          admin: { width: "50%" },
        },
        {
          name: "whatsapp",
          type: "text",
          label: "WhatsApp",
          required: true,
          admin: {
            width: "50%",
            description: "Format international avec indicatif.",
            components: { Cell: "@/components/admin/BoutonWhatsapp#BoutonWhatsapp" },
          },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "debut",
          type: "date",
          label: "Début (UTC)",
          required: true,
          admin: {
            width: "50%",
            /*
              ⚠️ `dayAndTime`, contrairement aux sessions. Là-bas le jour suffit
              et le sélecteur « dayOnly » écrivait midi en silence ; ici l'heure
              *est* l'information, et la masquer reviendrait à la perdre au
              premier ajustement fait depuis /admin.
            */
            date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM yyyy · HH:mm" },
          },
        },
        {
          name: "dureeMinutes",
          type: "number",
          label: "Durée (minutes)",
          defaultValue: 20,
          required: true,
          admin: { width: "50%" },
        },
      ],
    },
    {
      name: "statut",
      type: "select",
      label: "Suivi",
      defaultValue: "convenu",
      required: true,
      options: [
        { label: "Convenu", value: "convenu" },
        { label: "Appel passé", value: "passe" },
        { label: "Absent", value: "absent" },
        { label: "Annulé", value: "annule" },
      ],
      admin: {
        description:
          "« Absent » n'est pas « annulé » : l'un se rappelle, l'autre non. Le décompte des créneaux ne libère que les annulés.",
      },
    },
    {
      name: "demande",
      type: "relationship",
      relationTo: "demandes-rappel",
      label: "Demande d'origine",
      admin: {
        description: "La demande de rappel qui a mené à cet appel, quand il y en a une.",
      },
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notes d'appel",
    },
  ],
};
