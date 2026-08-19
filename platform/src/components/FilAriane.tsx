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
 */
export function FilAriane({ items }: { items: Miette[] }) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className="border-line mono-label text-ivory-dim border-b px-8 py-3"
    >
      {/* INT-04 — le BreadcrumbList suit automatiquement le fil affiché,
          donc les deux ne peuvent pas diverger. */}
      <JsonLd data={jsonLdFilAriane(items)} />
      <ol className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-2.5">
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
                <span className="text-gold" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
