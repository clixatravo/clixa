import type { Metadata, Route } from "next";
import Link from "next/link";
import Image from "next/image";
import { ProgrammeCard } from "@/components/ProgrammeCard";
import { FilAriane } from "@/components/FilAriane";
import type { ModeDiffusion } from "@/lib/types";
import {
  filtrerProgrammes,
  getSpecialisations,
  libelleMode,
  villesDisponibles,
  metiersSuggeres,
} from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "Toutes les formations",
  description:
    "Le catalogue complet des formations certifiantes et parcours exécutifs CLIXA, filtrable par spécialisation, modalité et ville.",
  // Toutes les combinaisons de filtres se canonisent vers le catalogue nu :
  // ce sont des vues d'un même contenu, pas des pages distinctes. Les pages
  // /specialisations/[slug] jouent le rôle de pages d'atterrissage indexables.
  alternates: { canonical: "/formations" },
};

const MODES: ModeDiffusion[] = ["presentiel", "visio"];

interface Props {
  searchParams: Promise<{ specialisation?: string; mode?: string; ville?: string; q?: string }>;
}

/**
 * FE-04 — Catalogue et logique de filtrage.
 *
 * Les filtres vivent dans l'URL plutôt que dans un état client : la page reste
 * rendue côté serveur, chaque combinaison est partageable et indexable, et le
 * retour navigateur fonctionne naturellement.
 */
export default async function Catalogue({ searchParams }: Props) {
  const params = await searchParams;
  const specs = await getSpecialisations();
  const metiers = await metiersSuggeres();
  const villes = await villesDisponibles();

  const mode = MODES.includes(params.mode as ModeDiffusion)
    ? (params.mode as ModeDiffusion)
    : undefined;

  const resultats = await filtrerProgrammes({
    specialisation: params.specialisation,
    mode,
    ville: params.ville,
    q: params.q,
  });

  /**
   * Construit l'URL en basculant un filtre, sans perdre les autres.
   * La chaîne de requête est construite dynamiquement : `typedRoutes` valide le
   * chemin mais ne peut pas vérifier les paramètres, d'où l'annotation explicite.
   */
  const lien = (cle: string, valeur?: string): Route => {
    const qs = new URLSearchParams();
    const actuel = { ...params };
    if (valeur === undefined || actuel[cle as keyof typeof actuel] === valeur) {
      delete actuel[cle as keyof typeof actuel];
    } else {
      actuel[cle as keyof typeof actuel] = valeur;
    }
    // Les autres paramètres sont conservés, y compris le terme recherché.
    for (const [k, v] of Object.entries(actuel)) if (v) qs.set(k, v);
    const s = qs.toString();
    return (s ? `/formations?${s}` : "/formations") as Route;
  };

  const actif = (cle: keyof typeof params, valeur?: string) => params[cle] === valeur;

  const chip = (estActif: boolean) =>
    `rounded-clixa border px-4 py-1.5 text-[0.78rem] transition-colors ${
      estActif
        ? "bg-gold border-gold text-ink font-bold"
        : "border-line text-ivory-dim hover:border-gold hover:text-ivory"
    }`;

  const aDesFiltres = Boolean(params.specialisation || params.mode || params.ville || params.q);

  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "Toutes les formations" }]} />

      <section className="px-8 py-12">
        <div className="mx-auto max-w-[1180px]">
          {/* ── En-tête Catalogue avec Visuel Officiel ── */}
          <div className="border-gold/30 bg-panel/75 rounded-clixa mb-10 overflow-hidden border p-6 shadow-2xl backdrop-blur-md sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div className="max-w-[42rem]">
              <span className="mono-label text-gold mb-3 block text-xs tracking-widest uppercase">
                ✦ Catalogue Officiel 2026
              </span>
              <h1 className="text-[clamp(1.8rem,3.2vw,2.4rem)] font-bold">
                {resultats.length} programme{resultats.length > 1 ? "s" : ""}, {specs.length}{" "}
                spécialisations.
              </h1>
              <p className="text-ivory-dim/90 mt-3 text-[0.94rem] leading-relaxed">
                Formations exécutives certifiantes et masterclasses pour cadres dirigeants.
                Modalités adaptées aux professionnels en poste au Maroc, en Côte d&apos;Ivoire, au
                Sénégal et en classe virtuelle.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link
                  href="/contact"
                  className="shimmer-gold from-gold-bright via-gold to-gold-bright text-ink rounded-clixa border-gold inline-flex items-center gap-2 border bg-gradient-to-r px-5 py-2.5 font-mono text-xs font-medium tracking-wider uppercase shadow-md transition-all hover:shadow-[0_0_18px_rgba(201,162,76,0.4)]"
                >
                  <span>Être conseillé sur un parcours</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            <div className="mt-6 shrink-0 lg:mt-0 lg:max-w-[280px]">
              <div className="border-gold/40 rounded-clixa group bg-ink relative aspect-[4/3] w-full overflow-hidden border shadow-xl">
                <Image
                  src="/images/marketing/catalogue-executive-clixa.jpg"
                  alt="Brochure Officielle CLIXA"
                  width={1200}
                  height={896}
                  sizes="(min-width: 1024px) 280px, 100vw"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
          </div>

          {/* ── Filtres ── */}
          <div className="glass-panel rounded-clixa mb-8 p-6.5">
            {/* Formulaire GET : la recherche fonctionne sans JavaScript */}
            <form
              action="/formations"
              method="get"
              className="border-line/60 flex flex-wrap gap-3 border-b pb-5"
            >
              {params.specialisation && (
                <input type="hidden" name="specialisation" value={params.specialisation} />
              )}
              {params.mode && <input type="hidden" name="mode" value={params.mode} />}
              {params.ville && <input type="hidden" name="ville" value={params.ville} />}

              <label htmlFor="q" className="sr-only">
                Rechercher une formation
              </label>
              <div className="relative min-h-11 flex-1">
                <span className="text-ivory-dim/60 pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm">
                  🔍
                </span>
                <input
                  id="q"
                  name="q"
                  type="search"
                  defaultValue={params.q ?? ""}
                  placeholder="Rechercher — votre métier, une compétence, un parcours…"
                  className="border-line bg-ink/70 rounded-clixa text-ivory placeholder:text-ivory-dim/50 focus:border-gold focus:ring-gold min-h-11 w-full border pr-4 pl-11 text-[0.9rem] transition-all focus:ring-1"
                />
              </div>
              <button
                type="submit"
                className="shimmer-gold from-gold-bright via-gold to-gold-bright text-ink rounded-clixa border-gold hover:shadow-gold/20 min-h-11 cursor-pointer border bg-gradient-to-r px-6 text-[0.85rem] font-bold shadow-md transition-all"
              >
                Rechercher
              </button>
            </form>

            {metiers.length > 0 && (
              <div className="mt-4 flex items-center gap-x-3 gap-y-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                <span className="mono-label text-gold shrink-0 text-[0.62rem] tracking-wider">
                  Vous êtes
                </span>
                {metiers.map((m) => (
                  <Link
                    key={m}
                    href={`/formations?q=${encodeURIComponent(m)}` as Route}
                    className="border-line bg-ink/40 text-ivory-dim hover:border-gold hover:text-ivory rounded-clixa shrink-0 border px-2.5 py-1 text-[0.76rem] whitespace-nowrap transition-colors"
                  >
                    {m}
                  </Link>
                ))}
              </div>
            )}

            <div
              data-rubrique="specialisation"
              className="border-line/60 flex flex-wrap items-baseline gap-3.5 border-b py-3.5"
            >
              <span className="mono-label text-ivory-dim w-full text-[0.65rem] sm:w-[120px]">
                Spécialisation
              </span>
              <div className="flex flex-wrap gap-2">
                <Link href={lien("specialisation")} className={chip(!params.specialisation)}>
                  Toutes
                </Link>
                {specs.map((s) => (
                  <Link
                    key={s.slug}
                    href={lien("specialisation", s.slug)}
                    className={chip(actif("specialisation", s.slug))}
                  >
                    {s.nom}
                  </Link>
                ))}
              </div>
            </div>

            <div
              data-rubrique="mode"
              className={`flex flex-wrap items-baseline gap-3.5 py-3.5 ${
                /*
                  Le trait sépare de la rubrique suivante ; sans ville à
                  proposer, c'est ici que la liste s'arrête et le trait ne
                  séparerait plus rien.
                */
                villes.length > 0 ? "border-line/60 border-b" : "pb-0"
              }`}
            >
              <span className="mono-label text-ivory-dim w-full text-[0.65rem] sm:w-[120px]">
                Modalité
              </span>
              <div className="flex flex-wrap gap-2">
                {MODES.map((m) => (
                  <Link key={m} href={lien("mode", m)} className={chip(actif("mode", m))}>
                    {libelleMode[m]}
                  </Link>
                ))}
              </div>
            </div>

            {/*
              ⚠️ Une rubrique sans choix ne s'affiche pas.

              « Ville » se rendait toujours : un intitulé, puis un cadre vide.
              Les douze parcours se donnent tous à distance, donc la liste est
              vide et le restera jusqu'à la première session en présentiel — le
              visiteur lisait un filtre qui ne filtre rien, ce qui se lit comme
              une page à moitié chargée.

              On ne retire pas la rubrique du code : la direction prévoit
              d'ouvrir des sessions en présentiel, et le jour où une ville
              existera, elle reparaîtra d'elle-même.
            */}
            {villes.length > 0 && (
              <div data-rubrique="ville" className="flex flex-wrap items-baseline gap-3.5 pt-3.5">
                <span className="mono-label text-ivory-dim w-full text-[0.65rem] sm:w-[120px]">
                  Ville
                </span>
                <div className="flex flex-wrap gap-2">
                  {villes.map((v) => (
                    <Link key={v} href={lien("ville", v)} className={chip(actif("ville", v))}>
                      {v}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <span className="text-ivory-dim text-[0.88rem]">
              <strong className="font-display text-gold-bright text-xl font-bold">
                {resultats.length}
              </strong>{" "}
              formation{resultats.length > 1 ? "s" : ""} correspond
              {resultats.length > 1 ? "ent" : ""}
              {params.q && (
                <>
                  {" à "}
                  <span className="text-ivory font-medium">« {params.q} »</span>
                </>
              )}
            </span>
            {aDesFiltres && (
              <Link
                href="/formations"
                className="text-gold-bright hover:text-gold font-mono text-[0.82rem] underline"
              >
                Réinitialiser les filtres
              </Link>
            )}
          </div>

          {/* FE-12 — état vide */}
          {resultats.length === 0 ? (
            <div className="border-line/70 bg-panel/70 rounded-clixa border p-12 text-center backdrop-blur-sm">
              <p className="font-display text-ivory mb-3 text-xl font-semibold">
                Aucune formation ne correspond.
              </p>
              <p className="text-ivory-dim mx-auto mb-6 max-w-[46ch] text-sm leading-relaxed">
                Essayez d&apos;élargir votre recherche en retirant un filtre, ou dites-nous ce que
                vous cherchez : nous ouvrons régulièrement de nouvelles sessions.
              </p>
              <Link
                href="/formations"
                className="border-gold text-ivory hover:text-gold-bright border-b pb-1 text-sm transition-colors"
              >
                Réinitialiser les filtres
              </Link>
            </div>
          ) : (
            <>
              {/*
                Un titre pour la liste, entendu et non vu.

                Les cartes portent un h3 — juste, puisqu'ailleurs elles vivent
                sous le h2 d'une section. Ici il n'y avait rien entre elles et
                le h1 : qui parcourt la page en sautant de titre en titre, ce
                que fait un lecteur d'écran, passait du titre de page aux douze
                parcours sans savoir qu'une liste commençait.

                Il reste invisible : le h1 annonce déjà le compte, et le
                répéter à l'écran n'apprendrait rien à personne.
              */}
              <h2 className="sr-only">
                {resultats.length} parcours {resultats.length > 1 ? "correspondent" : "correspond"}{" "}
                à votre recherche
              </h2>
              <div className="carte-grid sm:grid-cols-2 lg:grid-cols-3">
                {resultats.map((p) => (
                  <ProgrammeCard key={p.slug} programme={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
