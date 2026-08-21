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
    <footer className="border-line border-t">
      <div className="mx-auto max-w-[1180px] px-8 py-14">
        <div className="flex flex-wrap justify-between gap-12">
          <div className="max-w-[30ch]">
            <Link href="/" className="font-display text-xl font-bold">
              CLIXA<span className="text-gold">.</span>
            </Link>
            <p className="text-ivory-dim mt-4 text-[0.86rem]">
              Center of Leadership, Innovation &amp; Excellence in Africa.
            </p>
            {/*
              Le soulignement doré reste collé au texte, mais la zone cliquable
              déborde : sans le `py-0.5`, le lien ne fait que 23 px de haut.
            */}
            <a
              href="mailto:contact@clixa-institute.org"
              className="text-ivory mt-4 inline-block py-0.5 text-[0.86rem]"
            >
              <span className="border-gold border-b">contact@clixa-institute.org</span>
            </a>
          </div>

          {colonnes.map((c) => (
            <div key={c.titre}>
              <span className="mono-label text-gold mb-4 block">{c.titre}</span>
              {/*
                Le lien porte lui-même sa hauteur de cible : à 0,88 rem, le texte
                seul ne fait que 19 px, sous les 24 px exigés au doigt (WCAG 2.5.8).
                Le `py-1` la porte à 27 px, et l'écart de la liste est réduit
                d'autant pour que le rythme visuel ne bouge pas : le pas passe de
                29 px à 31 px, l'écart de liste étant absorbé par le remplissage.
              */}
              <ul className="flex flex-col">
                {c.liens.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-ivory-dim hover:text-ivory inline-block py-1 text-[0.88rem]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-line mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
          <span className="text-ivory-dim text-[0.78rem]">
            © {new Date().getFullYear()} CLIXA Institute — Tous droits réservés
          </span>
          <span className="mono-label text-ivory-dim">Agadir · Abidjan · Dakar</span>
        </div>
      </div>
    </footer>
  );
}
