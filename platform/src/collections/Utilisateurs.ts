import type { CollectionConfig } from "payload";
import { champRole, comptesEcriture, comptesLecture, reserveA } from "@/access/roles";

/**
 * BE-07 — Comptes d'administration.
 *
 * Ce sont les comptes qui accèdent au back-office, pas les apprenants : ceux-ci
 * relèvent du type `Utilisateur` de src/lib/types.ts et arrivent en phase 02.
 * Les deux resteront distincts — un formateur n'est pas un client.
 */
export const Utilisateurs: CollectionConfig = {
  slug: "utilisateurs",
  labels: {
    singular: "Utilisateur",
    plural: "Utilisateurs",
  },
  auth: true,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "nom", "role"],
    group: "Accès",
  },
  access: {
    read: comptesLecture,
    update: comptesEcriture,
    // Créer ou supprimer un compte relève de la direction seule.
    create: reserveA(),
    delete: reserveA(),
  },
  fields: [
    {
      name: "nom",
      type: "text",
      label: "Nom complet",
      required: true,
    },
    {
      name: "role",
      type: "select",
      label: "Rôle",
      required: true,
      defaultValue: "pedagogie",
      options: [
        { label: "Direction", value: "direction" },
        { label: "Pédagogie", value: "pedagogie" },
        { label: "Rédaction", value: "redaction" },
      ],
      /**
       * Seule la direction modifie un rôle.
       *
       * Sans cette restriction, n'importe qui pouvait ouvrir sa propre fiche —
       * ce que tout le monde a le droit de faire pour changer son mot de passe —
       * et s'attribuer « Direction ».
       */
      access: { update: champRole, create: champRole },
      admin: {
        description:
          "Direction : accès complet. Pédagogie : catalogue et sessions. Rédaction : blog et pages.",
      },
    },
  ],
};
