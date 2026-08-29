import { RESEAUX_CLIXA } from "@/lib/reseaux";
import type { Payload } from "payload";

/**
 * BE-16 — Courriels exécutifs & transactionnels CLIXA Institute.
 *
 * Chaque message part à la fois en texte brut (pour compatibilité universelle et anti-spam)
 * et en HTML structuré haute définition avec l'identité de marque (Or & Encre),
 * la signature de l'institut et les coordonnées complètes de contact.
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
  /**
   * Jusqu'à quand la place est tenue sans versement.
   *
   * ⚠️ Ce courriel a pour objet « Place retenue ». Sans terme écrit, il promet
   * plus que le système ne tient : la place repart au catalogue au bout de sept
   * jours. Calculé par l'appelant, à partir de `finDeLaTenue`.
   */
  tenueJusquau?: string;
  /** Ce que le participant a demandé à recevoir pour régler. */
  moyenSouhaite?: "carte" | "virement" | "transfert";
}

/**
 * Ce que l'équipe doit lui envoyer, dit dans les deux sens.
 *
 * Au participant : ce qu'il va recevoir, pour qu'il attende la bonne chose.
 * À l'équipe : ce qu'elle doit préparer, pour qu'elle n'ait pas à rouvrir le
 * dossier — c'est l'aller-retour qui coûtait le plus de temps.
 */
const ATTENDU = {
  carte: {
    participant: "un lien de paiement bancaire sécurisé",
    equipe: "Envoyer le LIEN DE PAIEMENT bancaire",
  },
  virement: {
    participant: "notre RIB, avec le motif à indiquer",
    equipe: "Envoyer le RIB",
  },
  transfert: {
    participant: "les coordonnées du bénéficiaire (Western Union, Ria ou MoneyGram)",
    equipe: "Envoyer les COORDONNÉES DE TRANSFERT",
  },
} as const;

/**
 * Gabarit HTML universel CLIXA Institute.
 * Rendu compatible Outlook, Gmail, Apple Mail, iOS et Android.
 */
/**
 * Échapper avant d'écrire dans un document HTML.
 *
 * ⚠️ La moitié de ce que portent ces courriels vient du formulaire public : le
 * nom, l'adresse, le numéro, le pays. Interpolés tels quels, ils permettaient
 * d'y glisser une balise — un lien, une image, un bloc entier — dans un message
 * que l'équipe ouvre en confiance parce qu'il vient de son propre site.
 *
 * Un client de messagerie n'exécute pas de script, mais il rend le HTML : ce
 * n'est donc pas une exécution de code, c'est une falsification de contenu.
 * Elle suffit à faire cliquer quelqu'un.
 *
 * Les cinq caractères qui comptent ; au-delà, on réécrit un moteur de gabarit.
 */
/*
  ⚠️ Ne s'applique qu'au HTML. La version texte d'un courriel — et son sujet —
  ne sont pas rendus : y échapper afficherait « &#39; » à la place d'une
  apostrophe. Les deux versions portent les mêmes valeurs et demandent des
  traitements opposés.
*/
export function echapper(valeur: unknown): string {
  return String(valeur ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function gabaritHtmlEmail({
  titre,
  soustitre,
  corpsHtml,
  boutonTexte,
  boutonLien,
  badgeRef,
}: {
  titre: string;
  soustitre?: string;
  corpsHtml: string;
  boutonTexte?: string;
  boutonLien?: string;
  badgeRef?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titre}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080c18; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #f3efe4;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #080c18; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Container principal 600px -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0f172a; border-radius: 12px; border: 1px solid rgba(201, 162, 76, 0.25); overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
          
          <!-- En-tête Institutionnel -->
          <tr>
            <td style="background-color: #080c18; border-bottom: 2px solid #c9a24c; padding: 28px 32px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 38px; height: 38px; background-color: #111a33; border: 1px solid #c9a24c; border-radius: 6px; text-align: center; vertical-align: middle;">
                          <span style="font-family: Georgia, serif; font-weight: bold; font-size: 18px; color: #c9a24c; line-height: 38px;">C</span>
                        </td>
                        <td style="padding-left: 14px;">
                          <div style="font-family: Georgia, serif; font-size: 20px; font-weight: bold; letter-spacing: 0.05em; color: #f3efe4;">
                            CLIXA<span style="color: #c9a24c;">.</span>
                          </div>
                          <div style="font-size: 10px; font-family: 'SF Mono', Menlo, Consolas, monospace; letter-spacing: 0.12em; text-transform: uppercase; color: #c9a24c; margin-top: 2px;">
                            Executive Education · Afrique
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  ${
                    badgeRef
                      ? `<td align="right">
                    <!-- La référence tient sur une ligne : depuis qu'elle compte huit
                         symboles au lieu de cinq, elle se coupait en deux dans l'en-tête
                         — « CLX- » d'un côté, le reste de l'autre. Une référence à moitié
                         lisible est une référence qu'on recopie de travers. -->
                    <div style="display: inline-block; background-color: rgba(201, 162, 76, 0.1); border: 1px solid rgba(201, 162, 76, 0.35); border-radius: 4px; padding: 4px 10px; font-family: 'SF Mono', Menlo, monospace; font-size: 11px; color: #e9cd84; font-weight: bold; white-space: nowrap;">
                      ${badgeRef}
                    </div>
                  </td>`
                      : ""
                  }
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps du message -->
          <tr>
            <td style="padding: 36px 32px;">
              <h1 style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 24px; font-weight: bold; color: #ffffff; line-height: 1.3;">
                ${titre}
              </h1>
              ${
                soustitre
                  ? `<div style="font-size: 14px; color: #b9b7ac; margin-bottom: 24px; line-height: 1.5;">${soustitre}</div>`
                  : `<div style="margin-bottom: 20px;"></div>`
              }

              <!-- Contenu spécifique -->
              <div style="font-size: 15px; line-height: 1.65; color: #e2e8f0;">
                ${corpsHtml}
              </div>

              <!-- Bouton d'action principal -->
              ${
                boutonTexte && boutonLien
                  ? `<div style="margin: 32px 0 20px 0; text-align: center;">
                <a href="${boutonLien}" style="display: inline-block; background-color: #c9a24c; color: #080c18; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 6px; box-shadow: 0 4px 12px rgba(201, 162, 76, 0.35);">
                  ${boutonTexte} &rarr;
                </a>
              </div>`
                  : ""
              }
            </td>
          </tr>

          <!-- Bloc Signature & Canaux de Contact Officiels -->
          <tr>
            <td style="background-color: #0b1122; border-top: 1px solid rgba(243, 239, 228, 0.1); padding: 28px 32px;">
              <div style="font-size: 11px; font-family: 'SF Mono', Menlo, monospace; color: #c9a24c; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold; margin-bottom: 12px;">
                ✦ Direction des Admissions & Relations Entreprises
              </div>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 18px;">
                <tr>
                  <td style="font-size: 13px; color: #cbd5e1; line-height: 1.8;">
                    <div><strong>💬 WhatsApp Admissions :</strong> <a href="${RESEAUX_CLIXA.whatsapp.url}" style="color: #2fa37d; text-decoration: none; font-weight: bold;">${RESEAUX_CLIXA.whatsapp.numeroAffiche}</a></div>
                    <div><strong>✉️ Courriel Officiel :</strong> <a href="mailto:contact@clixa.africa" style="color: #e9cd84; text-decoration: none;">contact@clixa.africa</a></div>
                    <div><strong>🌐 Portail Officiel :</strong> <a href="https://www.clixa.africa" style="color: #e9cd84; text-decoration: none;">https://www.clixa.africa</a></div>
                  </td>
                </tr>
              </table>

              <!-- Badges des Campus & Hubs -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px dashed rgba(243, 239, 228, 0.1); padding-top: 14px;">
                <tr>
                  <td style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
                    <span style="color: #e9cd84; font-weight: bold;">Présence Panafricaine :</span> Agadir · Abidjan · Dakar · Classe Virtuelle
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pied de page légal -->
          <tr>
            <td style="background-color: #060913; padding: 20px 32px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5;">
              CLIXA Institute — Institut Panafricain de Formation Continue & Certifications Exécutives.<br>
              Ce courriel vous a été adressé dans le cadre de votre démarche pédagogique officielle.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function envoyer(
  payload: Payload,
  message: { to: string; subject: string; text: string; html?: string },
): Promise<void> {
  try {
    await payload.sendEmail(message);
  } catch (e) {
    payload.logger.error({ err: e, to: message.to }, "[courriel] envoi impossible");
  }
}

/** Au participant : confirmation de place, récapitulatif du dossier et coordonnées de contact. */
export async function courrielParticipant(payload: Payload, d: CourrielInscription): Promise<void> {
  const lignesTexte = d.echeances.map(
    (e, i) =>
      `  ${i + 1}. ${EUROS.format(e.montant)}` +
      (e.dateLimite ? ` — à régler avant le ${JOUR.format(new Date(e.dateLimite))}` : ""),
  );

  const echeancesHtml = d.echeances
    .map(
      (e, i) => `
      <tr style="border-bottom: 1px solid rgba(243, 239, 228, 0.08);">
        <td style="padding: 10px 12px; font-size: 13px; color: #e2e8f0;">Échéance ${i + 1}</td>
        <td style="padding: 10px 12px; font-size: 13px; font-family: monospace; font-weight: bold; color: #e9cd84; text-align: right;">${EUROS.format(e.montant)}</td>
        <td style="padding: 10px 12px; font-size: 12px; color: #94a3b8; text-align: right;">${e.dateLimite ? JOUR.format(new Date(e.dateLimite)) : "À la réservation"}</td>
      </tr>`,
    )
    .join("");

  const corpsHtml = `
    <p style="margin-top: 0;">Bonjour <strong>${echapper(d.apprenantNom)}</strong>,</p>
    <p>Nous vous confirmons que votre place a bien été retenue pour le parcours exécutif :</p>
    
    <!-- Boîte Récapitulatif -->
    <div style="background-color: #111a33; border-left: 3px solid #c9a24c; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 4px;">${d.programmeTitre}</div>
      <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 8px;">Session : <strong>${d.sessionLibelle}</strong></div>
      <div style="font-size: 13px; color: #e9cd84;">Formule : <strong>${d.planLibelle} (${EUROS.format(d.montantTotal)})</strong></div>
    </div>
${
  d.tenueJusquau
    ? `
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #cbd5e1;">
      Cette place vous est tenue jusqu'au <strong style="color: #ffffff;">${JOUR.format(new Date(d.tenueJusquau))}</strong> — le temps qu'un transfert parte et arrive. Passé cette date, sans versement reçu, elle repart au catalogue. Votre premier versement la retient définitivement.
    </p>`
    : ""
}

    <div style="font-weight: bold; font-size: 14px; color: #ffffff; margin: 24px 0 10px 0;">Échéancier de règlement :</div>
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b1122; border-radius: 6px; border: 1px solid rgba(243, 239, 228, 0.1); margin-bottom: 24px;">
      <thead>
        <tr style="background-color: rgba(201, 162, 76, 0.1); border-bottom: 1px solid rgba(201, 162, 76, 0.2);">
          <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-family: monospace; text-transform: uppercase; color: #e9cd84;">Échéance</th>
          <th style="padding: 8px 12px; text-align: right; font-size: 11px; font-family: monospace; text-transform: uppercase; color: #e9cd84;">Montant</th>
          <th style="padding: 8px 12px; text-align: right; font-size: 11px; font-family: monospace; text-transform: uppercase; color: #e9cd84;">Date Limite</th>
        </tr>
      </thead>
      <tbody>
        ${echeancesHtml}
      </tbody>
    </table>

    <div style="font-weight: bold; font-size: 14px; color: #ffffff; margin-bottom: 12px;">Étapes pour valider définitivement votre inscription :</div>
    <ol style="margin: 0; padding-left: 20px; line-height: 1.8; color: #cbd5e1; font-size: 14px;">
      <li>Vous allez recevoir de notre part, par courriel, <strong>${ATTENDU[d.moyenSouhaite ?? "transfert"].participant}</strong>.</li>
      <li>Effectuez le versement de la 1<sup>re</sup> échéance.</li>
      <li>Indiquez-nous la référence du versement depuis votre dossier en ligne.</li>
      <li>Notre équipe vérifie, confirme votre place et vous transmet vos accès.</li>
    </ol>

    <p style="margin: 20px 0 0 0; padding: 12px 14px; background-color: #111a33; border-left: 3px solid #c9a24c; font-size: 13px; color: #cbd5e1;">
      <strong style="color: #ffffff;">Comment reconnaître nos messages.</strong> Aucun règlement ne se fait sur notre site, et nous ne vous demanderons jamais vos identifiants bancaires par courriel ni par téléphone. La date à laquelle nous vous avons envoyé de quoi régler est inscrite sur la page de votre dossier : si un message vous réclame un paiement sans y correspondre, ne le suivez pas et écrivez-nous.
    </p>
  `;

  await envoyer(payload, {
    to: d.apprenantEmail,
    subject: `Place Retenue — ${d.programmeTitre} [Dossier ${d.reference}]`,
    text: [
      `Bonjour ${d.apprenantNom},`,
      "",
      `Votre place est retenue pour « ${d.programmeTitre} ».`,
      ...(d.tenueJusquau
        ? [
            `Elle vous est tenue jusqu'au ${JOUR.format(new Date(d.tenueJusquau))} : passé cette`,
            "date, sans versement reçu, elle repart au catalogue. Votre premier versement la",
            "retient définitivement.",
          ]
        : []),
      `Session : ${d.sessionLibelle}`,
      `Référence de votre dossier : ${d.reference}`,
      "",
      `Règlement choisi : ${d.planLibelle} — ${EUROS.format(d.montantTotal)} au total`,
      ...lignesTexte,
      "",
      "Ce qu'il reste à faire :",
      "  1. Envoyer la première échéance par Western Union, Ria ou MoneyGram.",
      `  2. Nous transmettre le numéro de transfert par WhatsApp, en citant ${d.reference}.`,
      "  3. Nous vérifions et confirmons votre place.",
      "",
      "Votre dossier en ligne :",
      d.urlDossier,
      "",
      "Contact Admissions : contact@clixa.africa · https://www.clixa.africa",
      "CLIXA Institute — Direction des Admissions",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: "Votre place est retenue",
      soustitre: `Dossier d'admission officiel · ${d.sessionLibelle}`,
      badgeRef: d.reference,
      corpsHtml,
      boutonTexte: "Accéder à mon dossier en ligne",
      boutonLien: d.urlDossier,
    }),
  });
}

/**
 * À l'équipe : quelqu'un demande son contrat de formation.
 *
 * C'est le signal qui compte dans le tunnel. Une pré-inscription dit « je
 * regarde » ; une demande de contrat dit « je m'engage », et appelle un appel.
 */
export async function courrielContrat(
  payload: Payload,
  d: {
    reference: string;
    dossierId: number | string;
    apprenantNom: string;
    apprenantEmail: string;
    apprenantWhatsapp: string;
    programmeTitre: string;
  },
): Promise<void> {
  if (!EQUIPE) return;

  const corpsHtml = `
    <p style="margin: 0 0 16px 0; padding: 14px 16px; background-color: #1a1408; border-left: 3px solid #e9cd84; font-size: 15px; color: #ffffff;">
      <strong>${echapper(d.apprenantNom)} demande son contrat de formation.</strong>
      C'est le moment de l'appeler : orientation, questions, et ce qu'il faut savoir avant de signer.
    </p>
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #111a33; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 14px; line-height: 1.8;">
      <tr><td style="color: #94a3b8; width: 130px;">Parcours :</td><td style="color: #e9cd84;"><strong>${d.programmeTitre}</strong></td></tr>
      <tr><td style="color: #94a3b8;">Dossier :</td><td style="color: #e9cd84; font-family: monospace;">${d.reference}</td></tr>
      <tr><td style="color: #94a3b8;">WhatsApp :</td><td><a href="https://wa.me/${d.apprenantWhatsapp.replace(/[^0-9]/g, "")}" style="color: #2fa37d; font-weight: bold; text-decoration: none;">${echapper(d.apprenantWhatsapp)} ↗</a></td></tr>
      <tr><td style="color: #94a3b8;">E-mail :</td><td><a href="mailto:${echapper(d.apprenantEmail)}" style="color: #e9cd84;">${echapper(d.apprenantEmail)}</a></td></tr>
    </table>
    <p style="color: #94a3b8; font-size: 13px;">Le contrat est déjà composé depuis son dossier : il peut le télécharger, le signer et nous le renvoyer. Les instructions de paiement partent après signature.</p>
  `;

  await envoyer(payload, {
    to: EQUIPE,
    subject: `[Contrat demandé] ${d.reference} — ${d.apprenantNom}`,
    text: [
      `${d.apprenantNom} demande son contrat de formation.`,
      "",
      `Parcours : ${d.programmeTitre}`,
      `Dossier : ${d.reference}`,
      `WhatsApp : ${d.apprenantWhatsapp}`,
      `E-mail : ${d.apprenantEmail}`,
      "",
      "À faire : l'appeler pour l'orientation, puis envoyer les instructions",
      "de paiement une fois le contrat signé et renvoyé.",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: "Contrat demandé",
      soustitre: d.programmeTitre,
      badgeRef: d.reference,
      corpsHtml,
      boutonTexte: "Ouvrir le dossier",
      boutonLien: `https://www.clixa.africa/admin/collections/inscriptions/${d.dossierId}`,
    }),
  });
}

/** À l'équipe : notification d'une nouvelle inscription. */
export async function courrielEquipe(payload: Payload, d: CourrielInscription): Promise<void> {
  if (!EQUIPE) return;

  const corpsHtml = `
    <p>Une nouvelle demande de place vient d'être enregistrée sur la plateforme :</p>
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #111a33; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 14px; line-height: 1.8;">
      <tr><td style="color: #94a3b8; width: 130px;">Candidat :</td><td><strong style="color: #ffffff;">${echapper(d.apprenantNom)}</strong> (${echapper(d.apprenantPays)})</td></tr>
      <tr><td style="color: #94a3b8;">Programme :</td><td><strong style="color: #e9cd84;">${d.programmeTitre}</strong></td></tr>
      <tr><td style="color: #94a3b8;">Session :</td><td style="color: #ffffff;">${d.sessionLibelle}</td></tr>
      <tr><td style="color: #94a3b8;">Formule :</td><td style="color: #ffffff;">${d.planLibelle} — ${EUROS.format(d.montantTotal)}</td></tr>
      <tr><td style="color: #94a3b8;">WhatsApp :</td><td><a href="https://wa.me/${d.apprenantWhatsapp.replace(/[^0-9]/g, "")}" style="color: #2fa37d; font-weight: bold; text-decoration: none;">${echapper(d.apprenantWhatsapp)} ↗</a></td></tr>
      <tr><td style="color: #94a3b8;">E-mail :</td><td><a href="mailto:${echapper(d.apprenantEmail)}" style="color: #e9cd84;">${echapper(d.apprenantEmail)}</a></td></tr>
    </table>
    <p style="margin: 0 0 16px 0; padding: 14px 16px; background-color: #1a1408; border-left: 3px solid #e9cd84; font-size: 15px; color: #ffffff;">
      <strong>À faire maintenant : ${ATTENDU[d.moyenSouhaite ?? "transfert"].equipe}</strong> à
      <a href="mailto:${echapper(d.apprenantEmail)}" style="color: #e9cd84;">${echapper(d.apprenantEmail)}</a>,
      puis renseigner la date d'envoi sur le dossier — c'est elle que le participant voit,
      et c'est ce qui lui permet de reconnaître notre message d'un hameçonnage.
    </p>
    <p style="color: #94a3b8; font-size: 13px;">Ensuite : rapprocher le premier versement dans le back-office.</p>
  `;

  await envoyer(payload, {
    to: EQUIPE,
    subject: `[Nouvelle Inscription] ${d.apprenantNom} — ${d.programmeTitre}`,
    text: [
      `${d.apprenantNom} (${d.apprenantPays}) a retenu une place.`,
      `À FAIRE : ${ATTENDU[d.moyenSouhaite ?? "transfert"].equipe} à ${d.apprenantEmail},`,
      "puis renseigner la date d'envoi sur le dossier.",
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
    html: gabaritHtmlEmail({
      titre: "Nouvelle inscription reçue",
      badgeRef: d.reference,
      corpsHtml,
      boutonTexte: "Voir l'inscription dans Payload",
      boutonLien: `https://www.clixa.africa/admin/collections/inscriptions`,
    }),
  });
}

/** À l'équipe : transfert annoncé par un candidat. */
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
    /** L'identifiant du dossier, pour ouvrir la bonne fiche sans la chercher. */
    dossierId?: number | string;
    /** Vrai si le participant a joint un justificatif. */
    avecRecu?: boolean;
  },
): Promise<void> {
  if (!EQUIPE) return;

  const corpsHtml = `
    <p>Le participant <strong>${echapper(d.apprenantNom)}</strong> déclare avoir émis son transfert :</p>
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #111a33; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 14px; line-height: 1.8;">
      <tr><td style="color: #94a3b8; width: 140px;">Montant déclaré :</td><td><strong style="color: #e9cd84; font-size: 16px;">${EUROS.format(d.montant)}</strong></td></tr>
      <tr><td style="color: #94a3b8;">Moyen d'envoi :</td><td style="color: #ffffff; font-weight: bold;">${echapper(d.moyen)}</td></tr>
      <tr><td style="color: #94a3b8;">Code / N° Transfert :</td><td><code style="background-color: #080c18; padding: 2px 8px; border-radius: 4px; color: #2fa37d; font-weight: bold; font-family: monospace;">${echapper(d.numero)}</code></td></tr>
      <tr><td style="color: #94a3b8;">Dossier Réf. :</td><td style="color: #e9cd84; font-family: monospace;">${d.reference}</td></tr>
      <tr><td style="color: #94a3b8;">Programme :</td><td style="color: #ffffff;">${d.programmeTitre}</td></tr>
      <tr><td style="color: #94a3b8;">WhatsApp :</td><td><a href="https://wa.me/${d.apprenantWhatsapp.replace(/[^0-9]/g, "")}" style="color: #2fa37d; text-decoration: none;">${echapper(d.apprenantWhatsapp)} ↗</a></td></tr>
    </table>
    ${
      d.avecRecu
        ? `<p style="margin: 0 0 16px 0; padding: 14px 16px; background-color: #0d2119; border-left: 3px solid #2fa37d; font-size: 15px; color: #ffffff;"><strong>Un justificatif est joint.</strong> Il s'ouvre depuis la fiche du dossier, section « Reçus de versement ». Le fichier est privé : il ne se lit que connecté au back-office.</p>`
        : `<p style="margin: 0 0 16px 0; padding: 14px 16px; background-color: #1a1408; border-left: 3px solid #e9cd84; font-size: 14px; color: #cbd5e1;">Aucun justificatif joint — le numéro seul a été transmis. C'est admis : beaucoup annoncent depuis un téléphone, le reçu encore dans la poche.</p>`
    }
    <p style="color: #94a3b8; font-size: 13px;">Action requise : Vérifier la réception des fonds et valider l'échéance dans le back-office.</p>
  `;

  await envoyer(payload, {
    to: EQUIPE,
    subject: `[Transfert Annoncé] ${d.reference} — ${d.apprenantNom} (${d.moyen})`,
    text: [
      `${d.apprenantNom} déclare avoir envoyé ${EUROS.format(d.montant)}.`,
      "",
      `Moyen : ${d.moyen}`,
      `Numéro de transfert : ${d.numero}`,
      `Référence du dossier : ${d.reference}`,
      `Parcours : ${d.programmeTitre}`,
      `WhatsApp : ${d.apprenantWhatsapp}`,
      "",
      "L'échéance est passée en « annoncé ».",
      d.avecRecu
        ? "Un justificatif est joint : il s'ouvre depuis la fiche du dossier."
        : "Aucun justificatif joint — le numéro seul a été transmis.",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: "Nouveau Transfert Annoncé",
      badgeRef: d.reference,
      corpsHtml,
      boutonTexte: "Vérifier et Valider dans l'Admin",
      /*
        Le lien menait à la liste entière : il fallait y retrouver la référence
        à la main, plusieurs fois par jour. Il ouvre la fiche quand on connaît
        l'identifiant, la liste sinon — `/inscriptions/undefined` serait pire
        que la liste.
      */
      boutonLien: d.dossierId
        ? `https://www.clixa.africa/admin/collections/inscriptions/${d.dossierId}`
        : `https://www.clixa.africa/admin/collections/inscriptions`,
    }),
  });
}

/** À l'équipe : demande de rappel. */
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

  const corpsHtml = `
    <p>Une nouvelle demande de rappel téléphonique a été déposée :</p>
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #111a33; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 14px; line-height: 1.8;">
      <tr><td style="color: #94a3b8; width: 130px;">Demandeur :</td><td><strong style="color: #ffffff;">${echapper(d.nom)}</strong> (${echapper(d.pays)})</td></tr>
      <tr><td style="color: #94a3b8;">WhatsApp :</td><td><a href="https://wa.me/${d.whatsapp.replace(/[^0-9]/g, "")}" style="color: #2fa37d; font-weight: bold; text-decoration: none;">${echapper(d.whatsapp)} ↗</a></td></tr>
      <tr><td style="color: #94a3b8;">E-mail :</td><td><a href="mailto:${echapper(d.email)}" style="color: #e9cd84;">${echapper(d.email)}</a></td></tr>
      <tr><td style="color: #94a3b8;">Formation :</td><td style="color: #ffffff;">${d.programme ?? "Non précisée"}</td></tr>
      ${d.plan ? `<tr><td style="color: #94a3b8;">Rythme :</td><td style="color: #ffffff;">${d.plan}</td></tr>` : ""}
    </table>
  `;

  await envoyer(payload, {
    to: EQUIPE,
    subject: `Demande de rappel — ${d.nom} (${d.pays})`,
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
    html: gabaritHtmlEmail({
      titre: "Demande de rappel",
      corpsHtml,
      boutonTexte: "Voir les demandes de rappel",
      boutonLien: `https://www.clixa.africa/admin/collections/demandes-rappel`,
    }),
  });
}

/** Relance d'échéance avec ton cordial et signature institutionnelle. */
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

  const corpsHtml = `
    <p>Bonjour <strong>${echapper(d.apprenantNom)}</strong>,</p>
    <p>
      ${
        d.enRetard
          ? `Sauf erreur de notre part, une échéance de <strong style="color: #e9cd84;">${EUROS.format(d.montant)}</strong> était attendue le <strong>${quand}</strong> pour votre parcours <em>« ${d.programmeTitre} »</em>.`
          : `Votre prochaine échéance de formation d'un montant de <strong style="color: #e9cd84;">${EUROS.format(d.montant)}</strong> est à régler avant le <strong>${quand}</strong> pour <em>« ${d.programmeTitre} »</em>.`
      }
    </p>

    <div style="background-color: #111a33; border-radius: 6px; padding: 16px 20px; margin: 20px 0; border: 1px solid rgba(201, 162, 76, 0.2);">
      <div style="font-size: 13px; color: #cbd5e1;">Moyens acceptés : <strong>Western Union, Ria, MoneyGram, ou virement</strong></div>
      <div style="font-size: 13px; color: #cbd5e1; margin-top: 4px;">Pensez à préciser votre référence : <strong style="color: #e9cd84; font-family: monospace;">${d.reference}</strong></div>
    </div>

    <p style="font-size: 13px; color: #94a3b8;">
      Si votre règlement a déjà été émis ces dernières 24h, nous vous remercions de ne pas tenir compte de ce message — nos équipes procéderont au rapprochement dès réception.
    </p>
  `;

  await envoyer(payload, {
    to: d.apprenantEmail,
    subject: d.enRetard
      ? `Rappel d'échéance — ${d.programmeTitre} [${d.reference}]`
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
      "CLIXA Institute — Admissions",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: d.enRetard ? "Rappel d'échéance" : "Prochaine échéance de formation",
      badgeRef: d.reference,
      corpsHtml,
      boutonTexte: "Consulter mon dossier et régler",
      boutonLien: d.urlDossier,
    }),
  });
}

/** À l'équipe : récapitulatif du traitement des relances. */
export async function courrielBilanRelances(payload: Payload, lignes: string[]): Promise<void> {
  if (!EQUIPE || lignes.length === 0) return;

  await envoyer(payload, {
    to: EQUIPE,
    subject: `[Bilan Relances] ${lignes.length} échéance(s) traitée(s)`,
    text: ["Les participants suivants ont été relancés :", "", ...lignes].join("\n"),
  });
}
