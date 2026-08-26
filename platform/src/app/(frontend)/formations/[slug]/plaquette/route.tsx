import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import {
  formatPrix,
  getProgramme,
  getSessions,
  getTarifs,
  libelleMode,
  libelleNiveau,
} from "@/lib/catalogue";
import type { Programme, Session, Tarifs } from "@/lib/types";

/**
 * La plaquette d'un parcours, en PDF.
 *
 * ── À quoi elle sert ────────────────────────────────────────────────────────
 * Un cadre qui veut suivre un parcours doit le faire valider par sa direction
 * ou ses ressources humaines. Un lien vers une page web ne s'attache pas à une
 * demande interne ; un document, si.
 *
 * ── Pourquoi elle est calculée, et non déposée ──────────────────────────────
 * Une plaquette téléversée à la main vieillit dès que le barème ou les dates
 * changent — et personne ne pense à la refaire. Celle-ci se compose à la
 * demande depuis le catalogue : elle ne peut pas annoncer un tarif que le site
 * n'affiche plus.
 *
 * ── Ce qu'elle n'annonce pas ────────────────────────────────────────────────
 * Elle ne dit rien qui ne figure sur la fiche. Pas de « certification reconnue »
 * sans certification au catalogue, pas de dates sans session ouverte : chaque
 * bloc disparaît quand sa donnée manque, plutôt que de laisser une promesse en
 * l'air dans un document qui circulera par courriel.
 */

export const dynamic = "force-dynamic";

const OR = "#C9A24C";
const ENCRE = "#080C18";
const GRIS = "#5A5A5A";
const FILET = "#DDD8CC";

const s = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 56, paddingHorizontal: 48, fontSize: 10, color: ENCRE },
  bandeau: { borderBottomWidth: 2, borderBottomColor: OR, paddingBottom: 10, marginBottom: 20 },
  marque: { fontSize: 15, fontFamily: "Times-Bold", letterSpacing: 1 },
  surtitre: { fontSize: 7, color: GRIS, letterSpacing: 1.6, marginTop: 3 },
  titre: { fontSize: 19, fontFamily: "Times-Bold", marginBottom: 5, lineHeight: 1.2 },
  accroche: { fontSize: 10.5, color: GRIS, marginBottom: 16, lineHeight: 1.45 },
  section: { marginBottom: 15 },
  intertitre: {
    fontSize: 7.5,
    letterSpacing: 1.3,
    color: OR,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  texte: { lineHeight: 1.5, marginBottom: 3 },
  puce: { flexDirection: "row", marginBottom: 3 },
  tiret: { width: 11, color: OR },
  faitLigne: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: FILET,
    paddingVertical: 4,
  },
  faitCle: { width: 120, color: GRIS },
  faitVal: { flex: 1 },
  module: { marginBottom: 8 },
  moduleTitre: { fontFamily: "Helvetica-Bold", marginBottom: 2 },
  lecon: { color: GRIS, marginLeft: 11, marginBottom: 1 },
  planLigne: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: FILET,
    paddingVertical: 5,
  },
  pied: {
    position: "absolute",
    bottom: 26,
    left: 48,
    right: 48,
    borderTopWidth: 0.5,
    borderTopColor: FILET,
    paddingTop: 7,
    fontSize: 7.5,
    color: GRIS,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function Puce({ children }: { children: string }) {
  return (
    // `wrap={false}` : sans lui, un saut de page coupait la puce et laissait un
    // tiret seul en bas de colonne, sans son texte.
    <View style={s.puce} wrap={false}>
      <Text style={s.tiret}>—</Text>
      <Text style={{ flex: 1, lineHeight: 1.45 }}>{children}</Text>
    </View>
  );
}

function Fait({ cle, val }: { cle: string; val: string }) {
  return (
    <View style={s.faitLigne}>
      <Text style={s.faitCle}>{cle}</Text>
      <Text style={s.faitVal}>{val}</Text>
    </View>
  );
}

const JOUR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

function Plaquette({
  programme: p,
  sessions,
  tarifs,
}: {
  programme: Programme;
  sessions: Session[];
  tarifs: Tarifs;
}) {
  const prochaine = sessions[0];
  const seances = p.modules.length;

  return (
    <Document
      title={`${p.titre} — CLIXA Institute`}
      author="CLIXA Institute"
      subject="Plaquette pédagogique"
    >
      <Page size="A4" style={s.page}>
        <View style={s.bandeau}>
          <Text style={s.marque}>CLIXA INSTITUTE</Text>
          <Text style={s.surtitre}>PLAQUETTE PÉDAGOGIQUE</Text>
        </View>

        <Text style={s.titre}>{p.titre}</Text>
        <Text style={s.accroche}>{p.accroche}</Text>

        <View style={s.section}>
          <Text style={s.intertitre}>EN BREF</Text>
          <Fait cle="Durée" val={`${p.dureeHeures} heures`} />
          {seances > 0 && <Fait cle="Séances" val={`${seances} séances`} />}
          <Fait cle="Rythme" val={p.rythme} />
          <Fait cle="Niveau" val={libelleNiveau[p.niveau]} />
          <Fait cle="Langue" val={p.langue} />
          {prochaine && <Fait cle="Modalité" val={libelleMode[prochaine.mode]} />}
          {prochaine && (
            <Fait cle="Prochaine session" val={JOUR.format(new Date(prochaine.debut))} />
          )}
          {p.certification && <Fait cle="Certification" val={p.certification} />}
        </View>

        {p.objectifs && (
          <View style={s.section}>
            <Text style={s.intertitre}>OBJECTIFS</Text>
            <Text style={s.texte}>{p.objectifs}</Text>
          </View>
        )}

        {p.publicVise.length > 0 && (
          <View style={s.section}>
            <Text style={s.intertitre}>À QUI S&apos;ADRESSE CE PARCOURS</Text>
            {p.publicVise.map((v) => (
              <Puce key={v}>{v}</Puce>
            ))}
          </View>
        )}

        {p.competences.length > 0 && (
          <View style={s.section}>
            <Text style={s.intertitre}>COMPÉTENCES VISÉES</Text>
            {p.competences.map((c) => (
              <Puce key={c}>{c}</Puce>
            ))}
          </View>
        )}

        {p.prerequis && (
          <View style={s.section}>
            <Text style={s.intertitre}>PRÉREQUIS</Text>
            <Text style={s.texte}>{p.prerequis}</Text>
          </View>
        )}

        <View style={s.pied} fixed>
          <Text>CLIXA Institute — contact@clixa.africa — clixa.africa</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        {p.modules.length > 0 && (
          <View style={s.section}>
            <Text style={s.intertitre}>PROGRAMME</Text>
            {p.modules.map((m, i) => (
              <View key={m.id} style={s.module} wrap={false}>
                <Text style={s.moduleTitre}>
                  {i + 1}. {m.titre}
                </Text>
                {m.objectif && <Text style={s.lecon}>{m.objectif}</Text>}
                {m.lecons.map((l) => (
                  <Text key={l.id} style={s.lecon}>
                    · {l.titre}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {p.livrables && p.livrables.length > 0 && (
          <View style={s.section}>
            <Text style={s.intertitre}>CE QUE VOUS EMPORTEZ</Text>
            {p.livrables.map((v) => (
              <Puce key={v}>{v}</Puce>
            ))}
          </View>
        )}

        {tarifs.plans.length > 0 && (
          <View style={s.section}>
            <Text style={s.intertitre}>TARIFS ET RYTHMES DE PAIEMENT</Text>
            {tarifs.plans.map((plan) => (
              <View key={plan.code} style={s.planLigne}>
                <Text style={{ flex: 1 }}>{plan.libelle}</Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  {formatPrix(plan.totalCentimes)}
                </Text>
              </View>
            ))}
            <Text style={{ marginTop: 6, fontSize: 8.5, color: GRIS, lineHeight: 1.45 }}>
              Le règlement échelonné coûte davantage que le paiement comptant ; l&apos;écart figure
              ci-dessus. Les versements se font par transfert (Western Union, Ria, MoneyGram). Aucun
              paiement n&apos;est encaissé sur le site.
            </Text>
          </View>
        )}

        {p.debouches.length > 0 && (
          <View style={s.section}>
            <Text style={s.intertitre}>DÉBOUCHÉS</Text>
            {p.debouches.map((d) => (
              <Puce key={d}>{d}</Puce>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.intertitre}>INSCRIPTION</Text>
          <Text style={s.texte}>
            Les places se retiennent depuis clixa.africa/formations/{p.slug}. La demande ne vaut pas
            paiement : la place est confirmée après vérification du premier versement.
          </Text>
        </View>

        <View style={s.pied} fixed>
          <Text>
            Document établi le {JOUR.format(new Date())} — informations susceptibles d&apos;évoluer
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const programme = await getProgramme(slug);
  if (!programme) return new Response("Parcours introuvable", { status: 404 });

  const [sessions, tarifs] = await Promise.all([getSessions(slug), getTarifs()]);

  const buffer = await renderToBuffer(
    <Plaquette programme={programme} sessions={sessions} tarifs={tarifs} />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      // `inline` : le navigateur l'ouvre plutôt que de le jeter dans les
      // téléchargements. Qui veut le fichier l'enregistre d'un geste.
      "Content-Disposition": `inline; filename="CLIXA-${slug}.pdf"`,
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
