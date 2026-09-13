import type { CollectionConfig } from "payload";
import { lecturePubliee, reserveA } from "@/access/roles";
import { requisEnFrancais } from "@/collections/champs";
import { lireLaVideo } from "@/lib/video";
import { revaliderVitrine, revaliderVitrineSupprimee } from "@/collections/revalider";

/**
 * Les formations déjà données, en vidéo.
 *
 * ── Ce que cette collection sert à montrer ──────────────────────────────────
 * Demandé par la direction le 13 septembre 2026 : « les formations li deja daro
 * m3a nass, 3andna vediowat wajdin ». Le site dit ce qu'on propose ; il ne
 * montre nulle part ce qu'on a **déjà fait**. Un prospect venu d'une annonce
 * lit douze programmes et n'a aucune preuve qu'une seule séance ait eu lieu.
 *
 * ⚠️ **C'est une galerie, pas un historique.** Un titre, une phrase, une vidéo.
 * Ni date, ni nombre de participants, ni ville : la direction l'a tranché, et
 * c'est le bon choix — un compteur « 18 participants » vieillit, se conteste, et
 * demande d'être tenu à jour par quelqu'un. Une vidéo se suffit.
 */
export const Realisations: CollectionConfig = {
  slug: "realisations",
  labels: { singular: "Réalisation", plural: "Réalisations" },
  admin: {
    useAsTitle: "titre",
    defaultColumns: ["titre", "source", "ordre", "_status"],
    group: "Éditorial",
    description: "Vidéos des formations déjà données. Elles s'affichent sur /temoignages.",
  },
  access: {
    read: lecturePubliee,
    create: reserveA("redaction"),
    update: reserveA("redaction"),
    delete: reserveA("redaction"),
  },
  /*
    Comme les témoignages : on prépare, on relit, puis on publie. Une vidéo de
    participants réels n'est pas une ligne de catalogue qu'on corrige après coup.
  */
  versions: { drafts: true, maxPerDoc: 20 },

  hooks: {
    /*
      Sans ces deux-là, la rédaction publie une vidéo et le site ne bouge pas
      jusqu'au déploiement suivant. La page est pré-générée : c'est le crochet
      qui la remet à jour, pas l'enregistrement.
    */
    afterChange: [revaliderVitrine],
    afterDelete: [revaliderVitrineSupprimee],
  },

  fields: [
    {
      name: "titre",
      type: "text",
      label: "Titre",
      validate: requisEnFrancais,
      localized: true,
      admin: { description: "« Séance Directeur Administratif et Financier », par exemple." },
    },
    {
      name: "description",
      type: "textarea",
      label: "Une phrase",
      localized: true,
      admin: {
        description:
          "Facultatif. Ce qu'on voit dans la vidéo, en une ligne. Pas un résumé du programme.",
      },
    },
    {
      /*
        ⚠️ **Un choix explicite, plutôt que deux cases dont on remplit l'une.**
        Deux champs facultatifs côte à côte laissent remplir les deux — et il
        faut alors décider lequel gagne, à un endroit que personne ne relira.
        Le sélecteur pose la question une fois, et l'écran ne montre que la case
        qui compte.
      */
      name: "source",
      type: "select",
      label: "D'où vient la vidéo",
      required: true,
      defaultValue: "lien",
      options: [
        { label: "Un lien YouTube ou Vimeo", value: "lien" },
        { label: "Un fichier déposé ici (moins de 4 Mo)", value: "fichier" },
      ],
    },
    {
      name: "lien",
      type: "text",
      label: "Adresse de la vidéo",
      /*
        ── ⚠️ Le refus est un `validate`, pas une exception ─────────────────
        Le premier jet levait dans un crochet `beforeValidate`. Mesuré à
        l'écran : Payload rend alors **500 · « Something went wrong. »** — en
        anglais, sans dire quoi, et la phrase écrite juste ici n'atteignait
        personne. Un refus qui n'apprend rien fait recoller la même adresse,
        et fait chercher le défaut dans le code alors qu'il est dans la case.

        Un `validate` s'affiche **sous le champ**, en rouge, avec les formes
        acceptées — au moment où la personne a encore l'adresse sous les yeux.
      */
      validate: (valeur: unknown, options: unknown) => {
        const { siblingData, previousValue } = (options ?? {}) as {
          siblingData?: { source?: string };
          previousValue?: unknown;
        };
        if (siblingData?.source !== "lien") return true;

        /*
          ⚠️ Une valeur inchangée passe toujours. Un contrôle ajouté
          aujourd'hui ne peut pas geler une ligne écrite hier : c'est la leçon
          du champ « Pays », où un validateur rejouait sur chaque écriture et
          empêchait la tâche de 8 h de toucher un dossier ancien.
        */
        if (valeur === previousValue) return true;

        if (!valeur)
          return "Collez l'adresse de la vidéo, ou choisissez « un fichier déposé ici ».";

        return lireLaVideo(valeur)
          ? true
          : "Cette adresse n'est pas une vidéo YouTube ou Vimeo reconnue. Formes acceptées : " +
              "youtu.be/…, youtube.com/watch?v=…, youtube.com/shorts/… ou vimeo.com/…";
      },
      admin: {
        condition: (_, frere) => frere?.source === "lien",
        description:
          "Coller l'adresse telle quelle : youtu.be/…, youtube.com/watch?v=…, youtube.com/shorts/… ou vimeo.com/…",
      },
    },
    {
      name: "fichier",
      type: "upload",
      relationTo: "videos",
      label: "Fichier vidéo",
      admin: {
        condition: (_, frere) => frere?.source === "fichier",
        description:
          "L'hébergeur refuse au-delà de 4,5 Mo — une quinzaine de secondes de vidéo. Au-delà, passer par YouTube.",
      },
    },
    {
      /*
        ⚠️ **L'affiche n'est pas décorative sur un fichier déposé.** YouTube
        publie une vignette devinable ; un fichier, non — et le lecteur montre
        alors un carré noir, ce qui se lit comme une vidéo cassée. Elle reste
        facultative pour un lien, où la vignette du fournisseur prend le relais.
      */
      name: "affiche",
      type: "upload",
      relationTo: "medias",
      label: "Image d'attente",
      admin: {
        description:
          "Ce qu'on voit avant de lancer la lecture. Indispensable pour un fichier déposé ; facultative pour un lien YouTube, qui en fournit une.",
      },
    },
    {
      name: "ordre",
      type: "number",
      label: "Ordre d'affichage",
      admin: {
        position: "sidebar",
        description: "Le plus petit passe en premier. Vide : la plus récente d'abord.",
      },
    },
  ],
};
