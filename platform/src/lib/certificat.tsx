import React from "react";
/*
  ⚠️ `jsx-a11y/alt-text` désactivé pour ce fichier : l'`Image` de
  `@react-pdf/renderer` n'est pas un `<img>`. Elle dessine dans un PDF, où
  l'attribut `alt` n'existe pas — la règle ne peut être satisfaite, seulement
  contournée par un attribut inerte. Même raison que dans le contrat.
*/
/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CACHET_CLIXA, LOGO_CLIXA, LOGO_SKILLAFRIQUE, SIGNATURE_DIRECTEUR } from "@/lib/cachet";
import { SOCIETE } from "@/lib/societe";
import type { Dossier } from "@/lib/inscriptions";

/**
 * Le certificat professionnel, dessiné une seule fois.
 *
 * ── Pourquoi il vit ici, et pas dans la route ───────────────────────────────
 * Deux choses le rendent : la route que le participant ouvre, et le script qui
 * fabrique le spécimen de la marque. Un spécimen dessiné à part finit toujours
 * par mentir — c'est exactement ce qui s'était produit avant : un échantillon
 * refait à la main dormait dans `public/`, sans lien depuis aucune page, et il
 * aurait vieilli au premier changement du document réel.
 *
 * Ici, le spécimen **est** le certificat, avec un nom de remplacement et un
 * bandeau qui le dit.
 *
 * ── D'où vient le dessin ────────────────────────────────────────────────────
 * Le certificat que la direction délivre déjà à la main (référence
 * CLIXA-DAF0626-2026-066) sert de modèle : mêmes couleurs, mêmes blocs, mêmes
 * deux signataires.
 *
 * ── Ce qu'il ne fait pas ────────────────────────────────────────────────────
 * Il n'imprime pas de nom pour la case « Responsable pédagogique ». Le
 * certificat vu en exemple portait « Hajar El Khadiri », mais rien dans le
 * catalogue ne dit qu'elle encadre les douze parcours : l'inventer pour les
 * onze autres reviendrait à deviner un fait, ce que ce projet évite
 * systématiquement (voir `lib/reseaux.ts`, `lib/moyens.ts`). La case reste une
 * ligne de signature.
 */

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
  /*
    ⚠️ La hauteur se déduit du dessin, elle ne se choisit pas : le sigle fait
    234 × 47 px, soit très exactement 4,98 de rapport. Poser les deux à la main
    l'écraserait ou l'étirerait — ce qui, sur une marque, se voit avant tout le
    reste.
  */
  logo: { width: 78, height: 78 / 4.98 },
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
  skillLogo: { width: 132, height: 132 / 2.66 },
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
  /*
    ⚠️ Le tracé chevauche légèrement le trait, comme une vraie signature posée
    sur une ligne. Aligné à droite dans sa colonne, et de la largeur du trait :
    une signature centrée sous un trait aligné à droite se lit comme une image
    tombée là.
  */
  /*
    ⚠️ 40 de haut moins 6 de marge = 34, exactement la hauteur de
    `signatureEspace` en face. Sans cette compensation, la colonne signée
    avançait de six points de moins que l'autre et les deux traits ne
    tombaient plus à la même hauteur — un décalage qu'on ne voit pas dans le
    code, seulement sur la page.
  */
  signatureTrace: { width: 96, height: 40, marginBottom: -6, alignSelf: "flex-end" },
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

  /*
    ⚠️ Le vrai cachet, pas un cercle en pointillé. La première version dessinait
    un disque tireté portant « CLIXA INSTITUTE · SCEAU » — l'emplacement où
    tamponner après impression. Mais ce certificat ne s'imprime pas pour être
    tamponné : il se télécharge et se fait suivre par courriel. Un emplacement
    vide s'y lisait comme un document inachevé.
  */
  sceau: {
    // Le rapport du tampon d'origine, 260 × 250 : le déformer se verrait.
    width: 94,
    height: 90,
    marginHorizontal: 10,
  },

  /*
    ⚠️ Un filigrane, pas un bandeau plein. Une image de certificat qui circule
    dans une publicité doit être impossible à confondre avec un document
    délivré — mais elle doit aussi rester lisible : c'est ce qu'on montre à
    quelqu'un pour lui donner envie. Un bandeau opaque couvrait la signature,
    la date et la moitié de la colonne latérale ; il marquait le document en
    le rendant illisible.
  */
  /*
    ⚠️ Centré à la main, pas par `alignItems` : le médaillon est en position
    absolue, donc hors du flux, et son parent ne le centre plus. La moitié de
    sa largeur retranchée du milieu est ce qui reste.
  */
  medaillon: {
    position: "absolute",
    top: 128,
    left: "50%",
    marginLeft: -95,
    width: 190,
    height: 190,
    opacity: 0.055,
    alignItems: "center",
    justifyContent: "center",
  },
  medaillonAnneau: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 190,
    height: 190,
    borderWidth: 1.6,
    borderColor: NAVY,
    borderRadius: 95,
  },
  medaillonHaut: { fontSize: 11, fontFamily: "Times-Roman", color: NAVY, letterSpacing: 2 },
  medaillonNom: { marginTop: 2, fontSize: 40, fontFamily: "Times-Bold", color: NAVY },
  medaillonBas: { fontSize: 15, fontFamily: "Times-Bold", color: NAVY, letterSpacing: 1 },

  filigraneSpecimen: {
    position: "absolute",
    /*
      ⚠️ Calé sur la moitié droite, la seule qui reste blanche : à gauche il
      passait sous la colonne bleu nuit, où un filigrane clair disparaît. Et
      dimensionné pour tenir dans cette moitié — au-delà, le mot débordait de
      la page et se lisait « ÉCIMEN ».
    */
    top: 330,
    left: "30%",
    right: 0,
    alignItems: "center",
    transform: "rotate(-14deg)",
  },
  filigraneSpecimenTexte: {
    fontSize: 58,
    fontFamily: "Helvetica-Bold",
    color: "#001F4D",
    opacity: 0.13,
    letterSpacing: 12,
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

export function CertificatPDF({
  dossier,
  specimen = false,
}: {
  dossier: Dossier;
  /** Barre la page d'un bandeau « SPÉCIMEN » — pour la brochure et les publicités. */
  specimen?: boolean;
}) {
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
              <Image style={s.logo} src={LOGO_CLIXA} />
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
              <Image style={s.skillLogo} src={LOGO_SKILLAFRIQUE} />
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

            {/*
              ── Le médaillon de fond ────────────────────────────────────────
              Il remplace une ligne « ★ CLIXA » composée au texte, dont
              **l'étoile ne s'imprimait pas** : U+2605 n'existe ni dans Times
              ni dans Helvetica, les seules polices intégrées à react-pdf, et
              un glyphe absent est abandonné sans un mot. Il restait « CLIXA »
              seul sous le titre, qui se lisait comme une coquille. Le modèle
              de la direction ne l'imprimait pas davantage — l'étoile y est un
              carré vide, la même absence, un cran plus tôt.

              ⚠️ **Dessiné, et non inséré comme image.** Le médaillon du modèle
              est du bleu nuit à 14/255 d'opacité. Réduit et mis en palette pour
              tenir dans un module, sa transparence s'est effondrée : il est
              ressorti beige et opaque, aussi lisible que le texte qu'il doit
              passer derrière — constaté sur le rendu, pas déduit. Deux cercles
              et trois mots ne pèsent rien, ne dépendent d'aucune palette, et
              leur opacité se règle au centième.

              ⚠️ En position absolue, donc hors du flux : posé avant le titre,
              il aurait poussé tout le corps vers le bas.
            */}
            <View style={s.medaillon} fixed>
              <View style={s.medaillonAnneau} />
              <Text style={s.medaillonHaut}>CERTIFICAT</Text>
              <Text style={s.medaillonNom}>CLIXA</Text>
              <Text style={s.medaillonBas}>INSTITUTE</Text>
            </View>

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

              <Image style={s.sceau} src={CACHET_CLIXA} />

              <View style={[s.signatureCol, s.signatureDroite]}>
                <Text style={s.signatureRole}>Directeur Général de CLIXA Institute</Text>
                <Image style={s.signatureTrace} src={SIGNATURE_DIRECTEUR} />
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

        {specimen && (
          <View style={s.filigraneSpecimen} fixed>
            <Text style={s.filigraneSpecimenTexte}>SPÉCIMEN</Text>
          </View>
        )}

        <Text style={s.pied} fixed>
          Référence certificat : {referenceCertificat(dossier.reference)}
        </Text>
      </Page>
    </Document>
  );
}
