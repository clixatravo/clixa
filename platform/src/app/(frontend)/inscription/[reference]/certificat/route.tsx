import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { getDossier } from "@/lib/inscriptions";
import { appelant, cadenceOk, tropVite } from "@/lib/cadence";
import { SOCIETE } from "@/lib/societe";
import type { Dossier } from "@/lib/inscriptions";

/**
 * Le certificat professionnel, en PDF, composé depuis le dossier.
 *
 * ── Pourquoi maintenant, et pas avec le LMS ─────────────────────────────────
 * `Inscriptions.ts` renvoyait ce document à plus tard, « quand le LMS
 * viendra » — en le confondant avec la progression suivie leçon par leçon,
 * que Décision A écarte pour cette année. Il n'en a pas besoin : il ne dépend
 * que du statut « Terminée », posé à la main par l'équipe, exactement comme
 * le contrat ne dépend que d'une signature simple et non d'un tiers de
 * confiance qualifié.
 *
 * ── D'où vient le dessin ─────────────────────────────────────────────────────
 * Le certificat que la direction délivre déjà à la main (référence
 * CLIXA-DAF0626-2026-066) sert de modèle exact : mêmes couleurs, mêmes blocs,
 * mêmes deux signataires. Un document composé depuis le dossier ne peut pas
 * annoncer un parcours ou une date que le site n'a pas enregistrés — le même
 * principe que le contrat.
 *
 * ── Ce qu'il ne fait pas ────────────────────────────────────────────────────
 * Il n'imprime pas de nom pour la case « Responsable pédagogique ». Le
 * certificat vu en exemple portait « Hajar El Khadiri », mais rien dans le
 * catalogue ne dit qu'elle encadre les douze parcours : l'inventer pour les
 * onze autres reviendrait à deviner un fait, ce que ce projet évite
 * systématiquement (voir `lib/reseaux.ts`, `lib/moyens.ts`). La case reste une
 * ligne de signature, comme le contrat en garde une pour qui signe à la main.
 *
 * ⚠️ La référence imprimée sur le document (« CLIXA-… ») n'est pas la clef de
 * l'URL : elle se dérive de la référence du dossier, sans compteur ni table
 * de plus à tenir à jour — le même choix que la référence du dossier
 * elle-même, tirée une fois et jamais recalculée.
 */

export const dynamic = "force-dynamic";

const OR = "#C9A24C";
const NAVY = "#001F4D";
const NAVY_DOUX = "#123467";
const GRIS = "#5B6B85";
const IVOIRE = "#EEF2FA";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica" },
  cadre: {
    position: "absolute",
    top: 11,
    left: 11,
    right: 11,
    bottom: 11,
    borderWidth: 1.2,
    borderColor: OR,
  },
  corps: { flexDirection: "row", height: "100%" },

  // ── Colonne latérale ──
  cote: { width: "28%", backgroundColor: NAVY, flexDirection: "column" },
  coteEntete: {
    backgroundColor: "#ffffff",
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  logo: { fontSize: 20, fontFamily: "Times-Bold", color: NAVY },
  logoPoint: { color: OR },
  accroche: { marginTop: 6, fontSize: 7, lineHeight: 1.4, color: GRIS },
  coteBloc: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 0.7,
    borderTopColor: "#e7c979",
  },
  coteBlocEtire: { flexGrow: 1 },
  coteLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#e3c179", marginBottom: 6 },
  coteTexte: { fontSize: 7.3, lineHeight: 1.5, color: IVOIRE },
  item: { flexDirection: "row", marginBottom: 4 },
  itemPuce: { fontSize: 7.3, color: "#e3c179", marginRight: 5 },
  itemTexte: { fontSize: 7.3, color: IVOIRE, flex: 1, lineHeight: 1.35 },
  dureeValeur: { fontSize: 13, fontFamily: "Times-Bold", color: "#ffffff" },
  marqueSkill: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 0.7,
    borderTopColor: "#e7c979",
  },
  skillLigne: { flexDirection: "row", fontSize: 12, fontFamily: "Helvetica-Bold" },
  skillNoir: { color: "#111111" },
  skillOrange: { color: "#ee840e" },
  souscrit: { marginTop: 2, fontSize: 6.5, color: GRIS },
  cotePied: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    fontSize: 6.5,
    color: "#e3c179",
    borderTopWidth: 0.7,
    borderTopColor: "#e7c979",
  },

  // ── Corps principal ──
  corpsPrincipal: { flex: 1, paddingHorizontal: 40, paddingTop: 34, alignItems: "center" },
  titre: { fontSize: 21, fontFamily: "Times-Bold", color: NAVY, letterSpacing: 1 },
  sousTitre: {
    marginTop: 6,
    fontSize: 10.5,
    fontFamily: "Times-Bold",
    color: NAVY_DOUX,
    letterSpacing: 1.5,
  },
  mini: { marginTop: 14, fontSize: 10, fontFamily: "Times-Bold", color: NAVY },
  etoile: { color: OR },
  intro: { marginTop: 12, fontSize: 9.5, color: NAVY_DOUX },
  nom: { marginTop: 8, fontSize: 24, fontFamily: "Times-Bold", color: NAVY, textAlign: "center" },
  mention: { marginTop: 14, fontSize: 9.5, color: NAVY_DOUX, textAlign: "center", maxWidth: 420 },
  programmeCite: {
    marginTop: 5,
    fontSize: 12.5,
    fontFamily: "Times-Bold",
    color: NAVY,
    textAlign: "center",
  },
  organise: { marginTop: 8, fontSize: 9.5, color: NAVY_DOUX },
  periode: { marginTop: 5, fontSize: 9, color: NAVY_DOUX, textAlign: "center" },
  faitLe: { marginTop: 16, fontSize: 9.5, fontFamily: "Times-Italic", color: NAVY_DOUX },

  /*
    ⚠️ `alignItems: "flex-start"`, pas `flex-end`. Les deux colonnes n'ont pas
    la même hauteur — la droite porte un nom sous son trait, la gauche n'en a
    pas — et aligner les bas plutôt que les hauts décalait le rôle
    « Responsable pédagogique » loin de sa propre ligne, comme si les deux
    signatures ne répondaient plus à la même rangée.
  */
  signatures: { flexDirection: "row", alignItems: "flex-start", marginTop: 32, width: "100%" },
  signatureCol: { flex: 1 },
  signatureRole: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: NAVY },
  // Un espace fixe, pas une marge sur le texte : les deux colonnes gardent
  // ainsi le même trait à la même hauteur, quelle que soit la longueur du rôle.
  signatureEspace: { height: 34 },
  signatureTrait: { borderTopWidth: 0.7, borderTopColor: OR, width: "76%" },
  signatureTraitDroite: { alignSelf: "flex-end" },
  // Hauteur réservée même vide, côté gauche : sans elle, la colonne sans nom
  // remonterait d'une ligne par rapport à celle qui en affiche un.
  signatureNom: {
    marginTop: 4,
    fontSize: 9,
    fontFamily: "Times-Italic",
    color: NAVY_DOUX,
    height: 12,
  },
  signatureDroite: { alignItems: "flex-end" },

  sceau: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.1,
    borderColor: OR,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 18,
  },
  sceauTexte: {
    fontSize: 5.6,
    fontFamily: "Helvetica-Bold",
    color: OR,
    textAlign: "center",
    lineHeight: 1.5,
  },

  pied: {
    position: "absolute",
    bottom: 26,
    left: 40,
    right: 40,
    fontSize: 6.8,
    color: GRIS,
    textAlign: "right",
  },
});

const DESCRIPTION_CLIXA =
  "CLIXA Institute, à travers sa marque SkillAfrique, est une plateforme de formation professionnelle dédiée au développement des compétences en leadership, management, finance, gestion de projet, stratégie, innovation et excellence opérationnelle en Afrique.";

const JOUR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

/**
 * La référence imprimée sur le document, dérivée de celle du dossier.
 * `CLX-73WR8CVT` devient `CLIXA-73WR8CVT` : rien de plus à tirer, rien de
 * plus à stocker.
 */
function referenceCertificat(reference: string): string {
  return `CLIXA-${reference.replace(/^CLX-/i, "")}`;
}

function Certificat({ dossier }: { dossier: Dossier }) {
  const duree = dossier.programmeDureeHeures ? `${dossier.programmeDureeHeures} heures` : "—";
  const modules = dossier.programmeModules ?? [];
  const emisLe = dossier.certificatEmisLe ? new Date(dossier.certificatEmisLe) : new Date();

  return (
    <Document
      title={`Certificat professionnel ${dossier.reference}`}
      author="CLIXA Institute"
      subject={dossier.programmeTitre}
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.cadre} fixed />
        <View style={s.corps}>
          <View style={s.cote}>
            <View style={s.coteEntete}>
              <Text style={s.logo}>
                CLIXA<Text style={s.logoPoint}>.</Text>
              </Text>
              <Text style={s.accroche}>
                Centre de Leadership,{"\n"}Innovation &amp; eXcellence in Africa
              </Text>
            </View>

            <View style={s.coteBloc}>
              <Text style={s.coteLabel}>DESCRIPTION CLIXA INSTITUTE :</Text>
              <Text style={s.coteTexte}>{DESCRIPTION_CLIXA}</Text>
            </View>

            {modules.length > 0 && (
              <View style={[s.coteBloc, s.coteBlocEtire]}>
                <Text style={s.coteLabel}>ÉLÉMENTS DE LA FORMATION :</Text>
                {modules.map((m, i) => (
                  <View style={s.item} key={i}>
                    <Text style={s.itemPuce}>•</Text>
                    <Text style={s.itemTexte}>{m}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={s.coteBloc}>
              <Text style={s.coteLabel}>DURÉE DE LA FORMATION :</Text>
              <Text style={s.dureeValeur}>{duree.toUpperCase()}</Text>
            </View>

            <View style={s.marqueSkill}>
              <Text style={s.skillLigne}>
                <Text style={s.skillNoir}>SKILL</Text>
                <Text style={s.skillOrange}>AFRIQUE</Text>
              </Text>
              <Text style={s.souscrit}>By CLIXA Institute</Text>
            </View>
            <Text style={s.cotePied}>www.clixa.africa</Text>
          </View>

          <View style={s.corpsPrincipal}>
            <Text style={s.titre}>CERTIFICAT PROFESSIONNEL</Text>
            {/*
              ⚠️ Sans « EN » devant. Le certificat vu en exemple portait « EN
              DIRECTION ADMINISTRATIVE ET FINANCIÈRE » — un nom de domaine,
              reformulé à la main à partir du titre « Directeur Administratif
              et Financier ». Les titres réels du catalogue sont des intitulés
              de poste (« Directeur Marketing », « Préparation à la
              certification PMP® ») : aucune règle ne les transforme tous en
              nom de domaine sans se casser sur l'un des douze — la
              préparation PMP notamment, qui ne suit pas le moule « Directeur
              X ». Le titre du parcours, seul, reste juste dans tous les cas.
            */}
            <Text style={s.sousTitre}>{dossier.programmeTitre.toUpperCase()}</Text>

            <Text style={s.mini}>
              <Text style={s.etoile}>★ </Text>CLIXA
            </Text>

            <Text style={s.intro}>Ce certificat est décerné à</Text>
            <Text style={s.nom}>{dossier.apprenantNom ?? "—"}</Text>

            <Text style={s.mention}>
              Pour avoir participé avec succès à la formation professionnelle
            </Text>
            <Text style={s.programmeCite}>« {dossier.programmeTitre} »</Text>
            <Text style={s.organise}>organisée par CLIXA Institute.</Text>

            <Text style={s.periode}>
              La formation s&apos;est déroulée du{" "}
              {dossier.sessionDebut ? JOUR.format(new Date(dossier.sessionDebut)) : "—"} au{" "}
              {dossier.sessionFin ? JOUR.format(new Date(dossier.sessionFin)) : "—"}, pour une durée
              totale de {duree}.
            </Text>

            <Text style={s.faitLe}>Fait le {JOUR.format(emisLe)}</Text>

            <View style={s.signatures}>
              <View style={s.signatureCol}>
                <Text style={s.signatureRole}>Responsable pédagogique</Text>
                <View style={s.signatureEspace} />
                <View style={s.signatureTrait} />
                <Text style={s.signatureNom}> </Text>
              </View>

              <View style={s.sceau}>
                <Text style={s.sceauTexte}>
                  CLIXA{"\n"}INSTITUTE{"\n"}★ SCEAU ★
                </Text>
              </View>

              <View style={[s.signatureCol, s.signatureDroite]}>
                <Text style={s.signatureRole}>Directeur Général de CLIXA Institute</Text>
                <View style={s.signatureEspace} />
                <View style={[s.signatureTrait, s.signatureTraitDroite]} />
                {/*
                  Repris tel quel, comme sur le contrat : une même personne
                  s'écrit de la même façon sur les deux documents de la
                  maison, plutôt que d'inventer ici une casse différente.
                */}
                <Text style={s.signatureNom}>{SOCIETE.gerant}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={s.pied} fixed>
          Référence certificat : {referenceCertificat(dossier.reference)}
        </Text>
      </Page>
    </Document>
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  /*
    Même clef que le contrat et l'attestation : la référence du dossier ouvre
    le document. Le frein est celui de l'attestation, pas celui — absent — du
    contrat : un document qui nomme le participant en clair mérite le même
    plancher que l'attestation d'admission.
  */
  if (!cadenceOk("certificat", appelant(request), 20, 60_000)) return tropVite(60);

  const { reference } = await params;
  const dossier = await getDossier(reference);
  if (!dossier) {
    return new Response("Dossier introuvable.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  /*
    ── Le certificat ne se réclame pas avant d'être mérité ─────────────────────
    Même défaut que celui déjà corrigé pour les instructions de paiement : la
    page ne doit rien promettre qu'elle ne peut pas tenir. Tant que l'équipe
    n'a pas marqué le dossier « Terminée », aucun PDF n'existe.
  */
  if (dossier.statut !== "terminee") {
    return new Response(
      "Certificat pas encore disponible : ce parcours n'est pas encore marqué terminé.",
      { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const buffer = await renderToBuffer(<Certificat dossier={dossier} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="CLIXA-certificat-${dossier.reference}.pdf"`,
      // Un certificat porte le nom du participant : jamais dans un cache partagé.
      "Cache-Control": "private, no-store",
    },
  });
}
