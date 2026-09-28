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
 * ── L'affiche, reprise en entier sauf quatre choses ─────────────────────────
 * Demandé le même jour : « matenssa hta haja ». Tout ce que porte l'affiche de
 * la direction est ici — les quatre atouts, le public de chaque programme,
 * l'approche en quatre temps avec son suivi à 30 jours et son plan d'action à
 * 90 jours, les compléments des destinations, le séminaire intra-entreprise.
 * Sauf :
 * - **`www.clixa.com` et `contact@clixa.com`** : ce n'est pas notre domaine.
 *   Les coordonnées viennent de `lib/reseaux.ts`, comme partout.
 * - **Le QR code** : on ne sait pas où il mène.
 * - **Les photos de villes et de personnes** : rien ne dit qu'elles sont des
 *   nôtres. Les destinations sont écrites, pas illustrées ; les deux seules
 *   photos sont celles d'une vraie séance, transmises pour cette page.
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

/** Les quatre atouts du bandeau de l'affiche. */
const atouts = [
  {
    titre: "Formations pratiques et opérationnelles",
    trace:
      "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1 M17 11a2.5 2.5 0 1 0 0-5 M21 20v-1a4 4 0 0 0-3-3.9",
  },
  {
    titre: "Immersion professionnelle et visites d'entreprises",
    trace: "M4 21V5l7-2v18 M11 21h9V9l-9-3 M7 8h1 M7 12h1 M7 16h1 M14 11h2 M14 15h2",
  },
  {
    titre: "Réseautage international",
    trace:
      "M12 5a2 2 0 1 0 0-.01 M5 18a2 2 0 1 0 0-.01 M19 18a2 2 0 1 0 0-.01 M12 7v5 M12 12l-5.5 4.5 M12 12l5.5 4.5",
  },
  {
    titre: "Plans d'action concrets, pour un impact durable dans votre entreprise",
    trace: "M4 20h16 M6 16v-3 M10 16V9 M14 16v-5 M18 16V5 M16 7l2-2 2 2",
  },
];

/**
 * L'approche, en quatre temps — ceux de l'affiche, mot pour mot.
 *
 * ⚠️ Le suivi à 30 jours et le plan d'action à 90 jours sont des promesses de
 * la direction, portées par son affiche. Elles figurent ici parce qu'elle a
 * demandé de ne rien oublier ; le jour où l'un des deux change, c'est cette
 * table qu'on corrige.
 */
const approche = [
  {
    titre: "Learn",
    texte: "Expertise de haut niveau, cas pratiques, outils et simulations.",
    trace: "M2 9l10-5 10 5-10 5-10-5z M6 11v5c3 2 9 2 12 0v-5 M22 9v6",
  },
  {
    titre: "Experience",
    texte: "Immersion professionnelle, visites d'entreprises, networking et expérience culturelle.",
    trace:
      "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M3 12h18 M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9 M12 3c-2.5 2.5-3.5 5.5-3.5 9s1 6.5 3.5 9",
  },
  {
    titre: "Transform",
    texte: "Des livrables concrets et un plan d'action à 90 jours.",
    trace:
      "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2",
  },
  {
    titre: "Follow-up",
    texte: "Une session virtuelle 30 jours après le séminaire.",
    trace:
      "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1 M17 11a2.5 2.5 0 1 0 0-5 M21 20v-1a4 4 0 0 0-3-3.9",
  },
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

/*
  Les couleurs sont celles de l'affiche : chaque programme a la sienne, et
  c'est à elle qu'on le reconnaît d'une page à l'autre. Le public visé
  (« pour ») vient aussi de l'affiche — le texte ne donnait que les thèmes.
*/
const programmes = [
  {
    titre: "Finance & Performance",
    pour: "DAF, RAF, contrôle de gestion, CFO, managers financiers",
    couleur: "#1f5fae",
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
    pour: "DG, managers, hauts potentiels",
    couleur: "#c9a24c",
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
    pour: "Chefs de projets, PMO, équipes projets",
    couleur: "#1f9d63",
    sujets: ["Gestion de projet", "Agile", "PMO", "Risques", "Gouvernance", "Leadership projet"],
    trace: "M4 6h7 M4 12h11 M4 18h5 M15 6l2 2 4-4 M19 18l2 2 M17 16h.01",
  },
  {
    titre: "Procurement & Supply Chain",
    pour: "Achats, logistique, opérations",
    couleur: "#e0712f",
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
    pour: "Directeurs commerciaux, KAM, responsables marchés",
    couleur: "#7b4fb3",
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
    pour: "Managers, équipes de transformation",
    couleur: "#1a9ea3",
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
    themes: ["Finance", "Leadership", "Stratégie", "Transformation", "Grands groupes"],
  },
  {
    ville: "Casablanca",
    pays: "Maroc",
    themes: ["Finance", "Business Afrique", "Industrie", "Transformation"],
  },
  {
    ville: "Las Palmas",
    pays: "Espagne · Canaries",
    themes: [
      "Logistique",
      "Ports",
      "Commerce Afrique-Europe",
      "Executive Development",
      "Leadership retreat",
    ],
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
      className="shimmer-gold from-gold-bright via-gold to-gold-bright text-ink border-gold rounded-clixa inline-flex min-h-12 w-full items-center justify-center gap-2 border bg-gradient-to-r px-6 py-3.5 text-center text-[0.8rem] font-bold tracking-[0.06em] uppercase shadow-[0_4px_18px_-4px_rgba(201,162,76,0.3)] transition-all hover:scale-[1.01] hover:shadow-[0_6px_24px_-2px_rgba(201,162,76,0.45)] sm:w-auto sm:px-7 sm:text-sm sm:tracking-[0.08em]"
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

          {/*
            ── Les deux photos, composées ──────────────────────────────────
            Transmises par la direction le 27 septembre 2026 pour cette page.
            Le formateur en grand, l'atelier en médaillon : l'une dit qui
            anime, l'autre comment on travaille — deux vraies séances, là où
            l'affiche d'origine montrait des villes dont rien ne dit qu'elles
            sont les nôtres.

            ⚠️ Recadrées à la source, pas seulement par `object-position` :
            le formateur était une capture de téléphone à bandes noires, et
            l'atelier montrait surtout le parquet — le tableau de scoring
            occupait un tiers du cadre. Chacune est gardée à sa taille
            d'origine, jamais agrandie. Les noms de fichiers ont changé avec le
            recadrage : l'optimiseur d'images de Next — et le cache de Vercel —
            gardent l'ancienne version sous l'ancien nom, et l'écran montrait
            encore la salle entière.

            ⚠️ Le médaillon est posé **dans** le cadre, pas en marge négative :
            à 375 px, un décalage vers la gauche sortirait de l'écran et
            ferait défiler la page de côté.
          */}
          <figure className="relative mx-auto w-full max-w-[460px] pb-16 pl-8 sm:pb-20 sm:pl-14">
            <div
              className="border-gold/35 rounded-clixa absolute top-5 right-0 bottom-24 left-12 translate-x-3 border sm:left-20 sm:translate-x-4"
              aria-hidden="true"
            />
            <div className="rounded-clixa relative z-10 overflow-hidden border border-white/10 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.9)]">
              <Image
                src="/images/entreprises/formateur-en-seance.jpg"
                alt="Un formateur CLIXA anime une séance de séminaire en salle"
                width={738}
                height={922}
                priority
                sizes="(min-width: 1024px) 400px, 85vw"
                className="aspect-[4/5] w-full object-cover"
              />
              <div
                className="from-ink/85 absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t to-transparent"
                aria-hidden="true"
              />
              <span className="bg-ink/75 border-gold/40 text-gold-bright rounded-clixa absolute top-4 left-4 border px-2.5 py-1 font-mono text-[0.6rem] tracking-[0.14em] uppercase backdrop-blur-sm">
                En séance
              </span>
            </div>

            <div className="rounded-clixa border-ink ring-gold/40 absolute bottom-0 left-0 z-20 w-[44%] overflow-hidden border-4 shadow-[0_22px_45px_-15px_rgba(0,0,0,0.95)] ring-1">
              <Image
                src="/images/entreprises/atelier-tableau-scoring.jpg"
                alt="Tableau de scoring d'un atelier : trois équipes, leurs tests et leurs scores sur des post-it"
                width={630}
                height={840}
                sizes="(min-width: 1024px) 200px, 40vw"
                className="aspect-[3/4] w-full object-cover"
              />
              <span className="bg-ink/80 text-ivory absolute inset-x-0 bottom-0 px-2.5 py-1.5 font-mono text-[0.56rem] tracking-[0.12em] uppercase backdrop-blur-sm">
                Atelier · scoring
              </span>
            </div>
          </figure>
        </div>
      </section>

      {/* ── Les quatre atouts (bandeau de l'affiche) ─────────────────────── */}
      <section className="border-line bg-panel/40 border-b px-6 py-10 sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          <p className="font-display text-ivory mb-8 max-w-[40ch] text-[clamp(1.2rem,2.2vw,1.55rem)] leading-snug font-semibold">
            Des équipes plus performantes pour des entreprises africaines{" "}
            <span className="gold-gradient-text">plus ambitieuses.</span>
          </p>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
            {atouts.map((a, i) => (
              <li
                key={a.titre}
                className={`flex items-start gap-4 lg:px-6 ${i > 0 ? "lg:border-line lg:border-l" : "lg:pl-0"}`}
              >
                <span className="border-gold/40 bg-gold/10 text-gold-bright inline-flex size-12 shrink-0 items-center justify-center rounded-full border">
                  <Pictogramme trace={a.trace} className="size-[22px]" />
                </span>
                <span className="text-ivory pt-1 text-[0.88rem] leading-snug font-semibold tracking-[0.02em] uppercase">
                  {a.titre}
                </span>
              </li>
            ))}
          </ul>
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

          {/*
            Les deux semaines, côte à côte et reliées : c'est une progression,
            pas deux options. La photo d'atelier qui occupait une troisième
            colonne est montée en tête de page, avec celle du formateur — une
            même photo à deux endroits se lirait comme un remplissage.
          */}
          <div className="relative grid gap-6 lg:grid-cols-2 lg:gap-10">
            <span
              className="border-gold/50 bg-ink text-gold-bright absolute top-1/2 left-1/2 z-10 hidden size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-[0_0_24px_-6px_rgba(201,162,76,0.6)] lg:inline-flex"
              aria-hidden="true"
            >
              <Pictogramme trace="M5 12h14 M13 6l6 6-6 6" className="size-5" />
            </span>
            {semaines.map((s, i) => (
              <article
                key={s.numero}
                className="executive-card rounded-clixa flex flex-col p-7 sm:p-8"
              >
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
                <ul className="border-line/60 mt-auto grid gap-2 border-t pt-5 sm:grid-cols-2">
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
          </div>
        </div>
      </section>

      {/* ── L'approche en quatre temps (affiche) ─────────────────────────── */}
      <section className="border-line relative overflow-hidden border-b px-6 py-16 sm:px-8">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1180px]">
          <div className="mb-10">
            <span className="mono-label text-gold mb-3 block">
              Des expériences qui transforment vos équipes
            </span>
            <h2 className="text-[clamp(1.6rem,3vw,2.3rem)] font-semibold">
              Notre approche : Learn <span className="text-gold">→</span> Experience{" "}
              <span className="text-gold">→</span> Transform
            </h2>
          </div>

          {/*
            Quatre temps reliés par un filet doré : horizontal sur grand écran,
            vertical sur téléphone. C'est une suite, et le filet la montre sans
            rien écrire de plus.

            ⚠️ Sur téléphone, l'icône passe à gauche du texte. Centrées et
            empilées, les quatre étapes faisaient défiler un écran et demi pour
            quatre phrases courtes — vu à la capture à 375 px.
          */}
          <ol className="relative grid gap-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <span
              className="via-gold/40 absolute top-8 right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-transparent to-transparent lg:block"
              aria-hidden="true"
            />
            <span
              className="from-gold/50 via-gold/25 absolute top-6 bottom-6 left-6 w-px bg-gradient-to-b to-transparent sm:hidden"
              aria-hidden="true"
            />
            {approche.map((a, i) => (
              <li key={a.titre} className="relative flex items-start gap-5 lg:block lg:text-center">
                <span className="border-gold/50 bg-ink text-gold-bright relative z-10 inline-flex size-12 shrink-0 items-center justify-center rounded-full border shadow-[0_0_28px_-8px_rgba(201,162,76,0.55)] lg:mx-auto lg:mb-5 lg:size-16">
                  <Pictogramme trace={a.trace} className="size-6 lg:size-7" />
                </span>
                <div>
                  <span className="text-gold/70 mb-1 block font-mono text-[0.62rem] tracking-[0.16em] uppercase">
                    Étape {i + 1}
                  </span>
                  <h3 className="font-display text-ivory mb-1.5 text-[1.15rem] font-semibold uppercase lg:mb-2 lg:text-[1.2rem]">
                    {a.titre}
                  </h3>
                  <p className="text-ivory-dim/90 text-[0.9rem] leading-relaxed lg:mx-auto lg:max-w-[26ch]">
                    {a.texte}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Les programmes ──────────────────────────────────────────────── */}
      <section className="border-line border-b px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-10">
            <span className="mono-label text-gold mb-3 block">Nos programmes phares</span>
            <h2 className="mb-3 text-[clamp(1.6rem,3vw,2.3rem)] font-semibold">
              Des programmes adaptés aux enjeux de votre organisation.
            </h2>
            <p className="text-ivory-dim/90 text-[0.98rem]">
              Des séminaires conçus autour de vos enjeux stratégiques.
            </p>
          </div>

          <div className="carte-grid sm:grid-cols-2 lg:grid-cols-3">
            {programmes.map((p) => (
              <article
                key={p.titre}
                className="executive-card rounded-clixa relative flex flex-col overflow-hidden p-7"
              >
                <div
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: `linear-gradient(90deg, ${p.couleur}, transparent)` }}
                  aria-hidden="true"
                />
                <div className="mb-5 flex items-center gap-4">
                  <span
                    className="inline-flex size-14 shrink-0 items-center justify-center rounded-full text-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.9)]"
                    style={{ backgroundColor: p.couleur }}
                  >
                    <Pictogramme trace={p.trace} className="size-7" />
                  </span>
                  <h3 className="font-display text-ivory text-[1.15rem] leading-tight font-semibold">
                    {p.titre}
                  </h3>
                </div>
                <p className="text-ivory-dim mb-4 text-[0.86rem] leading-relaxed">
                  <span className="text-gold-bright font-mono text-[0.66rem] tracking-[0.14em] uppercase">
                    Pour
                  </span>{" "}
                  {p.pour}
                </p>
                <ul className="border-line/60 mt-auto flex flex-wrap gap-1.5 border-t pt-4">
                  {p.sujets.map((t) => (
                    <li
                      key={t}
                      className="border-line text-ivory/90 rounded-full border px-2.5 py-0.5 text-[0.75rem]"
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

          <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            {prestations.map((p) => (
              <li
                key={p}
                className="border-line bg-panel/50 rounded-clixa text-ivory flex items-center gap-3 border px-4 py-3 text-[0.9rem] sm:py-3.5 sm:text-[0.92rem]"
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
            <h2 className="mb-3 text-[clamp(1.6rem,3vw,2.3rem)] font-semibold">
              Cinq destinations. Cinq écosystèmes.
            </h2>
            <p className="text-ivory-dim/90 max-w-[62ch] text-[0.98rem] leading-relaxed">
              Des villes choisies pour leur écosystème économique, leur accessibilité et leurs
              opportunités de networking.
            </p>
          </div>

          {/*
            ⚠️ Sur téléphone, les cinq villes glissent du doigt au lieu de
            s'empiler : empilées, elles tenaient deux écrans. La carte suivante
            dépasse au bord droit, et c'est ce débord qui dit qu'on peut
            glisser — une flèche seule ne le dirait pas. Le défilement reste
            dans le bandeau : la page, elle, ne bouge pas de côté (mesuré, 375 px
            pour 375 px).

            ⚠️ `scroll-px-6` n'est pas décoratif : l'aimantation du défilement
            ignore le `padding` du bandeau, et la première carte se collait au
            bord de l'écran.
          */}
          <p className="text-ivory-dim/70 mb-3 font-mono text-[0.62rem] tracking-[0.14em] uppercase sm:hidden">
            Faites glisser →
          </p>
          <div className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto scroll-smooth px-6 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
            {destinations.map((d) => (
              <article
                key={d.ville}
                className="executive-card rounded-clixa relative flex w-[78%] shrink-0 snap-start flex-col overflow-hidden p-6 sm:w-auto"
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
                <ul className="flex flex-wrap gap-1.5 sm:mt-auto">
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
            <span className="mono-label text-gold mb-3 block">
              Private Corporate Seminar · Séminaire intra-entreprise
            </span>
            <h2 className="mb-4 text-[clamp(1.6rem,3vw,2.3rem)] font-semibold">
              Votre entreprise. Vos collaborateurs. Vos enjeux.
            </h2>
            <p className="text-ivory-dim/90 text-[0.98rem] leading-relaxed">
              CLIXA peut privatiser un programme pour votre organisation et construire les deux
              semaines autour de vos priorités. Des programmes 100 % personnalisés pour vos équipes,
              adaptés à vos objectifs et à votre secteur d&apos;activité.
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
          <div className="mt-8 flex justify-center sm:justify-start">
            <BoutonSeminaire>Échangeons sur votre prochain séminaire</BoutonSeminaire>
          </div>
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
