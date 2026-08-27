import { randomBytes } from "crypto";
import type { CollectionConfig, PayloadRequest } from "payload";
import { connecte, reserveA } from "@/access/roles";

/**
 * BE-14 — Les inscriptions.
 *
 * Décision n° 2 du contrat : l'inscription est le pivot, pas une ligne de
 * commande. Le paiement s'y accroche aujourd'hui ; la convocation, puis la
 * progression et le certificat quand le LMS viendra.
 *
 * ── Pourquoi aucune passerelle de paiement ──────────────────────────────────
 * Les règlements passent par Western Union, Ria et MoneyGram. Ce ne sont pas
 * des passerelles : on n'y paie pas un site, on transfère de l'argent à une
 * personne. Le tunnel s'arrête donc à la réservation, et l'équipe rapproche
 * ensuite le transfert de l'inscription à partir du numéro fourni.
 *
 * ── Pourquoi les échéances vivent ici ───────────────────────────────────────
 * Le contrat prévoyait une entité Paiement distincte. Elles restent un tableau
 * de l'inscription : l'équipe traite un dossier, pas des lignes de paiement
 * éparpillées, et tout se lit sur un écran. Le champ `prochaineEcheance` est
 * calculé à l'enregistrement — c'est lui qui permet de trier les relances sans
 * ouvrir chaque dossier.
 *
 * ── Pourquoi personne ne se connecte ────────────────────────────────────────
 * Pas de compte apprenant en V1. Un mot de passe à retenir avant même d'avoir
 * payé écarte des inscrits ; la référence du dossier suffit à y revenir.
 */
/**
 * Remet le décompte de places d'une session à la vérité.
 *
 * On recompte plutôt qu'on n'incrémente : un compteur qu'on ajuste dérive dès
 * la première annulation faite à la main, et la session annonce alors des
 * places qu'elle n'a plus.
 *
 * `req` est passé aux deux appels — sans lui ils tournent hors de la
 * transaction en cours et ne voient pas le dossier qu'on vient d'écrire.
 */
async function recompter(docs: unknown[], req: PayloadRequest): Promise<void> {
  const ids = new Set<number>();
  for (const d of docs) {
    const s = (d as { session?: unknown })?.session;
    const id = typeof s === "object" && s !== null ? (s as { id?: unknown }).id : s;
    if (typeof id === "number") ids.add(id);
  }

  for (const id of ids) {
    const vivantes = await req.payload.count({
      collection: "inscriptions",
      where: { and: [{ session: { equals: id } }, { statut: { not_equals: "annulee" } }] },
      overrideAccess: true,
      req,
    });
    await req.payload.update({
      collection: "sessions",
      id,
      overrideAccess: true,
      data: { placesReservees: vivantes.totalDocs },
      req,
    });
  }
}

/*
  L'alphabet exclut I, O, 0 et 1.

  Une référence se dicte au téléphone et se recopie d'un courriel : les quatre
  caractères qu'on confond à l'oral ou à l'œil coûtent plus qu'ils ne
  rapportent. Trente-deux symboles suffisent largement.
*/
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LONGUEUR = 8;

/**
 * Tirer une référence de dossier.
 *
 * ⚠️ `randomBytes`, pas `Math.random()`.
 *
 * La référence n'est pas un simple identifiant : c'est la seule clef qui
 * protège la fiche d'un dossier — nom, adresse, téléphone, échéancier — et
 * l'annonce d'un transfert. `Math.random()` est un générateur rapide, non
 * cryptographique : son état interne se reconstitue à partir de quelques
 * sorties, et qui a ouvert deux ou trois dossiers peut alors prédire ceux
 * qu'on délivrera ensuite.
 *
 * Huit symboles sur trente-deux valent quarante bits — mille milliards de
 * combinaisons, là où cinq caractères en base 36 en donnaient soixante
 * millions. Les références déjà émises restent valables : elles sont
 * enregistrées, pas recalculées.
 */
function tirage(): string {
  const octets = randomBytes(LONGUEUR);
  let sortie = "";
  for (let i = 0; i < LONGUEUR; i += 1) {
    // Le modulo est sans biais : 256 est un multiple de 32.
    sortie += ALPHABET[octets[i]! % ALPHABET.length];
  }
  return sortie;
}

export const Inscriptions: CollectionConfig = {
  slug: "inscriptions",
  labels: { singular: "Inscription", plural: "Inscriptions" },
  admin: {
    useAsTitle: "reference",
    defaultColumns: [
      "reference",
      "apprenantNom",
      "apprenantWhatsapp",
      "session",
      "statut",
      "prochaineEcheance",
    ],
    group: "Admissions",
    description:
      "Une ligne par place demandée. Le paiement arrive par transfert : c'est ici qu'on le rapproche.",
  },
  access: {
    // Un dossier contient des coordonnées : jamais de lecture publique.
    read: connecte,
    create: connecte,
    update: connecte,
    delete: reserveA(),
  },
  hooks: {
    /*
      Le décompte de places se recalcule, il ne s'incrémente pas.
      Un compteur qu'on ajuste dérive : une inscription annulée à la main, une
      suppression, un import — et la session annonce des places qu'elle n'a plus.
      On recompte les dossiers vivants, ce qui reste juste quoi qu'il arrive.
    */
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        await recompter([doc, previousDoc], req);
        return doc;
      },
    ],
    // Une suppression libère une place autant qu'une annulation.
    afterDelete: [
      async ({ doc, req }) => {
        await recompter([doc], req);
        return doc;
      },
    ],
    beforeChange: [
      ({ data }) => {
        /*
          La référence sert au participant à retrouver son dossier sans compte.
          Elle est tirée une fois, à la création, et ne bouge plus : elle circule
          par WhatsApp et par courriel.
        */
        if (!data.reference) {
          data.reference = `CLX-${tirage()}`;
        }

        // La prochaine échéance impayée, pour trier les relances sans ouvrir les dossiers.
        const echeances: { statut?: string; dateLimite?: string }[] = data.echeances ?? [];
        const dues = echeances
          .filter((e) => e.statut !== "regle" && e.dateLimite)
          .map((e) => e.dateLimite as string)
          .sort();
        data.prochaineEcheance = dues[0] ?? null;

        // Un dossier entièrement réglé l'est aussi au niveau du dossier.
        if (echeances.length > 0 && echeances.every((e) => e.statut === "regle")) {
          if (data.statut === "confirmee" || data.statut === "demandee") data.statut = "payee";
        }

        return data;
      },
    ],
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "reference",
          type: "text",
          label: "Référence",
          unique: true,
          admin: {
            width: "30%",
            readOnly: true,
            description: "Attribuée à la création.",
          },
        },
        {
          name: "statut",
          type: "select",
          label: "Statut",
          required: true,
          defaultValue: "demandee",
          options: [
            { label: "Demandée — en attente de paiement", value: "demandee" },
            { label: "Confirmée — acompte reçu", value: "confirmee" },
            { label: "Payée — solde reçu", value: "payee" },
            { label: "Terminée — parcours suivi", value: "terminee" },
            { label: "Annulée", value: "annulee" },
          ],
          admin: { width: "40%" },
        },
        {
          name: "prochaineEcheance",
          type: "date",
          label: "Prochaine échéance",
          admin: {
            width: "30%",
            readOnly: true,
            description: "Calculée. Trier dessus pour les relances.",
            date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
          },
        },
      ],
    },
    {
      /*
        Rattaché au compte quand il en existe un, laissé vide sinon. Le tunnel
        n'exige pas de compte : ce champ se remplit après coup, quand la
        personne en crée un avec la même adresse.
      */
      name: "apprenant",
      type: "relationship",
      relationTo: "apprenants",
      label: "Compte du participant",
      admin: {
        description: "Rempli automatiquement à la création du compte, par l'adresse e-mail.",
      },
    },
    {
      name: "session",
      type: "relationship",
      relationTo: "sessions",
      label: "Session",
      required: true,
      admin: { description: "La place demandée. C'est elle qui porte les dates et le tarif." },
    },

    /* ── L'apprenant ────────────────────────────────────────────────── */
    {
      type: "collapsible",
      label: "Le participant",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "apprenantNom",
              type: "text",
              label: "Nom complet",
              required: true,
              admin: { width: "50%" },
            },
            {
              name: "apprenantEmail",
              type: "email",
              label: "E-mail",
              required: true,
              admin: { width: "50%" },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "apprenantWhatsapp",
              type: "text",
              label: "WhatsApp",
              required: true,
              admin: {
                width: "50%",
                description: "Avec l'indicatif du pays.",
                /*
                  Dans la liste, la cellule devient un lien qui ouvre WhatsApp avec un
                  message prérempli. C'est le geste que l'équipe répète le plus : sans
                  lui, il faut ouvrir le dossier, copier le numéro, changer
                  d'application, et écrire depuis le début.

                  Le numéro reste affiché à côté : on doit pouvoir le lire et le
                  recopier ailleurs sans passer par WhatsApp.
                */
                components: {
                  Cell: "@/components/admin/BoutonWhatsapp#BoutonWhatsapp",
                },
              },
            },
            {
              name: "apprenantPays",
              type: "text",
              label: "Pays",
              required: true,
              admin: { width: "50%" },
            },
          ],
        },
      ],
    },

    /* ── Le payeur ──────────────────────────────────────────────────── */
    {
      type: "collapsible",
      label: "Le payeur",
      admin: {
        description:
          "Décision n° 7 : le payeur reste distinct du participant, même quand c'est la même personne. C'est ce qui permettra d'ajouter l'offre entreprise sans refaire le tunnel.",
      },
      fields: [
        {
          name: "payeurType",
          type: "select",
          label: "Qui règle",
          required: true,
          defaultValue: "particulier",
          options: [
            { label: "Le participant lui-même", value: "particulier" },
            { label: "Un employeur ou une organisation", value: "organisation" },
          ],
        },
        {
          type: "row",
          admin: { condition: (data) => data?.payeurType === "organisation" },
          fields: [
            {
              name: "payeurNom",
              type: "text",
              label: "Nom de l'organisation",
              admin: { width: "50%" },
            },
            {
              name: "payeurEmail",
              type: "email",
              label: "E-mail de facturation",
              admin: { width: "50%" },
            },
          ],
        },
      ],
    },

    /* ── Le règlement ───────────────────────────────────────────────── */
    {
      type: "collapsible",
      label: "Le règlement",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "planPaiement",
              type: "select",
              label: "Rythme choisi",
              required: true,
              defaultValue: "P1",
              options: [
                { label: "En une fois", value: "P1" },
                { label: "En deux fois", value: "P2" },
                { label: "En trois fois", value: "P3" },
              ],
              admin: { width: "35%" },
            },
            {
              name: "montantTotal",
              type: "number",
              label: "Total dû",
              min: 0,
              admin: {
                width: "35%",
                description:
                  "Figé à l'inscription : un barème qui change ne rouvre pas un dossier.",
              },
            },
            {
              name: "devise",
              type: "select",
              label: "Devise",
              defaultValue: "EUR",
              options: [
                { label: "Euro (€)", value: "EUR" },
                { label: "Dirham (MAD)", value: "MAD" },
                { label: "Franc CFA (XOF)", value: "XOF" },
              ],
              admin: { width: "30%" },
            },
          ],
        },
        {
          name: "echeances",
          type: "array",
          label: "Échéances",
          labels: { singular: "Échéance", plural: "Échéances" },
          admin: {
            description:
              "Créées à l'inscription d'après le rythme choisi. Cocher « réglée » quand le transfert est vérifié.",
          },
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "montant",
                  type: "number",
                  label: "Montant",
                  required: true,
                  min: 0,
                  admin: { width: "25%" },
                },
                {
                  name: "dateLimite",
                  type: "date",
                  label: "À régler avant",
                  admin: {
                    width: "30%",
                    date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
                  },
                },
                {
                  name: "statut",
                  type: "select",
                  label: "État",
                  required: true,
                  defaultValue: "attendu",
                  options: [
                    { label: "Attendu", value: "attendu" },
                    { label: "Annoncé par le participant", value: "annonce" },
                    { label: "Réglé — transfert vérifié", value: "regle" },
                  ],
                  admin: { width: "45%" },
                },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "moyen",
                  type: "select",
                  label: "Moyen",
                  options: [
                    { label: "Western Union", value: "western-union" },
                    { label: "Ria", value: "ria" },
                    { label: "MoneyGram", value: "moneygram" },
                    { label: "Virement bancaire", value: "virement" },
                    { label: "Espèces", value: "especes" },
                  ],
                  admin: { width: "35%" },
                },
                {
                  name: "reference",
                  type: "text",
                  label: "Numéro de transfert",
                  admin: {
                    width: "35%",
                    description: "MTCN pour Western Union, PIN pour Ria.",
                  },
                },
                {
                  name: "relanceeLe",
                  type: "date",
                  label: "Relancée le",
                  admin: {
                    width: "30%",
                    readOnly: true,
                    description:
                      "Posé par la relance automatique. Empêche d'écrire deux fois la même semaine.",
                    date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
                  },
                },
                {
                  name: "regleLe",
                  type: "date",
                  label: "Vérifié le",
                  admin: {
                    width: "25%",
                    date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notes internes",
      admin: { description: "Jamais montré au participant." },
    },
  ],
};
