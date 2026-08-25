import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilAriane } from "@/components/FilAriane";
import {
  formatDateArticle,
  getArticles,
  getArticlesParCategorie,
  getCategories,
  getCategorie,
  nomCategorie,
} from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Analyses et repères sur les certifications professionnelles, la finance, le management et la carrière en Afrique.",
  alternates: { canonical: "/blog" },
};

interface Props {
  searchParams: Promise<{ categorie?: string }>;
}

export default async function Blog({ searchParams }: Props) {
  const { categorie } = await searchParams;
  const cats = getCategories();
  const catActive = categorie ? getCategorie(categorie) : undefined;

  const liste = catActive ? await getArticlesParCategorie(catActive.slug) : await getArticles();
  const [une, ...suite] = liste;

  const chip = (actif: boolean) =>
    `rounded-clixa border px-4 py-1.5 text-[0.78rem] transition-colors ${
      actif
        ? "bg-gold border-gold text-ink font-bold"
        : "border-line text-ivory-dim hover:border-gold hover:text-ivory"
    }`;

  return (
    <>
      <FilAriane
        items={[
          { href: "/", label: "Accueil" },
          { href: "/blog" as Route, label: "Blog" },
          ...(catActive ? [{ label: catActive.nom }] : []),
        ]}
      />

      <section className="px-8 py-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9">
            <span className="mono-label text-gold mb-3 block">Analyses &amp; Perspectives</span>
            <h1 className="max-w-[24ch] text-[clamp(1.8rem,3.4vw,2.6rem)] font-bold">
              {catActive ? catActive.nom : "Repères pour décider de votre parcours."}
            </h1>
          </div>

          {/* Filtres par catégorie */}
          <div className="mb-10 flex flex-wrap gap-2">
            <Link href={"/blog" as Route} className={chip(!catActive)}>
              Tous les articles
            </Link>
            {cats.map((c) => (
              <Link
                key={c.slug}
                href={`/blog?categorie=${c.slug}` as Route}
                className={chip(catActive?.slug === c.slug)}
              >
                {c.nom}
              </Link>
            ))}
          </div>

          {liste.length === 0 ? (
            <div className="border-line/70 bg-panel/70 rounded-clixa border p-12 text-center backdrop-blur-sm">
              <p className="font-display text-ivory mb-3 text-xl font-semibold">
                Aucun article dans cette catégorie.
              </p>
              <Link
                href={"/blog" as Route}
                className="border-gold text-ivory hover:text-gold-bright border-b pb-1 text-sm transition-colors"
              >
                Voir tous les articles
              </Link>
            </div>
          ) : (
            <>
              {/* Article à la une */}
              {une && (
                <Link
                  href={`/blog/${une.slug}`}
                  className="executive-card group rounded-clixa mb-8 block p-8 shadow-xl transition-all sm:p-12"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-4">
                    <span className="text-emerald-bright font-mono text-[0.62rem] font-semibold tracking-[0.14em] uppercase">
                      ✦ {nomCategorie(une.categorie)}
                    </span>
                    <span className="text-ivory-dim font-mono text-[0.74rem]">
                      {formatDateArticle(une.publieLe)} · {une.lectureMinutes} min de lecture
                    </span>
                  </div>
                  <h2 className="font-display text-ivory group-hover:text-gold-bright mb-4 max-w-[24ch] text-[clamp(1.6rem,3.2vw,2.4rem)] leading-tight font-bold transition-colors">
                    {une.titre}
                  </h2>
                  <p className="text-ivory-dim/90 max-w-[62ch] text-[1.02rem] leading-relaxed">
                    {une.chapo}
                  </p>
                  <span className="text-gold-bright group-hover:text-gold mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors">
                    Lire l&apos;article complet <span>→</span>
                  </span>
                </Link>
              )}

              {/* Les suivants */}
              {suite.length > 0 && (
                <div className="carte-grid sm:grid-cols-2 lg:grid-cols-3">
                  {suite.map((a) => (
                    <Link
                      key={a.slug}
                      href={`/blog/${a.slug}`}
                      className="executive-card group rounded-clixa flex min-h-[230px] flex-col justify-between gap-3 p-6.5 transition-all"
                    >
                      <div className="space-y-2.5">
                        <span className="text-emerald-bright font-mono text-[0.6rem] tracking-[0.12em] uppercase">
                          {nomCategorie(a.categorie)}
                        </span>
                        <h3 className="font-display text-ivory group-hover:text-gold-bright text-[1.12rem] leading-snug font-semibold transition-colors">
                          {a.titre}
                        </h3>
                        <p className="text-ivory-dim/85 line-clamp-3 text-[0.86rem] leading-relaxed">
                          {a.chapo}
                        </p>
                      </div>
                      <span className="border-line/60 text-ivory-dim/70 mt-auto border-t pt-3.5 font-mono text-[0.72rem]">
                        {formatDateArticle(a.publieLe)} · {a.lectureMinutes} min
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
