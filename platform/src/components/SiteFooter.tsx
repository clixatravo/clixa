import Link from "next/link";
import type { Route } from "next";
import { getPages } from "@/lib/pages";
import { ReseauxSociaux } from "@/components/ReseauxSociaux";

/**
 * Les pages légales se lisent dans le CMS, elles ne sont pas écrites ici.
 *
 * Une liste tenue à la main aurait le défaut qu'on a déjà payé trois fois sur ce
 * site : elle survit à ce qu'elle décrit. Un lien vers une page dépubliée mène
 * au vide, et une page publiée que personne n'a pensé à lier reste introuvable.
 *
 * Ici, la barre du bas montre les pages publiées, et rien d'autre. Tant que la
 * direction n'en publie aucune, elle n'affiche pas de rubrique vide.
 */
const colonnes = [
  {
    titre: "Se former",
    liens: [
      { href: "/formations", label: "Toutes les formations" },
      { href: "/skillafrique", label: "SkillAfrique" },
      { href: "/campus", label: "Nos campus" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    titre: "L'institut",
    liens: [
      { href: "/a-propos", label: "À propos" },
      { href: "/entreprises", label: "Pour les entreprises" },
      { href: "/contact", label: "Être rappelé" },
    ],
  },
] as const;

export async function SiteFooter() {
  const pages = await getPages();

  return (
    <footer className="bg-ink/95 border-t border-white/[0.08]">
      <div className="mx-auto max-w-[1180px] px-8 py-16">
        <div className="flex flex-wrap justify-between gap-12">
          <div className="max-w-[34ch]">
            <Link
              href="/"
              className="font-display group flex items-center gap-2.5 text-xl font-bold"
            >
              <span className="border-gold/30 bg-panel text-gold rounded-clixa group-hover:border-gold flex size-7 items-center justify-center border font-mono text-xs font-bold transition-all">
                C
              </span>
              <span>
                CLIXA<span className="text-gold">.</span>
              </span>
            </Link>
            <p className="text-ivory-dim/80 mt-4 text-[0.86rem] leading-relaxed">
              Center of Leadership, Innovation &amp; Excellence in Africa. Accompagner les
              dirigeants et certifier les compétences clés.
            </p>
            <a
              href="mailto:contact@clixa.africa"
              className="text-gold-bright hover:text-gold mt-4 inline-flex items-center gap-1.5 py-0.5 text-[0.84rem] transition-colors"
            >
              <span>contact@clixa.africa</span>
              <span>→</span>
            </a>

            {/* Barre des 3 logos réseaux sociaux (sans texte) */}
            <div className="mt-5">
              <ReseauxSociaux taille="normal" />
            </div>
          </div>

          {colonnes.map((c) => (
            <div key={c.titre}>
              <span className="mono-label text-gold mb-4 block">{c.titre}</span>
              <ul className="flex flex-col space-y-1">
                {c.liens.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-ivory-dim hover:text-gold-bright inline-block py-1 text-[0.88rem] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/*
          ── L'identité légale, visible ──────────────────────────────────────
          C'est ce que porte le bas des factures de la société, et ce qu'un
          visiteur cherche quand il se demande à qui il confie son argent : une
          raison sociale, un registre, un identifiant. Les mentions légales le
          diront aussi — elles attendent trois informations que seule la
          direction possède — mais rien n'oblige à faire attendre celles-ci.

          En chasse fixe et en petit : on ne les lit pas, on vérifie qu'elles
          sont là.
        */}
        <p className="border-line/60 text-ivory-dim/60 mt-14 border-t pt-6 font-mono text-[0.7rem] tracking-wide">
          CLIXA SARLAU — RC Agadir 67759 — ICE 003917718000017 — IF 71921918
          <span className="mx-2 opacity-40">·</span>
          N° 1525, Bureau n° 5, Hay Essalam, Agadir, Maroc
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-ivory-dim/70 text-[0.78rem]">
              © {new Date().getFullYear()} CLIXA Institute — Tous droits réservés
            </span>
            {pages.map((p) => (
              <Link
                key={p.slug}
                href={`/${p.slug}` as Route}
                className="text-ivory-dim/70 hover:text-ivory text-[0.78rem] transition-colors"
              >
                {p.titre}
              </Link>
            ))}
          </div>
          <div className="text-ivory-dim flex items-center gap-2 font-mono text-[0.66rem] tracking-wider uppercase">
            <span className="bg-gold inline-block size-1.5 rounded-full" />
            <span>Agadir · Abidjan · Dakar</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
