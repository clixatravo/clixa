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
 * Ce que le participant va recevoir pour régler, pour qu'il attende la bonne
 * chose.
 *
 * ⚠️ Chaque entrée portait aussi une consigne à l'équipe — « Envoyer le RIB » —
 * lue par le message `[Nouvelle Inscription]`, retiré le 16 septembre 2026. Elle
 * est partie avec lui : elle disait d'envoyer les coordonnées **à la
 * pré-inscription**, quand tout le reste du système ne les envoie qu'une fois le
 * contrat signé et vérifié.
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
    geste: "Vous réglez en ligne, par carte, depuis ce lien.",
    preuve: "Vous nous le signalez depuis votre dossier — le justificatif de votre banque suffit.",
  },
  virement: {
    participant: "notre RIB, avec le motif à indiquer",
    geste: "Vous effectuez le virement depuis votre banque.",
    preuve:
      "Vous nous indiquez la référence du virement depuis votre dossier, avec l'avis d'opération.",
  },
  transfert: {
    participant: "les coordonnées du bénéficiaire (Western Union, Ria ou MoneyGram)",
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
                Direction des Admissions
              </div>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 18px;">
                <tr>
                  <td style="font-size: 13px; color: #cbd5e1; line-height: 1.8;">
                    <!--
                      ⚠️ Pas d'emoji, depuis le 23 septembre 2026. Le pied en portait
                      trois — 💬 ✉️ 🌐 — plus une étoile au-dessus. Trois raisons, et
                      la dernière est celle qui a tranché :

                      - **ils ne se rendent pas pareil d'un client à l'autre** : en
                        couleur chez Gmail, en noir et blanc chez Outlook, en carré
                        vide là où la police manque — et un carré vide dans le pied
                        d'un message qui réclame un virement se lit comme un message
                        mal formé, c'est-à-dire suspect ;
                      - **ils survivent mal au texte brut**, que les filtres lisent ;
                      - **la direction a demandé le ton de Namecheap ou de Vercel**
                        (23 septembre 2026), et ni l'un ni l'autre n'en emploie. Une
                        institution qui délivre des certificats se signe en toutes
                        lettres.

                      L'information n'a pas bougé : c'est la décoration qui part.
                    -->
                    <div style="padding: 3px 0;"><span style="display: inline-block; min-width: 92px; color: #94a3b8;">WhatsApp</span> <a href="${RESEAUX_CLIXA.whatsapp.url}" style="color: #2fa37d; text-decoration: none; font-weight: bold;">${RESEAUX_CLIXA.whatsapp.numeroAffiche}</a></div>
                    <div style="padding: 3px 0;"><span style="display: inline-block; min-width: 92px; color: #94a3b8;">Courriel</span> <a href="${RESEAUX_CLIXA.email.url}" style="color: #e9cd84; text-decoration: none;">${RESEAUX_CLIXA.email.adresse}</a></div>
                    <div style="padding: 3px 0;"><span style="display: inline-block; min-width: 92px; color: #94a3b8;">Site</span> <a href="https://www.clixa.africa" style="color: #e9cd84; text-decoration: none;">www.clixa.africa</a></div>
                  </td>
                </tr>
              </table>

              <!-- Badges des Campus & Hubs -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px dashed rgba(243, 239, 228, 0.1); padding-top: 14px;">
                <tr>
                  <td style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
                    <span style="color: #e9cd84; font-weight: bold;">Présence :</span> Agadir · Classe virtuelle · Abidjan et Dakar prochainement
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
 * Le gabarit **clair** — réservé aux messages qui s'adressent à des gens qui
 * ne nous connaissent pas encore.
 *
 * ── ⚠️ Pourquoi un second gabarit, et non un réglage du premier ────────────
 * Décision de la direction, le 23 septembre 2026, au vu de quatre courriels
 * d'Accor et de Lyca : « briitha tkon fhal hado li seft lek » — tous sur fond
 * clair. Les seize messages du tunnel gardent l'encre : ils partent à
 * quelqu'un qui a déjà un dossier, ils prolongent le site, et les basculer
 * demanderait de les regarder un par un alors qu'ils partent tous les jours.
 *
 * Ce que le fond clair achète, et ce n'est pas qu'une question de goût :
 *
 * - **il se rend mieux partout.** Outlook et Gmail délavent volontiers un fond
 *   sombre ; un fond clair, non ;
 * - **les visuels y ressortent** — le spécimen du certificat est lui-même
 *   blanc et bleu nuit, et il se noyait sur l'encre ;
 * - **c'est ce que fait une institution** qui écrit à quelqu'un pour la
 *   première fois.
 *
 * ⚠️ **L'or change de valeur entre les deux gabarits.** `#c9a24c` sur blanc
 * tombe à 2,2:1 — sous le seuil, illisible pour du texte. Le texte doré est
 * donc `#8f6b1c` (4,8:1), et `#c9a24c` ne sert plus que de **fond** de bouton,
 * sous du texte encre. Ne pas recopier l'or du gabarit sombre ici.
 *
 * ⚠️ **`color-scheme: light` et les couleurs en dur.** Gmail et Outlook
 * inversent volontiers un courriel clair quand le téléphone est en mode
 * sombre — et ils le font mal : texte encre sur fond redevenu sombre. La méta
 * le leur déconseille, et chaque cellule porte sa couleur explicitement plutôt
 * que d'hériter.
 */
export function gabaritClairEmail({
  titre,
  soustitre,
  corpsHtml,
  boutonTexte,
  boutonLien,
}: {
  titre: string;
  soustitre?: string;
  corpsHtml: string;
  boutonTexte?: string;
  boutonLien?: string;
}): string {
  const SITE_IMG = `${SITE}/images/email`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${titre}</title>
</head>
<body style="margin:0; padding:0; background-color:#f2efe8; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; color:#15181f;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f2efe8; padding:28px 14px;">
    <tr><td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #e6e0d2;">

        <!-- Marque, centrée : c'est ce que font les quatre exemples -->
        <tr><td align="center" style="background-color:#ffffff; padding:30px 28px 22px;">
          <img src="${SITE_IMG}/logo.png" width="46" height="46" alt="CLIXA Institute"
               style="display:block; border:0; border-radius:9px;">
          <div style="font-family:Georgia,serif; font-size:21px; font-weight:bold; letter-spacing:0.06em; color:#15181f; padding-top:10px;">
            CLIXA<span style="color:#8f6b1c;">.</span>
          </div>
          <div style="font-family:'SF Mono',Menlo,Consolas,monospace; font-size:9.5px; letter-spacing:0.15em; text-transform:uppercase; color:#8f6b1c; padding-top:4px;">
            Executive Education &middot; Afrique
          </div>
        </td></tr>

        <!-- Titre, centré et court -->
        <tr><td align="center" style="background-color:#ffffff; padding:0 32px 4px;">
          <h1 style="margin:0; font-family:Georgia,serif; font-size:27px; font-weight:bold; color:#15181f; line-height:1.28;">
            ${titre}
          </h1>
          ${
            soustitre
              ? `<div style="font-size:14px; color:#5c5f68; line-height:1.55; padding-top:10px; max-width:430px;">${soustitre}</div>`
              : ""
          }
        </td></tr>

        <tr><td style="background-color:#ffffff; padding:24px 28px 8px; font-size:15px; line-height:1.68; color:#2b2f38;">
          ${corpsHtml}
        </td></tr>

        ${
          boutonTexte && boutonLien
            ? `<tr><td align="center" style="background-color:#ffffff; padding:12px 28px 34px;">
          <a href="${boutonLien}" style="display:inline-block; background-color:#c9a24c; color:#15181f; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14.5px; font-weight:bold; text-decoration:none; padding:15px 34px; border-radius:7px;">
            ${boutonTexte} &rarr;
          </a>
        </td></tr>`
            : `<tr><td style="background-color:#ffffff; height:18px;"></td></tr>`
        }

        <!-- Contacts, sur un fond à peine tiré -->
        <tr><td align="center" style="background-color:#faf8f3; border-top:1px solid #e6e0d2; padding:24px 28px;">
          <div style="font-family:'SF Mono',Menlo,monospace; font-size:9.5px; letter-spacing:0.14em; text-transform:uppercase; color:#8f6b1c; padding-bottom:12px;">
            Direction des Admissions
          </div>
          <div style="font-size:13.5px; line-height:1.9; color:#5c5f68;">
            WhatsApp <a href="${RESEAUX_CLIXA.whatsapp.url}" style="color:#15181f; text-decoration:none; font-weight:bold;">${RESEAUX_CLIXA.whatsapp.numeroAffiche}</a><br>
            <a href="${RESEAUX_CLIXA.email.url}" style="color:#8f6b1c; text-decoration:none;">${RESEAUX_CLIXA.email.adresse}</a>
            &nbsp;&middot;&nbsp;
            <a href="${SITE}" style="color:#8f6b1c; text-decoration:none;">www.clixa.africa</a>
          </div>
        </td></tr>

      </table>

      <!-- Pied légal, hors de la carte — comme chez Accor -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;">
        <tr><td align="center" style="padding:18px 22px 6px; font-size:11.5px; line-height:1.65; color:#8a8778;">
          CLIXA SARLAU &middot; Agadir, Maroc &middot; Classe virtuelle &middot; Abidjan et Dakar prochainement
        </td></tr>
      </table>
    </td></tr>
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
  message: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    /**
     * En-têtes supplémentaires, passés tels quels à l'expéditeur.
     *
     * ⚠️ Un seul usage aujourd'hui, et il n'est pas décoratif :
     * `List-Unsubscribe` sur le message de présentation. C'est un message
     * commercial adressé à des gens qui ne nous connaissent pas ; sans moyen
     * de se désabonner, celui que cela agace n'a qu'un bouton sous la main —
     * « signaler comme indésirable ». Quelques signalements suffisent à faire
     * tomber la réputation de `envoi.clixa.africa`, et avec elle la
     * confirmation d'inscription, le contrat et le certificat. Gmail et Yahoo
     * l'attendent de tout expéditeur en volume depuis 2024, comme DMARC.
     */
    headers?: Record<string, string>;
  },
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

    <div style="font-weight: bold; font-size: 14px; color: #ffffff; margin-bottom: 12px;">Les étapes, dans l'ordre :</div>
    <ol style="margin: 0; padding-left: 20px; line-height: 1.8; color: #cbd5e1; font-size: 14px;">
      <li><strong style="color: #ffffff;">Demandez votre contrat</strong> depuis la page de votre dossier. Rien ne vous engage tant qu'il n'est pas signé.</li>
      <li>Signez-le en ligne. Nous le relisons, et nous vous prévenons.</li>
      <li>Une fois le contrat vérifié, nous vous envoyons par courriel <strong>${ATTENDU[d.moyenSouhaite ?? "transfert"].participant}</strong>.</li>
      <li>Effectuez le versement de la 1<sup>re</sup> échéance, puis indiquez-nous sa référence depuis votre dossier.</li>
      <li>Nous vérifions, confirmons votre place et vous transmettons vos accès.</li>
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
    ── Où va une demande de rappel ────────────────────────────────────────────
    Elle allait à l'adresse publique du site, `contact@clixa.africa` : une
    demande de rappel n'est pas un événement à constater, c'était l'argument,
    c'est un appel à passer, et un appel se donne à une personne.

    ⚠️ Le risque annoncé s'est vérifié dans l'autre sens : la boîte publique
    n'est pas relevée tous les jours, et la première demande venue de la
    fenêtre de rappel — le 5 septembre 2026, depuis une fiche de parcours —
    est arrivée là où personne ne la cherchait. C'est le message qui supporte
    le moins de rester sans réponse : quelqu'un qui n'a encore rien décidé.

    Elle va donc au groupe que toute l'équipe relève, comme les cinq autres
    notifications. Décision de la direction, le 5 septembre 2026.

    ⚠️ Sans `EMAIL_EQUIPE`, rien ne part — comme pour les autres. La garde est
    juste en dessous : mieux vaut ne pas envoyer que d'envoyer à personne.
  */
  const destinataire = EQUIPE;
  if (!destinataire) return;

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

/**
 * Au participant : sa place arrive au terme annoncé.
 *
 * ── ⚠️ Le seul message que le tunnel n'envoyait pas ─────────────────────────
 * Une pré-inscription retient une place sept jours. Passé ce délai, la tâche
 * quotidienne la rend au catalogue — **en silence**. Le participant ne
 * l'apprenait qu'en rouvrant sa page, c'est-à-dire à peu près jamais : les
 * treize autres gabarits couvraient tout le reste du tunnel, celui-là
 * n'existait pas.
 *
 * Sur les quatorze dossiers de production du 6 septembre 2026, neuf étaient
 * dans ce cas. Décision de la direction, le 7 septembre : on prévient, et la
 * place ne part pas tant que le message n'est pas parti.
 *
 * ── ⚠️ Il part **au** terme, et il doit le dire comme tel ──────────────────
 * Le premier jet annonçait « Votre place est tenue jusqu'au 6 septembre » —
 * dans un message envoyé le 7. La tâche ne passe qu'à 8 h, et seulement une
 * fois le délai écoulé : la date promise était donc **toujours dans le
 * passé**, sujet compris. Le participant lisait une échéance déjà expirée
 * présentée comme à venir.
 *
 * Il dit maintenant ce qui est vrai au moment où on le lit : le délai est
 * atteint, **et la place n'est pas encore repartie**. C'est mot pour mot ce
 * qu'affiche la page du dossier dans la même fenêtre — les deux ne peuvent pas
 * se contredire, puisque le participant les lit l'un après l'autre.
 *
 * ── Ce qu'il dit, et ce qu'il ne dit pas ────────────────────────────────────
 * ⚠️ **Il ne réclame pas d'argent.** Une pré-inscription n'engage à rien et
 * n'a reçu aucune coordonnée de règlement : lui demander de payer serait le
 * même défaut que la relance corrigée la veille. Il demande le seul geste
 * qu'il puisse faire — demander son contrat — ou de nous écrire.
 *
 * ⚠️ **Le battement de deux jours n'y figure pas**, et aucune nouvelle date
 * n'est promise. Une échéance qu'on annonce plus longue est une échéance qu'on
 * repousse ; le délai gardé en réserve sert à ne pas punir un retard d'un
 * jour, pas à être offert.
 *
 * ⚠️ Rend `true` seulement si le courriel est parti — l'appelant écrit
 * `placeRappeleeLe`, et c'est cette date qui autorise la place à repartir.
 */
export async function courrielPlaceBientotRendue(
  payload: Payload,
  d: {
    reference: string;
    apprenantNom: string;
    apprenantEmail: string;
    programmeTitre: string;
    sessionDetail: string;
    tenueJusquau: string;
    urlDossier: string;
  },
): Promise<boolean> {
  const quand = JOUR.format(new Date(d.tenueJusquau));

  const corpsHtml = `
    <p>Bonjour <strong>${echapper(d.apprenantNom)}</strong>,</p>
    <p>
      Vous avez retenu une place pour <em>« ${echapper(d.programmeTitre)} »</em>
      — ${echapper(d.sessionDetail)}. Le délai que nous vous avions indiqué, le
      ${quand}, est atteint.
    </p>

    <div style="background-color: #111a33; border-radius: 6px; padding: 16px 20px; margin: 20px 0; border: 1px solid rgba(201, 162, 76, 0.3);">
      <div style="font-size: 14px; color: #ffffff;"><strong>Pour la garder, demandez votre contrat de formation</strong> depuis votre dossier — rien n'est encaissé à ce moment-là.</div>
      <div style="font-size: 13px; color: #cbd5e1; margin-top: 6px;">
        Une question d'abord ? Répondez à ce message — un conseiller vous répond.
      </div>
    </div>

    <p style="font-size: 13px; color: #94a3b8;">
      Sans nouvelle de votre part <strong>sous deux jours</strong>, nous la
      remettrons au catalogue et elle pourra être prise par quelqu'un d'autre.
      Vous pourrez toujours revenir : ce message ne ferme rien.
    </p>
  `;

  return envoyer(payload, {
    to: d.apprenantEmail,
    subject: `Votre place n'est pas encore repartie — ${d.programmeTitre}`,
    text: [
      `Bonjour ${d.apprenantNom},`,
      "",
      `Vous avez retenu une place pour « ${d.programmeTitre} » — ${d.sessionDetail}.`,
      `Le délai que nous vous avions indiqué, le ${quand}, est atteint.`,
      "",
      "Votre place n'est pas encore repartie.",
      "",
      "Pour la garder, demandez votre contrat de formation depuis votre dossier —",
      "rien n'est encaissé à ce moment-là :",
      d.urlDossier,
      "",
      "Une question d'abord ? Répondez à ce message.",
      "",
      "Sans nouvelle sous deux jours, nous la remettrons au catalogue —",
      "vous pourrez toujours revenir.",
      "",
      "CLIXA Institute — Admissions",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: "Votre place n'est pas encore repartie",
      badgeRef: d.reference,
      corpsHtml,
      boutonTexte: "Demander mon contrat",
      boutonLien: d.urlDossier,
    }),
  });
}

/**
 * Au participant : son délai court encore, mais plus pour longtemps.
 *
 * ── ⚠️ Le seul message partait quand il était déjà trop tard ────────────────
 * `courrielPlaceBientotRendue` ne part qu'**au terme** : le participant
 * apprenait que son délai était écoulé, pas qu'il courait. Celui-ci arrive à
 * quatre, trois puis deux jours de la fin — demandé par la direction le
 * 9 septembre 2026, alors que la cohorte portée par l'annonce était complète à
 * 30/30 et qu'une place perdue ne se retrouvait pas.
 *
 * ⚠️ **Il ne réclame pas d'argent, et c'est la règle de la maison.** Une
 * pré-inscription n'a **jamais reçu de coordonnées de règlement** — elles
 * partent après la signature du contrat. Lui écrire « venez terminer votre
 * paiement » lui demanderait un geste qu'il n'a aucun moyen de faire : c'est
 * exactement le défaut que `prochaineEtape` corrige sur la page du dossier, et
 * celui que le formulaire d'annonce de transfert a coûté à un vrai prospect.
 * Le seul geste possible à ce stade est de **demander son contrat**.
 *
 * ⚠️ **Et il dit ce qui arrive vraiment.** Le dossier n'est pas supprimé : sa
 * *place* retourne au catalogue, et la personne peut toujours écrire. Annoncer
 * une suppression serait plus impressionnant et faux — or c'est la seule chose
 * qu'un message de relance ne peut pas se permettre.
 */
export async function courrielRappelAvantTerme(
  payload: Payload,
  d: {
    reference: string;
    apprenantNom: string;
    apprenantEmail: string;
    programmeTitre: string;
    sessionDetail: string;
    tenueJusquau: string;
    urlDossier: string;
    jours: number;
  },
): Promise<boolean> {
  const quand = JOUR.format(new Date(d.tenueJusquau));
  const reste = d.jours === 1 ? "il vous reste un jour" : `il vous reste ${d.jours} jours`;
  const Reste = d.jours === 1 ? "Il vous reste un jour" : `Il vous reste ${d.jours} jours`;

  const corpsHtml = `
    <p>Bonjour <strong>${echapper(d.apprenantNom)}</strong>,</p>
    <p>
      Vous avez retenu une place pour <em>« ${echapper(d.programmeTitre)} »</em>
      — ${echapper(d.sessionDetail)}. Nous vous la tenons jusqu'au
      <strong>${quand}</strong> : ${reste}.
    </p>

    <div style="background-color: #111a33; border-radius: 6px; padding: 16px 20px; margin: 20px 0; border: 1px solid rgba(201, 162, 76, 0.3);">
      <div style="font-size: 14px; color: #ffffff;"><strong>Pour la garder, demandez votre contrat de formation</strong> depuis votre dossier.</div>
      <div style="font-size: 13px; color: #cbd5e1; margin-top: 6px;">
        Rien n'est encaissé à ce moment-là. Les modalités de règlement vous
        parviennent après, une fois le contrat signé et relu par nos soins.
      </div>
    </div>

    <p style="font-size: 13px; color: #94a3b8;">
      Passé ce délai, votre place retourne au catalogue et peut être prise par
      quelqu'un d'autre. Une question d'abord ? Répondez à ce message — un
      conseiller vous répond.
    </p>
  `;

  return envoyer(payload, {
    to: d.apprenantEmail,
    subject: `${Reste} pour confirmer votre place — ${d.programmeTitre}`,
    text: [
      `Bonjour ${d.apprenantNom},`,
      "",
      `Vous avez retenu une place pour « ${d.programmeTitre} » — ${d.sessionDetail}.`,
      `Nous vous la tenons jusqu'au ${quand} : ${reste}.`,
      "",
      "Pour la garder, demandez votre contrat de formation depuis votre dossier :",
      d.urlDossier,
      "",
      "Rien n'est encaissé à ce moment-là. Les modalités de règlement vous",
      "parviennent après, une fois le contrat signé et relu par nos soins.",
      "",
      "Passé ce délai, votre place retourne au catalogue.",
      "",
      "Une question d'abord ? Répondez à ce message.",
      "",
      "CLIXA Institute — Admissions",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: `${Reste} pour confirmer votre place`,
      badgeRef: d.reference,
      corpsHtml,
      boutonTexte: "Demander mon contrat",
      boutonLien: d.urlDossier,
    }),
  });
}

/**
 * Au participant : son versement est enregistré, sa place est acquise.
 *
 * ── ⚠️ Le geste d'équipe dont personne ne l'informait ───────────────────────
 * L'équipe voyait l'argent arriver, ouvrait l'échéancier, marquait la ligne
 * réglée — et le participant n'en savait rien. Il avait fait un transfert
 * international vers un pays qui n'est pas le sien, et attendait une
 * confirmation qui ne venait pas. Chaque autre moment du tunnel en envoie une ;
 * celui-là, le seul où de l'argent change de mains, n'en envoyait aucune.
 *
 * Signalé par la direction le 7 septembre 2026 : « qu'on lui dise qu'il a payé
 * et que sa place est garantie ».
 *
 * ⚠️ **C'est aussi le moment où sa place cesse d'expirer.** Un versement reçu
 * la retient sans limite (`lib/places.ts`) : le lui dire vaut mieux que de le
 * laisser compter les jours d'un délai qui ne court plus.
 */
export async function courrielVersementRecu(
  payload: Payload,
  d: {
    reference: string;
    apprenantNom: string;
    apprenantEmail: string;
    programmeTitre: string;
    montant: number;
    solde: boolean;
  },
): Promise<void> {
  /*
    ⚠️ L'adresse se compose ici, comme dans les douze autres gabarits, plutôt
    que d'être passée par l'appelant : une seconde façon de l'écrire finirait
    par porter l'apex quand le canonique est `www`, ce qui est arrivé six fois.
  */
  const urlDossier = `${SITE}/inscription/${d.reference}`;

  const corpsHtml = `
    <p>Bonjour <strong>${echapper(d.apprenantNom)}</strong>,</p>
    <p>
      Nous confirmons la réception de votre versement de
      <strong style="color: #e9cd84;">${EUROS.format(d.montant)}</strong> pour le parcours
      <em>« ${echapper(d.programmeTitre)} »</em>.
    </p>

    <div style="background-color: #111a33; border-radius: 6px; padding: 16px 20px; margin: 20px 0; border: 1px solid rgba(47, 163, 125, 0.35);">
      <div style="font-size: 14px; color: #ffffff;"><strong>Votre place est acquise.</strong></div>
      <div style="font-size: 13px; color: #cbd5e1; margin-top: 6px;">
        ${
          d.solde
            ? "Votre formation est intégralement réglée. Il ne reste que la date de démarrage."
            : "Elle ne repart plus au catalogue. Votre prochaine échéance figure sur votre dossier."
        }
      </div>
    </div>

    <p style="font-size: 13px; color: #94a3b8;">
      Votre attestation d'admission, désormais officielle, se télécharge depuis
      votre dossier.
    </p>
  `;

  await envoyer(payload, {
    to: d.apprenantEmail,
    subject: d.solde
      ? `Formation réglée — votre place est acquise [${d.reference}]`
      : `Versement reçu — votre place est acquise [${d.reference}]`,
    text: [
      `Bonjour ${d.apprenantNom},`,
      "",
      `Nous confirmons la réception de votre versement de ${EUROS.format(d.montant)}`,
      `pour le parcours « ${d.programmeTitre} ».`,
      "",
      "Votre place est acquise et ne repart plus au catalogue.",
      d.solde
        ? "Votre formation est intégralement réglée. Il ne reste que la date de démarrage."
        : "Votre prochaine échéance figure sur votre dossier.",
      "",
      "Votre attestation d'admission, désormais officielle :",
      urlDossier,
      "",
      "CLIXA Institute — Admissions",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: d.solde ? "Formation intégralement réglée" : "Versement reçu",
      badgeRef: d.reference,
      corpsHtml,
      boutonTexte: "Voir mon dossier",
      boutonLien: urlDossier,
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

/**
 * Au participant : son certificat est prêt.
 *
 * ── Pourquoi ce message existe ───────────────────────────────────────────────
 * L'équipe passe un dossier à « Terminée » depuis /admin ; sans ce message, le
 * participant n'a aucun moyen de savoir que ce geste a eu lieu, ni que le PDF
 * existe désormais sur son dossier. C'est le même défaut que celui déjà
 * corrigé pour le contrat vérifié et les instructions de paiement : un état
 * qui change sans que personne n'en soit prévenu.
 *
 * ⚠️ **Il dit aussi que le document se vérifie, et c'est à lui de le dire.**
 * Le certificat porte un code depuis le 14 septembre 2026, et `/verifier` le
 * lit ; mais c'est le participant qui remet le document à un employeur ou à une
 * banque, et il ne peut pas leur en vanter une propriété qu'il ignore. Le code
 * ne dit rien de son dossier — c'est toute la raison pour laquelle il est tiré
 * à part — donc l'écrire ici ne découvre rien que le certificat ne porte déjà.
 */
export async function courrielCertificatDisponible(
  payload: Payload,
  d: {
    reference: string;
    apprenantNom: string;
    apprenantEmail: string;
    programmeTitre: string;
    certificatCode?: string;
  },
): Promise<boolean> {
  const url = `${SITE}/inscription/${d.reference}`;
  const verif = `${SITE}/verifier`;

  return envoyer(payload, {
    to: d.apprenantEmail,
    subject: `Votre certificat est disponible — ${d.programmeTitre} [${d.reference}]`,
    text: [
      `Bonjour ${d.apprenantNom},`,
      "",
      `Votre parcours « ${d.programmeTitre} » est marqué terminé, et votre certificat`,
      "professionnel est prêt.",
      "",
      "Vous le trouverez sur la page de votre dossier :",
      `  ${url}`,
      ...(d.certificatCode
        ? [
            "",
            "Le document porte en bas de page un code de vérification :",
            `  ${d.certificatCode}`,
            "",
            "Un employeur, une banque ou une école peut le saisir ici pour",
            "confirmer que le certificat est authentique :",
            `  ${verif}`,
          ]
        : []),
      "",
      "Merci de votre confiance.",
      "",
      "CLIXA Institute — Direction des Admissions",
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: "Votre certificat est disponible",
      soustitre: d.programmeTitre,
      badgeRef: d.reference,
      corpsHtml: `
        <p style="margin-top: 0;">Bonjour <strong>${echapper(d.apprenantNom)}</strong>,</p>
        <p style="margin: 0 0 16px 0; padding: 14px 16px; background-color: #0d2119; border-left: 3px solid #2fa37d; font-size: 15px; color: #ffffff;">
          Votre parcours <strong>« ${echapper(d.programmeTitre)} »</strong> est marqué terminé, et votre <strong>certificat professionnel est prêt</strong>.
        </p>
        <p>Vous le trouverez sur la page de votre dossier, en PDF.</p>
        ${
          d.certificatCode
            ? `<p style="margin: 16px 0 0 0;">Le document porte en bas de page un <strong>code de vérification</strong> :</p>
        <p style="margin: 8px 0 0 0; font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace; font-size: 17px; letter-spacing: 1px; color: #ffffff;">${echapper(d.certificatCode)}</p>
        <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 13px;">Un employeur, une banque ou une école peut le saisir sur <a href="${verif}" style="color: #e9cd84;">${verif.replace(/^https?:\/\//, "")}</a> pour confirmer que votre certificat est authentique.</p>`
            : ""
        }
        <p style="color: #94a3b8; font-size: 13px; margin-top: 18px;">Merci de votre confiance.</p>
      `,
      boutonTexte: "Ouvrir mon dossier",
      boutonLien: url,
    }),
  });
}

/**
 * Une conversation WhatsApp attend un conseiller.
 *
 * ⚠️ **C'est le message le plus urgent des sept.** Les autres constatent ce qui
 * s'est produit — une inscription, un contrat, un transfert — et peuvent
 * attendre l'heure suivante. Celui-ci dit qu'une personne est **en train**
 * d'écrire, maintenant, et qu'un robot vient de lui promettre qu'on lui
 * répondrait. Une promesse tenue vingt minutes plus tard n'est plus la même
 * promesse.
 *
 * ⚠️ Il ne part qu'une fois par reprise : la garde « vide avant, rempli
 * maintenant » vit dans le crochet de `Conversations`, comme pour le contrat
 * vérifié et le certificat. Sans elle, chaque message reçu la renverrait.
 */
export async function courrielMainPassee(
  payload: Payload,
  d: { id: string; nom: string; whatsapp: string; dernier: string },
): Promise<void> {
  if (!EQUIPE) return;

  const lien = `https://www.clixa.africa/admin/collections/conversations/${d.id}`;
  const corpsHtml = `
    <p style="margin: 0 0 16px;">Le robot d'orientation passe la main : quelqu'un demande à parler à un conseiller, et nous sommes dans les heures d'ouverture.</p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="color: #94a3b8; padding: 4px 0;">Nom :</td><td>${echapper(d.nom)}</td></tr>
      <tr><td style="color: #94a3b8; padding: 4px 0;">WhatsApp :</td><td>${echapper(d.whatsapp)}</td></tr>
      <tr><td style="color: #94a3b8; padding: 4px 0; vertical-align: top;">Dernier message :</td><td>${echapper(d.dernier)}</td></tr>
    </table>
    <p style="margin: 16px 0 0; color: #94a3b8; font-size: 13px;">Le robot s'est tu : plus aucun message automatique ne partira sur ce fil tant que la conversation reste sur « un conseiller ».</p>
  `;

  await envoyer(payload, {
    to: EQUIPE,
    subject: `À reprendre — ${d.nom} attend un conseiller`,
    text: [
      "Le robot d'orientation passe la main.",
      "",
      `Nom : ${d.nom}`,
      `WhatsApp : ${d.whatsapp}`,
      `Dernier message : ${d.dernier}`,
      "",
      `La conversation : ${lien}`,
    ].join("\n"),
    html: gabaritHtmlEmail({
      titre: "Une conversation attend un conseiller",
      corpsHtml,
      boutonTexte: "Lire la conversation",
      boutonLien: lien,
    }),
  });
}

/**
 * L'annonce du démarrage de la cohorte, adressée à chaque inscrit.
 *
 * ── Ce que ce message est, et ce qu'il n'est pas ────────────────────────────
 * Demandé par la direction le 23 septembre 2026 : prévenir les inscrits que la
 * session démarre, réclamer le règlement à qui doit régler, et la signature à
 * qui n'a pas signé. C'est **un** message, pas trois : tout le monde apprend la
 * même nouvelle — le parcours commence le samedi 3 octobre — et chacun lit
 * ensuite ce qui le concerne, lui.
 *
 * ⚠️ **Le bloc « où en est votre dossier » vient d'`annonceDuDemarrage`**, pas
 * d'un `if` écrit ici. Sur cent seize dossiers de production, dix seulement
 * peuvent régler quelque chose aujourd'hui ; écrire la règle dans le gabarit
 * l'aurait rendue invérifiable, et un envoi de masse est précisément ce qu'on
 * ne peut pas rattraper. Voir `lib/demarrage.ts` pour le décompte et la règle.
 *
 * ── Le dessin ──────────────────────────────────────────────────────────────
 * Le corps suit la forme que la direction a demandée — celle des messages de
 * Namecheap ou de Vercel : une nouvelle en haut, un encadré de faits au
 * milieu, un seul bouton. Trois choix tiennent à la messagerie, pas au goût :
 *
 * - **des tableaux, pas des `div` en flex.** Outlook rend le HTML avec le
 *   moteur de Word : `flex` et `grid` y sont ignorés, et la mise en page
 *   s'effondre en une colonne de texte nu.
 * - **des styles en ligne.** Gmail retire la balise `<style>` d'un message.
 * - **aucune image.** Les clients les bloquent par défaut ; un message dont
 *   l'information vit dans une image arrive vide. Le cartouche de l'en-tête
 *   est donc dessiné en HTML, comme dans les quinze autres gabarits.
 */
export async function courrielDemarrageCohorte(
  payload: Payload,
  d: {
    reference: string;
    apprenantNom: string;
    apprenantEmail: string;
    programmeTitre: string;
    /** « 8 samedis · 9h00–13h00 » — la cadence fait foi, elle n'est pas recalculée. */
    cadence?: string;
    debut: string;
    fin?: string;
    urlDossier: string;
    annonce: import("@/lib/demarrage").AnnonceDemarrage;
  },
): Promise<boolean> {
  const debutLong = JOUR.format(new Date(d.debut));
  const finLong = d.fin ? JOUR.format(new Date(d.fin)) : undefined;

  /*
    ⚠️ Le prénom seul, et seulement s'il en reste quelque chose. « Bonjour
    M. » sur un nom d'un seul mot serait pire que « Bonjour ». On coupe sur le
    premier espace et l'on se rabat sur le nom entier.
  */
  const prenom = d.apprenantNom.trim().split(/\s+/)[0] || d.apprenantNom.trim();

  const ligne = (cle: string, valeur: string) => `
    <tr>
      <td style="padding: 9px 0; border-bottom: 1px solid rgba(243,239,228,0.07); color: #94a3b8; font-size: 13px; vertical-align: top; width: 132px;">${cle}</td>
      <td style="padding: 9px 0; border-bottom: 1px solid rgba(243,239,228,0.07); color: #f1f5f9; font-size: 14px; vertical-align: top;">${valeur}</td>
    </tr>`;

  const corpsHtml = `
    <p style="margin: 0 0 18px 0;">Bonjour ${echapper(prenom)},</p>

    <p style="margin: 0 0 24px 0;">
      Votre parcours <strong style="color: #ffffff;">${echapper(d.programmeTitre)}</strong>
      démarre le <strong style="color: #e9cd84;">${echapper(debutLong)}</strong>.
      Voici où en est votre dossier, et ce qu'il reste à faire avant la première séance.
    </p>

    <!-- Encadré des faits : ce que le participant vérifiera sur le site -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #111a33; border: 1px solid rgba(201,162,76,0.18); border-radius: 8px; padding: 18px 20px; margin: 0 0 26px 0;">
      <tr><td>
        <div style="font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #c9a24c; margin-bottom: 10px;">Votre inscription</div>
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          ${ligne("Parcours", `<strong style="color:#ffffff;">${echapper(d.programmeTitre)}</strong>`)}
          ${ligne("Première séance", echapper(debutLong))}
          ${finLong ? ligne("Dernière séance", echapper(finLong)) : ""}
          ${d.cadence ? ligne("Rythme", echapper(d.cadence) + " (UTC)") : ""}
          ${ligne("Format", "Classe virtuelle, en direct avec un formateur")}
          ${ligne("Référence", `<span style="font-family:'SF Mono',Menlo,monospace; color:#e9cd84; letter-spacing:0.04em; white-space:nowrap;">${echapper(d.reference)}</span>`)}
        </table>
      </td></tr>
    </table>

    <!-- Où en est le dossier : la seule partie qui change d'un destinataire à l'autre -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-left: 3px solid #c9a24c; background-color: rgba(201,162,76,0.06); border-radius: 0 6px 6px 0; margin: 0 0 8px 0;">
      <tr><td style="padding: 16px 18px;">
        <div style="font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #c9a24c; margin-bottom: 8px;">Où en est votre dossier</div>
        <div style="color: #ffffff; font-size: 15px; font-weight: bold; line-height: 1.5; margin-bottom: ${d.annonce.geste ? "8px" : "0"};">
          ${echapper(d.annonce.situation)}
        </div>
        ${
          d.annonce.geste
            ? `<div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">${echapper(d.annonce.geste)}</div>`
            : `<div style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Rien à faire de votre côté pour l'instant — nous revenons vers vous.</div>`
        }
      </td></tr>
    </table>
  `;

  /*
    ⚠️ **La mise en garde contre l'hameçonnage ne s'écrit qu'à qui peut
    payer.** C'est le seul moment où de l'argent change de mains, et la date
    d'envoi affichée sur le dossier est la seule vérification qu'on offre au
    participant. L'écrire à quelqu'un qui n'a rien à régler ajouterait une
    inquiétude sans lui donner de geste — et diluerait l'avertissement le jour
    où il compte vraiment.
  */
  const garde = d.annonce.peutRegler
    ? `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 26px 0 0 0; border-top: 1px dashed rgba(243,239,228,0.12);">
      <tr><td style="padding-top: 16px; font-size: 12.5px; line-height: 1.6; color: #94a3b8;">
        <strong style="color:#cbd5e1;">Une précaution.</strong> Les coordonnées de règlement ne figurent
        jamais sur notre site : elles vous ont été envoyées par courriel, et la date de cet envoi
        s'affiche sur votre dossier. Un message qui ne correspond à aucune date affichée ne vient
        pas de nous — écrivez-nous avant d'y donner suite.
      </td></tr>
    </table>`
    : "";

  const texte = [
    `Bonjour ${prenom},`,
    "",
    `Votre parcours ${d.programmeTitre} démarre le ${debutLong}.`,
    "",
    "VOTRE INSCRIPTION",
    `  Parcours       : ${d.programmeTitre}`,
    `  Première séance: ${debutLong}`,
    finLong ? `  Dernière séance: ${finLong}` : "",
    d.cadence ? `  Rythme         : ${d.cadence} (UTC)` : "",
    `  Format         : classe virtuelle, en direct avec un formateur`,
    `  Référence      : ${d.reference}`,
    "",
    "OÙ EN EST VOTRE DOSSIER",
    `  ${d.annonce.situation}`,
    d.annonce.geste ? `  ${d.annonce.geste}` : "  Rien à faire de votre côté pour l'instant.",
    "",
    `${d.annonce.bouton} : ${d.urlDossier}`,
    "",
    d.annonce.peutRegler
      ? "Une précaution : les coordonnées de règlement ne figurent jamais sur notre site. Elles vous ont été envoyées par courriel, et la date de cet envoi s'affiche sur votre dossier. Un message qui ne correspond à aucune date affichée ne vient pas de nous."
      : "",
    "",
    `Une question ? WhatsApp ${RESEAUX_CLIXA.whatsapp.numeroAffiche} — ${RESEAUX_CLIXA.email.adresse}`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return envoyer(payload, {
    to: d.apprenantEmail,
    /*
      ⚠️ L'objet nomme le parcours, jamais la seule date. « Votre parcours
      commence samedi » dans une boîte qui porte déjà quatre de nos messages ne
      dit pas lequel des douze, et se lit comme une relance de plus.
    */
    subject: `${d.programmeTitre} — première séance le ${debutLong}`,
    text: texte,
    html: gabaritHtmlEmail({
      titre: `Votre parcours commence le ${debutLong}`,
      soustitre: `Huit séances en direct${finLong ? `, jusqu'au ${finLong}` : ""}.`,
      corpsHtml: corpsHtml + garde,
      boutonTexte: d.annonce.bouton,
      boutonLien: d.urlDossier,
      badgeRef: d.reference,
    }),
  });
} /**
 * Le message de présentation, centré sur un parcours.
 *
 * ── ⚠️ Ce message ne suit aucun geste ──────────────────────────────────────
 * Les seize autres partent parce que quelqu'un a fait quelque chose. Celui-ci
 * part parce que **nous** avons décidé d'écrire à quelqu'un qui ne nous
 * connaît peut-être pas. D'où `List-Unsubscribe`, et le désabonnement dit
 * aussi en toutes lettres.
 *
 * ── ⚠️ Ce qui a été repris d'un gabarit reçu, et ce qui a été corrigé ──────
 * La direction a transmis le 23 septembre 2026 un gabarit composé ailleurs
 * (« khedm bhado o ziid 3lihom dakxi dyalk »). Sa **structure** était bonne et
 * elle est reprise : trois compétences en tête, des cartes, trois étapes, un
 * encadré de tarifs, deux boutons. Ses **faits** ne tenaient pas, et chacun
 * aurait été découvert par le premier prospect qui vérifie :
 *
 * | ce qu'il annonçait | ce qui est vrai |
 * |---|---|
 * | `/programmes/<slug>` | `/formations/<slug>` — **tous ses liens rendaient 404** |
 * | « 8 séances du soir » | **8 samedis, 9h00–13h00 UTC** |
 * | « Promotion limitée à 20 participants » | la cohorte est **tenue ouverte**, et 109 places étaient déjà prises |
 * | « Places limitées » | aucune rareté ne s'invente |
 * | WhatsApp `212660000000` | `212669303467` — l'autre est un numéro d'attente |
 * | 4 images `email_*.jpg` | **404**, aucune n'existe |
 * | « Sélection sur dossier », « Comité des Admissions » | il n'y a pas de sélection : pré-inscription, contrat, règlement |
 * | « Accès immédiat à la plateforme » | l'accès vient après la signature et le versement |
 * | « 5 templates » | **six** livrables, et ils sont au catalogue |
 * | « 3 mensualités » | trois échéances **adossées aux séances**, pas aux mois |
 * | « Attestation officielle » | l'attestation est **provisoire** tant que rien n'est réglé |
 * | `/conditions`, `/desinscription` | **404** toutes les deux |
 *
 * Tout ce que ce gabarit affirme vient donc du catalogue, du barème ou de la
 * session — jamais d'une rédaction parallèle. `verifier-presentation.ts` garde
 * chacun de ces refus.
 */
export async function courrielPresentation(
  payload: Payload,
  d: {
    email: string;
    nom?: string;
    presentation: import("@/lib/presentation").Presentation;
  },
): Promise<boolean> {
  const p = d.presentation;
  const prenom = d.nom?.trim().split(/\s+/)[0];
  const IMG = `${SITE}/images/email`;
  const v = p.enAvant;

  const image = (fichier: string, alt: string, hauteur?: number) =>
    `<img src="${IMG}/${fichier}" width="600"${hauteur ? ` height="${hauteur}"` : ""} alt="${echapper(alt)}" style="display:block; width:100%; max-width:600px; height:auto; border:0; outline:none;">`;

  const rubrique = (t: string) =>
    `<div style="font-family:'SF Mono',Menlo,Consolas,monospace; font-size:9.5px; letter-spacing:0.15em; text-transform:uppercase; color:#8f6b1c; padding:0 0 12px;">${echapper(t)}</div>`;

  const air = (h: number) => `<div style="height:${h}px; line-height:${h}px;">&nbsp;</div>`;

  /*
    ⚠️ `white-space: nowrap` sur les colonnes du bandeau : « 8 samedis » se
    cassait en deux dès que la colonne se resserrait, et un bandeau dont l'un
    des trois fait deux lignes tord l'alignement. Mesuré à l'écran.

    ⚠️ Et les commentaires sur le HTML vivent **ici**, hors du littéral : un
    backtick posé dedans le termine, et l'erreur qui en sort désigne une tout
    autre ligne.
  */
  const heures = v?.heures ?? 32;
  const jours = v?.cadence?.split("·")[0]?.trim() ?? "8 séances";
  const faits = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#faf8f3; border-radius:10px;">
      <tr>
        ${[
          [`${heures} h`, "en direct"],
          [jours, "le matin"],
          ["100 %", "en ligne"],
        ]
          .map(
            ([grand, petit]) => `<td align="center" width="33%" style="padding:18px 6px;">
            <div style="font-family:Georgia,serif; font-size:19px; font-weight:bold; color:#15181f; white-space:nowrap;">${echapper(String(grand))}</div>
            <div style="font-size:12px; color:#5c5f68; padding-top:3px; white-space:nowrap;">${echapper(String(petit))}</div>
          </td>`,
          )
          .join("")}
      </tr>
    </table>`;

  /*
    Les trois compétences de tête, avec une pastille numérotée — la forme du
    gabarit reçu, dont c'était la meilleure idée. ⚠️ Un chiffre, pas un emoji :
    les emojis ne se rendent pas pareil d'un client à l'autre, et un carré vide
    dans un message de prospection se lit comme un message mal formé.
  */
  const competences =
    v && v.competences.length > 0
      ? `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      ${v.competences
        .map(
          (c, i) => `<tr>
        <td width="40" style="vertical-align:top; padding:0 0 16px;">
          <div style="width:28px; height:28px; border-radius:50%; background-color:#15181f; color:#c9a24c; text-align:center; line-height:28px; font-family:Georgia,serif; font-size:14px; font-weight:bold;">${i + 1}</div>
        </td>
        <td style="vertical-align:top; padding:3px 0 16px 12px; font-size:15px; line-height:1.55; color:#2b2f38;">
          ${echapper(c.charAt(0).toUpperCase() + c.slice(1))}
        </td>
      </tr>`,
        )
        .join("")}
    </table>`
      : "";

  const SPECIMEN = "directeur-administratif-et-financier";

  const bloc = (titre: string, contenu: string) => `
    ${air(32)}
    ${rubrique(titre)}
    ${contenu}`;

  const enAvant = v
    ? `
    ${air(30)}
    ${competences}

    ${air(20)}
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#faf8f3; border:1px solid #e6e0d2; border-radius:12px; overflow:hidden;">
      ${
        v.slug === SPECIMEN
          ? `<tr><td style="padding:0;">${image("certificat-daf.jpg", `Spécimen du certificat professionnel ${v.titre}, portant le détail des séances et un code de vérification`, 375)}</td></tr>`
          : ""
      }
      <tr><td style="padding:24px;">
        ${rubrique("Le programme, séance par séance")}
        <div style="font-size:14.5px; line-height:2; color:#2b2f38;">
          ${v.seances.map((s) => echapper(s)).join("<br>")}
        </div>
        ${
          v.livrables.length > 0
            ? `<div style="margin-top:20px; padding-top:18px; border-top:1px solid #e6e0d2;">
                 ${rubrique(`Ce que vous emportez — ${v.livrables.length} livrables`)}
                 <div style="font-size:14px; line-height:1.85; color:#5c5f68;">${v.livrables.map((l) => "&bull;&nbsp; " + echapper(l)).join("<br>")}</div>
               </div>`
            : ""
        }
        ${
          v.pourQui.length > 0
            ? `<div style="margin-top:18px; padding-top:16px; border-top:1px solid #e6e0d2; font-size:13.5px; line-height:1.6; color:#8a8778;">
                 <strong style="color:#5c5f68;">Pour qui :</strong> ${echapper(v.pourQui.join(" · "))}
               </div>`
            : ""
        }
        <div style="padding-top:22px;">
          <a href="${SITE}/formations/${v.slug}" style="display:inline-block; background-color:#15181f; color:#ffffff; font-size:13.5px; font-weight:bold; text-decoration:none; padding:12px 24px; border-radius:6px;">
            Voir la fiche complète &rarr;
          </a>
          <a href="${SITE}/formations/${v.slug}/plaquette" style="display:inline-block; margin-left:8px; color:#8f6b1c; font-size:13.5px; font-weight:bold; text-decoration:none; padding:12px 4px;">
            La plaquette (PDF)
          </a>
        </div>
      </td></tr>
    </table>`
    : "";

  /*
    ── Les trois étapes, telles qu'elles se passent vraiment ─────────────────
    ⚠️ Le gabarit reçu décrivait une sélection sur dossier et un comité des
    admissions. Il n'y en a pas : le tunnel a deux temps, et la pré-inscription
    n'engage à rien. Promettre un entretien de sélection à quelqu'un qui
    remplira un formulaire sans jamais être appelé, c'est le faire attendre
    pour rien.
  */
  const etapes = [
    [
      "Vous retenez votre place",
      "Un formulaire de deux minutes. Rien ne vous engage, rien n'est encaissé, et vous repartez avec une référence de dossier.",
    ],
    [
      "Vous demandez votre contrat, quand vous êtes décidé",
      "Il se compose depuis votre dossier et se signe en ligne. Les instructions de règlement vous parviennent ensuite, par courriel.",
    ],
    [
      "Vous réglez, et vous démarrez",
      "Carte bancaire, virement ou transfert — vous choisissez. Aucune donnée bancaire ne passe par le site.",
    ],
  ]
    .map(
      ([titre, texte], i) => `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#faf8f3; border-left:3px solid ${i === 2 ? "#2f6d52" : "#c9a24c"}; border-radius:0 8px 8px 0; margin-bottom:12px;">
      <tr><td style="padding:15px 18px;">
        <div style="font-size:14.5px; font-weight:bold; color:#15181f;">${i + 1}. ${echapper(titre)}</div>
        <div style="font-size:13.5px; line-height:1.6; color:#5c5f68; padding-top:5px;">${echapper(texte)}</div>
      </td></tr>
    </table>`,
    )
    .join("");

  const corpsHtml = `
    ${image("hero-catalogue.jpg", "Le catalogue exécutif CLIXA posé sur une table de conseil, face à une baie vitrée au crépuscule", 280)}

    ${air(26)}
    ${faits}

    ${prenom ? `${air(26)}<div style="font-size:15px; color:#2b2f38;">Bonjour ${echapper(prenom)},</div>` : ""}

    ${air(18)}
    <div style="font-size:15.5px; line-height:1.7; color:#2b2f38;">
      ${echapper(p.accroche)}
    </div>

    ${enAvant}

    ${bloc("Comment s'inscrire", etapes)}

    ${bloc(
      "Tarifs — les mêmes pour tous les parcours",
      `<table width="100%" border="0" cellspacing="0" cellpadding="0">
      ${p.formules
        .map(
          (f) => `<tr>
        <td style="padding:11px 0; border-bottom:1px solid #eee9dd; font-size:14.5px; color:#2b2f38;">${echapper(f.libelle)}</td>
        <td align="right" style="padding:11px 0; border-bottom:1px solid #eee9dd; font-family:Georgia,serif; font-size:17px; font-weight:bold; color:#15181f; white-space:nowrap;">${echapper(f.total)}</td>
        <td align="right" style="padding:11px 0 11px 14px; border-bottom:1px solid #eee9dd; font-size:12px; color:#8a8778; white-space:nowrap;">${echapper(f.detail)}</td>
      </tr>`,
        )
        .join("")}
    </table>
    <div style="font-size:12.5px; line-height:1.6; color:#8a8778; padding-top:10px;">
      Payer en plusieurs fois coûte un peu plus cher. Nous préférons l'écrire ici
      plutôt que vous le laisser découvrir au moment de régler — les échéances sont
      adossées aux séances, pas au calendrier.
    </div>`,
    )}

    ${air(32)}
    ${image("seminaire.jpg", "Séminaire de dirigeants animé par CLIXA à Agadir, autour d'une table de conseil", 338)}
    <div style="font-size:11.5px; line-height:1.55; color:#8a8778; padding:9px 2px 0; font-style:italic;">
      Séminaire dirigeants · Agadir — les parcours, eux, se donnent en classe virtuelle.
    </div>

    ${bloc(
      "Le certificat",
      `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#faf8f3; border-left:3px solid #c9a24c; border-radius:0 10px 10px 0;">
      <tr><td style="padding:20px 22px; font-size:14.5px; line-height:1.7; color:#2b2f38;">
        ${p.certificat.map((l) => echapper(l)).join("<br><br>")}
      </td></tr>
    </table>`,
    )}

    ${bloc(
      `Les ${p.combien} parcours`,
      p.familles
        .map(
          (f) => `
      <div style="font-family:'SF Mono',Menlo,monospace; font-size:9.5px; letter-spacing:0.14em; text-transform:uppercase; color:#8f6b1c; padding:12px 0 6px;">${echapper(f.nom)}</div>
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        ${f.parcours
          .map(
            (c) => `<tr>
          <td style="padding:7px 0; border-bottom:1px solid #eee9dd; font-size:14.5px; color:${c.slug === v?.slug ? "#8f6b1c" : "#2b2f38"}; ${c.slug === v?.slug ? "font-weight:bold;" : ""}">${echapper(c.titre)}</td>
          <td align="right" style="padding:7px 0; border-bottom:1px solid #eee9dd; font-size:12.5px; color:#8a8778; white-space:nowrap;">${c.heures} h</td>
        </tr>`,
          )
          .join("")}
      </table>`,
        )
        .join(""),
    )}

    ${
      p.rentree
        ? `${air(30)}
           <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#15181f; border-radius:10px;">
             <tr><td align="center" style="padding:22px;">
               <div style="font-family:'SF Mono',Menlo,monospace; font-size:9.5px; letter-spacing:0.15em; text-transform:uppercase; color:#c9a24c;">Prochaine rentrée</div>
               <div style="font-family:Georgia,serif; font-size:18px; font-weight:bold; color:#ffffff; padding-top:7px;">${echapper(p.rentree)}</div>
             </td></tr>
           </table>`
        : ""
    }

    ${air(22)}
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr><td align="center" style="padding-bottom:10px;">
        <a href="${RESEAUX_CLIXA.whatsapp.url}" style="display:block; background-color:#ffffff; border:1px solid #2f6d52; color:#2f6d52; font-size:14px; font-weight:bold; text-align:center; text-decoration:none; padding:13px 20px; border-radius:8px;">
          Poser une question sur WhatsApp — ${echapper(RESEAUX_CLIXA.whatsapp.numeroAffiche)}
        </a>
      </td></tr>
    </table>
  `;

  const desabonnement = `mailto:${REPONDRE_A}?subject=${encodeURIComponent("Désabonnement")}`;
  const pied = `
    ${air(24)}
    <div style="border-top:1px solid #eee9dd; padding-top:16px; font-size:11.5px; line-height:1.6; color:#8a8778;">
      Vous recevez ce message parce que nous pensons que nos parcours peuvent vous
      intéresser. Si ce n'est pas le cas,
      <a href="${desabonnement}" style="color:#8f6b1c;">dites-le nous en un clic</a>
      et nous ne vous écrirons plus.
    </div>`;

  const texte = [
    prenom ? `Bonjour ${prenom},` : "",
    "",
    p.accroche,
    "",
    v ? `${v.titre} — ${heures} h · ${v.cadence ?? "8 séances"}` : "",
    ...(v ? v.competences.map((c) => `  · ${c}`) : []),
    "",
    ...(v
      ? [
          "LE PROGRAMME, SÉANCE PAR SÉANCE",
          ...v.seances.map((s) => `  ${s}`),
          "",
          ...(v.livrables.length
            ? [
                `CE QUE VOUS EMPORTEZ — ${v.livrables.length} LIVRABLES`,
                ...v.livrables.map((l) => `  · ${l}`),
                "",
              ]
            : []),
          ...(v.pourQui.length ? [`Pour qui : ${v.pourQui.join(" · ")}`, ""] : []),
          `  La fiche : ${SITE}/formations/${v.slug}`,
          `  La plaquette : ${SITE}/formations/${v.slug}/plaquette`,
          "",
        ]
      : []),
    "COMMENT S'INSCRIRE",
    "  1. Vous retenez votre place — rien ne vous engage, rien n'est encaissé.",
    "  2. Vous demandez votre contrat quand vous êtes décidé, et vous le signez en ligne.",
    "  3. Vous réglez — carte, virement ou transfert. Aucune donnée bancaire ne passe par le site.",
    "",
    "TARIFS — les mêmes pour tous les parcours",
    ...p.formules.map((f) => `  ${f.libelle} : ${f.total} (${f.detail})`),
    "  Les échéances sont adossées aux séances, pas au calendrier.",
    "",
    "Séminaire dirigeants · Agadir — les parcours, eux, se donnent en classe virtuelle.",
    "",
    "LE CERTIFICAT",
    ...p.certificat.map((l) => `  · ${l}`),
    "",
    `LES ${p.combien} PARCOURS`,
    ...p.familles.flatMap((f) => [
      "",
      `  ${f.nom.toUpperCase()}`,
      ...f.parcours.map((c) => `    · ${c.titre} — ${c.heures} h`),
    ]),
    "",
    p.rentree ? `PROCHAINE RENTRÉE : ${p.rentree}` : "",
    "",
    `Le catalogue : ${SITE}/formations`,
    `Une question ? WhatsApp ${RESEAUX_CLIXA.whatsapp.numeroAffiche} — ${RESEAUX_CLIXA.email.adresse}`,
    "",
    `Pour ne plus recevoir nos messages, répondez « Désabonnement » à ${REPONDRE_A}.`,
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  return envoyer(payload, {
    to: d.email,
    subject: p.objet,
    text: texte,
    html: gabaritClairEmail({
      titre: v ? v.titre : "Prenez la direction",
      soustitre: v
        ? `${echapper(v.accroche)}${p.rentree ? ` — rentrée le ${echapper(p.rentree.split(" — ")[0] ?? "")}.` : "."}`
        : "Des parcours exécutifs en classe virtuelle, avec un certificat vérifiable en ligne.",
      corpsHtml: corpsHtml + pied,
      boutonTexte: v ? "Retenir ma place" : "Voir le catalogue",
      boutonLien: v ? `${SITE}/inscription?formation=${v.slug}` : `${SITE}/formations`,
    }),
    headers: {
      "List-Unsubscribe": `<${desabonnement}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
