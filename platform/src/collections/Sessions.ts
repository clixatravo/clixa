import type { CollectionConfig } from "payload";
import { lectureLibre, reserveA } from "@/access/roles";

/**
 * BE-03 — Sessions.
 *
 * Miroir du type `Session` de src/lib/types.ts.
 *
 * ── Décision n° 1 ───────────────────────────────────────────────────────────
 * Une session est une occurrence datée d'un programme, jamais le programme
 * lui-même. C'est ce qui permet d'ouvrir la même formation à Agadir en novembre
 * et à Abidjan en janvier, à des prix différents, sans dupliquer la fiche.
 *
 * ── Décision n° 5 ───────────────────────────────────────────────────────────
 * Le mode de diffusion est une donnée, pas un gabarit. La valeur « en-ligne »
 * est déjà déclarée : le jour du e-learning, on ajoutera un écran, pas une
 * seconde plateforme.
 */
export const Sessions: CollectionConfig = {
  slug: "sessions",
  labels: { singular: "Session", plural: "Sessions" },
  admin: {
    useAsTitle: "reference",
    defaultColumns: ["reference", "programme", "mode", "debut", "capacite"],
    group: "Catalogue",
    description: "Les dates ouvertes à la réservation. Une ligne par ville et par période.",
  },
  access: {
    read: lectureLibre,
    create: reserveA("pedagogie"),
    update: reserveA("pedagogie"),
    delete: reserveA("pedagogie"),
  },
  hooks: {
    beforeChange: [
      /**
       * Compose un intitulé lisible pour les listes du back-office.
       * Sans lui, les sessions s'affichent par identifiant et deviennent
       * impossibles à distinguer dès qu'il y en a plus d'une dizaine.
       */
      async ({ data, req }) => {
        if (!data.programme || !data.debut) return data;

        let titreProgramme = "Programme";
        try {
          const p = await req.payload.findByID({
            collection: "programmes",
            id: data.programme,
            depth: 0,
          });
          if (typeof p?.titre === "string") titreProgramme = p.titre;
        } catch {
          // Programme introuvable : on garde l'intitulé générique plutôt que
          // de faire échouer l'enregistrement de la session.
        }

        const lieu = data.mode === "presentiel" ? (data.ville ?? "Présentiel") : "Classe virtuelle";
        const date = new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(data.debut));

        return { ...data, reference: `${titreProgramme} — ${lieu} — ${date}` };
      },
    ],
  },
  fields: [
    {
      name: "reference",
      type: "text",
      label: "Intitulé",
      admin: {
        readOnly: true,
        position: "sidebar",
        description: "Composé automatiquement à l'enregistrement.",
      },
    },
    {
      name: "programme",
      type: "relationship",
      relationTo: "programmes",
      label: "Formation",
      required: true,
      index: true,
    },
    {
      name: "mode",
      type: "select",
      label: "Mode de diffusion",
      required: true,
      defaultValue: "presentiel",
      options: [
        { label: "Présentiel", value: "presentiel" },
        { label: "À distance (classe virtuelle)", value: "visio" },
        {
          label: "En ligne, à son rythme — non ouvert",
          value: "en-ligne",
        },
      ],
      admin: {
        description:
          "« En ligne » est réservé au e-learning, qui n'est pas ouvert cette année. Ne pas l'utiliser.",
      },
    },

    /* ── Présentiel ─────────────────────────────────────────────────── */
    {
      type: "row",
      admin: { condition: (data) => data?.mode === "presentiel" },
      fields: [
        {
          name: "ville",
          type: "text",
          label: "Ville",
          admin: { width: "50%", placeholder: "Agadir" },
        },
        {
          name: "pays",
          type: "text",
          label: "Pays",
          admin: { width: "50%", placeholder: "Maroc" },
        },
      ],
    },

    /* ── Distanciel ─────────────────────────────────────────────────── */
    {
      name: "lienVisio",
      type: "text",
      label: "Lien de la classe virtuelle",
      admin: {
        condition: (data) => data?.mode === "visio",
        description:
          "À laisser vide : le lien Google Meet sera créé automatiquement à l'ouverture de la session (phase 02).",
      },
    },

    /* ── Dates ──────────────────────────────────────────────────────── */
    {
      type: "row",
      fields: [
        {
          name: "debut",
          type: "date",
          label: "Début",
          required: true,
          admin: {
            width: "50%",
            date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" },
          },
        },
        {
          name: "fin",
          type: "date",
          label: "Fin",
          required: true,
          admin: {
            width: "50%",
            date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" },
          },
          validate: (
            valeur: unknown,
            { siblingData }: { siblingData: Record<string, unknown> },
          ) => {
            const debut = siblingData?.debut;
            if (typeof valeur !== "string" && !(valeur instanceof Date)) return true;
            if (!debut) return true;
            return new Date(valeur as string) >= new Date(debut as string)
              ? true
              : "La date de fin ne peut pas précéder la date de début.";
          },
        },
      ],
    },
    {
      name: "fuseau",
      type: "select",
      label: "Fuseau des horaires",
      // Les parcours réels annoncent tous des horaires UTC : le proposer
      // d'emblée épargne une saisie. Une session en présentiel peut le laisser
      // vide — la page ne l'affiche pas dans ce cas.
      defaultValue: "UTC",
      options: [
        { label: "UTC", value: "UTC" },
        { label: "GMT", value: "GMT" },
        { label: "Maroc (GMT+1)", value: "Africa/Casablanca" },
        { label: "Côte d'Ivoire (GMT)", value: "Africa/Abidjan" },
        { label: "Sénégal (GMT)", value: "Africa/Dakar" },
      ],
      admin: {
        description:
          "Les fiches annoncent leurs horaires en UTC. Sans cette précision, un participant à Abidjan et un autre à Casablanca ne lisent pas la même heure.",
      },
    },
    {
      name: "cadence",
      type: "text",
      label: "Rythme affiché",
      localized: true,
      admin: {
        placeholder: "5 jours   ·   8 semaines · mardi soir",
        description: "Texte libre montré sous les dates sur la fiche formation.",
      },
    },

    /* ── Places ─────────────────────────────────────────────────────── */
    {
      type: "row",
      fields: [
        {
          name: "capacite",
          type: "number",
          label: "Places au total",
          required: true,
          min: 1,
          admin: { width: "50%" },
        },
        {
          name: "placesReservees",
          type: "number",
          label: "Places déjà prises",
          required: true,
          defaultValue: 0,
          min: 0,
          admin: {
            width: "50%",
            description:
              "Saisie à la main en V1. À partir de la phase 02, ce compteur sera tenu par les réservations payées.",
          },
        },
      ],
    },

    /* ── Tarif ──────────────────────────────────────────────────────── */
    {
      type: "row",
      fields: [
        {
          name: "prix",
          type: "number",
          label: "Prix",
          required: true,
          min: 0,
          admin: {
            width: "50%",
            description:
              "En unité entière — saisir 1250 pour 1 250 €. La conversion en centimes se fait côté application.",
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
            { label: "Dirham marocain (MAD)", value: "MAD" },
            { label: "Franc CFA (XOF)", value: "XOF" },
          ],
          admin: { width: "50%" },
        },
      ],
    },
  ],
};
