import type { Payload } from "payload";

/**
 * BE-16 — Les courriels que la plateforme envoie.
 *
 * ── Pourquoi si peu de mise en forme ────────────────────────────────────────
 * Un message transactionnel se lit dans une notification, souvent sur un
 * téléphone, souvent en diagonale. Le texte simple passe partout, ne finit pas
 * en spam pour cause d'images distantes, et reste lisible quand le client de
 * messagerie décide de tout dépouiller.
 *
 * ── Pourquoi un envoi qui n'échoue jamais ───────────────────────────────────
 * Un courriel qui ne part pas ne doit pas empêcher une inscription d'exister.
 * La place est retenue, le dossier est en base : c'est l'essentiel. On note
 * l'échec dans les journaux et on continue.
 *
 * Sans adaptateur configuré — pas de clé Resend — Payload écrit les messages
 * dans la console au lieu de les envoyer. Le tunnel fonctionne donc en
 * développement sans qu'aucun courriel ne parte pour de vrai.
 */

/** Où arrivent les notifications internes. À défaut, personne n'est prévenu. */
const EQUIPE = process.env.EMAIL_EQUIPE;

const EUROS = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const JOUR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

export interface CourrielInscription {
  reference: string;
  apprenantNom: string;
  apprenantEmail: string;
  apprenantWhatsapp: string;
  apprenantPays: string;
  programmeTitre: string;
  sessionLibelle: string;
  planLibelle: string;
  montantTotal: number;
  echeances: { montant: number; dateLimite?: string }[];
  urlDossier: string;
}

async function envoyer(
  payload: Payload,
  message: { to: string; subject: string; text: string },
): Promise<void> {
  try {
    await payload.sendEmail(message);
  } catch (e) {
    // Voir l'en-tête : une inscription vaut mieux qu'un accusé de réception.
    payload.logger.error({ err: e, to: message.to }, "[courriel] envoi impossible");
  }
}

/** Au participant : sa référence, son échéancier, et où revenir. */
export async function courrielParticipant(payload: Payload, d: CourrielInscription): Promise<void> {
  const lignes = d.echeances.map(
    (e, i) =>
      `  ${i + 1}. ${EUROS.format(e.montant)}` +
      (e.dateLimite ? ` — à régler avant le ${JOUR.format(new Date(e.dateLimite))}` : ""),
  );

  await envoyer(payload, {
    to: d.apprenantEmail,
    subject: `Votre place est retenue — ${d.programmeTitre}`,
    text: [
      `Bonjour ${d.apprenantNom},`,
      "",
      `Votre place est retenue pour « ${d.programmeTitre} ».`,
      `Session : ${d.sessionLibelle}`,
      `Référence de votre dossier : ${d.reference}`,
      "",
      `Règlement choisi : ${d.planLibelle} — ${EUROS.format(d.montantTotal)} au total`,
      ...lignes,
      "",
      "Ce qu'il reste à faire :",
      "  1. Envoyer la première échéance par Western Union, Ria ou MoneyGram.",
      `  2. Nous transmettre le numéro de transfert par WhatsApp, en citant ${d.reference}.`,
      "  3. Nous vérifions et confirmons votre place.",
      "",
      "Votre dossier, à conserver :",
      d.urlDossier,
      "",
      "À bientôt,",
      "CLIXA Institute",
    ].join("\n"),
  });
}

/** À l'équipe : de quoi rappeler sans ouvrir le back-office. */
export async function courrielEquipe(payload: Payload, d: CourrielInscription): Promise<void> {
  if (!EQUIPE) {
    payload.logger.warn("[courriel] EMAIL_EQUIPE absent : personne n'est prévenu des inscriptions");
    return;
  }

  await envoyer(payload, {
    to: EQUIPE,
    subject: `Nouvelle inscription — ${d.apprenantNom} — ${d.programmeTitre}`,
    text: [
      `${d.apprenantNom} (${d.apprenantPays}) a retenu une place.`,
      "",
      `Parcours : ${d.programmeTitre}`,
      `Session : ${d.sessionLibelle}`,
      `Règlement : ${d.planLibelle} — ${EUROS.format(d.montantTotal)}`,
      `Référence : ${d.reference}`,
      "",
      `E-mail : ${d.apprenantEmail}`,
      `WhatsApp : ${d.apprenantWhatsapp}`,
      "",
      "Le transfert est à rapprocher dans le back-office quand il arrivera.",
    ].join("\n"),
  });
}

/**
 * À l'équipe : un participant dit avoir fait son transfert.
 *
 * C'est le message qui remplace le « je vous ai envoyé l'argent » reçu par
 * WhatsApp, hors de tout dossier. Il porte le numéro de transfert et la
 * référence ensemble : c'est le rapprochement qui coûtait le plus de temps,
 * puisqu'il fallait retrouver de quel dossier parlait le message.
 *
 * Rien n'est encaissé pour autant. L'échéance passe en « annoncé » — vérifier
 * le transfert, et le passer en « réglé », reste un geste humain.
 */
export async function courrielTransfert(
  payload: Payload,
  d: {
    reference: string;
    apprenantNom: string;
    apprenantWhatsapp: string;
    programmeTitre: string;
    moyen: string;
    numero: string;
    montant: number;
  },
): Promise<void> {
  if (!EQUIPE) {
    payload.logger.warn("[courriel] EMAIL_EQUIPE absent : personne n'est prévenu des transferts");
    return;
  }

  await envoyer(payload, {
    to: EQUIPE,
    subject: `Transfert annoncé — ${d.reference} — ${d.apprenantNom}`,
    text: [
      `${d.apprenantNom} déclare avoir envoyé ${EUROS.format(d.montant)}.`,
      "",
      `Moyen : ${d.moyen}`,
      `Numéro de transfert : ${d.numero}`,
      `Référence du dossier : ${d.reference}`,
      `Parcours : ${d.programmeTitre}`,
      `WhatsApp : ${d.apprenantWhatsapp}`,
      "",
      "L'échéance est passée en « annoncé ». Elle attend la vérification du",
      "transfert pour être marquée réglée dans le back-office.",
    ].join("\n"),
  });
}

/** À l'équipe : quelqu'un demande à être rappelé. */
export async function courrielRappel(
  payload: Payload,
  d: {
    nom: string;
    email: string;
    whatsapp: string;
    pays: string;
    programme?: string;
    plan?: string;
  },
): Promise<void> {
  if (!EQUIPE) return;

  await envoyer(payload, {
    to: EQUIPE,
    subject: `Demande de rappel — ${d.nom}`,
    text: [
      `${d.nom} (${d.pays}) demande à être rappelé.`,
      "",
      d.programme ? `Formation : ${d.programme}` : "Formation : non précisée",
      d.plan ? `Rythme envisagé : ${d.plan}` : "",
      "",
      `E-mail : ${d.email}`,
      `WhatsApp : ${d.whatsapp}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

/**
 * Relance d'échéance.
 *
 * Le ton compte : la personne a déjà retenu sa place et souvent déjà payé une
 * fois. Ce n'est pas un recouvrement, c'est un rappel. On donne le montant, la
 * date, la référence et le lien — de quoi agir sans avoir à chercher.
 */
export async function courrielRelance(
  payload: Payload,
  d: {
    reference: string;
    apprenantNom: string;
    apprenantEmail: string;
    programmeTitre: string;
    montant: number;
    dateLimite: string;
    enRetard: boolean;
    urlDossier: string;
  },
): Promise<void> {
  const quand = JOUR.format(new Date(d.dateLimite));

  await envoyer(payload, {
    to: d.apprenantEmail,
    subject: d.enRetard
      ? `Échéance dépassée — ${d.programmeTitre}`
      : `Prochaine échéance le ${quand} — ${d.programmeTitre}`,
    text: [
      `Bonjour ${d.apprenantNom},`,
      "",
      d.enRetard
        ? `Une échéance de ${EUROS.format(d.montant)} était attendue le ${quand} pour « ${d.programmeTitre} ».`
        : `Votre prochaine échéance de ${EUROS.format(d.montant)} est à régler avant le ${quand}, pour « ${d.programmeTitre} ».`,
      "",
      "Le règlement se fait par Western Union, Ria ou MoneyGram.",
      `Pensez à citer la référence ${d.reference} et à nous transmettre le numéro de transfert par WhatsApp.`,
      "",
      "Votre dossier :",
      d.urlDossier,
      "",
      "Si le transfert est déjà parti, ce message n'appelle pas de réponse : nous le rapprocherons.",
      "",
      "CLIXA Institute",
    ].join("\n"),
  });
}

/** À l'équipe : le récapitulatif de ce que la relance a fait. */
export async function courrielBilanRelances(payload: Payload, lignes: string[]): Promise<void> {
  if (!EQUIPE || lignes.length === 0) return;

  await envoyer(payload, {
    to: EQUIPE,
    subject: `Relances envoyées — ${lignes.length} échéance(s)`,
    text: ["Les participants suivants ont été relancés :", "", ...lignes].join("\n"),
  });
}
