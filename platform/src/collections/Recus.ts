import type { CollectionConfig } from "payload";
import { reserveA } from "@/access/roles";
import { retirerRecu } from "@/lib/recus";

/**
 * Les justificatifs de versement, déposés par le participant.
 *
 * ── Pourquoi pas `upload: true` ─────────────────────────────────────────────
 * Le système de dépôt de Payload passe par le greffon Vercel Blob, qui ne sait
 * écrire qu'en accès public. Un reçu porte un nom, un montant et parfois un
 * numéro de compte : le protéger par une adresse qu'on espère introuvable, ce
 * n'est pas le protéger. Le fichier est donc déposé par `lib/recus.ts` dans un
 * magasin privé, et cette collection n'en garde que la trace.
 *
 * ── Ce qui protège le fichier ───────────────────────────────────────────────
 * Le magasin est privé : son adresse ne suffit pas, il faut le jeton du projet.
 * Le seul chemin de lecture est `api/recu/[id]`, qui exige une session
 * d'équipe. Un participant ne relit pas son reçu — il l'a chez lui — et
 * personne ne lit celui d'un autre.
 *
 * ⚠️ Création et modification fermées. Le dépôt passe par `api/transfert`, qui
 * vérifie la référence du dossier, la cadence et le rang de l'échéance avant
 * d'écrire. Une collection ouverte en création serait un dépôt anonyme.
 */
export const Recus: CollectionConfig = {
  slug: "recus",
  labels: { singular: "Reçu de versement", plural: "Reçus de versement" },
  admin: {
    useAsTitle: "nomOriginal",
    defaultColumns: ["nomOriginal", "dossier", "echeance", "createdAt"],
    group: "Admissions",
    description:
      "Déposés par les participants depuis leur dossier. Le fichier ne s'ouvre que d'ici.",
  },
  access: {
    read: ({ req }) => req.user?.collection === "utilisateurs",
    create: () => false,
    update: () => false,
    delete: reserveA(),
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "dossier",
          type: "relationship",
          relationTo: "inscriptions",
          label: "Dossier",
          required: true,
          index: true,
          admin: { width: "50%" },
        },
        {
          name: "echeance",
          type: "number",
          label: "Échéance",
          min: 1,
          admin: { width: "20%", description: "1 pour la première." },
        },
        {
          name: "nomOriginal",
          type: "text",
          label: "Fichier",
          required: true,
          admin: { width: "30%", readOnly: true },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          /*
            Le chemin dans le magasin. Il ne suffit pas à ouvrir le fichier —
            le magasin est privé — mais il n'a aucune raison d'être modifiable :
            le changer à la main ne ferait que perdre la trace du fichier.
          */
          name: "chemin",
          type: "text",
          label: "Chemin dans le magasin",
          required: true,
          admin: { width: "50%", readOnly: true },
        },
        {
          name: "typeFichier",
          type: "text",
          label: "Type",
          admin: { width: "25%", readOnly: true },
        },
        {
          name: "taille",
          type: "number",
          label: "Taille (octets)",
          admin: { width: "25%", readOnly: true },
        },
      ],
    },
    {
      name: "lien",
      type: "ui",
      label: "Le fichier",
      admin: { components: { Field: "@/components/admin/LienRecu#LienRecu" } },
    },
  ],
  hooks: {
    afterDelete: [
      async ({ doc, req }) => {
        /*
          Le fichier ne survit pas à sa fiche. Sans cela, un reçu supprimé du
          back-office resterait dans le magasin — facturé, et toujours lisible
          par qui détient le jeton du projet.

          ⚠️ On n'échoue pas si le retrait rate : la fiche est déjà supprimée,
          et lever ici ne la ramènerait pas. On le journalise pour qu'un fichier
          orphelin se voie.
        */
        const chemin = (doc as { chemin?: string })?.chemin;
        if (!chemin) return;
        try {
          await retirerRecu(chemin);
        } catch (e) {
          req.payload.logger.error({ err: e, chemin }, "[recus] fichier non retiré du magasin");
        }
      },
    ],
  },
};
