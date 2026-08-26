import Link from "next/link";

/**
 * Les pages légales (mentions, confidentialité, CGV) ne sont pas liées ici : les
 * modèles existants du site statique portent encore des champs « [à compléter] »
 * et un avertissement explicite. Elles seront intégrées quand RIS-06 sera livré
 * côté client. `typedRoutes` empêche de toute façon un lien vers une route absente.
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

export function SiteFooter() {
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

        <div className="border-line/60 mt-14 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
          <span className="text-ivory-dim/70 text-[0.78rem]">
            © {new Date().getFullYear()} CLIXA Institute — Tous droits réservés
          </span>
          <div className="text-ivory-dim flex items-center gap-2 font-mono text-[0.66rem] tracking-wider uppercase">
            <span className="bg-gold inline-block size-1.5 rounded-full" />
            <span>Agadir · Abidjan · Dakar</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
