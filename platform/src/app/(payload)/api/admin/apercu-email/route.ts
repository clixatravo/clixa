import { getPayload } from "payload";
import config from "@payload-config";
import { gabaritHtmlEmail } from "@/lib/courriel";

/**
 * Endpoint de prévisualisation des gabarits d'e-mails pour l'administration.
 * Accessible aux administrateurs pour vérifier le rendu visuel.
 */
export async function GET(request: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });

  if (!user) {
    return new Response("Accès réservé à l'administration.", { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "inscription";

  let html = "";

  if (type === "relance") {
    html = gabaritHtmlEmail({
      titre: "Prochaine échéance de formation",
      soustitre: "Rappel automatique d'échéance · Session Automne 2026",
      badgeRef: "CLX-84920",
      corpsHtml: `
        <p>Bonjour <strong>Amadou Diallo</strong>,</p>
        <p>
          Votre prochaine échéance de formation d'un montant de <strong style="color: #e9cd84;">235,00 €</strong> est à régler avant le <strong>15 septembre 2026</strong> pour votre parcours <em>« Executive Data & AI Leadership »</em>.
        </p>

        <div style="background-color: #111a33; border-radius: 6px; padding: 16px 20px; margin: 20px 0; border: 1px solid rgba(201, 162, 76, 0.2);">
          <div style="font-size: 13px; color: #cbd5e1;">Moyens acceptés : <strong>Western Union, Ria, MoneyGram, ou virement</strong></div>
          <div style="font-size: 13px; color: #cbd5e1; margin-top: 4px;">Pensez à préciser votre référence : <strong style="color: #e9cd84; font-family: monospace;">CLX-84920</strong></div>
        </div>

        <p style="font-size: 13px; color: #94a3b8;">
          Si votre règlement a déjà été émis ces dernières 24h, nous vous remercions de ne pas tenir compte de ce message — nos équipes procéderont au rapprochement dès réception.
        </p>
      `,
      boutonTexte: "Consulter mon dossier et régler",
      boutonLien: "https://clixa.africa/inscription/CLX-84920",
    });
  } else {
    // Inscription par défaut
    html = gabaritHtmlEmail({
      titre: "Votre place est retenue",
      soustitre: "Dossier d'admission officiel · Rentrée du 19 septembre 2026",
      badgeRef: "CLX-73891",
      corpsHtml: `
        <p style="margin-top: 0;">Bonjour <strong>Sarah Benjelloun</strong>,</p>
        <p>Nous vous confirmons que votre place a bien été retenue pour le parcours exécutif :</p>
        
        <div style="background-color: #111a33; border-left: 3px solid #c9a24c; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
          <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 4px;">Executive Master · Finance Digitale & FinTech</div>
          <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 8px;">Session : <strong>Rentrée du 19 septembre 2026 (Classe virtuelle)</strong></div>
          <div style="font-size: 13px; color: #e9cd84;">Formule : <strong>Comptant (423,00 €)</strong></div>
        </div>

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
            <tr style="border-bottom: 1px solid rgba(243, 239, 228, 0.08);">
              <td style="padding: 10px 12px; font-size: 13px; color: #e2e8f0;">Règlement unique</td>
              <td style="padding: 10px 12px; font-size: 13px; font-family: monospace; font-weight: bold; color: #e9cd84; text-align: right;">423,00 €</td>
              <td style="padding: 10px 12px; font-size: 12px; color: #94a3b8; text-align: right;">À la réservation</td>
            </tr>
          </tbody>
        </table>

        <div style="font-weight: bold; font-size: 14px; color: #ffffff; margin-bottom: 12px;">Étapes pour valider définitivement votre inscription :</div>
        <ol style="margin: 0; padding-left: 20px; line-height: 1.8; color: #cbd5e1; font-size: 14px;">
          <li>Effectuez le versement de l'échéance (Western Union, Ria, MoneyGram ou virement).</li>
          <li>Transmettez le numéro de transfert par <strong>WhatsApp</strong> à votre conseiller ou sur votre dossier.</li>
          <li>Notre équipe valide votre admission et vous transmet vos accès d'apprentissage.</li>
        </ol>
      `,
      boutonTexte: "Accéder à mon dossier en ligne",
      boutonLien: "https://clixa.africa/inscription/CLX-73891",
    });
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
