import { echapper, gabaritHtmlEmail } from "@/lib/courriel";
import type { CollectionBeforeChangeHook, CollectionConfig } from "payload";
import { connecte, reserveA } from "@/access/roles";
import { paysValideFacultatif } from "./champs";
import { exigerUnMotDePasseSolide } from "@/lib/mot-de-passe";

/**
 * BE-18 — Les comptes des participants.
 *
 * Distincts des `Utilisateurs`, qui sont les comptes du back-office. La
 * séparation n'est pas cosmétique : `admin.user` ne désigne qu'une collection,
 * et c'est celle du personnel. Un participant ne peut donc pas atteindre
 * /admin, quoi qu'il tente — la garantie tient à la configuration, pas à une
 * règle qu'on aurait pu oublier d'écrire.
 *
 * ── Pourquoi le compte vient après, jamais avant ────────────────────────────
 * Le tunnel d'inscription n'en demande pas. Un mot de passe à retenir avant
 * même d'avoir payé écarte des inscrits, et la référence du dossier suffit à y
 * revenir. Le compte se crée ensuite, pour qui veut retrouver plusieurs
 * dossiers au même endroit — et ses inscriptions passées s'y rattachent
 * d'elles-mêmes, par l'adresse.
 *
 * ── Ce que le compte ne fait pas ────────────────────────────────────────────
 * Il ne donne accès à aucun contenu de formation : le LMS n'est pas au
 * programme cette année (décision A). Il montre des dossiers, des échéances et
 * des dates.
 */
/**
 * Ce qu'un participant ne réécrit pas lui-même, même sur sa propre fiche.
 *
 * ⚠️ **Trouvé en audit le 1er octobre 2026, et éprouvé avant d'être corrigé.**
 * La règle `update` laisse un participant modifier sa fiche — son nom, son
 * numéro, son pays. Mais l'API REST acceptait tout le reste avec : son adresse,
 * son identifiant Google, « adresse vérifiée » et `_verified`. `admin.readOnly`
 * ne fermait que la case de l'écran.
 *
 * L'adresse était la porte qui compte. La connexion Google cherche un compte
 * **par adresse** quand elle ne le trouve pas par identifiant, l'y rattache, puis
 * y accroche tous les dossiers de cette adresse (`rattacherParAdresse`).
 * Quelqu'un ouvrait donc un compte, le réécrivait à l'adresse d'une autre
 * personne qui n'en avait pas encore, et attendait : à la première connexion
 * Google de celle-ci, ses dossiers — nom, téléphone, échéancier, référence —
 * arrivaient dans un compte dont l'autre connaissait le mot de passe.
 *
 * Ces champs sont donc retirés de toute écriture faite **par un participant**.
 * L'équipe les corrige depuis /admin ; les routes du site écrivent sans
 * utilisateur (`overrideAccess`), et ne sont pas concernées. Le mot de passe,
 * lui, reste modifiable : changer le sien est un geste légitime.
 */
const CHAMPS_DE_CONNEXION = ["email", "googleId", "emailVerifie", "_verified"] as const;

export const figerLesChampsDeConnexion: CollectionBeforeChangeHook = ({
  req,
  data,
  originalDoc,
  operation,
}) => {
  if (operation !== "update" || req.user?.collection !== "apprenants" || !originalDoc) return data;
  /*
    ⚠️ On remet la valeur d'avant, on ne retire pas la clef. À ce stade
    `data` porte la fiche entière, fusionnée : retirer `email` faisait échouer
    la validation sur toute écriture, nom compris — un participant ne pouvait
    plus rien corriger. C'est le témoin de la garde qui l'a montré.
  */
  const garde: Record<string, unknown> = { ...data };
  const avant = originalDoc as Record<string, unknown>;
  for (const champ of CHAMPS_DE_CONNEXION) {
    if (champ in avant) garde[champ] = avant[champ];
    else delete garde[champ];
  }
  return garde;
};

export const Apprenants: CollectionConfig = {
  slug: "apprenants",
  labels: { singular: "Participant", plural: "Participants" },
  auth: {
    /*
      ── Le cookie de session porte le drapeau `Secure` en production ─────────
      Sans lui, le cookie voyage aussi sur une connexion en clair : il suffit
      d'un lien en `http://` pour que la session parte en lisible. Les
      navigateurs qui cloisonnent les cookies posés au retour d'un site tiers
      — le retour de Google en est un — traitent aussi moins bien un cookie non
      marqué.

      ⚠️ Conditionné à l'environnement : posé en développement, le cookie ne
      serait jamais accepté sur `http://localhost`, et la connexion locale
      cesserait de fonctionner sans que rien ne l'explique.
    */
    cookies: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
    },
    // Une session qui dure : personne ne revient sur son dossier chaque jour.
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 10,
    lockTime: 10 * 60 * 1000,

    /*
      ── L'adresse doit être prouvée avant que le compte serve ───────────────
      Sans cela, un compte s'ouvre avec n'importe quelle adresse : celle d'un
      autre, ou aucune. C'est ce qui obligeait à réclamer aussi la référence du
      dossier pour rattacher quoi que ce soit — une précaution qui compensait
      l'absence de preuve.

      Le contrôle revient à sa place : Payload envoie un lien, et le compte
      reste inutilisable tant qu'il n'est pas suivi. Un robot qui remplit le
      formulaire n'obtient rien.

      ⚠️ Les comptes ouverts par Google sont créés vérifiés — Google atteste
      déjà que la personne contrôle l'adresse, et lui redemander une preuve
      qu'il vient de fournir n'aurait aucun sens. Voir `api/auth/google/retour`.
    */
    verify: {
      generateEmailSubject: () => "Confirmez votre adresse — CLIXA Institute",
      generateEmailHTML: ({ token, user }) =>
        gabaritHtmlEmail({
          titre: "Confirmez votre adresse",
          soustitre: "Une dernière étape avant d'accéder à votre espace",
          corpsHtml: `
            <p style="margin: 0 0 16px 0;">Bonjour ${echapper((user as { nom?: string })?.nom ?? "")},</p>
            <p style="margin: 0 0 16px 0;">
              Votre accès est presque prêt. Il ne manque qu'une confirmation : elle
              nous assure que cette adresse est bien la vôtre, et c'est elle qui
              vous permettra de retrouver vos dossiers.
            </p>
            <p style="margin: 0 0 16px 0; color: #94a3b8; font-size: 13px;">
              Si vous n'avez pas demandé d'accès, ce message ne vous concerne pas :
              sans confirmation, rien ne s'ouvre.
            </p>
          `,
          boutonTexte: "Confirmer mon adresse",
          boutonLien: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/compte/confirmer?token=${token}`,
        }),
    },
  },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "nom", "pays"],
    group: "Admissions",
    description:
      "Les comptes que les participants créent eux-mêmes. Le personnel les consulte, il ne les crée pas.",
  },
  hooks: {
    beforeOperation: [exigerUnMotDePasseSolide],
    beforeChange: [figerLesChampsDeConnexion],
  },
  access: {
    /*
      Le personnel lit tout ; un participant ne lit que sa propre fiche.
      Sans la seconde branche, il ne pourrait pas consulter son compte ; sans la
      première, l'équipe ne pourrait pas l'aider au téléphone.
    */
    read: ({ req }) => {
      if (!req.user) return false;
      if (req.user.collection === "utilisateurs") return true;
      return { id: { equals: req.user.id } };
    },
    // La création passe par le formulaire public, qui appelle l'API en interne.
    create: () => false,
    update: ({ req }) => {
      if (!req.user) return false;
      if (req.user.collection === "utilisateurs") return true;
      return { id: { equals: req.user.id } };
    },
    delete: reserveA(),
    // Sécurité de fond : jamais d'accès au back-office depuis ce compte.
    admin: () => false,
    unlock: connecte,
  },
  fields: [
    {
      name: "nom",
      type: "text",
      label: "Nom complet",
      required: true,
    },
    {
      type: "row",
      fields: [
        {
          name: "telephone",
          type: "text",
          label: "WhatsApp",
          admin: { width: "50%" },
        },
        {
          name: "pays",
          type: "text",
          label: "Pays",
          admin: { width: "50%" },
          validate: paysValideFacultatif,
        },
      ],
    },
    {
      /*
        L'identifiant Google du participant, quand il s'est connecté ainsi.

        C'est lui la clef du rattachement, jamais l'adresse : Google laisse
        changer l'adresse d'un compte, et quelqu'un peut récupérer une adresse
        abandonnée par un autre. L'identifiant, lui, ne se réattribue pas.

        Vide pour qui s'est inscrit avec un mot de passe. Les deux chemins
        mènent au même compte — voir `lib/google.ts`.
      */
      name: "googleId",
      type: "text",
      label: "Identifiant Google",
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: "Renseigné automatiquement à la première connexion Google.",
      },
    },
    {
      /*
        Une adresse vérifiée par Google est une adresse prouvée — ce que le
        formulaire, lui, ne prouve pas. C'est ce drapeau qui autorise à
        rattacher un dossier sur la seule adresse, sans demander la référence.
      */
      name: "emailVerifie",
      type: "checkbox",
      label: "Adresse vérifiée",
      defaultValue: false,
      admin: {
        readOnly: true,
        description: "Vraie quand Google a confirmé l'adresse.",
      },
    },
  ],
};
