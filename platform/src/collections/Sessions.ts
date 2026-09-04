import type { CollectionConfig } from "payload";
import { lectureLibre, reserveA } from "@/access/roles";
import { revaliderSession, revaliderSessionSupprimee } from "@/collections/revalider";

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
    afterChange: [revaliderSession],
    afterDelete: [revaliderSessionSupprimee],
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

      /**
       * Aligne l'heure enregistrée sur l'heure annoncée.
       *
       * ── Le défaut ─────────────────────────────────────────────────────
       * L'horaire d'une séance était déclaré **deux fois** : en toutes
       * lettres dans la cadence (« 8 samedis · 13h00–17h00 »), et en
       * silence dans les instants `debut` / `fin`. Rien ne les confrontait,
       * et le 4 septembre 2026 les ressources humaines se sont révélées
       * enregistrées à **12:00** sous une cadence qui promettait 13h00 —
       * avec une fin à 12:00 elle aussi, soit une séance de zéro minute.
       *
       * ⚠️ **Midi n'est pas un hasard.** Les deux champs sont en
       * `pickerAppearance: "dayOnly"` : le sélecteur du back-office ne
       * montre pas d'heure et enregistre midi UTC. Toucher à la date d'une
       * session depuis /admin efface donc son horaire, sans rien afficher
       * qui le laisse deviner. Et `ouvrir-cohorte.ts` écrit lui aussi les
       * deux — ses heures et sa phrase — ce qui est la même faille, une
       * porte plus loin.
       *
       * ── La règle ──────────────────────────────────────────────────────
       * La cadence fait foi : c'est elle que le visiteur lit, elle que
       * porte la campagne, et la seule des deux qu'un membre de l'équipe
       * corrigerait s'il voyait l'écart. Les instants s'y recalent.
       *
       * ⚠️ On ne touche qu'aux sessions en UTC : ailleurs la cadence est
       * écrite dans le fuseau de la session, et comparer des heures nues
       * conclurait à un écart qui n'existe pas.
       *
       * ⚠️ Une cadence sans horaire n'est pas une faute — on passe, sans
       * rien changer. Un crochet qui « corrige » ce qu'il n'a pas su lire
       * fait plus de dégâts que celui qui s'abstient.
       */
      ({ data, originalDoc }) => {
        /*
          ⚠️ On ne se réveille que si l'écriture touche à l'un des quatre
          champs concernés. Sans ce filtre, le crochet réécrivait `debut` et
          `fin` à *chaque* enregistrement d'une session — dont ceux du crochet
          `recompter`, qui met à jour le décompte de places à chaque
          inscription. Les valeurs auraient été identiques, mais on n'élargit
          pas une écriture sur la ligne `sessions` sans raison : c'est celle
          autour de laquelle tourne l'interblocage que `lib/interblocage.ts`
          existe pour rattraper.
        */
        const concerne =
          data.cadence !== undefined ||
          data.debut !== undefined ||
          data.fin !== undefined ||
          data.fuseau !== undefined;
        if (!concerne) return data;

        const brute: unknown = data.cadence ?? originalDoc?.cadence;
        /*
          `cadence` est traduisible : selon la locale de la requête, Payload
          passe la chaîne ou l'objet de toutes les langues. Le français fait
          référence — c'est la langue du catalogue.
        */
        const cadence =
          typeof brute === "string"
            ? brute
            : typeof (brute as { fr?: unknown })?.fr === "string"
              ? (brute as { fr: string }).fr
              : undefined;

        const fuseau = data.fuseau ?? originalDoc?.fuseau ?? "UTC";
        if (!cadence || fuseau !== "UTC") return data;

        const dits = /(\d{1,2})h(\d{2})\D+(\d{1,2})h(\d{2})/.exec(cadence);
        if (!dits) return data;

        const aLHeure = (valeur: unknown, h: number, m: number) => {
          if (!valeur) return undefined;
          const d = new Date(valeur as string);
          if (Number.isNaN(d.getTime())) return undefined;
          d.setUTCHours(h, m, 0, 0);
          return d.toISOString();
        };

        const debut = aLHeure(data.debut ?? originalDoc?.debut, Number(dits[1]), Number(dits[2]));
        const fin = aLHeure(data.fin ?? originalDoc?.fin, Number(dits[3]), Number(dits[4]));

        return {
          ...data,
          ...(debut ? { debut } : {}),
          ...(fin ? { fin } : {}),
        };
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
