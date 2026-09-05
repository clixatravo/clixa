import type { CollectionConfig } from "payload";
import { connecte } from "@/access/roles";
import { courrielMainPassee } from "@/lib/courriel";

/**
 * Un échange WhatsApp avec un prospect, et qui le mène.
 *
 * ── Pourquoi garder la conversation ─────────────────────────────────────────
 * Trois raisons, dans cet ordre. Un conseiller qui reprend la main doit lire
 * ce qui s'est dit avant lui, sans quoi il refait poser les mêmes questions.
 * Un robot qui répond doit savoir où il en est. Et le jour où quelqu'un
 * conteste ce qu'on lui a promis, la seule réponse qui vaille est la
 * transcription — c'est la même raison qui fait garder l'empreinte du contrat.
 *
 * ── ⚠️ `conduite` est l'interrupteur qui fait taire le robot ────────────────
 * Passée à « humain », plus un mot ne part automatiquement. Deux voix sur le
 * même fil, c'est ce qui fait qu'on n'y comprend rien et qu'on raccroche. La
 * règle vit dans `lib/orientation.ts` et se lit d'ici.
 *
 * ── Écriture fermée ─────────────────────────────────────────────────────────
 * Rien ne se dépose depuis un formulaire public : les conversations naissent
 * du webhook de Meta, qui vérifie la signature de ce qu'il reçoit.
 */
export const Conversations: CollectionConfig = {
  slug: "conversations",
  labels: { singular: "Conversation", plural: "Conversations" },
  admin: {
    useAsTitle: "intitule",
    defaultColumns: ["intitule", "whatsapp", "conduite", "updatedAt"],
    group: "Admissions",
    description: "Les échanges WhatsApp menés par le robot d'orientation.",
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
       * L'intitulé, et la date de reprise.
       *
       * ⚠️ **`passeeAlHumainLe` se pose ici, dans la même écriture** que le
       * passage à « humain » — pas dans un second aller-retour `afterChange`.
       * Rouvrir la ligne juste après l'avoir écrite est exactement le chemin
       * qui a produit l'interblocage que `lib/interblocage.ts` existe pour
       * rattraper ailleurs. Même choix que la date du certificat.
       */
      ({ data, originalDoc }) => {
        const reprise =
          data.conduite === "humain" && originalDoc?.conduite !== "humain" && !data.passeeAlHumainLe
            ? { passeeAlHumainLe: new Date().toISOString() }
            : {};
        return {
          ...data,
          ...reprise,
          intitule: `${data.nom || "Prospect"} — ${data.whatsapp ?? ""}`.trim(),
        };
      },
    ],
    afterChange: [
      /**
       * Prévenir l'équipe qu'une conversation attend un humain.
       *
       * ⚠️ **« Vide avant, rempli maintenant »**, la même garde que le contrat
       * vérifié, les instructions de paiement et le certificat. Sans elle,
       * chaque enregistrement de la conversation — donc chaque message reçu —
       * renverrait l'alerte, et l'équipe cesserait de la lire au bout de trois.
       */
      async ({ doc, previousDoc, req }) => {
        if (!doc.passeeAlHumainLe || previousDoc?.passeeAlHumainLe) return;
        await courrielMainPassee(req.payload, {
          id: String(doc.id),
          nom: String(doc.nom ?? "Prospect"),
          whatsapp: String(doc.whatsapp ?? ""),
          dernier: String(doc.dernierMessage ?? ""),
        });
      },
    ],
  },
  fields: [
    {
      name: "intitule",
      type: "text",
      label: "Intitulé",
      admin: { readOnly: true, description: "Composé du nom et du numéro. Ne pas saisir." },
    },
    {
      type: "row",
      fields: [
        {
          name: "nom",
          type: "text",
          label: "Nom",
          admin: {
            width: "50%",
            description: "Tel que WhatsApp le donne ; le prospect ne l'a pas forcément saisi.",
          },
        },
        {
          name: "whatsapp",
          type: "text",
          label: "WhatsApp",
          required: true,
          index: true,
          admin: {
            width: "50%",
            components: { Cell: "@/components/admin/BoutonWhatsapp#BoutonWhatsapp" },
          },
        },
      ],
    },
    {
      name: "conduite",
      type: "select",
      label: "Qui mène",
      defaultValue: "robot",
      required: true,
      index: true,
      options: [
        { label: "Le robot", value: "robot" },
        { label: "Un conseiller (le robot se tait)", value: "humain" },
        { label: "Terminée", value: "close" },
      ],
      admin: {
        description:
          "Passée à « un conseiller », plus aucun message automatique ne part. À remettre sur « terminée » une fois l'échange fini.",
      },
    },
    {
      name: "passeeAlHumainLe",
      type: "date",
      label: "Reprise par un conseiller le",
      admin: {
        readOnly: true,
        description: "Posée automatiquement. C'est elle qui déclenche l'alerte à l'équipe.",
        date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM yyyy · HH:mm" },
      },
    },
    {
      name: "dernierMessage",
      type: "textarea",
      label: "Dernier message reçu",
      admin: {
        readOnly: true,
        description: "Ce que le prospect a écrit en dernier — de quoi savoir sur quoi il attend.",
      },
    },
    {
      name: "messages",
      type: "array",
      label: "Fil de la conversation",
      labels: { singular: "Message", plural: "Messages" },
      admin: {
        description: "Ce qui s'est dit, dans l'ordre. À lire avant de reprendre la main.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "sens",
              type: "select",
              label: "Sens",
              required: true,
              options: [
                { label: "Reçu", value: "entrant" },
                { label: "Envoyé", value: "sortant" },
              ],
              admin: { width: "30%" },
            },
            {
              name: "le",
              type: "date",
              label: "Le",
              required: true,
              admin: {
                width: "70%",
                date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM · HH:mm" },
              },
            },
          ],
        },
        { name: "texte", type: "textarea", label: "Texte", required: true },
      ],
    },
    {
      name: "demande",
      type: "relationship",
      relationTo: "demandes-rappel",
      label: "Demande d'origine",
    },
    {
      name: "rendezVous",
      type: "relationship",
      relationTo: "rendez-vous",
      label: "Rendez-vous convenu",
      admin: {
        description: "Rempli dès qu'un créneau est retenu. Le robot cesse alors d'en proposer.",
      },
    },
  ],
};
