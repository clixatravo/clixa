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
    <header className="bg-ink/80 sticky top-0 z-50 border-b border-white/[0.08] backdrop-blur-xl transition-colors">
      {/* relative implicite via sticky : le panneau du menu mobile s'y ancre. */}
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex max-w-[1180px] items-center justify-between gap-5 px-8 py-4.5"
      >
        <Link
          href="/"
          className="font-display group flex min-h-11 items-center gap-2.5 text-xl font-bold tracking-tight"
        >
          <span className="border-gold/30 bg-panel text-gold rounded-clixa group-hover:border-gold flex size-7 items-center justify-center border font-mono text-xs font-bold transition-all group-hover:shadow-[0_0_12px_rgba(201,162,76,0.3)]">
            C
          </span>
          <span>
            CLIXA<span className="text-gold">.</span>
          </span>
        </Link>

        <NavDesktop liens={liens} />

        <div className="flex items-center gap-4">
          {/*
            Sélecteur de langue : l'interface existe, le routage par langue
            arrive avec SOC-02 / BE-06 quand le CMS multilingue est en place.
          */}
          <span className="mono-label text-ivory-dim/80 border-line hidden border-r pr-4 sm:inline">
            FR
          </span>
          {/*
            Un seul lien, et il ne dépend pas de la session : lire le cookie ici
            rendrait tout le site dynamique et ferait perdre la pré-génération de
            chaque page. C'est /compte qui tranche — il renvoie vers la connexion
            quand personne n'est identifié.
          */}
          <Link
            href="/compte"
            className="border-line-strong bg-panel/70 text-ivory hover:border-gold hover:bg-panel-2 rounded-clixa group hidden min-h-11 items-center gap-2 border px-4 text-[0.82rem] tracking-wide transition-all sm:inline-flex"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="text-gold size-3.5 shrink-0 transition-transform group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            >
              <circle cx="8" cy="5" r="2.6" />
              <path d="M2.6 14c0-2.6 2.4-4.2 5.4-4.2s5.4 1.6 5.4 4.2" strokeLinecap="round" />
            </svg>
            Mon espace
          </Link>
          <Link
            href="/contact"
            className="border-gold/60 bg-gold/10 text-gold-bright hover:bg-gold hover:text-ink rounded-clixa hidden min-h-11 items-center border px-5 text-[0.82rem] font-semibold tracking-wide shadow-[0_0_14px_-2px_rgba(201,162,76,0.15)] transition-all hover:shadow-[0_0_20px_rgba(201,162,76,0.4)] md:inline-flex"
          >
            Nous contacter
          </Link>
          <MobileMenu liens={liens} />
        </div>
      </nav>
    </header>
  );
}
