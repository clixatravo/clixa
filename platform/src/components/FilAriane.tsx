import type { Route } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { jsonLdFilAriane } from "@/lib/seo";

export interface Miette {
  href?: Route;
  label: string;
}

/**
 * FE-14 — Fil d'Ariane.
 *
 * Centralisé ici plutôt que recopié dans chaque page : le balisage sémantique
 * (nav + aria-current) et la hauteur de cible tactile se corrigent en un endroit.
 *
 * ── Un bouton de retour, puis la trace ──────────────────────────────────────
 * Le fil était une ligne de texte en capitales, sans relief : rien n'indiquait
 * qu'on pouvait cliquer, et la seule action utile — revenir — se confondait avec
 * le reste. L'étape précédente devient donc un bouton, avec sa flèche et son
 * contour ; le reste du chemin la suit, en retrait.
 *
 * Le fil complet est conservé, et pas seulement pour la forme : c'est lui qui
 * alimente le BreadcrumbList lu par Google. Un bouton seul l'aurait supprimé.
 */
export function FilAriane({ items }: { items: Miette[] }) {
  // L'étape précédente : celle vers laquelle « revenir » a un sens.
  const retour = [...items].reverse().find((m) => m.href);

  return (
    <nav
      aria-label="Fil d'Ariane"
      className="border-line text-ivory-dim border-b px-8 py-3.5 text-[0.78rem]"
    >
      {/* INT-04 — le BreadcrumbList suit automatiquement le fil affiché,
          donc les deux ne peuvent pas diverger. */}
      <JsonLd data={jsonLdFilAriane(items)} />

      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-2">
        {retour && (
          <Link
            href={retour.href!}
            className="border-line-strong bg-panel rounded-clixa text-ivory hover:border-gold hover:bg-panel-2 group inline-flex min-h-9 items-center gap-2 border px-3.5 font-medium transition-colors"
          >
            <span
              aria-hidden="true"
              className="text-gold transition-transform duration-200 group-hover:-translate-x-0.5"
            >
              ←
            </span>
            <span className="max-w-[24ch] truncate">{retour.label}</span>
          </Link>
        )}

        {/*
          Sur mobile, la trace complète occupait trois lignes avant même le titre.
          Elle reste dans le document pour les lecteurs d'écran, et ne réapparaît
          à l'œil qu'à partir de deux colonnes — le bouton suffit à situer.
        */}
        <ol className="mono-label text-ivory-dim/70 sr-only gap-x-2.5 text-[0.64rem] sm:not-sr-only sm:flex sm:flex-wrap sm:items-center">
          {items.map((m, i) => {
            const dernier = i === items.length - 1;
            return (
              <li key={m.label} className="flex items-center gap-2.5">
                {m.href && !dernier ? (
                  <Link href={m.href} className="hover:text-ivory flex min-h-8 items-center">
                    {m.label}
                  </Link>
                ) : (
                  <span
                    aria-current={dernier ? "page" : undefined}
                    className="text-ivory flex min-h-8 items-center"
                  >
                    {m.label}
                  </span>
                )}
                {!dernier && (
                  <span className="text-gold/60" aria-hidden="true">
                    /
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
