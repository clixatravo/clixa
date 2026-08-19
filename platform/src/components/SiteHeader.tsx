import type { Route } from "next";
import Link from "next/link";
import { MobileMenu } from "@/components/MobileMenu";
import { NavDesktop } from "@/components/NavDesktop";

/**
 * FE-02 — Gabarit global.
 *
 * La navigation ne liste que les routes réellement construites. `typedRoutes` est
 * activé dans next.config.ts, donc un lien vers une route inexistante casse le
 * build plutôt que de livrer un 404 en production.
 */
const liens = [
  { href: "/formations", label: "Formations" },
  { href: "/skillafrique", label: "SkillAfrique" },
  { href: "/a-propos", label: "À propos" },
  { href: "/entreprises", label: "Entreprises" },
  { href: "/campus", label: "Campus" },
  { href: "/blog", label: "Blog" },
] as const satisfies readonly { href: Route; label: string }[];

export function SiteHeader() {
  return (
    <header className="border-line bg-ink/85 sticky top-0 z-50 border-b backdrop-blur-md">
      {/* relative implicite via sticky : le panneau du menu mobile s'y ancre. */}
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex max-w-[1180px] items-center justify-between gap-5 px-8 py-5"
      >
        <Link href="/" className="font-display flex min-h-11 items-center text-xl font-bold">
          CLIXA<span className="text-gold">.</span>
        </Link>

        <NavDesktop liens={liens} />

        <div className="flex items-center gap-4">
          {/* Sélecteur de langue : l'interface existe, le routage par langue arrive
              avec SOC-02 / BE-06 quand le CMS multilingue est en place. */}
          <span className="mono-label text-ivory-dim hidden sm:inline">FR</span>
          <Link
            href="/contact"
            className="border-gold text-ivory hover:bg-gold hover:text-ink rounded-clixa hidden min-h-11 items-center border px-5 text-[0.82rem] tracking-wide transition-colors md:inline-flex"
          >
            Nous contacter
          </Link>
          <MobileMenu liens={liens} />
        </div>
      </nav>
    </header>
  );
}
