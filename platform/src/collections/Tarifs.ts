import type { GlobalConfig } from "payload";
import { reserveA } from "@/access/roles";
import { requisEnFrancais } from "@/collections/champs";

/**
 * BE-13 — Barème et plans de paiement.
 *
 * Les douze parcours partagent le même tarif : la direction l'a fixé une fois,
 * pour tout le catalogue. Le porter sur chaque session obligerait à le répéter
 * douze fois et à le corriger douze fois — c'est un réglage, pas une donnée de
 * session.
 *
 * Le prix de la session reste néanmoins sur la session : le jour où un parcours
 * fera exception, il aura son propre montant sans que ce barème bouge.
 *
 * Payer en plusieurs fois coûte plus cher — 423 € comptant, 470 € en trois
 * fois. L'écart est assumé et affiché : c'est le prix du délai, pas un frais
 * caché découvert au paiement.
 */
export const Tarifs: GlobalConfig = {
  slug: "tarifs",
  label: "Tarifs et paiement",
  admin: { group: "Catalogue" },
  access: {
    read: () => true,
    update: reserveA("direction"),
  },
  versions: { drafts: false, max: 20 },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "prixComptant",
          type: "number",
          label: "Prix comptant",
          required: true,
          min: 0,
          admin: {
            width: "50%",
            description: "En unité entière. Le montant réglé en une seule fois.",
          },
        },
        {
          name: "devise",
          type: "select",
          label: "Devise",
          required: true,
          defaultValue: "EUR",
          options: [
            { label: "Euro (€)", value: "EUR" },
            { label: "Dirham (MAD)", value: "MAD" },
            { label: "Franc CFA (XOF)", value: "XOF" },
          ],
          admin: { width: "50%" },
        },
      ],
    },
    {
      name: "plans",
      type: "array",
      label: "Plans de paiement",
      labels: { singular: "Plan", plural: "Plans" },
      minRows: 1,
      admin: {
        description:
          "Du plus simple au plus étalé. Le premier de la liste est celui mis en avant sur la fiche.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "code",
              type: "text",
              label: "Code",
              required: true,
              admin: { width: "25%", placeholder: "P1" },
            },
            {
              name: "libelle",
              type: "text",
              label: "Libellé",
              validate: requisEnFrancais,
              localized: true,
              admin: { width: "40%", placeholder: "2 tranches" },
            },
            {
              name: "total",
              type: "number",
              label: "Total",
              required: true,
              min: 0,
              admin: { width: "35%" },
            },
          ],
        },
        {
          name: "echeances",
          type: "array",
          label: "Échéances",
          labels: { singular: "Échéance", plural: "Échéances" },
          minRows: 1,
          admin: { description: "Les montants successifs, dans l'ordre." },
          fields: [
            {
              name: "montant",
              type: "number",
              label: "Montant",
              required: true,
              min: 0,
            },
          ],
        },
        {
          name: "conditions",
          type: "text",
          label: "Quand payer",
          validate: requisEnFrancais,
          localized: true,
          admin: {
            placeholder: "1re échéance à la signature ; 2e avant la 5e séance",
            description: "Phrase montrée sous le plan.",
          },
        },
      ],
    },
    {
      name: "moyensPaiement",
      type: "array",
      label: "Moyens de paiement acceptés",
      labels: { singular: "Moyen", plural: "Moyens" },
      fields: [
        {
          name: "valeur",
          type: "text",
          label: "Moyen",
          required: true,
          admin: { placeholder: "Western Union" },
        },
      ],
    },
  ],
};
