import type { Metadata, Route } from "next";
import Link from "next/link";
import { ProgrammeCard } from "@/components/ProgrammeCard";
import { FilAriane } from "@/components/FilAriane";
import type { ModeDiffusion } from "@/lib/types";
import {
  filtrerProgrammes,
  getSpecialisations,
  libelleMode,
  villesDisponibles,
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
          <div className="mb-9">
            <span className="mono-label text-gold mb-3 block">Catalogue</span>
            <h1 className="text-[clamp(1.5rem,2.8vw,2.1rem)]">
              {resultats.length} programme{resultats.length > 1 ? "s" : ""}, {specs.length}{" "}
              spécialisations.
            </h1>
          </div>

          {/* ── Filtres ── */}
          <div className="border-line bg-panel mb-7 border p-6">
            {/* Formulaire GET : la recherche fonctionne sans JavaScript et reste
                dans l'URL, comme les autres filtres. Les champs cachés évitent
                de perdre les filtres actifs à la soumission. */}
            <form
              action="/formations"
              method="get"
              className="border-line flex flex-wrap gap-3 border-b pb-5"
            >
              {params.specialisation && (
                <input type="hidden" name="specialisation" value={params.specialisation} />
              )}
              {params.mode && <input type="hidden" name="mode" value={params.mode} />}
              {params.ville && <input type="hidden" name="ville" value={params.ville} />}

              <label htmlFor="q" className="sr-only">
                Rechercher une formation
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={params.q ?? ""}
                placeholder="Rechercher — PMP, IFRS, contrôle de gestion…"
                className="border-line bg-ink rounded-clixa text-ivory focus:border-gold min-h-11 flex-1 border px-4 text-[0.9rem]"
              />
              <button
                type="submit"
                className="bg-gold text-ink rounded-clixa border-gold min-h-11 border px-6 text-[0.85rem] font-bold"
              >
                Rechercher
              </button>
            </form>

            <div className="border-line flex flex-wrap items-baseline gap-3.5 border-b py-3">
              <span className="mono-label text-ivory-dim w-full sm:w-[120px]">Spécialisation</span>
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

            <div className="border-line flex flex-wrap items-baseline gap-3.5 border-b py-3">
              <span className="mono-label text-ivory-dim w-full sm:w-[120px]">Modalité</span>
              <div className="flex flex-wrap gap-2">
                {MODES.map((m) => (
                  <Link key={m} href={lien("mode", m)} className={chip(actif("mode", m))}>
                    {libelleMode[m]}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-3.5 py-3">
              <span className="mono-label text-ivory-dim w-full sm:w-[120px]">Ville</span>
              <div className="flex flex-wrap gap-2">
                {villes.map((v) => (
                  <Link key={v} href={lien("ville", v)} className={chip(actif("ville", v))}>
                    {v}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <span className="text-ivory-dim text-[0.86rem]">
              <strong className="font-display text-gold-bright text-xl">{resultats.length}</strong>{" "}
              formation{resultats.length > 1 ? "s" : ""} correspond
              {resultats.length > 1 ? "ent" : ""}
              {params.q && (
                <>
                  {" à "}
                  <span className="text-ivory">« {params.q} »</span>
                </>
              )}
            </span>
            {aDesFiltres && (
              <Link href="/formations" className="text-ivory-dim hover:text-gold text-[0.82rem]">
                Réinitialiser les filtres
              </Link>
            )}
          </div>

          {/* FE-12 — état vide */}
          {resultats.length === 0 ? (
            <div className="border-line bg-panel border p-12 text-center">
              <p className="font-display mb-3 text-xl">Aucune formation ne correspond.</p>
              <p className="text-ivory-dim mx-auto mb-6 max-w-[46ch] text-sm">
                Essayez d&apos;élargir votre recherche en retirant un filtre, ou dites-nous ce que
                vous cherchez : nous ouvrons régulièrement de nouvelles sessions.
              </p>
              <Link href="/formations" className="border-gold text-ivory border-b pb-1 text-sm">
                Réinitialiser les filtres
              </Link>
            </div>
          ) : (
            <div className="hairline-grid sm:grid-cols-2 lg:grid-cols-3">
              {resultats.map((p) => (
                <ProgrammeCard key={p.slug} programme={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
