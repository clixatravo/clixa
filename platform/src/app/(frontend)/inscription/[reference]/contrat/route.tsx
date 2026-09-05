import React from "react";
/*
  ⚠️ `jsx-a11y/alt-text` désactivé pour ce fichier, et pour une seule raison :
  l'`Image` de `@react-pdf/renderer` n'est pas un `<img>`. Elle dessine dans un
  PDF, où l'attribut `alt` n'existe pas — la règle ne peut donc pas être
  satisfaite, seulement contournée par un attribut inerte. Deux avertissements
  à chaque vérification apprennent surtout à ne plus les lire.
*/
/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { getDossier } from "@/lib/inscriptions";
import { formatPrix } from "@/lib/catalogue";
import { SOCIETE } from "@/lib/societe";
import { CACHET_CLIXA, SIGNATURE_DIRECTEUR } from "@/lib/cachet";
import type { Dossier } from "@/lib/inscriptions";

/**
 * Le contrat de formation, en PDF, composé depuis le dossier.
 *
 * ── Pourquoi il est calculé, et non déposé ──────────────────────────────────
 * Un contrat rédigé à la main pour chaque participant vieillit dès que le
 * barème change, et se recopie de travers : le premier exemplaire reçu par la
 * direction portait un montant, une formule et un échéancier saisis un par un.
 * Celui-ci se compose depuis le dossier — il ne peut pas annoncer un
 * échéancier que le site n'a pas enregistré.
 *
 * ── Ce qu'il ne fait pas ────────────────────────────────────────────────────
 * Il ne signe rien. La signature reste manuscrite, précédée de « Lu et
 * approuvé », parce que c'est ce que le contrat exige lui-même : une signature
 * dessinée dans un navigateur n'a pas la même valeur, et l'obtenir demanderait
 * un tiers de confiance.
 *
 * ⚠️ Les coordonnées de paiement n'y figurent pas, et l'article 3 le dit :
 * elles sont communiquées après signature. C'est la décision de la direction,
 * et le contrat s'y tient.
 *
 * ⚠️ La juridiction est celle d'Agadir, où la société a son siège. Le modèle
 * transmis par la direction désignait Casablanca — les deux ne pouvaient pas
 * avoir raison, puisque les mentions légales du site renvoient déjà aux
 * tribunaux du siège. Tranché par la direction le 29 août 2026.
 */

export const dynamic = "force-dynamic";

const OR = "#C9A24C";
const ENCRE = "#080C18";
const GRIS = "#5A5A5A";
const FILET = "#DDD8CC";

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 52, paddingHorizontal: 46, fontSize: 8.5, color: ENCRE },
  bandeau: {
    borderBottomWidth: 2,
    borderBottomColor: OR,
    paddingBottom: 8,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  marque: { fontSize: 14, fontFamily: "Times-Bold", letterSpacing: 1 },
  surtitre: { fontSize: 6.5, color: GRIS, letterSpacing: 1.5, marginTop: 2 },
  reference: { fontSize: 8, fontFamily: "Courier-Bold", color: OR },
  titre: { fontSize: 15, fontFamily: "Times-Bold", marginBottom: 10 },
  preambule: { lineHeight: 1.45, marginBottom: 14, textAlign: "justify" },
  article: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
  texte: { lineHeight: 1.45, marginBottom: 4, textAlign: "justify" },
  ligne: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: FILET,
    paddingVertical: 4,
  },
  terme: { width: "38%", color: GRIS },
  valeur: { width: "62%", fontFamily: "Helvetica-Bold" },
  signatures: { flexDirection: "row", marginTop: 22, gap: 24 },
  colonne: { flex: 1, borderWidth: 0.5, borderColor: FILET, padding: 10, minHeight: 118 },
  colonneTitre: { fontSize: 7.5, letterSpacing: 1.2, color: OR, marginBottom: 7 },
  champ: { marginBottom: 5, lineHeight: 1.4 },
  mention: { fontSize: 7, color: GRIS, marginTop: 6, lineHeight: 1.35 },
  /*
    Le tracé arrive sur fond transparent, dessiné en clair pour un écran sombre.
    Sur le papier il serait invisible : on le pose sur une bande sombre, comme
    un tampon, plutôt que d'en inverser les couleurs — une inversion ferait de
    l'anti-aliasing une bouillie grise.
  */
  trace: { height: 46, marginTop: 4, backgroundColor: ENCRE, borderRadius: 3 },
  /*
    La signature et le cachet côte à côte, comme sur un papier tamponné à la
    main : le paraphe à gauche, le tampon à sa droite et un peu plus haut.

    ⚠️ Ils sont posés sans fond, contrairement au tracé du client. Celui-là
    arrive dessiné en clair pour un écran sombre ; ceux-ci sont les vraies
    empreintes, en encre foncée sur transparent — les poser sur une bande
    sombre les rendrait invisibles.
  */
  paraphe: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  parapheTrace: { width: 88, height: 40 },
  parapheCachet: { width: 58, height: 56, marginLeft: 4 },
  intertitre: { fontSize: 7.5, letterSpacing: 1.3, color: OR, marginTop: 16, marginBottom: 6 },
  pied: {
    position: "absolute",
    bottom: 26,
    left: 46,
    right: 46,
    borderTopWidth: 0.5,
    borderTopColor: FILET,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: GRIS,
  },
});

const JOUR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

function Ligne({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <View style={s.ligne}>
      <Text style={s.terme}>{terme}</Text>
      <Text style={s.valeur}>{valeur}</Text>
    </View>
  );
}

function Pied({ reference }: { reference: string }) {
  return (
    <View style={s.pied} fixed>
      <Text>CLIXA Institute · clixa.africa · Réf. {reference}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function Contrat({ dossier }: { dossier: Dossier }) {
  const total = dossier.echeances.reduce((n, e) => n + e.montantCentimes, 0);
  const formule =
    dossier.echeances.length === 1 ? "comptant" : `${dossier.echeances.length} tranches`;

  return (
    <Document
      title={`Contrat de formation ${dossier.reference}`}
      author="CLIXA Institute"
      subject={dossier.programmeTitre}
    >
      <Page size="A4" style={s.page}>
        <View style={s.bandeau}>
          <View>
            <Text style={s.marque}>C L I X A</Text>
            <Text style={s.surtitre}>INSTITUTE · EXECUTIVE EDUCATION</Text>
          </View>
          <Text style={s.reference}>RÉF. {dossier.reference}</Text>
        </View>

        <Text style={s.titre}>Contrat de formation en ligne</Text>

        <Text style={s.preambule}>
          Entre les soussignés : (i) {SOCIETE.nom}, {SOCIETE.forme} sise {SOCIETE.siege}, RC{" "}
          {SOCIETE.rc}, ICE {SOCIETE.ice}, IF {SOCIETE.if}, représentée par {SOCIETE.gerant},
          Gérant, ci-après « CLIXA » ; et (ii) le Client identifié en Annexe 1, ci-après le « Client
          » ; ensemble les « Parties ».
        </Text>

        <Text style={s.article}>Article 1 — Objet et documents contractuels</Text>
        <Text style={s.texte}>
          Le présent contrat comprend le corps principal, l&apos;Annexe 1, la facture correspondante
          et, le cas échéant, tout justificatif utile d&apos;exécution ou de paiement. Il a pour
          objet l&apos;inscription du Client à une formation en ligne dispensée par CLIXA Institute.
        </Text>

        <Text style={s.article}>Article 2 — Programme et exécution</Text>
        <Text style={s.texte}>
          Selon l&apos;offre souscrite, la prestation comprend des sessions live, des supports
          pédagogiques, des ressources numériques et, selon le programme, un accompagnement
          pédagogique, des exercices, un test à blanc, une attestation ou un certificat interne.
          CLIXA peut adapter raisonnablement les outils, l&apos;ordre des séquences, les
          intervenants ou les horaires sans altérer l&apos;économie générale du programme.
        </Text>

        <Text style={s.article}>Article 3 — Prix, offre et paiement</Text>
        <Text style={s.texte}>
          Le prix, la devise, la formule choisie, le mode de paiement retenu et l&apos;échéancier
          sont ceux de l&apos;Annexe 1. Les instructions de paiement de CLIXA sont communiquées au
          Client après signature du contrat. Tout paiement partiel, tronqué, diminué par frais,
          conversion, retenue ou incident de transfert ne vaut paiement qu&apos;à hauteur du montant
          effectivement reçu par CLIXA. Aucun accès final, replay étendu, attestation ou certificat
          n&apos;est dû tant que les sommes exigibles n&apos;ont pas été effectivement reçues.
        </Text>

        <Text style={s.article}>Article 4 — Conformité et justificatifs</Text>
        <Text style={s.texte}>
          Le Client déclare fournir des informations exactes et utiliser des fonds d&apos;origine
          licite. Il fournit sur demande tout justificatif utile à CLIXA, à sa banque ou à une
          autorité compétente : pièce d&apos;identité, preuve d&apos;adresse, reçu, référence de
          transfert, ordre de virement, preuve carte, identité du payeur ou document KYC/compliance.
          Tout paiement provenant d&apos;un tiers non déclaré, ou tout paiement bloqué, rejeté,
          retourné, gelé ou suspendu, ne libère pas le Client tant que le montant dû n&apos;a pas
          été effectivement reçu.
        </Text>

        <Text style={s.article}>Article 5 — Suspension, résiliation, responsabilité</Text>
        <Text style={s.texte}>
          CLIXA peut suspendre immédiatement tout ou partie de la prestation en cas de non-paiement,
          fraude, défaut documentaire, risque de conformité, comportement perturbateur ou partage
          d&apos;accès, et résilier de plein droit si le manquement n&apos;est pas régularisé après
          notification. Les sommes correspondant aux prestations déjà ouvertes, exécutées ou
          engagées restent acquises à CLIXA, sauf disposition impérative contraire. CLIXA est tenue
          d&apos;une obligation de moyens ; sa responsabilité globale est limitée au montant
          effectivement encaissé au titre du présent contrat. Elle n&apos;est pas responsable des
          défaillances d&apos;internet, plateformes tierces, banques, prestataires de paiement,
          autorités ou cas de force majeure.
        </Text>

        <Text style={s.article}>Article 6 — Preuve, droit applicable et litiges</Text>
        <Text style={s.texte}>
          Constituent notamment des preuves suffisantes : contrat, annexe, facture, courriels,
          feuilles de présence, journaux d&apos;accès, supports remis, validations et justificatifs
          de paiement. Le présent contrat est régi par le droit marocain. Tout litige relatif à sa
          validité, son interprétation, son exécution, son paiement ou sa résiliation relève de la
          compétence exclusive des tribunaux compétents d&apos;Agadir, sans préjudice du droit de
          CLIXA de solliciter toute mesure conservatoire utile.
        </Text>

        <View style={s.signatures}>
          {/*
            ⚠️ **Un contrat signé d'un seul côté n'est pas un contrat.** Cette
            colonne portait un nom, une qualité, et deux lignes de pointillés —
            pendant que celle du client portait sa signature, sa date et
            l'empreinte de son engagement. Le participant signait donc un
            document où la maison, elle, n'avait rien signé.

            ⚠️ **La date est celle du participant, pas celle du téléchargement.**
            Un contrat se date du jour où l'accord se forme, et un PDF composé à
            la demande se retéléchargerait des mois plus tard : mettre
            `new Date()` ici ferait porter au même contrat deux dates
            différentes selon le moment où on l'ouvre. C'est la même raison qui
            fige « Fait le » du certificat dans `beforeChange`.

            Tant que le client n'a pas signé, la ligne reste vide : rien n'est
            encore convenu, et une date d'un côté seulement ne voudrait rien
            dire.
          */}
          <View style={s.colonne}>
            <Text style={s.colonneTitre}>POUR CLIXA</Text>
            <Text style={s.champ}>Nom : {SOCIETE.gerant}</Text>
            <Text style={s.champ}>Qualité : Gérant</Text>
            <Text style={s.champ}>
              Fait à Agadir, le :{" "}
              {dossier.contratSigneLe
                ? JOUR.format(new Date(dossier.contratSigneLe))
                : "______________"}
            </Text>
            {dossier.contratSigneLe ? (
              <View style={s.paraphe}>
                <Image style={s.parapheTrace} src={SIGNATURE_DIRECTEUR} />
                <Image style={s.parapheCachet} src={CACHET_CLIXA} />
              </View>
            ) : (
              <Text style={s.champ}>Signature et cachet :</Text>
            )}
          </View>
          <View style={s.colonne}>
            <Text style={s.colonneTitre}>POUR LE CLIENT</Text>
            {dossier.contratSigneLe ? (
              <>
                <Text style={s.champ}>Nom : {dossier.contratSignataire}</Text>
                <Text style={s.champ}>
                  Signé le : {JOUR.format(new Date(dossier.contratSigneLe))}
                </Text>
                <Text style={s.champ}>Mention : « Lu et approuvé »</Text>
                {dossier.contratTrace ? <Image style={s.trace} src={dossier.contratTrace} /> : null}
                <Text style={s.mention}>
                  Signature électronique apposée depuis l&apos;espace du participant. Horodatage,
                  adresse IP, navigateur et empreinte des termes sont conservés par CLIXA et
                  produits sur demande.
                </Text>
              </>
            ) : (
              <>
                <Text style={s.champ}>Nom : {dossier.apprenantNom ?? "______________"}</Text>
                <Text style={s.champ}>Fait à ____________, le : ____________</Text>
                <Text style={s.champ}>Signature :</Text>
                <Text style={s.mention}>
                  Signature précédée de la mention manuscrite « Lu et approuvé ».
                </Text>
              </>
            )}
          </View>
        </View>

        <Pied reference={dossier.reference} />
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.bandeau}>
          <View>
            <Text style={s.marque}>C L I X A</Text>
            <Text style={s.surtitre}>ANNEXE 1 · CONDITIONS PARTICULIÈRES</Text>
          </View>
          <Text style={s.reference}>RÉF. {dossier.reference}</Text>
        </View>

        <Text style={s.intertitre}>LE CLIENT</Text>
        <Ligne terme="Référence du dossier" valeur={dossier.reference} />
        <Ligne terme="Nom du client" valeur={dossier.apprenantNom ?? "—"} />
        <Ligne terme="Courriel" valeur={dossier.apprenantEmail ?? "—"} />
        <Ligne terme="Téléphone" valeur={dossier.apprenantWhatsapp ?? "—"} />
        <Ligne terme="Pays de résidence" valeur={dossier.apprenantPays ?? "—"} />

        <Text style={s.intertitre}>LA FORMATION</Text>
        <Ligne terme="Programme" valeur={dossier.programmeTitre} />
        <Ligne terme="Session" valeur={dossier.sessionDetail} />
        {dossier.sessionDebut ? (
          <Ligne terme="Première séance" valeur={JOUR.format(new Date(dossier.sessionDebut))} />
        ) : null}

        <Text style={s.intertitre}>LE RÈGLEMENT</Text>
        <Ligne terme="Formule choisie" valeur={formule} />
        <Ligne terme="Total dû" valeur={formatPrix(total)} />
        {dossier.echeances.map((e, i) => (
          <Ligne
            key={i}
            terme={`${i + 1}${i === 0 ? "re" : "e"} échéance`}
            valeur={
              formatPrix(e.montantCentimes) +
              (e.dateLimite ? ` — avant le ${JOUR.format(new Date(e.dateLimite))}` : "")
            }
          />
        ))}
        <Ligne
          terme="Mode de paiement retenu"
          valeur={
            {
              carte: "Carte bancaire",
              virement: "Virement bancaire",
              transfert: "Western Union · Ria · MoneyGram",
            }[dossier.moyenSouhaite ?? "transfert"]
          }
        />

        <Text style={s.mention}>
          Les instructions de paiement sont communiquées par courriel après signature du présent
          contrat. Aucun règlement ne s&apos;effectue sur le site.
        </Text>

        <Text style={s.intertitre}>À RENSEIGNER PAR LE PARTICIPANT</Text>
        <Ligne terme="Adresse complète" valeur=" " />
        <Ligne terme="Type de pièce d'identité" valeur="CNI / Passeport / Permis de conduire" />
        <Ligne terme="Numéro de la pièce" valeur=" " />

        <View style={s.signatures}>
          <View style={s.colonne}>
            <Text style={s.colonneTitre}>NOM DU CLIENT</Text>
            <Text style={s.champ}>
              {dossier.contratSignataire ?? dossier.apprenantNom ?? "______________"}
            </Text>
          </View>
          <View style={s.colonne}>
            <Text style={s.colonneTitre}>SIGNATURE</Text>
            {dossier.contratSigneLe ? (
              <>
                {dossier.contratTrace ? <Image style={s.trace} src={dossier.contratTrace} /> : null}
                <Text style={s.champ}>
                  Signé électroniquement le {JOUR.format(new Date(dossier.contratSigneLe))}
                </Text>
              </>
            ) : (
              <Text style={s.mention}>Précédée de la mention « Lu et approuvé ».</Text>
            )}
          </View>
        </View>

        <Pied reference={dossier.reference} />
      </Page>
    </Document>
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const dossier = await getDossier(reference);
  if (!dossier) return new Response("Dossier introuvable", { status: 404 });

  const buffer = await renderToBuffer(<Contrat dossier={dossier} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="CLIXA-contrat-${dossier.reference}.pdf"`,
      /*
        Un contrat porte le nom et le téléphone du participant : il n'a rien à
        faire dans un cache partagé, contrairement à la plaquette.
      */
      "Cache-Control": "private, no-store",
    },
  });
}
