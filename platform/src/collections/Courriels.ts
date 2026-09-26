import type { CollectionConfig } from "payload";
import { connecte, reserveA } from "@/access/roles";
import { OPTIONS_STATUT_COURRIEL } from "@/lib/suivi-courriel";

/**
 * Chaque courriel que le site envoie, et ce que Resend en dit.
 *
 * Demandé par la direction le 26 septembre 2026. Voir `lib/suivi-courriel.ts`
 * pour les états et leur ordre.
 *
 * ── Ce que la collection ne garde pas ───────────────────────────────────────
 * **Le corps du message.** Ces courriels portent des montants, des références
 * de dossier et des liens de règlement ; le destinataire et l'objet suffisent à
 * répondre à « lui est-il parvenu ? ». C'est la règle déjà posée pour le
 * journal de Vercel.
 *
 * ── Qui écrit ───────────────────────────────────────────────────────────────
 * Personne, depuis /admin ni depuis l'API : la ligne naît de l'envoi
 * (`noterLEnvoi`) et ne change qu'à l'appel signé de Resend
 * (`api/webhooks/resend`). Un état qu'on pourrait retoucher à la main ne dirait
 * plus ce que Resend a constaté.
 */
export const Courriels: CollectionConfig = {
  slug: "courriels",
  labels: { singular: "Courriel envoyé", plural: "Courriels envoyés" },
  admin: {
    group: "Admissions",
    useAsTitle: "destinataire",
    /*
      L'état juste après le destinataire : c'est ce qu'on vient lire. Après
      l'objet, il sortait de l'écran d'un téléphone — vu à 375 px.
    */
    defaultColumns: ["destinataire", "statut", "objet", "envoyeLe", "derniereNouvelleLe"],
    description:
      "Chaque courriel parti du site, et ce que Resend en dit : remis, retardé, rejeté, signalé. « Remis » veut dire accepté par le serveur du destinataire — pas lu, et pas forcément hors des indésirables.",
    listSearchableFields: ["destinataire", "objet"],
  },
  defaultSort: "-envoyeLe",
  access: {
    read: connecte,
    create: () => false,
    update: () => false,
    delete: reserveA(),
  },
  fields: [
    {
      name: "destinataire",
      type: "text",
      label: "Destinataire",
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: "objet",
      type: "text",
      label: "Objet",
      admin: { readOnly: true },
    },
    {
      name: "statut",
      type: "select",
      label: "État",
      required: true,
      defaultValue: "envoye",
      index: true,
      options: OPTIONS_STATUT_COURRIEL,
      admin: {
        readOnly: true,
        components: { Cell: "@/components/admin/EtatCourriel#EtatCourriel" },
      },
    },
    {
      name: "detail",
      type: "text",
      label: "Détail",
      admin: {
        readOnly: true,
        description: "La raison d'un rejet, telle que le serveur d'en face l'a donnée.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "envoyeLe",
          type: "date",
          label: "Envoyé le",
          index: true,
          admin: {
            readOnly: true,
            width: "50%",
            date: { pickerAppearance: "dayAndTime", displayFormat: "dd/MM/yyyy HH:mm" },
          },
        },
        {
          name: "derniereNouvelleLe",
          type: "date",
          label: "Dernière nouvelle",
          admin: {
            readOnly: true,
            width: "50%",
            date: { pickerAppearance: "dayAndTime", displayFormat: "dd/MM/yyyy HH:mm" },
          },
        },
      ],
    },
    {
      name: "resendId",
      type: "text",
      label: "Identifiant Resend",
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description:
          "Le même que dans le tableau de bord de Resend — c'est par lui qu'on l'y retrouve.",
      },
    },
    {
      name: "evenements",
      type: "array",
      label: "Ce que Resend a signalé",
      admin: { readOnly: true, initCollapsed: true },
      fields: [
        { name: "type", type: "text", label: "Événement" },
        { name: "le", type: "date", label: "Le" },
        /* L'identifiant de l'appel : un appel rejoué par Resend ne compte qu'une fois. */
        { name: "appel", type: "text", label: "Appel", admin: { hidden: true } },
      ],
    },
  ],
};
