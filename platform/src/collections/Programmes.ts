import type { CollectionConfig } from "payload";
import { lectureLibre, reserveA } from "@/access/roles";
import { requisEnFrancais } from "@/collections/champs";
import { revaliderProgramme, revaliderProgrammeSupprime } from "@/collections/revalider";

/**
 * BE-02 — Programmes de formation.
 *
 * Miroir du type `Programme` de src/lib/types.ts.
 *
 * ── L'arbre Module → Leçon ──────────────────────────────────────────────────
 * Décision n° 3 du contrat d'extensibilité : l'arbre est conservé, même si la
 * V1 ne l'affiche que comme plan de cours.
 *
 * Il est modélisé en champs imbriqués plutôt qu'en collections séparées. Les
 * lignes d'un champ `array` reçoivent un identifiant stable, qui survit aux
 * modifications : la table `Progression` du LMS pourra donc s'y rattacher le
 * moment venu. Et l'équipe pédagogique saisit un programme entier dans un seul
 * écran, au lieu de créer modules et leçons un par un — c'est ce qui décide de
 * l'adoption réelle du back-office.
 *
 * ── Décision A ──────────────────────────────────────────────────────────────
 * Le e-learning n'étant pas visé cette année, une leçon ne porte que titre et
 * durée. Les champs `objectif` et `contenuId` existent dans src/lib/types.ts
 * mais ne sont pas exposés ici : on ne demande pas à l'équipe pédagogique un
 * travail qui ne servirait à rien avant le LMS.
 */
export const Programmes: CollectionConfig = {
  hooks: {
    afterChange: [revaliderProgramme],
    afterDelete: [revaliderProgrammeSupprime],
  },
  slug: "programmes",
  labels: { singular: "Programme", plural: "Programmes" },
  admin: {
    useAsTitle: "titre",
    defaultColumns: ["titre", "specialisation", "dureeHeures", "updatedAt"],
    group: "Catalogue",
    description: "Les formations du catalogue. Les dates se gèrent dans « Sessions ».",
    /** Ouvre la page publique en mode brouillon (voir api/apercu). */
    preview: (doc: Record<string, unknown>) =>
      typeof doc?.slug === "string"
        ? `/api/apercu?chemin=${encodeURIComponent(`/formations/${doc.slug}`)}`
        : null,
  },
  access: {
    read: lectureLibre,
    create: reserveA("pedagogie"),
    update: reserveA("pedagogie"),
    delete: reserveA("pedagogie"),
  },
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
  fields: [
    {
      name: "titre",
      type: "text",
      label: "Titre",
      validate: requisEnFrancais,
      localized: true,
    },
    {
      name: "slug",
      type: "text",
      label: "Identifiant d'URL",
      required: true,
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
        description: "Apparaît dans l'adresse : /formations/preparation-certification-pmp",
      },
      validate: (valeur: string | null | undefined) =>
        typeof valeur === "string" && /^[a-z0-9-]+$/.test(valeur)
          ? true
          : "Uniquement des minuscules, des chiffres et des tirets.",
    },
    {
      name: "specialisation",
      type: "relationship",
      relationTo: "specialisations",
      label: "Spécialisation",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "type",
      type: "select",
      label: "Nature",
      required: true,
      defaultValue: "metier",
      options: [
        { label: "Certification", value: "certification" },
        { label: "Parcours exécutif", value: "parcours-executif" },
        { label: "Métier", value: "metier" },
        { label: "Sur mesure", value: "sur-mesure" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "niveau",
      type: "select",
      label: "Niveau",
      required: true,
      defaultValue: "intermediaire",
      options: [
        { label: "Débutant", value: "debutant" },
        { label: "Intermédiaire", value: "intermediaire" },
        { label: "Avancé", value: "avance" },
      ],
      admin: { position: "sidebar" },
    },

    {
      type: "tabs",
      tabs: [
        {
          label: "Présentation",
          fields: [
            {
              name: "accroche",
              type: "textarea",
              label: "Accroche",
              validate: requisEnFrancais,
              localized: true,
              admin: { description: "Deux ou trois lignes, affichées sous le titre." },
            },
            {
              name: "objectifs",
              type: "textarea",
              label: "Objectifs de la formation",
              validate: requisEnFrancais,
              localized: true,
            },
            {
              name: "certification",
              type: "text",
              label: "Certification délivrée",
              localized: true,
              admin: {
                description: "À laisser vide si la formation ne prépare pas à une certification.",
              },
            },
            {
              type: "row",
              fields: [
                {
                  name: "dureeHeures",
                  type: "number",
                  label: "Durée (heures)",
                  required: true,
                  min: 1,
                  admin: { width: "33%" },
                },
                {
                  name: "rythme",
                  type: "text",
                  label: "Rythme",
                  validate: requisEnFrancais,
                  localized: true,
                  admin: { width: "34%", placeholder: "8 semaines" },
                },
                {
                  name: "langue",
                  type: "text",
                  label: "Langue d'animation",
                  required: true,
                  defaultValue: "Français",
                  admin: { width: "33%" },
                },
              ],
            },
          ],
        },
        {
          label: "Public & compétences",
          fields: [
            {
              name: "publicVise",
              type: "array",
              label: "Public visé",
              labels: { singular: "Profil", plural: "Profils" },
              minRows: 1,
              fields: [
                {
                  name: "valeur",
                  type: "text",
                  label: "Profil",
                  validate: requisEnFrancais,
                  localized: true,
                },
              ],
            },
            {
              name: "competences",
              type: "array",
              label: "Compétences visées",
              labels: { singular: "Compétence", plural: "Compétences" },
              minRows: 1,
              fields: [
                {
                  name: "valeur",
                  type: "text",
                  label: "Compétence",
                  validate: requisEnFrancais,
                  localized: true,
                },
              ],
            },
            {
              name: "prerequis",
              type: "textarea",
              label: "Pré-requis",
              validate: requisEnFrancais,
              localized: true,
            },
            {
              name: "livrables",
              type: "array",
              label: "Livrables remis aux participants",
              labels: { singular: "Livrable", plural: "Livrables" },
              admin: {
                description:
                  "Ce que le participant emporte : support, replays, corrigés, grilles de lecture.",
              },
              fields: [
                {
                  name: "valeur",
                  type: "text",
                  label: "Livrable",
                  validate: requisEnFrancais,
                  localized: true,
                },
              ],
            },
            {
              name: "outils",
              type: "array",
              label: "Outils et bonus inclus",
              labels: { singular: "Outil", plural: "Outils" },
              admin: {
                description:
                  "Ressources fournies en plus du cours : templates Excel, Word, PowerPoint, cas fil rouge.",
              },
              fields: [
                {
                  name: "valeur",
                  type: "text",
                  label: "Outil",
                  validate: requisEnFrancais,
                  localized: true,
                },
              ],
            },
            {
              name: "positionnement",
              type: "text",
              label: "Positionnement",
              localized: true,
              admin: {
                placeholder: "Posture DAF · Pilotage, contrôle, cash & financement",
                description: "Deux ou trois mots : la posture que le parcours vise.",
              },
            },
            {
              name: "approche",
              type: "array",
              label: "Approche pédagogique",
              labels: { singular: "Point", plural: "Points" },
              admin: {
                description: "Comment le parcours est mené : live, cas fil rouge, ateliers.",
              },
              fields: [
                {
                  name: "valeur",
                  type: "text",
                  label: "Point",
                  validate: requisEnFrancais,
                  localized: true,
                },
              ],
            },
            {
              name: "mentionsLegales",
              type: "textarea",
              label: "Mentions légales",
              localized: true,
              admin: {
                description:
                  "Mention imposée par un tiers, affichée sous la fiche. Exemple : PMP® est une marque du Project Management Institute ; les frais d'examen ne sont pas inclus.",
              },
            },
            {
              name: "debouches",
              type: "array",
              label: "Débouchés professionnels",
              labels: { singular: "Débouché", plural: "Débouchés" },
              minRows: 1,
              fields: [
                {
                  name: "valeur",
                  type: "text",
                  label: "Métier",
                  validate: requisEnFrancais,
                  localized: true,
                },
              ],
            },
          ],
        },
        {
          label: "Plan de cours",
          description:
            "Titre et durée suffisent. Les objectifs par leçon ne servent qu'au e-learning, qui n'est pas au programme cette année.",
          fields: [
            {
              name: "modules",
              type: "array",
              label: "Modules",
              labels: { singular: "Module", plural: "Modules" },
              minRows: 1,
              admin: {
                initCollapsed: true,
                components: {
                  RowLabel: "@/collections/EtiquetteModule#EtiquetteModule",
                },
              },
              fields: [
                {
                  name: "titre",
                  type: "text",
                  label: "Titre du module",
                  validate: requisEnFrancais,
                  localized: true,
                },
                {
                  name: "livrables",
                  type: "text",
                  label: "Livrables de la séance",
                  localized: true,
                  admin: {
                    placeholder: "diagnostic finance ; plan d'action 90 jours",
                    description: "Ce que la séance produit. Affiché sous son objectif.",
                  },
                },
                {
                  name: "objectif",
                  type: "textarea",
                  label: "Objectif de la séance",
                  localized: true,
                  admin: {
                    description:
                      "Une phrase : ce que la séance vise. Affichée quand le module est déplié.",
                  },
                },
                {
                  name: "lecons",
                  type: "array",
                  label: "Leçons",
                  labels: { singular: "Leçon", plural: "Leçons" },
                  minRows: 1,
                  fields: [
                    {
                      type: "row",
                      fields: [
                        {
                          name: "titre",
                          type: "text",
                          label: "Titre",
                          validate: requisEnFrancais,
                          localized: true,
                          admin: { width: "70%" },
                        },
                        {
                          name: "dureeMinutes",
                          type: "number",
                          label: "Durée (minutes)",
                          required: true,
                          min: 5,
                          admin: { width: "30%" },
                        },
                      ],
                    },
                    /*
                      BE-04 — les deux colonnes que le LMS remplira.

                      `lib/types.ts` les annonce depuis le début : « les champs
                      optionnels existent dans le schéma et restent vides ».
                      C'était faux — ils n'existaient que dans l'interface
                      TypeScript, et la base n'en portait aucune trace. Le
                      contrat et le schéma disent maintenant la même chose.

                      Ils sont masqués dans l'administration : personne n'a de
                      quoi les remplir cette année (décision A), et deux champs
                      vides sous chaque leçon feraient hésiter l'équipe à chaque
                      saisie. Le jour du LMS, il suffira de retirer `hidden`.

                      Les déclarer maintenant évite surtout la friction connue :
                      une colonne ajoutée plus tard demande de pousser le schéma
                      en production *avant* le code, sous peine de build cassé.
                    */
                    {
                      name: "objectif",
                      type: "text",
                      label: "Objectif de la leçon",
                      localized: true,
                      admin: {
                        hidden: true,
                        description: "Réservé au LMS. Non renseigné cette année.",
                      },
                    },
                    {
                      name: "contenuId",
                      type: "text",
                      label: "Contenu rattaché",
                      admin: {
                        hidden: true,
                        description: "Réservé au LMS : vidéo, support, quiz.",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
