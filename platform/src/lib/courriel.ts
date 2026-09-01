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

/**
 * Où atterrit la réponse de qui appuie sur « Répondre ».
 *
 * ⚠️ Sans cela, la réponse partait vers l'expéditeur — `contact@envoi.clixa.africa`
 * — et **rebondissait** : le sous-domaine d'envoi n'a ni MX ni A, exprès. Il
 * sert à envoyer, pas à recevoir. Le participant voyait donc son message
 * revenir, et de notre côté rien n'arrivait : un silence des deux bords, sur le
 * geste le plus naturel qu'on puisse faire devant un courriel.
 *
 * L'adresse de réponse est celle que des humains relèvent, sur le domaine
 * principal — celui dont les MX pointent vers Zoho. Le défaut vaut pour la
 * production ; la variable existe pour ne pas avoir à toucher au code le jour
 * où l'adresse change.
 */
const REPONDRE_A = process.env.EMAIL_REPONSE ?? RESEAUX_CLIXA.email.adresse;

/*
  L'adresse canonique du site. Les liens d'un courriel ne se rattrapent pas :
  une redirection depuis l'apex coûte un aller-retour à qui clique, et certains
  clients de messagerie l'affichent comme une adresse différente.
*/
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.clixa.africa";

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
/*
  ⚠️ `geste` et `preuve` existent parce que la suite du message ne veut pas dire
  la même chose selon le moyen. « Vous effectuez le versement, puis indiquez-nous
  la référence du transfert » n'a aucun sens pour qui règle par carte : il n'y a
  ni guichet, ni numéro à recopier. On écrivait pourtant cette phrase à tout le
  monde, en énumérant les trois moyens suivis de « selon ce que vous avez
  choisi » — c'est-à-dire en laissant le participant faire le tri lui-même, dans
  un message qui devait justement le guider.
*/
const ATTENDU = {
  carte: {
    participant: "un lien de paiement bancaire sécurisé",
    equipe: "Envoyer le LIEN DE PAIEMENT bancaire",
    geste: "Vous réglez en ligne, par carte, depuis ce lien.",
    preuve: "Vous nous le signalez depuis votre dossier — le justificatif de votre banque suffit.",
  },
  virement: {
    participant: "notre RIB, avec le motif à indiquer",
    equipe: "Envoyer le RIB",
    geste: "Vous effectuez le virement depuis votre banque.",
    preuve:
      "Vous nous indiquez la référence du virement depuis votre dossier, avec l'avis d'opération.",
  },
  transfert: {
    participant: "les coordonnées du bénéficiaire (Western Union, Ria ou MoneyGram)",
    equipe: "Envoyer les COORDONNÉES DE TRANSFERT",
    geste: "Vous effectuez le transfert au guichet.",
    preuve: "Vous nous indiquez le numéro de transfert depuis votre dossier, avec le reçu.",
  },
} as const;

/** Ce que le participant a demandé, avec un repli sûr si rien n'est renseigné. */
const attenduPour = (moyen?: "carte" | "virement" | "transfert") => ATTENDU[moyen ?? "transfert"];

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
                    <div><strong>✉️ Courriel Officiel :</strong> <a href="${RESEAUX_CLIXA.email.url}" style="color: #e9cd84; text-decoration: none;">${RESEAUX_CLIXA.email.adresse}</a></div>
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

/**
 * Envoie, et dit si c'est parti.
 *
 * ⚠️ Le booléen n'est pas décoratif. Un envoi qui échoue est journalisé et la
 * suite continue — refuser d'enregistrer une inscription parce qu'un courriel
 * n'est pas parti serait pire. Mais l'appelant qui *écrit une trace* de cet
 * envoi doit pouvoir la conditionner : marquer une échéance « relancée » alors
 * que rien n'est parti la fait taire pendant sept jours, et la relance est
 * perdue sans que personne ne le sache. Voir `api/relances`.
 */
async function envoyer(
  payload: Payload,
  message: { to: string; subject: string; text: string; html?: string },
): Promise<boolean> {
  try {
    // `replyTo` sur tous les messages : l'expéditeur ne sait pas recevoir.
    const resultat = await payload.sendEmail({ replyTo: REPONDRE_A, ...message });

    /*
      ── Un envoi réussi laisse une trace, lui aussi ──────────────────────────
      Seul l'échec en laissait une. Le jour où quelqu'un dit « je n'ai rien
      reçu », on ne pouvait pas distinguer les deux seules réponses qui
      comptent : *parti et perdu en route* — boîte pleine, filtre anti-spam,
      adresse mal saisie — ou *jamais tenté*, ce qui serait un défaut chez nous.
      Sans cette ligne, la question ne se tranche pas : on cherche un bogue
      là où il n'y a peut-être qu'un dossier « indésirables ».

      L'identifiant rendu par l'expéditeur est le fil qui mène au reste : c'est
      lui qu'on cherche dans le tableau de bord de Resend pour savoir si le
      serveur d'en face a accepté, refusé, ou mis en attente.

      ⚠️ Le sujet et le destinataire, jamais le corps : ces messages portent des
      montants, des références de dossier et des liens de règlement. Un journal
      se consulte à plusieurs et se conserve ; il n'a pas à en garder copie.
    */
    const id = (resultat as { id?: unknown } | undefined)?.id;
    payload.logger.info(
      { to: message.to, subject: message.subject, ...(id ? { id: String(id) } : {}) },
      "[courriel] envoyé",
    );
    return true;
  } catch (e) {
    payload.logger.error({ err: e, to: message.to }, "[courriel] envoi impossible");
    return false;
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
    <p>Votre pré-inscription est enregistrée et votre place est retenue pour le parcours exécutif :</p>
    
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
    subject: `Pré-inscription enregistrée — ${d.programmeTitre} [Dossier ${d.reference}]`,
    text: [
      `Bonjour ${d.apprenantNom},`,
      "",
      `Votre pré-inscription est enregistrée pour « ${d.programmeTitre} », et votre place est retenue.`,
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
      `Contact Admissions : ${RESEAUX_CLIXA.email.adresse} · https://www.clixa.africa`,
      "CLIXA Institute — Direction des Admissions",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: "Votre pré-inscription est enregistrée",
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

/**
 * Le contrat vient d'être signé : au participant, et à l'équipe.
 *
 * Deux messages pour un même fait, parce qu'ils ne disent pas la même chose.
 * Au participant : ce qu'il vient d'engager, et ce qui vient ensuite. À
 * l'équipe : qu'il faut maintenant envoyer les instructions de paiement — c'est
 * la seule chose qui bloque la suite.
 *
 * ⚠️ Le participant reçoit l'empreinte de son contrat. Elle ne lui sert à rien
 * au quotidien, et c'est précisément le but : le jour où l'un de nous deux
 * prétendrait que les termes ont changé, elle est dans sa boîte, datée, hors de
 * notre portée.
 */
export async function courrielSignature(
  payload: Payload,
  d: {
    reference: string;
    dossierId: number | string;
    apprenantNom: string;
    apprenantEmail: string;
    apprenantWhatsapp: string;
    programmeTitre: string;
    signeLe: string;
    empreinte: string;
    /** Ce qu'il a demandé pour régler : la suite du message en dépend. */
    moyenSouhaite?: "carte" | "virement" | "transfert";
  },
): Promise<void> {
  const quand = JOUR.format(new Date(d.signeLe));
  const url = `https://www.clixa.africa/inscription/${d.reference}`;
  /*
    ⚠️ Le message nommait les trois moyens d'un coup, suivis de « selon ce que
    vous avez choisi » — il laissait donc le participant faire le tri, dans le
    message qui devait justement le guider. Pire : il annonçait « notre RIB » à
    quelqu'un qui règle par carte, puis lui demandait « la référence du
    transfert » qu'il n'aura jamais.
  */
  const attendu = attenduPour(d.moyenSouhaite);

  await envoyer(payload, {
    to: d.apprenantEmail,
    subject: `Contrat signé — ${d.programmeTitre} [Dossier ${d.reference}]`,
    text: [
      `Bonjour ${d.apprenantNom},`,
      "",
      `Votre contrat de formation a bien été signé le ${quand}.`,
      "",
      "Ce qui suit :",
      `  1. Notre équipe vous envoie par courriel ${attendu.participant}.`,
      `  2. ${attendu.geste}`,
      `  3. ${attendu.preuve}`,
      "",
      "Votre exemplaire signé reste disponible sur votre dossier :",
      url,
      "",
      `Empreinte de votre contrat : ${d.empreinte}`,
      "Conservez ce message : cette empreinte identifie les termes que vous avez",
      "signés, et permet de vérifier qu'ils n'ont pas changé depuis.",
      "",
      "CLIXA Institute — Direction des Admissions",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: "Votre contrat est signé",
      soustitre: d.programmeTitre,
      badgeRef: d.reference,
      corpsHtml: `
        <p style="margin-top: 0;">Bonjour <strong>${echapper(d.apprenantNom)}</strong>,</p>
        <p>Votre contrat de formation a bien été signé le <strong style="color: #ffffff;">${quand}</strong>.</p>
        <div style="font-weight: bold; font-size: 14px; color: #ffffff; margin: 22px 0 10px 0;">Ce qui suit :</div>
        <ol style="margin: 0; padding-left: 20px; line-height: 1.8; color: #cbd5e1; font-size: 14px;">
          <li>Nous vous envoyons par courriel <strong style="color: #ffffff;">${attendu.participant}</strong>.</li>
          <li>${attendu.geste}</li>
          <li>${attendu.preuve}</li>
        </ol>
        <p style="margin: 22px 0 0 0; padding: 12px 14px; background-color: #111a33; border-left: 3px solid #c9a24c; font-size: 12px; color: #94a3b8;">
          <strong style="color: #ffffff;">Empreinte de votre contrat</strong><br/>
          <code style="font-family: monospace; color: #e9cd84; word-break: break-all;">${d.empreinte}</code><br/>
          Conservez ce message : cette empreinte identifie les termes que vous avez signés, et permet de vérifier qu'ils n'ont pas changé depuis.
        </p>
      `,
      boutonTexte: "Voir mon dossier",
      boutonLien: url,
    }),
  });

  if (!EQUIPE) return;

  await envoyer(payload, {
    to: EQUIPE,
    subject: `[Contrat signé] ${d.reference} — ${d.apprenantNom}`,
    text: [
      `${d.apprenantNom} a signé son contrat le ${quand}.`,
      "",
      `Parcours : ${d.programmeTitre}`,
      `Dossier : ${d.reference}`,
      `WhatsApp : ${d.apprenantWhatsapp}`,
      `E-mail : ${d.apprenantEmail}`,
      "",
      "Le contrat signé, tel qu'il a été signé :",
      `https://www.clixa.africa/inscription/${d.reference}/contrat`,
      "",
      "À FAIRE : le relire, envoyer les instructions de paiement, puis",
      "renseigner la date d'envoi sur le dossier.",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: "Contrat signé",
      soustitre: d.programmeTitre,
      badgeRef: d.reference,
      corpsHtml: `
        <p style="margin: 0 0 16px 0; padding: 14px 16px; background-color: #0d2119; border-left: 3px solid #2fa37d; font-size: 15px; color: #ffffff;">
          <strong>${echapper(d.apprenantNom)} a signé son contrat</strong> le ${quand}.
          À faire maintenant : lui envoyer les instructions de paiement, puis renseigner la date d'envoi sur le dossier.
        </p>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #111a33; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 14px; line-height: 1.8;">
          <tr><td style="color: #94a3b8; width: 130px;">Dossier :</td><td style="color: #e9cd84; font-family: monospace;">${d.reference}</td></tr>
          <tr><td style="color: #94a3b8;">WhatsApp :</td><td><a href="https://wa.me/${d.apprenantWhatsapp.replace(/[^0-9]/g, "")}" style="color: #2fa37d; font-weight: bold; text-decoration: none;">${echapper(d.apprenantWhatsapp)} ↗</a></td></tr>
          <tr><td style="color: #94a3b8;">E-mail :</td><td><a href="mailto:${echapper(d.apprenantEmail)}" style="color: #e9cd84;">${echapper(d.apprenantEmail)}</a></td></tr>
        </table>
        <p style="margin: 0 0 18px 0;">
          <a href="https://www.clixa.africa/inscription/${d.reference}/contrat" style="display: inline-block; padding: 10px 18px; background-color: #c9a24c; color: #080c18; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 4px;">Lire le contrat signé (PDF) &rarr;</a>
        </p>
        <p style="color: #94a3b8; font-size: 12px;">Le contrat porte la signature tracée. La preuve — horodatage, IP, navigateur et empreinte des termes — est enregistrée sur le dossier.</p>
      `,
      boutonTexte: "Ouvrir le dossier",
      boutonLien: `https://www.clixa.africa/admin/collections/inscriptions/${d.dossierId}`,
    }),
  });
}

/**
 * Le lien qui confirme une adresse.
 *
 * ── Pourquoi il vit ici plutôt que dans la collection ───────────────────────
 * Payload l'envoie lui-même quand `auth.verify` est configuré — mais son envoi
 * n'est pas rattrapé : s'il échoue, la création du compte échoue avec lui, et
 * un service de courriel indisponible ferme une porte d'entrée. La route crée
 * donc le compte sans envoi, puis appelle ceci, qui passe par `envoyer()` et
 * attrape.
 *
 * ⚠️ Un seul texte pour les deux chemins. Le premier envoi et le renvoi disent
 * la même chose, sans quoi ils finiraient par diverger — et c'est le second
 * qu'on relit le moins.
 */
export function courrielConfirmation(args: { nom: string; token: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const lien = `${SITE}/compte/confirmer?token=${args.token}`;

  return {
    subject: "Confirmez votre adresse — CLIXA Institute",
    text: [
      `Bonjour ${args.nom},`,
      "",
      "Votre accès est presque prêt. Il ne manque qu'une confirmation : elle nous",
      "assure que cette adresse est bien la vôtre, et c'est elle qui vous permettra",
      "de retrouver vos dossiers.",
      "",
      lien,
      "",
      "Si vous n'avez pas demandé d'accès, ce message ne vous concerne pas : sans",
      "confirmation, rien ne s'ouvre.",
      "",
      "CLIXA Institute — Direction des Admissions",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: "Confirmez votre adresse",
      soustitre: "Une dernière étape avant d'accéder à votre espace",
      corpsHtml: `
        <p style="margin: 0 0 16px 0;">Bonjour ${echapper(args.nom)},</p>
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
      boutonLien: lien,
    }),
  };
}

/**
 * Envoie ce lien, et dit si c'est parti.
 *
 * Rend `false` plutôt que de lever : la création du compte ne doit pas dépendre
 * de l'expéditeur, mais l'appelant doit savoir quoi afficher.
 */
export async function envoyerConfirmation(
  payload: Payload,
  destinataire: string,
  args: { nom: string; token: string },
): Promise<boolean> {
  const message = courrielConfirmation(args);
  /*
    Ce chemin double `envoyer` volontairement : il part avant que le compte
    existe vraiment, et son échec se raconte au visiteur au lieu d'être avalé.
    La trace, elle, doit être la même — c'est le courriel dont l'absence
    enferme quelqu'un dehors, et celui qu'on cherchera en premier.
  */
  try {
    // Même raison qu'ailleurs : l'expéditeur ne sait pas recevoir de réponse.
    const resultat = await payload.sendEmail({
      replyTo: REPONDRE_A,
      to: destinataire,
      ...message,
    });
    const id = (resultat as { id?: unknown } | undefined)?.id;
    payload.logger.info(
      { to: destinataire, subject: message.subject, ...(id ? { id: String(id) } : {}) },
      "[courriel] envoyé",
    );
    return true;
  } catch (e) {
    payload.logger.error({ err: e, to: destinataire }, "[confirmation] envoi impossible");
    return false;
  }
}

/** À l'équipe : notification d'une nouvelle inscription. */
export async function courrielEquipe(payload: Payload, d: CourrielInscription): Promise<void> {
  if (!EQUIPE) return;

  const corpsHtml = `
    <p>Une nouvelle pré-inscription vient d'être enregistrée sur la plateforme :</p>
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
  /*
    ⚠️ Celui-ci ne va pas à l'équipe entière, mais à l'adresse affichée sur le
    site — et il la tient de `lib/reseaux.ts`, la même source que la page de
    contact et le pied de page.

    Deux raisons. La première est une décision : une demande de rappel n'est pas
    un événement à constater, c'est un appel à passer. Elle appelle une personne,
    pas une équipe. Les autres notifications — inscription, contrat, transfert —
    disent ce qui s'est produit et vont, elles, à tout le monde.

    La seconde est une règle de la maison : qui écrit à l'adresse publique et qui
    remplit le formulaire aboutissent au même endroit **par construction**. Écrire
    l'adresse ici en toutes lettres en ferait une seconde copie, et deux copies
    finissent toujours par diverger — c'est ce qui avait laissé un faux numéro
    d'admissions dans chaque courriel envoyé.
  */
  const destinataire = RESEAUX_CLIXA.email.adresse;

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
    to: destinataire,
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
  /*
    ⚠️ Rend `true` seulement si le courriel est parti. L'appelant écrit une
    trace (`relanceeLe`) qui fait taire cette échéance pendant sept jours :
    l'écrire sur un envoi manqué perd la relance en silence.
  */
): Promise<boolean> {
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

  return envoyer(payload, {
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

/**
 * Au participant : son contrat a été relu et accepté.
 *
 * ── Le silence que ce message rompt ─────────────────────────────────────────
 * Entre la signature et l'arrivée des coordonnées, le participant ne voyait
 * rien. Il venait de s'engager par écrit, le courriel de signature lui
 * annonçait que l'équipe enverrait de quoi payer — puis plus rien, le temps que
 * quelqu'un ouvre son dossier. C'est le moment du tunnel où l'on doute.
 *
 * ⚠️ Ce message n'apporte aucune coordonnée de règlement, et le dit. Les
 * coordonnées partent séparément, décision de la direction : rien de bancaire
 * ne traverse le site. Promettre ici un lien qui n'y est pas ferait chercher
 * une pièce jointe qui n'existe pas.
 *
 * ⚠️ Il rappelle aussi la garde contre l'hameçonnage : la date d'envoi des
 * coordonnées s'affiche sur son dossier, et un message qui ne correspond à
 * aucune date affichée n'est pas de nous.
 */
export async function courrielContratVerifie(
  payload: Payload,
  d: {
    reference: string;
    apprenantNom: string;
    apprenantEmail: string;
    programmeTitre: string;
    moyenSouhaite?: "carte" | "virement" | "transfert";
  },
): Promise<boolean> {
  const url = `${SITE}/inscription/${d.reference}`;
  const attendu = attenduPour(d.moyenSouhaite);

  return envoyer(payload, {
    to: d.apprenantEmail,
    subject: `Contrat vérifié — ${d.programmeTitre} [Dossier ${d.reference}]`,
    text: [
      `Bonjour ${d.apprenantNom},`,
      "",
      "Nous avons relu votre contrat de formation : il est vérifié et accepté.",
      "",
      `Vous allez recevoir, dans un courriel séparé, ${attendu.participant}.`,
      "",
      "IMPORTANT — comment reconnaître notre message :",
      "  La date de cet envoi s'affichera sur la page de votre dossier. Un",
      "  message qui vous réclame un paiement sans correspondre à cette date",
      "  ne vient pas de nous. Vérifiez toujours ici :",
      `  ${url}`,
      "",
      "Votre place reste retenue en attendant.",
      "",
      "CLIXA Institute — Direction des Admissions",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: "Votre contrat est vérifié",
      soustitre: d.programmeTitre,
      badgeRef: d.reference,
      corpsHtml: `
        <p style="margin-top: 0;">Bonjour <strong>${echapper(d.apprenantNom)}</strong>,</p>
        <p style="margin: 0 0 16px 0; padding: 14px 16px; background-color: #0d2119; border-left: 3px solid #2fa37d; font-size: 15px; color: #ffffff;">
          Nous avons relu votre contrat de formation : il est <strong>vérifié et accepté</strong>.
        </p>
        <p>Vous allez recevoir, dans un courriel séparé, ${attendu.participant}.</p>
        <p style="margin: 22px 0 0 0; padding: 12px 14px; background-color: #111a33; border-left: 3px solid #c9a24c; font-size: 13px; color: #cbd5e1;">
          <strong style="color: #ffffff;">Comment reconnaître notre message</strong><br/>
          La date de cet envoi s'affichera sur la page de votre dossier. Un message qui vous réclame un paiement sans correspondre à cette date ne vient pas de nous — vérifiez toujours sur votre dossier.
        </p>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 18px;">Votre place reste retenue en attendant.</p>
      `,
      boutonTexte: "Voir mon dossier",
      boutonLien: url,
    }),
  });
}

/**
 * Au participant : les instructions de règlement viennent de partir.
 *
 * ── Pourquoi ce message existe, alors qu'un autre porte les coordonnées ─────
 * Les coordonnées elles-mêmes partent à la main, dans un message que l'équipe
 * compose — décision de la direction : rien de bancaire ne traverse le site.
 * Ce message-ci ne les porte pas. Il fait autre chose, qui compte autant :
 * il **date** l'envoi.
 *
 * ⚠️ C'est la garde contre l'hameçonnage, et elle ne tenait qu'à moitié. La
 * date d'envoi s'affiche sur la page du dossier depuis le début — mais personne
 * ne disait au participant d'aller la regarder. Un lien bancaire reçu par
 * courriel ressemble trait pour trait à un faux ; la seule vérification qu'on
 * puisse lui offrir sans mettre le lien en ligne est de comparer deux dates,
 * encore faut-il qu'il sache qu'il doit le faire.
 */
export async function courrielInstructionsEnvoyees(
  payload: Payload,
  d: {
    reference: string;
    apprenantNom: string;
    apprenantEmail: string;
    programmeTitre: string;
    moyenSouhaite?: "carte" | "virement" | "transfert";
    envoyeLe: string;
  },
): Promise<boolean> {
  const url = `${SITE}/inscription/${d.reference}`;
  const attendu = attenduPour(d.moyenSouhaite);
  const quand = JOUR.format(new Date(d.envoyeLe));

  return envoyer(payload, {
    to: d.apprenantEmail,
    subject: `De quoi régler votre première échéance — ${d.programmeTitre} [${d.reference}]`,
    text: [
      `Bonjour ${d.apprenantNom},`,
      "",
      `Nous venons de vous envoyer, dans un message séparé, ${attendu.participant}.`,
      "",
      "AVANT DE RÉGLER, VÉRIFIEZ :",
      `  La page de votre dossier indique « Coordonnées envoyées le ${quand} ».`,
      "  Si le message que vous avez reçu ne correspond pas à cette date, il ne",
      "  vient pas de nous — ne réglez rien et écrivez-nous.",
      `  ${url}`,
      "",
      `Une fois que c'est fait : ${attendu.preuve}`,
      "",
      "CLIXA Institute — Direction des Admissions",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: "De quoi régler votre première échéance",
      soustitre: d.programmeTitre,
      badgeRef: d.reference,
      corpsHtml: `
        <p style="margin-top: 0;">Bonjour <strong>${echapper(d.apprenantNom)}</strong>,</p>
        <p>Nous venons de vous envoyer, <strong style="color: #ffffff;">dans un message séparé</strong>, ${attendu.participant}.</p>
        <p style="margin: 22px 0 0 0; padding: 14px 16px; background-color: #2a1a0d; border-left: 3px solid #c9a24c; font-size: 14px; color: #f3efe4;">
          <strong style="color: #ffffff;">Avant de régler, vérifiez</strong><br/>
          La page de votre dossier indique « Coordonnées envoyées le <strong style="color: #e9cd84;">${quand}</strong> ».
          Si le message que vous avez reçu ne correspond pas à cette date, <strong>il ne vient pas de nous</strong> — ne réglez rien et écrivez-nous.
        </p>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 18px;">
          Une fois que c'est fait : ${attendu.preuve}
        </p>
      `,
      boutonTexte: "Vérifier sur mon dossier",
      boutonLien: url,
    }),
  });
}
