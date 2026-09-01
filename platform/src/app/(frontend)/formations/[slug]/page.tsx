import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { JsonLd } from "@/components/JsonLd";
import { jsonLdCourse } from "@/lib/seo";
import { PlanDeCours } from "@/components/PlanDeCours";
import { SessionsDisponibles } from "@/components/SessionsDisponibles";
import { Temoignages } from "@/components/Temoignages";
import { Badge, PlacesBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { placesRestantes } from "@/lib/types";
import { MOYENS_AFFICHES } from "@/lib/moyens";
import {
  formatPeriode,
  formatPrix,
  getProchaineSession,
  getProgramme,
  getProgrammes,
  libelleNiveau,
  getSessions,
  getSpecialisation,
  libelleMode,
  lieuSession,
  getTarifs,
  getTemoignagesDe,
} from "@/lib/catalogue";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await getProgrammes()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProgramme(slug);
  if (!p) return {};

  const url = `/formations/${p.slug}`;
  return {
    title: p.titre,
    description: p.accroche,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: p.titre, description: p.accroche },
  };
}

export default async function FicheFormation({ params }: Props) {
  const { slug } = await params;
  const programme = await getProgramme(slug);
  if (!programme) notFound();

  const spec = await getSpecialisation(programme.specialisation);
  const sessions = await getSessions(programme.slug);
  const tarifs = await getTarifs();
  const temoignages = await getTemoignagesDe(programme.slug);
  const prochaine = await getProchaineSession(programme.slug);

  const parMode = new Map<string, number>();
  for (const s of sessions) {
    const actuel = parMode.get(s.mode);
    if (actuel === undefined || s.prixCentimes < actuel) parMode.set(s.mode, s.prixCentimes);
  }

  return (
    <>
      {/* INT-04 — Course + une CourseInstance par session, avec dates et prix */}
      <JsonLd data={jsonLdCourse(programme, sessions, tarifs)} />

      {/* ── Fil d'Ariane ── */}
      <FilAriane
        items={[
          { href: "/", label: "Accueil" },
          { href: "/formations", label: "Formations" },
          ...(spec ? [{ href: `/specialisations/${spec.slug}` as Route, label: spec.nom }] : []),
          { label: programme.titre },
        ]}
      />

      {/* ── Héros ── */}
      <section className="border-line relative overflow-hidden border-b px-8 py-14 lg:py-18">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1180px]">
          <div className="eyebrow mono-label mb-5">{spec?.nom}</div>
          <h1 className="mb-4 max-w-[20ch] text-[clamp(2.1rem,4.5vw,3.4rem)] font-bold tracking-tight">
            {programme.titre}
          </h1>
          <p className="text-ivory-dim/95 mb-6 max-w-[62ch] text-[1.05rem] leading-relaxed">
            {programme.accroche}
          </p>
          {programme.certification && (
            <div className="flex flex-wrap items-center gap-3">
              <Badge ton="certification">Certification {programme.certification}</Badge>
              <span className="text-ivory-dim font-mono text-xs">
                ✦ Examen international reconnu
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Faits saillants ── */}
      <div className="mx-auto max-w-[1180px] px-8 pt-8">
        <div className="hairline-grid rounded-clixa grid-cols-2 overflow-hidden sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["Durée", `${programme.dureeHeures} heures`],
            ["Rythme", programme.rythme],
            ["Modalité", [...parMode.keys()].map((m) => libelleMode[m as never]).join(" ou ")],
            ["Niveau", libelleNiveau[programme.niveau]],
            ["Langue", programme.langue],
          ].map(([label, valeur]) => (
            <div key={label} className="bg-panel/70 p-4.5 backdrop-blur-sm">
              <span className="mono-label text-gold mb-1.5 block text-[0.6rem] tracking-[0.14em]">
                {label}
              </span>
              <span className="text-ivory text-[0.94rem] font-medium">{valeur}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="mx-auto max-w-[1180px] px-8 py-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            <Bloc titre="Objectifs de la formation">
              {programme.positionnement && (
                <p className="text-gold-bright bg-panel/40 border-gold rounded-r-clixa mb-3.5 border-l-2 p-4 text-[0.92rem] leading-relaxed font-medium">
                  {programme.positionnement}
                </p>
              )}
              <p className="leading-relaxed">{programme.objectifs}</p>
            </Bloc>

            <Bloc titre="Public visé">
              <Liste items={programme.publicVise} colonnes />
            </Bloc>

            <Bloc titre="Compétences visées">
              <Liste items={programme.competences} colonnes />
            </Bloc>

            <Bloc titre="Pré-requis">
              <p className="leading-relaxed">{programme.prerequis}</p>
            </Bloc>

            <Bloc titre="Plan de cours détaillé">
              <PlanDeCours modules={programme.modules} />
            </Bloc>

            <Bloc titre="Sessions ouvertes aux inscriptions">
              <SessionsDisponibles sessions={sessions} programmeSlug={programme.slug} />
            </Bloc>

            {programme.approche && programme.approche.length > 0 && (
              <Bloc titre="Approche pédagogique">
                <Liste items={programme.approche} />
              </Bloc>
            )}

            {programme.livrables && programme.livrables.length > 0 && (
              <Bloc titre="Livrables remis aux participants">
                <Liste items={programme.livrables} colonnes />
              </Bloc>
            )}

            {programme.outils && programme.outils.length > 0 && (
              <Bloc titre="Outils et bonus inclus">
                <Liste items={programme.outils} colonnes />
              </Bloc>
            )}

            <Bloc titre="Débouchés professionnels" dernier={!programme.mentionsLegales}>
              <Liste items={programme.debouches} colonnes />
            </Bloc>

            {programme.mentionsLegales && (
              <p className="border-line text-ivory-dim/75 mt-9 border-t pt-6 text-[0.82rem] leading-relaxed">
                {programme.mentionsLegales}
              </p>
            )}
          </div>

          {/* ── Colonne latérale Sticky Executive ── */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="glass-panel-gold rounded-clixa p-6.5 shadow-xl">
              {/* Tarifs et plans */}
              <div className="border-gold/35 bg-ink/60 rounded-clixa mb-6 border p-5">
                <span className="mono-label text-gold mb-3 block text-[0.62rem] tracking-[0.14em]">
                  Options de règlement
                </span>
                {tarifs.plans.map((plan, i) => {
                  const surcout = plan.totalCentimes - tarifs.prixComptantCentimes;
                  const cible = (
                    prochaine
                      ? `/inscription?formation=${programme.slug}&debut=${prochaine.debut.slice(0, 10)}&plan=${plan.code}`
                      : `/contact?programme=${programme.slug}&plan=${plan.code}`
                  ) as Route;
                  return (
                    <Link
                      key={plan.code}
                      href={cible}
                      className="border-line/60 hover:bg-panel/70 block border-b py-3.5 transition-all first:pt-0 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className={
                            i === 0
                              ? "mono-label text-ivory text-[0.65rem] font-semibold"
                              : "text-ivory-dim text-[0.82rem]"
                          }
                        >
                          {i === 0 ? "Comptant" : plan.libelle}
                        </span>
                        <span
                          className={
                            i === 0
                              ? "font-display text-gold-bright text-2xl font-bold"
                              : "text-ivory font-mono text-[0.84rem] font-semibold tabular-nums"
                          }
                        >
                          {i === 0
                            ? formatPrix(plan.totalCentimes)
                            : plan.echeancesCentimes.map((m) => formatPrix(m)).join(" + ")}
                        </span>
                      </div>
                      <div className="text-ivory-dim/70 mt-1 text-[0.72rem]">
                        {i === 0
                          ? plan.conditions
                          : `${formatPrix(plan.totalCentimes)} au total (soit +${formatPrix(surcout)}) · ${plan.conditions}`}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {prochaine && (
                <div className="border-line/60 bg-ink/40 rounded-clixa mb-6 border p-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="mono-label text-gold text-[0.58rem] tracking-[0.14em]">
                      Prochaine rentrée
                    </span>
                    <PlacesBadge restantes={placesRestantes(prochaine)} />
                  </div>
                  <div className="text-ivory text-[0.95rem] font-semibold">
                    {formatPeriode(prochaine.debut, prochaine.fin)}
                  </div>
                  <div className="text-ivory-dim mt-1 font-mono text-[0.76rem]">
                    {lieuSession(prochaine)}
                  </div>
                </div>
              )}

              <div className="mb-6 flex flex-col gap-3">
                {prochaine ? (
                  <Button
                    href={
                      `/inscription?formation=${programme.slug}&debut=${prochaine.debut.slice(0, 10)}` as Route
                    }
                    className="w-full py-4 text-xs font-bold tracking-wider uppercase shadow-lg"
                  >
                    Me pré-inscrire en ligne
                  </Button>
                ) : (
                  <Button
                    href="/contact"
                    className="w-full py-4 text-xs font-bold tracking-wider uppercase"
                  >
                    Être prévenu de la prochaine session
                  </Button>
                )}
                <Button href="/contact" variante="contour" className="w-full py-3.5 text-xs">
                  Être rappelé par un conseiller
                </Button>

                {/*
                  La plaquette, pour qui doit faire valider sa formation en interne. Un
                  lien vers une page web ne s'attache pas à une demande adressée aux
                  ressources humaines ; un document, si.

                  Une balise <a> et non <Link> : le PDF n'est pas une page du site, il
                  n'y a rien à précharger ni à naviguer côté client.
                */}
                <a
                  href={`/formations/${programme.slug}/plaquette`}
                  target="_blank"
                  rel="noopener"
                  className="border-line-strong text-ivory-dim hover:border-gold hover:text-ivory rounded-clixa flex min-h-11 w-full items-center justify-center border text-[0.78rem] transition-colors"
                >
                  Télécharger la plaquette (PDF)
                </a>
              </div>

              <ul className="border-line/60 flex flex-col gap-2.5 border-t pt-5">
                {[
                  /*
                    ⚠️ La liste vient du code, pas du global `tarifs`.

                    Celui-ci ne portait que « Western Union · Ria · MoneyGram » :
                    un prospect qui voulait régler par carte lisait, sur la page
                    qui décide de son achat, que nous ne prenons que des
                    services de transfert. Les deux listes ont divergé le jour
                    où la direction a ouvert la carte et le virement — le
                    formulaire a suivi, la fiche est restée en arrière.

                    Chaque moyen commande ce que le participant reçoit par
                    courriel et ce que le contrat écrit : la liste vraie est
                    celle que le système sait honorer.
                  */
                  ...MOYENS_AFFICHES,
                  "Support de cours & livrables inclus",
                  "Attestation de fin de formation",
                  "Accompagnement live en direct",
                ].map((t) => (
                  <li key={t} className="text-ivory-dim/90 flex items-center gap-2 text-[0.8rem]">
                    <span className="text-emerald-bright font-bold">✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <Temoignages temoignages={temoignages} />
    </>
  );
}

function Bloc({
  titre,
  children,
  dernier = false,
}: {
  titre: string;
  children: React.ReactNode;
  dernier?: boolean;
}) {
  return (
    <section className={dernier ? "" : "border-line/60 mb-10 border-b pb-10"}>
      <h2 className="font-display mb-4 text-[1.4rem] font-semibold">{titre}</h2>
      <div className="text-ivory-dim max-w-[66ch] text-[0.95rem] leading-relaxed">{children}</div>
    </section>
  );
}

function Liste({ items, colonnes = false }: { items: string[]; colonnes?: boolean }) {
  return (
    <ul className={colonnes ? "grid gap-3 sm:grid-cols-2 sm:gap-x-6" : "flex flex-col gap-3"}>
      {items.map((t) => (
        <li
          key={t}
          className="text-ivory-dim/95 flex items-start gap-2.5 text-[0.92rem] leading-relaxed"
        >
          <span className="text-gold mt-1 shrink-0 text-xs font-bold">✦</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
