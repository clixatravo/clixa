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
          {/*
            Sélecteur de langue : l'interface existe, le routage par langue
            arrive avec SOC-02 / BE-06 quand le CMS multilingue est en place.

            Il était coincé entre « Mon espace » et « Nous contacter ». Un mot
            nu entre deux boutons casse la paire qu'ils forment, et se lit comme
            une étiquette égarée plutôt que comme un réglage. Placé avant, sur
            un filet, il termine la navigation au lieu d'interrompre les
            actions — et la page finit sur son appel principal, pas sur un
            repère gris.
          */}
          <span className="mono-label text-ivory-dim border-line hidden border-r pr-4 sm:inline">
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
            className="border-line-strong bg-panel text-ivory hover:border-gold hover:bg-panel-2 rounded-clixa group hidden min-h-11 items-center gap-2 border px-4 text-[0.82rem] tracking-wide transition-colors sm:inline-flex"
          >
            {/*
              Une silhouette plutôt qu'un mot seul : à côté d'un bouton doré,
              du texte nu se lisait comme une étiquette et personne n'y voyait
              un lien. Le contour vient de la même famille que le bouton de
              retour du fil d'Ariane — c'est le second niveau d'action, sous
              « Nous contacter » qui reste l'appel principal.
            */}
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="text-gold size-3.5 shrink-0"
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
