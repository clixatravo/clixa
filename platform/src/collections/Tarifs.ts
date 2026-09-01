import type { GlobalConfig } from "payload";
import { champPersonnel, reserveA } from "@/access/roles";
import { requisEnFrancais } from "@/collections/champs";
import { revaliderTarifs } from "@/collections/revalider";

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
  hooks: { afterChange: [revaliderTarifs] },
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

    /**
     * À qui envoyer l'argent — et pourquoi ce bloc ne s'affiche plus.
     *
     * ⚠️ Ces champs ne sont plus publiés, et le masquage est la garde. La
     * direction a tranché : le RIB, le lien de paiement bancaire et les
     * coordonnées de transfert partent **par courriel**, après la demande du
     * participant. Rien de tout cela n'a sa place sur une page web.
     *
     * La page du dossier les affichait dès qu'ils étaient renseignés — et elle
     * s'ouvre avec la seule référence, qui circule par WhatsApp et par
     * courriel. Il aurait suffi qu'on remplisse ces cases ici, par curiosité ou
     * en croyant bien faire, pour publier un RIB sur une adresse qu'on partage.
     * La page ne sait plus les lire ; les masquer décourage qu'on les saisisse
     * en attendant d'y croire.
     *
     * ⚠️ Mais `admin.hidden` n'est **pas** un contrôle d'accès : il retire la
     * case du formulaire, et l'API REST continue de servir le champ à qui le
     * demande. Éprouvé — les quatre valeurs remplies, `/api/globals/tarifs`
     * tiré sans aucune session, et le RIB sortait. Le global est en lecture
     * publique, comme tout ce que le site affiche. Chacun de ces champs porte
     * donc `access: { read: champPersonnel }` : la donnée peut exister, elle ne
     * sort jamais.
     *
     * Les colonnes restent en base : les retirer demanderait une migration, et
     * elles ne coûtent rien. Pour rouvrir ce bloc un jour, retirer `hidden` —
     * mais il faudra alors rétablir l'affichage, qui a été supprimé.
     */
    {
      type: "collapsible",
      label: "Coordonnées du bénéficiaire — non publiées",
      admin: {
        hidden: true,
        description: "Sans effet : les coordonnées partent par courriel, jamais par le site.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "beneficiaireNom",
              type: "text",
              label: "Nom complet du bénéficiaire",
              admin: { width: "50%", placeholder: "Tel qu'il figure sur la pièce d'identité" },
              access: { read: champPersonnel },
            },
            {
              name: "beneficiaireVille",
              type: "text",
              label: "Ville",
              admin: { width: "25%", placeholder: "Agadir" },
              access: { read: champPersonnel },
            },
            {
              name: "beneficiairePays",
              type: "text",
              label: "Pays",
              admin: { width: "25%", placeholder: "Maroc" },
              access: { read: champPersonnel },
            },
          ],
        },
        {
          name: "consignesPaiement",
          type: "textarea",
          label: "Consignes complémentaires",
          localized: true,
          access: { read: champPersonnel },
          admin: {
            description:
              "Affiché sous les coordonnées. Par exemple : envoyer le numéro de transfert par WhatsApp après l'envoi.",
          },
        },
      ],
    },
  ],
};
