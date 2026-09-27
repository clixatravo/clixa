import type { Metadata, Route } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { FilAriane } from "@/components/FilAriane";
import { RESEAUX_CLIXA } from "@/lib/reseaux";

/**
 * Pour les entreprises : les séminaires internationaux de deux semaines.
 *
 * ── Deux offres, et cette page n'en porte qu'une ────────────────────────────
 * Précisé par la direction le 27 septembre 2026 : CLIXA forme **en ligne des
 * personnes** — le catalogue, DAF, directeur de production, directeur
 * marketing — et **en présentiel des entreprises**. Cette page est la seconde.
 * Elle renvoie à la première pour qui cherche une formation à titre
 * individuel, sans quoi un cadre arrivé ici croirait devoir partir deux
 * semaines à Madrid pour se former.
 *
 * Le texte est celui de la direction (« CLIXA Corporate Training »), repris
 * dans son ordre : la promesse, le déroulé des deux semaines, les programmes,
 * ce que CLIXA organise, les cinq destinations, le séminaire privatisé.
 *
 * ── ⚠️ Ce que la page ne reprend pas de l'affiche transmise ────────────────
 * - **`www.clixa.com` et `contact@clixa.com`** : ce n'est pas notre domaine.
 *   Les coordonnées viennent de `lib/reseaux.ts`, comme partout.
 * - **Le QR code** : on ne sait pas où il mène.
 * - **Les photos de villes** : rien ne dit qu'elles sont des nôtres. Les
 *   destinations sont écrites, pas illustrées ; les deux seules photos sont
 *   celles d'une vraie séance, transmises pour cette page.
 * - **« Session virtuelle 30 jours après »** : l'affiche la promet, le texte
 *   de la direction non. Une promesse de suivi se tient ou ne s'écrit pas.
 *
 * ⚠️ **« Selon la formule retenue, CLIXA peut prendre en charge »** — la
 * nuance est dans le texte d'origine et elle reste. Hébergement, restauration
 * et transferts ne sont pas inclus d'office ; les annoncer ainsi ferait
 * découvrir l'écart au devis.
 */
export const metadata: Metadata = {
  title: "Séminaires internationaux pour entreprises",
  description:
    "CLIXA Corporate Training organise des séminaires professionnels de deux semaines pour les entreprises africaines — Madrid, Barcelone, Paris, Casablanca, Las Palmas. Formation, immersion, networking et plan d'action.",
};

const MESSAGE_SEMINAIRE =
  "Bonjour CLIXA, nous souhaitons organiser un séminaire de deux semaines pour nos équipes.";
const LIEN_SEMINAIRE = `${RESEAUX_CLIXA.whatsapp.url}?text=${encodeURIComponent(MESSAGE_SEMINAIRE)}`;

const ingredients = [
  "Formation intensive",
  "Ateliers pratiques",
  "Études de cas",
  "Immersion professionnelle",
  "Benchmark",
  "Networking",
  "Expérience culturelle",
  "Plan d'action",
];

const semaines = [
  {
    numero: "Semaine 1",
    titre: "Learn",
    texte: "Approfondissement des compétences métier et managériales.",
    points: [
      "Masterclasses",
      "Cas pratiques",
      "Simulations",
      "Workshops",
      "Outils professionnels",
      "Travail sur les problématiques de l'entreprise",
    ],
  },
  {
    numero: "Semaine 2",
    titre: "Experience & Transform",
    texte: "Transformer les acquis en perspectives nouvelles et en actions concrètes.",
    points: [
      "Immersions professionnelles",
      "Rencontres avec des experts",
      "Benchmark",
      "Networking",
      "Ateliers de transformation",
      "Construction du plan d'action",
    ],
  },
];

const programmes = [
  {
    titre: "Finance & Performance",
    sujets: [
      "Finance",
      "Contrôle de gestion",
      "Cash & BFR",
      "Budget & Forecast",
      "Business Partnering",
    ],
    trace: "M4 19h16 M7 16v-4 M11 16V8 M15 16v-6 M19 16V5",
  },
  {
    titre: "Leadership & Management",
    sujets: [
      "Leadership",
      "Management",
      "Communication",
      "Conduite du changement",
      "Performance collective",
    ],
    trace:
      "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1 M17 11a2.5 2.5 0 1 0 0-5 M21 20v-1a4 4 0 0 0-3-3.9",
  },
  {
    titre: "Project Management",
    sujets: ["Gestion de projet", "Agile", "PMO", "Risques", "Gouvernance", "Leadership projet"],
    trace: "M4 6h7 M4 12h11 M4 18h5 M15 6l2 2 4-4 M19 18l2 2 M17 16h.01",
  },
  {
    titre: "Procurement & Supply Chain",
    sujets: [
      "Achats",
      "Supply Chain",
      "Logistique",
      "Supplier Management",
      "Excellence opérationnelle",
    ],
    trace:
      "M3 7h11v9H3z M14 10h4l3 3v3h-7 M6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3",
  },
  {
    titre: "Sales & Business Development",
    sujets: [
      "Stratégie commerciale",
      "Négociation",
      "Key Account Management",
      "Business Development",
    ],
    trace: "M3 17l6-6 4 4 8-8 M15 7h6v6",
  },
  {
    titre: "AI & Digital Transformation",
    sujets: [
      "Intelligence artificielle",
      "Digitalisation",
      "Automatisation",
      "Data",
      "Transformation des processus",
    ],
    trace:
      "M9 3v3 M15 3v3 M9 18v3 M15 18v3 M3 9h3 M3 15h3 M18 9h3 M18 15h3 M7 7h10v10H7z M10 10h4v4h-4z",
  },
];

const prestations = [
  "Programme de formation",
  "Intervenants et experts",
  "Hébergement",
  "Restauration",
  "Transferts et logistique locale",
  "Visites et immersions professionnelles",
  "Activités culturelles",
  "Accompagnement administratif",
  "Support avant et pendant le séjour",
];

const destinations = [
  {
    ville: "Madrid",
    pays: "Espagne",
    themes: ["Business international", "Finance", "Agri-business", "Transformation"],
  },
  {
    ville: "Barcelone",
    pays: "Espagne",
    themes: ["Innovation", "Digital", "Entrepreneuriat", "Supply Chain"],
  },
  {
    ville: "Paris",
    pays: "France",
    themes: ["Finance", "Leadership", "Stratégie", "Transformation"],
  },
  {
    ville: "Casablanca",
    pays: "Maroc",
    themes: ["Finance", "Business Afrique", "Industrie", "Transformation"],
  },
  {
    ville: "Las Palmas",
    pays: "Espagne · Canaries",
    themes: ["Logistique", "Ports", "Commerce Afrique-Europe", "Executive Development"],
  },
];

const prive = [
  {
    moment: "Avant",
    texte:
      "Nous identifions avec votre direction les compétences à renforcer et les problématiques à traiter.",
  },
  {
    moment: "Pendant",
    texte: "Vos collaborateurs travaillent sur leurs propres enjeux, pas sur des cas génériques.",
  },
  {
    moment: "Après",
    texte:
      "Ils repartent avec des outils, des recommandations et des plans d'action directement applicables dans votre organisation.",
  },
];

function Pictogramme({ trace, className = "size-5" }: { trace: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={trace} />
    </svg>
  );
}

/** Le bouton de contact : WhatsApp, message déjà écrit. */
function BoutonSeminaire({ children }: { children: ReactNode }) {
  return (
    <a
      href={LIEN_SEMINAIRE}
      target="_blank"
      rel="noopener noreferrer"
      className="shimmer-gold from-gold-bright via-gold to-gold-bright text-ink border-gold rounded-clixa inline-flex min-h-12 items-center justify-center gap-2 border bg-gradient-to-r px-7 py-3.5 text-center text-sm font-bold tracking-[0.08em] uppercase shadow-[0_4px_18px_-4px_rgba(201,162,76,0.3)] transition-all hover:scale-[1.01] hover:shadow-[0_6px_24px_-2px_rgba(201,162,76,0.45)]"
    >
      {children}
      <Pictogramme trace="M5 12h14 M13 6l6 6-6 6" className="size-4" />
    </a>
  );
}

export default function Entreprises() {
  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "Pour les entreprises" }]} />

      {/* ── La promesse ─────────────────────────────────────────────────── */}
      <section className="border-line relative overflow-hidden border-b px-6 py-14 sm:px-8 lg:py-20">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="eyebrow mono-label mb-5">CLIXA Corporate Training</div>
            <p className="text-gold-bright mb-4 font-mono text-[0.72rem] tracking-[0.14em] uppercase">
              Séminaires internationaux de 2 semaines · entreprises africaines
            </p>
            <h1 className="mb-6 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.08] font-bold">
              Développez vos talents. Transformez votre organisation.{" "}
              <span className="gold-gradient-text">Ouvrez vos équipes sur le monde.</span>
            </h1>
            <p className="text-ivory-dim/95 mb-6 max-w-[60ch] text-[1.02rem] leading-relaxed">
              CLIXA Corporate Training conçoit et organise des séminaires professionnels
              internationaux de deux semaines, destinés aux entreprises, institutions et
              organisations africaines.
            </p>

            <p className="text-ivory mb-6 font-mono text-[0.78rem] tracking-[0.12em] uppercase">
              Madrid · Barcelone · Paris · Casablanca · Las Palmas
            </p>

            <ul className="mb-8 flex flex-wrap gap-2" aria-label="Au programme des deux semaines">
              {ingredients.map((i) => (
                <li
                  key={i}
                  className="border-line bg-panel/60 text-ivory-dim rounded-full border px-3 py-1 text-[0.8rem]"
                >
                  {i}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <BoutonSeminaire>Organiser un séminaire</BoutonSeminaire>
              <a
                href="#deroule"
                className="text-ivory-dim hover:text-ivory hover:border-gold border-ivory-dim border-b py-2 text-sm transition-colors"
              >
                Voir le déroulé des deux semaines
              </a>
            </div>
          </div>

          <figure className="relative mx-auto w-full max-w-[380px]">
            <div className="border-gold/30 rounded-clixa relative overflow-hidden border shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
              <Image
                src="/images/entreprises/seminaire-formateur.jpg"
                alt="Un formateur CLIXA anime une séance de séminaire en salle"
                width={738}
                height={1313}
                priority
                sizes="(min-width: 1024px) 380px, 90vw"
                className="aspect-[4/5] w-full object-cover object-[50%_30%]"
              />
            </div>
            <figcaption className="text-ivory-dim/80 mt-3 text-center font-mono text-[0.68rem] tracking-[0.12em] uppercase">
              En séance · animation en salle
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── Pour qui : les deux offres ──────────────────────────────────── */}
      <section className="border-line border-b px-6 py-6 sm:px-8">
        <p className="text-ivory-dim mx-auto max-w-[1180px] text-[0.9rem] leading-relaxed">
          <span className="text-ivory font-semibold">Vous vous formez à titre individuel ?</span>{" "}
          Nos parcours de direction — DAF, directeur de production, directeur marketing… — se
          suivent en ligne, en classe virtuelle.{" "}
          <Link
            href={"/formations" as Route}
            className="text-gold-bright hover:text-gold underline underline-offset-4"
          >
            Voir le catalogue en ligne →
          </Link>
        </p>
      </section>

      {/* ── Les deux semaines ───────────────────────────────────────────── */}
      <section id="deroule" className="border-line scroll-mt-24 border-b px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-10 max-w-[62ch]">
            <span className="mono-label text-gold mb-3 block">Learn · Experience · Transform</span>
            <h2 className="mb-4 text-[clamp(1.6rem,3vw,2.3rem)] font-semibold">
              Deux semaines pour apprendre, expérimenter et transformer.
            </h2>
            <p className="text-ivory-dim/90 text-[0.98rem] leading-relaxed">
              Nos séminaires ne sont pas conçus comme une succession de cours. Ils constituent une
              véritable expérience de développement professionnel.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr_0.8fr]">
            {semaines.map((s, i) => (
              <article key={s.numero} className="executive-card rounded-clixa flex flex-col p-7">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="border-gold/30 bg-gold/10 text-gold-bright rounded-clixa px-2.5 py-1 font-mono text-[0.64rem] font-bold tracking-[0.12em] uppercase">
                    {s.numero}
                  </span>
                  <span className="font-display text-gold/25 text-[2.6rem] leading-none font-bold">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-display text-ivory mb-2 text-[1.45rem] font-semibold uppercase">
                  {s.titre}
                </h3>
                <p className="text-ivory-dim/90 mb-5 text-[0.93rem] leading-relaxed">{s.texte}</p>
                <ul className="border-line/60 mt-auto grid gap-2 border-t pt-5">
                  {s.points.map((p) => (
                    <li key={p} className="text-ivory flex items-start gap-2.5 text-[0.9rem]">
                      <span className="text-emerald-bright mt-[0.1rem]" aria-hidden="true">
                        ✓
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}

            <figure className="rounded-clixa border-line relative hidden overflow-hidden border lg:block">
              <Image
                src="/images/entreprises/atelier-scoring.jpg"
                alt="Tableau de scoring d'un atelier : trois équipes, leurs tests et leurs scores sur des post-it"
                width={1000}
                height={1333}
                sizes="(min-width: 1024px) 300px, 0px"
                className="h-full w-full object-cover object-[50%_40%]"
              />
              <figcaption className="from-ink/95 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-5 pt-14">
                <span className="text-gold-bright block font-mono text-[0.64rem] tracking-[0.14em] uppercase">
                  En atelier
                </span>
                <span className="text-ivory text-[0.88rem] leading-snug">
                  Trois équipes, des tests, un score : on apprend en le faisant.
                </span>
              </figcaption>
            </figure>
          </div>

          {/*
            Sous 1024 px, la photo d'atelier passe sous les deux semaines, en
            bandeau : en troisième colonne elle écraserait les cartes, et
            empilée en portrait elle ferait défiler un écran entier de post-it.
          */}
          <figure className="rounded-clixa border-line relative mt-6 overflow-hidden border lg:hidden">
            <Image
              src="/images/entreprises/atelier-scoring.jpg"
              alt="Tableau de scoring d'un atelier : trois équipes, leurs tests et leurs scores sur des post-it"
              width={1000}
              height={1333}
              sizes="100vw"
              className="aspect-[16/10] w-full object-cover object-[50%_45%]"
            />
            <figcaption className="from-ink/95 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-4 pt-12">
              <span className="text-gold-bright block font-mono text-[0.62rem] tracking-[0.14em] uppercase">
                En atelier
              </span>
              <span className="text-ivory text-[0.86rem]">
                Trois équipes, des tests, un score : on apprend en le faisant.
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── Les programmes ──────────────────────────────────────────────── */}
      <section className="border-line border-b px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-10">
            <span className="mono-label text-gold mb-3 block">Nos programmes</span>
            <h2 className="text-[clamp(1.6rem,3vw,2.3rem)] font-semibold">
              Des programmes adaptés aux enjeux de votre organisation.
            </h2>
          </div>

          <div className="carte-grid sm:grid-cols-2 lg:grid-cols-3">
            {programmes.map((p) => (
              <article key={p.titre} className="executive-card rounded-clixa p-7">
                <span className="border-gold/35 bg-gold/10 text-gold-bright mb-5 inline-flex size-11 items-center justify-center rounded-full border">
                  <Pictogramme trace={p.trace} />
                </span>
                <h3 className="font-display text-ivory mb-3 text-[1.15rem] font-semibold">
                  {p.titre}
                </h3>
                <p className="text-ivory-dim/85 text-[0.88rem] leading-relaxed">
                  {p.sujets.join(" · ")}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ce que CLIXA organise ───────────────────────────────────────── */}
      <section className="border-line border-b px-6 py-16 sm:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <span className="mono-label text-gold mb-3 block">Une expérience complète</span>
            <h2 className="mb-4 text-[clamp(1.6rem,3vw,2.3rem)] font-semibold">
              Une expérience internationale, un interlocuteur unique.
            </h2>
            <p className="text-ivory-dim/90 mb-4 text-[0.98rem] leading-relaxed">
              Selon la formule retenue, CLIXA peut prendre en charge l&apos;organisation du
              parcours.
            </p>
            <p className="text-ivory-dim/90 text-[0.98rem] leading-relaxed">
              L&apos;entreprise dispose ainsi d&apos;un interlocuteur unique pour organiser le
              séminaire de ses collaborateurs.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {prestations.map((p) => (
              <li
                key={p}
                className="border-line bg-panel/50 rounded-clixa text-ivory flex items-center gap-3 border px-4 py-3.5 text-[0.92rem]"
              >
                <span
                  className="border-emerald/40 bg-emerald/10 text-emerald-bright inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.7rem]"
                  aria-hidden="true"
                >
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Les destinations ────────────────────────────────────────────── */}
      <section className="border-line border-b px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-10">
            <span className="mono-label text-gold mb-3 block">5 destinations</span>
            <h2 className="text-[clamp(1.6rem,3vw,2.3rem)] font-semibold">
              Cinq destinations. Cinq écosystèmes.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {destinations.map((d) => (
              <article
                key={d.ville}
                className="executive-card rounded-clixa relative flex flex-col overflow-hidden p-6"
              >
                <div
                  className="from-gold/70 absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r to-transparent"
                  aria-hidden="true"
                />
                <span className="text-ivory-dim/70 mb-1 font-mono text-[0.62rem] tracking-[0.14em] uppercase">
                  {d.pays}
                </span>
                <h3 className="font-display text-ivory mb-4 text-[1.5rem] font-semibold">
                  {d.ville}
                </h3>
                <ul className="mt-auto flex flex-wrap gap-1.5">
                  {d.themes.map((t) => (
                    <li
                      key={t}
                      className="border-line text-ivory-dim rounded-full border px-2 py-0.5 text-[0.72rem]"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Le séminaire privatisé ──────────────────────────────────────── */}
      <section className="border-line border-b px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-10 max-w-[62ch]">
            <span className="mono-label text-gold mb-3 block">Private Corporate Seminar</span>
            <h2 className="mb-4 text-[clamp(1.6rem,3vw,2.3rem)] font-semibold">
              Votre entreprise. Vos collaborateurs. Vos enjeux.
            </h2>
            <p className="text-ivory-dim/90 text-[0.98rem] leading-relaxed">
              CLIXA peut privatiser un programme pour votre organisation et construire les deux
              semaines autour de vos priorités.
            </p>
          </div>

          <ol className="carte-grid md:grid-cols-3">
            {prive.map((p, i) => (
              <li key={p.moment} className="executive-card rounded-clixa p-7">
                <span className="border-gold/30 bg-gold/10 text-gold-bright rounded-clixa mb-4 inline-block px-2.5 py-1 font-mono text-[0.64rem] font-bold tracking-[0.12em] uppercase">
                  {i + 1} · {p.moment}
                </span>
                <p className="text-ivory text-[0.95rem] leading-relaxed">{p.texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── L'appel ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="glass-panel-gold rounded-clixa flex flex-wrap items-center justify-between gap-8 p-8 sm:p-10">
            <div>
              <h2 className="mb-3 text-[clamp(1.5rem,2.8vw,2.1rem)] font-semibold">
                Deux semaines ailleurs.{" "}
                <span className="gold-gradient-text">Des compétences pour longtemps.</span>
              </h2>
              <p className="text-ivory-dim/90 max-w-[54ch] text-[0.96rem] leading-relaxed">
                Parlez-nous de vos équipes et de vos enjeux : nous construisons le séminaire avec
                vous. Sur WhatsApp, ou par courriel à{" "}
                <a
                  href={RESEAUX_CLIXA.email.url}
                  className="text-gold-bright hover:text-gold underline underline-offset-4"
                >
                  {RESEAUX_CLIXA.email.adresse}
                </a>
                .
              </p>
            </div>
            <BoutonSeminaire>Concevoir notre séminaire</BoutonSeminaire>
          </div>
        </div>
      </section>
    </>
  );
}
