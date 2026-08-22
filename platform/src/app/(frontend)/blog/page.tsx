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
            <span className="mono-label text-gold mb-3 block">Blog</span>
            <h1 className="max-w-[24ch] text-[clamp(1.8rem,3.4vw,2.6rem)]">
              {catActive ? catActive.nom : "Repères pour décider de votre parcours."}
            </h1>
          </div>

          {/* Filtres par catégorie, portés par l'URL comme sur le catalogue */}
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
            <div className="border-line bg-panel border p-12 text-center">
              <p className="font-display mb-3 text-xl">Aucun article dans cette catégorie.</p>
              <Link
                href={"/blog" as Route}
                className="border-gold text-ivory border-b pb-1 text-sm"
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
                  className="bg-panel hover:bg-panel-2 border-line mb-px block border p-8 transition-colors sm:p-12"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-4">
                    <span className="text-emerald-bright font-mono text-[0.6rem] tracking-[0.12em] uppercase">
                      {nomCategorie(une.categorie)}
                    </span>
                    <span className="text-ivory-dim text-[0.75rem]">
                      {formatDateArticle(une.publieLe)} · {une.lectureMinutes} min
                    </span>
                  </div>
                  <h2 className="mb-4 max-w-[22ch] text-[clamp(1.5rem,3vw,2.2rem)]">{une.titre}</h2>
                  <p className="text-ivory-dim max-w-[62ch] text-[0.98rem]">{une.chapo}</p>
                  <span className="text-gold-bright mt-6 inline-block text-sm">
                    Lire l&apos;article →
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
                      className="bg-panel hover:bg-panel-2 flex min-h-[220px] flex-col gap-3 p-6 transition-colors"
                    >
                      <span className="text-emerald-bright font-mono text-[0.6rem] tracking-[0.12em] uppercase">
                        {nomCategorie(a.categorie)}
                      </span>
                      <h3 className="font-display text-[1.08rem] leading-tight">{a.titre}</h3>
                      <p className="text-ivory-dim line-clamp-3 text-[0.86rem]">{a.chapo}</p>
                      <span className="border-line text-ivory-dim mt-auto border-t pt-3 text-[0.74rem]">
                        {formatDateArticle(a.publieLe)} · {a.lectureMinutes} min de lecture
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
