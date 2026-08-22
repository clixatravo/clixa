import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { JsonLd } from "@/components/JsonLd";
import { jsonLdCourse } from "@/lib/seo";
import { PlanDeCours } from "@/components/PlanDeCours";
import { SessionsDisponibles } from "@/components/SessionsDisponibles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { placesRestantes } from "@/lib/types";
import {
  formatPeriode,
  formatPrix,
  getProchaineSession,
  getProgramme,
  getProgrammes,
  getSessions,
  getSpecialisation,
  libelleMode,
  lieuSession,
  getTarifs,
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

const NIVEAUX = { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" } as const;

export default async function FicheFormation({ params }: Props) {
  const { slug } = await params;
  const programme = await getProgramme(slug);
  if (!programme) notFound();

  const spec = await getSpecialisation(programme.specialisation);
  const sessions = await getSessions(programme.slug);
  const tarifs = await getTarifs();
  const prochaine = await getProchaineSession(programme.slug);

  const parMode = new Map<string, number>();
  for (const s of sessions) {
    const actuel = parMode.get(s.mode);
    if (actuel === undefined || s.prixCentimes < actuel) parMode.set(s.mode, s.prixCentimes);
  }

  return (
    <>
      {/* INT-04 — Course + une CourseInstance par session, avec dates et prix */}
      <JsonLd data={jsonLdCourse(programme, sessions)} />

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
      <section className="border-line border-b px-8 py-13">
        <div className="mx-auto max-w-[1180px]">
          <div className="eyebrow mono-label mb-5">{spec?.nom}</div>
          <h1 className="mb-4 max-w-[20ch] text-[clamp(1.9rem,4vw,3rem)]">{programme.titre}</h1>
          <p className="text-ivory-dim mb-6 max-w-[62ch] text-[1.02rem]">{programme.accroche}</p>
          {programme.certification && <Badge ton="certification">{programme.certification}</Badge>}
        </div>
      </section>

      {/* ── Faits saillants ── */}
      <div className="mx-auto max-w-[1180px] px-8 pt-8">
        <div className="hairline-grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["Durée", `${programme.dureeHeures} heures`],
            ["Rythme", programme.rythme],
            ["Modalité", [...parMode.keys()].map((m) => libelleMode[m as never]).join(" ou ")],
            ["Niveau", NIVEAUX[programme.niveau]],
            ["Langue", programme.langue],
          ].map(([label, valeur]) => (
            <div key={label} className="bg-panel p-4">
              <span className="mono-label text-gold mb-1.5 block text-[0.58rem]">{label}</span>
              <span className="text-ivory text-[0.92rem]">{valeur}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="mx-auto max-w-[1180px] px-8 py-11">
        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          <div>
            <Bloc titre="Objectifs de la formation">
              <p>{programme.objectifs}</p>
            </Bloc>

            <Bloc titre="Public visé">
              <Liste items={programme.publicVise} colonnes />
            </Bloc>

            <Bloc titre="Compétences visées">
              <Liste items={programme.competences} colonnes />
            </Bloc>

            <Bloc titre="Pré-requis">
              <p>{programme.prerequis}</p>
            </Bloc>

            <Bloc titre="Plan de cours">
              <PlanDeCours modules={programme.modules} />
            </Bloc>

            <Bloc titre="Sessions disponibles">
              <SessionsDisponibles sessions={sessions} />
            </Bloc>

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

            {/*
              La mention n'est pas décorative : la fiche PMP doit rappeler que la
              marque appartient au PMI et que les frais d'examen restent à la charge
              du participant. On la sort du flux des rubriques pour ce qu'elle est —
              une note de bas de fiche, lisible mais discrète.
            */}
            {programme.mentionsLegales && (
              <p className="border-line text-ivory-dim mt-9 border-t pt-6 text-[0.82rem] leading-relaxed">
                {programme.mentionsLegales}
              </p>
            )}
          </div>

          {/* ── Colonne latérale ── */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="bg-panel p-6">
              {/*
                Le tarif est celui du catalogue, pas celui de la session : les
                douze parcours partagent le même barème. Les plans échelonnés
                coûtent plus cher, et l'écart est montré — 423 € comptant contre
                470 € en trois fois. Le taire pour « faire propre » reviendrait à
                laisser le visiteur le découvrir au moment de payer.
              */}
              <div className="border-gold mb-6 border p-5">
                {/*
                  Chaque rythme est un lien : le choix part avec la demande au
                  lieu de se rejouer au téléphone. Le premier plan sert de
                  référence — les suivants affichent ce qu'ils coûtent en plus.
                */}
                {tarifs.plans.map((plan, i) => {
                  const surcout = plan.totalCentimes - tarifs.prixComptantCentimes;
                  const cible = `/contact?programme=${programme.slug}&plan=${plan.code}` as Route;
                  return (
                    <Link
                      key={plan.code}
                      href={cible}
                      className="border-line hover:bg-panel-2 block border-b py-3 transition-colors first:pt-0 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className={
                            i === 0
                              ? "mono-label text-ivory-dim text-[0.6rem]"
                              : "text-ivory-dim text-[0.82rem]"
                          }
                        >
                          {i === 0 ? "Comptant" : plan.libelle}
                        </span>
                        <span
                          className={
                            i === 0
                              ? "font-display text-gold-bright text-2xl"
                              : "text-ivory font-mono text-[0.82rem] tabular-nums"
                          }
                        >
                          {i === 0
                            ? formatPrix(plan.totalCentimes)
                            : plan.echeancesCentimes.map((m) => formatPrix(m)).join(" + ")}
                        </span>
                      </div>
                      <div className="text-ivory-dim mt-0.5 text-[0.7rem]">
                        {i === 0
                          ? plan.conditions
                          : `${formatPrix(plan.totalCentimes)} au total, soit ${formatPrix(surcout)} de plus · ${plan.conditions}`}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {prochaine && (
                <div className="border-line mb-4 border-b pb-4">
                  <span className="mono-label text-gold mb-2 block text-[0.58rem]">
                    Prochaine session
                  </span>
                  <div className="text-ivory text-[0.94rem]">
                    {formatPeriode(prochaine.debut, prochaine.fin)}
                  </div>
                  <div className="text-ivory-dim mt-1 text-[0.78rem]">
                    {lieuSession(prochaine)} · {placesRestantes(prochaine)} places restantes
                  </div>
                </div>
              )}

              <div className="mb-6 flex flex-col gap-2.5">
                {/* FE-07 — transactionnel à partir de la phase 02 */}
                <Button href="/contact">Réserver ma place</Button>
                <Button href="/contact" variante="contour">
                  Être rappelé par un conseiller
                </Button>
              </div>

              {/*
                Cette liste annonçait « paiement en 3 fois sans frais » et le
                paiement par carte. Le barème réel dit l'inverse : trois fois
                coûte 47 € de plus, et les règlements passent par Western Union,
                Ria ou MoneyGram. On affiche ce qui est vrai.
              */}
              <ul className="border-line flex flex-col gap-2.5 border-t pt-4">
                {[
                  ...tarifs.moyensPaiement,
                  "Support de cours inclus",
                  "Attestation de fin de formation",
                ].map((t) => (
                  <li key={t} className="text-ivory-dim relative pl-4.5 text-[0.8rem]">
                    <span className="bg-emerald-bright absolute top-[0.6em] left-0 block h-px w-2" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
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
    <section className={dernier ? "" : "border-line mb-9 border-b pb-9"}>
      <h2 className="mb-4 text-[1.35rem]">{titre}</h2>
      <div className="text-ivory-dim max-w-[66ch] text-[0.94rem]">{children}</div>
    </section>
  );
}

function Liste({ items, colonnes = false }: { items: string[]; colonnes?: boolean }) {
  return (
    <ul className={colonnes ? "grid gap-2.5 sm:grid-cols-2 sm:gap-x-6" : "flex flex-col gap-2.5"}>
      {items.map((t) => (
        <li key={t} className="text-ivory-dim relative pl-5 text-[0.92rem]">
          <span className="bg-gold absolute top-[0.62em] left-0 block h-px w-2" />
          {t}
        </li>
      ))}
    </ul>
  );
}
