import { appelant, cadenceOk, tropVite } from "@/lib/cadence";
import { getPayload } from "payload";
import config from "@payload-config";
import { SOCIETE } from "@/lib/societe";

interface Params {
  params: Promise<{ reference: string }>;
}

/**
 * Échapper avant d'écrire dans le document.
 *
 * ⚠️ Cette route sert du `text/html` construit par interpolation, et la moitié
 * des valeurs vient du formulaire public : le nom, l'adresse, le numéro, le
 * pays. Un nom contenant une balise `<script>` s'exécutait donc chez qui
 * ouvrait l'attestation — l'équipe, la plupart du temps — avec l'origine du
 * site. La référence protège l'accès au document, pas son contenu.
 *
 * Les cinq caractères qui suffisent : au-delà, on réécrit un moteur de gabarit.
 */
function echapper(valeur: unknown): string {
  return String(valeur ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(request: Request, { params }: Params) {
  /*
    Même clef, même frein que l'annonce de transfert : l'attestation s'ouvre
    sur la seule référence et affiche les coordonnées du participant. La laisser
    sans cadence rouvrirait par la porte du document ce que l'autre route ferme.
  */
  if (!cadenceOk("attestation", appelant(request), 20, 60_000)) return tropVite(60);

  const { reference } = await params;
  const refNorm = (reference ?? "").toUpperCase();

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { reference: { equals: refNorm } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  });

  const ins = docs[0];
  if (!ins) {
    return new Response("Dossier introuvable.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const sessionObj = ins.session && typeof ins.session === "object" ? ins.session : null;
  const sessionTitre =
    sessionObj && "reference" in sessionObj ? String(sessionObj.reference) : "Session Exécutive";
  const dateDebut =
    sessionObj && "debut" in sessionObj && sessionObj.debut
      ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(sessionObj.debut))
      : "Prochaine rentrée";

  const dateDoc = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());

  const echeances = Array.isArray(ins.echeances) ? ins.echeances : [];
  const totalRegle = echeances
    .filter((e) => e && typeof e === "object" && "statut" in e && e.statut === "regle")
    .reduce((acc, cur) => acc + (typeof cur?.montant === "number" ? cur.montant : 0), 0);

  /*
    ── ⚠️ Provisoire tant que rien n'est réglé ────────────────────────────────
    Le document s'intitulait « Attestation **Officielle** d'Admission » et
    affirmait faire foi « pour l'ensemble des démarches institutionnelles,
    professionnelles et de financement » — sur un dossier qui n'avait rien
    versé, et dont la place n'est tenue que sept jours.

    Il circule : le participant l'imprime pour son employeur, pour une banque,
    parfois pour un dossier de visa. Le présenter comme officiel alors que rien
    n'est acquis engage la maison sur ce qu'elle n'a pas encore accordé, et
    expose le participant à se le voir refuser au guichet.

    Décision de la direction, le 7 septembre 2026 : **provisoire jusqu'au
    règlement, officielle après**. C'est le premier versement qui fait bascule
    — le même fait qui confirme le dossier et retient la place sans terme.
  */
  const officielle = totalRegle > 0;

  /** Ce que /admin affiche, jamais le mot de la base. */
  const STATUT: Record<string, string> = {
    demandee: "Admission provisoire",
    confirmee: "Acompte reçu",
    payee: "Réglée intégralement",
    terminee: "Parcours suivi",
    annulee: "Annulée",
  };
  const statutLisible = STATUT[String(ins.statut)] ?? String(ins.statut ?? "");

  const EUROS = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${officielle ? "Attestation d'Admission" : "Attestation d'Admission Provisoire"} — ${echapper(refNorm)} — CLIXA Institute</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 30px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #c9a24c;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .brand-logo {
      font-size: 28px;
      font-weight: 800;
      color: #080c18;
      letter-spacing: -0.5px;
    }
    .brand-logo span { color: #c9a24c; }
    .brand-sub {
      font-family: monospace;
      font-size: 10px;
      letter-spacing: 2px;
      color: #64748b;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .doc-meta {
      text-align: right;
      font-family: monospace;
      font-size: 11px;
      color: #475569;
    }
    .doc-title {
      text-align: center;
      margin: 35px 0 25px 0;
    }
    .doc-title h1 {
      font-size: 22px;
      color: #080c18;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 6px 0;
    }
    .doc-title p {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .section-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      padding: 20px;
      margin-bottom: 25px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      font-size: 13px;
    }
    .info-label {
      font-family: monospace;
      font-size: 10px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 3px;
    }
    .info-valeur {
      font-weight: 600;
      color: #0f172a;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      font-weight: bold;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .signature-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 60px;
      padding-top: 20px;
    }
    .seal {
      width: 90px;
      height: 90px;
      border: 2px dashed #c9a24c;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 10px;
      font-family: monospace;
      color: #c9a24c;
      font-weight: bold;
      text-transform: uppercase;
    }
    .signature-box {
      text-align: right;
      font-size: 12px;
    }
    .signature-box strong {
      display: block;
      color: #080c18;
      margin-bottom: 40px;
    }
    /*
      ⚠️ La réserve doit se lire, pas se deviner : encadrée et sur fond, comme
      les blocs d'information. En petit texte gris au fil de la page, elle
      passerait pour une mention d'usage — et c'est justement la phrase qui
      dit ce que le document ne vaut pas.
    */
    .reserve {
      border-left: 3px solid #c9a24c;
      background: #fdfaf3;
      padding: 12px 16px;
      margin: 20px 0;
      font-size: 12px;
      color: #0f172a;
      line-height: 1.6;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
      margin-top: 50px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      font-family: monospace;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="background: #c9a24c; color: #080c18; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; font-family: monospace;">🖨 Imprimer / Enregistrer en PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="brand-logo">CLIXA<span>.</span></div>
      <div class="brand-sub">Executive Education &middot; Afrique</div>
    </div>
    <div class="doc-meta">
      <div><strong>RÉFÉRENCE :</strong> ${echapper(ins.reference)}</div>
      <div><strong>DATE D'ÉMISSION :</strong> ${echapper(dateDoc)}</div>
      <div><strong>STATUT :</strong> <span class="badge">${echapper(statutLisible)}</span></div>
    </div>
  </div>

  <div class="doc-title">
    <h1>${officielle ? "Attestation Officielle d'Admission" : "Attestation d'Admission Provisoire"}</h1>
    <p>Délivrée par la Direction des Admissions &amp; du Registre Académique</p>
  </div>

  <div class="section-box">
    <div class="info-grid">
      <div>
        <div class="info-label">Participant (Nom complet)</div>
        <div class="info-valeur">${echapper(ins.apprenantNom)}</div>
      </div>
      <div>
        <div class="info-label">Adresse E-mail</div>
        <div class="info-valeur">${echapper(ins.apprenantEmail)}</div>
      </div>
      <div>
        <div class="info-label">WhatsApp / Téléphone</div>
        <div class="info-valeur">${echapper(ins.apprenantWhatsapp)}</div>
      </div>
      <div>
        <div class="info-label">Pays de résidence</div>
        <div class="info-valeur">${echapper(ins.apprenantPays || "—")}</div>
      </div>
    </div>
  </div>

  <div class="section-box">
    <div class="info-grid">
      <div style="grid-column: 1 / -1;">
        <div class="info-label">Programme / Promotion</div>
        <div class="info-valeur" style="font-size: 15px; color: #080c18;">${echapper(sessionTitre)}</div>
      </div>
      <div>
        <div class="info-label">Date de démarrage</div>
        <div class="info-valeur">${echapper(dateDebut)}</div>
      </div>
      <div>
        <div class="info-label">Règlement enregistré</div>
        <div class="info-valeur">${officielle ? `${EUROS.format(totalRegle)} reçus` : "Aucun règlement enregistré à ce jour"}</div>
      </div>
    </div>
  </div>

  <p style="font-size: 12px; color: #475569; margin: 25px 0;">
    ${
      officielle
        ? "La direction académique de CLIXA Institute certifie par la présente l'admission du participant susmentionné au sein de la promotion exécutive désignée, les formalités d'inscription ayant été accomplies. Ce document fait foi pour l'ensemble des démarches institutionnelles, professionnelles et de financement."
        : "La direction académique de CLIXA Institute atteste par la présente l'enregistrement de la demande d'admission du participant susmentionné au sein de la promotion exécutive désignée."
    }
  </p>

  ${
    officielle
      ? ""
      : `<!--
    ⚠️ La réserve est dictée par la direction, mot pour mot. Elle ne paraît que
    sur le document provisoire : sur l'attestation définitive, elle décrirait
    une condition déjà remplie et jetterait un doute sur ce qui est acquis.
  -->
  <p class="reserve">
    Ce document ne vaut admission officielle qu'après l'accomplissement de
    l'ensemble des formalités d'inscription, y compris le règlement des frais
    de formation.
  </p>`
  }

  <div class="signature-area">
    <div class="seal">
      CLIXA<br>INSTITUTE<br>★ SCEAU ★
    </div>
    <div class="signature-box">
      <strong>Pour le Conseil Pédagogique & la Direction</strong>
      <div style="font-style: italic; color: #475569; font-family: serif; font-size: 16px;">Le Directeur des Admissions</div>
      <div style="font-size: 10px; color: #94a3b8; margin-top: 5px;">${SOCIETE.nom} &middot; Agadir</div>
    </div>
  </div>

  <div class="footer">
    ${SOCIETE.nom} &middot; RC ${SOCIETE.rc} &middot; ICE ${SOCIETE.ice} &middot; ${SOCIETE.siege} — Document vérifiable sous la référence ${echapper(ins.reference)}
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
