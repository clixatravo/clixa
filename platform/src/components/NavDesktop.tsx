"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navigation principale sur écran large.
 *
 * Les liens étaient en gris atténué et en petit corps : ils se lisaient comme du
 * texte, pas comme une navigation cliquable. Ils sont désormais en pleine
 * couleur, avec un soulignement or qui apparaît au survol et reste affiché sur
 * la rubrique courante — le visiteur voit à la fois où cliquer et où il est.
 */
export function NavDesktop({ liens }: { liens: readonly { href: Route; label: string }[] }) {
  const pathname = usePathname();

  return (
    <div className="hidden items-center gap-1 md:flex">
      {liens.map((l) => {
        const actif = pathname === l.href || pathname.startsWith(`${l.href}/`);

        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={actif ? "page" : undefined}
            className={`group relative flex min-h-11 items-center px-3 text-[0.9rem] transition-colors ${
              actif ? "text-ivory" : "text-ivory-dim hover:text-ivory"
            }`}
          >
            {l.label}
            <span
              aria-hidden="true"
              className={`bg-gold absolute bottom-2 left-3 h-px transition-all duration-300 ${
                actif
                  ? "right-3 opacity-100"
                  : "right-[calc(100%-0.75rem)] opacity-0 group-hover:right-3 group-hover:opacity-100"
              }`}
            />
          </Link>
        );
      })}
    </div>
  );
}
