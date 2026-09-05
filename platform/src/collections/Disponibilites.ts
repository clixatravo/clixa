import type { GlobalConfig } from "payload";
import { connecte } from "@/access/roles";

/**
 * Quand le Responsable Orientation peut prendre un appel.
 *
 * ── Pourquoi un global, et pas une collection ───────────────────────────────
 * Une seule personne reçoit les prospects. Une collection « disponibilités »
 * demanderait de choisir de qui l'on parle à chaque lecture, pour une réponse
 * qui serait toujours la même. Le jour où l'équipe s'étoffe, ce global devient
 * une collection avec une relation vers `utilisateurs` — les créneaux calculés
 * ne changent pas de forme pour autant.
 *
 * ── ⚠️ Des heures hebdomadaires, pas un calendrier ──────────────────────────
 * On déclare « lundi 9h–12h », pas « lundi 6 octobre 9h–12h ». Un calendrier
 * qu'il faut remplir chaque semaine finit par ne plus être rempli, et un robot
 * qui propose des créneaux dans un calendrier vide ne propose rien. Les
 * exceptions — un jour de fermeture, un déplacement — se posent à part.
 *
 * ── ⚠️ Tout est en UTC, comme les sessions ──────────────────────────────────
 * C'est déjà le fuseau du catalogue et celui des cadences. En mêler un second
 * ici ferait exactement ce qui a produit la séance de zéro minute : deux
 * façons de dire une heure, et rien qui les confronte.
 */
export const Disponibilites: GlobalConfig = {
  slug: "disponibilites",
  label: "Disponibilités des appels",
  admin: {
    group: "Admissions",
    description:
      "Les heures où un conseiller peut être appelé. Le robot ne propose que des créneaux pris là-dedans.",
  },
  access: {
    /*
      ⚠️ Lecture réservée, contrairement au barème. Ces heures ne sont pas une
      information publique : les créneaux libres se calculent au serveur et
      seuls les trois prochains sont proposés. Publier l'agenda entier
      dirait à qui le lit quand personne ne répond au téléphone.
    */
    read: connecte,
    update: connecte,
  },
  fields: [
    {
      name: "actif",
      type: "checkbox",
      label: "Proposer des rendez-vous",
      defaultValue: false,
      admin: {
        description:
          "Décoché, le robot ne propose aucun créneau et invite à écrire. À cocher une fois les heures renseignées.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "dureeMinutes",
          type: "number",
          label: "Durée d'un appel (minutes)",
          defaultValue: 20,
          min: 5,
          max: 120,
          required: true,
          admin: { width: "50%" },
        },
        {
          name: "delaiMinimumHeures",
          type: "number",
          label: "Prévenir au moins (heures) à l'avance",
          defaultValue: 2,
          min: 0,
          max: 168,
          required: true,
          admin: {
            width: "50%",
            description: "Un créneau dans dix minutes ne laisse le temps à personne de s'y rendre.",
          },
        },
      ],
    },
    {
      name: "semaine",
      type: "array",
      label: "Heures d'ouverture",
      labels: { singular: "Plage", plural: "Plages" },
      admin: {
        description:
          "Une ligne par plage. « Lundi 9h00–12h00 » et « Lundi 14h00–17h00 » font deux lignes.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "jour",
              type: "select",
              label: "Jour",
              required: true,
              admin: { width: "34%" },
              /*
                ⚠️ La valeur est le numéro de `getUTCDay()` : dimanche vaut 0.
                Stocker le nom obligerait à le traduire pour comparer, et c'est
                une table de correspondance de plus à tenir juste.
              */
              options: [
                { label: "Lundi", value: "1" },
                { label: "Mardi", value: "2" },
                { label: "Mercredi", value: "3" },
                { label: "Jeudi", value: "4" },
                { label: "Vendredi", value: "5" },
                { label: "Samedi", value: "6" },
                { label: "Dimanche", value: "0" },
              ],
            },
            {
              name: "debut",
              type: "text",
              label: "De (UTC)",
              required: true,
              admin: { width: "33%", placeholder: "09:00" },
            },
            {
              name: "fin",
              type: "text",
              label: "À (UTC)",
              required: true,
              admin: { width: "33%", placeholder: "12:00" },
            },
          ],
        },
      ],
    },
    {
      name: "fermetures",
      type: "array",
      label: "Jours fermés",
      labels: { singular: "Fermeture", plural: "Fermetures" },
      admin: {
        description: "Congés, déplacements, jours fériés. Aucun créneau n'y est proposé.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "jour",
              type: "date",
              label: "Date",
              required: true,
              admin: {
                width: "50%",
                date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" },
              },
            },
            {
              name: "motif",
              type: "text",
              label: "Motif",
              admin: { width: "50%", placeholder: "Aïd, déplacement Abidjan…" },
            },
          ],
        },
      ],
    },
  ],
};
