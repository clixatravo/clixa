import type { Metadata, Route } from "next";
import { BlocRendu } from "@/components/BlocRendu";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { JsonLd } from "@/components/JsonLd";
import { jsonLdArticle } from "@/lib/seo";
import {
  formatDateArticle,
  getArticle,
  getArticles,
  getArticlesLies,
  nomCategorie,
} from "@/lib/blog";
import { getProgramme } from "@/lib/catalogue";
import { Button } from "@/components/ui/Button";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await getArticles()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) return {};
  const url = `/blog/${a.slug}`;
  return {
    title: a.titre,
    description: a.chapo,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: a.titre,
      description: a.chapo,
      publishedTime: a.publieLe,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const lies = await getArticlesLies(article.slug);
  const programme = article.programmeLie ? await getProgramme(article.programmeLie) : undefined;

  return (
    <>
      <JsonLd data={jsonLdArticle(article)} />

      <FilAriane
        items={[
          { href: "/", label: "Accueil" },
          { href: "/blog" as Route, label: "Blog" },
          {
            href: `/blog?categorie=${article.categorie}` as Route,
            label: nomCategorie(article.categorie),
          },
        ]}
      />

      <article className="px-8 py-14">
        <div className="mx-auto max-w-[720px]">
          <div className="eyebrow mono-label mb-5">{nomCategorie(article.categorie)}</div>

          <h1 className="mb-5 text-[clamp(1.9rem,4vw,2.9rem)]">{article.titre}</h1>

          <p className="text-ivory-dim mb-7 text-[1.06rem]">{article.chapo}</p>

          <div className="border-line text-ivory-dim mb-12 flex flex-wrap items-center gap-4 border-y py-4 text-[0.8rem]">
            <span className="text-ivory">{article.auteur}</span>
            <span className="text-gold">·</span>
            <time dateTime={article.publieLe}>{formatDateArticle(article.publieLe)}</time>
            <span className="text-gold">·</span>
            <span>{article.lectureMinutes} min de lecture</span>
          </div>

          <div className="flex flex-col gap-6">
            {article.contenu.map((bloc, i) => (
              <BlocRendu key={i} bloc={bloc} />
            ))}
          </div>

          {/* Programme lié — la conversion recherchée en bas d'article */}
          {programme && (
            <aside className="border-gold bg-panel mt-14 border p-8">
              <span className="mono-label text-gold mb-3 block">Formation associée</span>
              <h2 className="mb-3 text-[1.3rem]">{programme.titre}</h2>
              <p className="text-ivory-dim mb-6 text-[0.92rem]">{programme.accroche}</p>
              <Button href={`/formations/${programme.slug}` as Route}>Voir le programme</Button>
            </aside>
          )}
        </div>
      </article>

      {lies.length > 0 && (
        <section className="border-line border-t px-8 py-14">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-8">
              <span className="mono-label text-gold mb-3 block">À lire ensuite</span>
              <h2 className="text-[clamp(1.4rem,2.6vw,1.9rem)]">D&apos;autres articles.</h2>
            </div>
            <div className="carte-grid sm:grid-cols-2 lg:grid-cols-3">
              {lies.map((a) => (
                <Link
                  key={a.slug}
                  href={`/blog/${a.slug}`}
                  className="bg-panel hover:bg-panel-2 flex min-h-[190px] flex-col gap-3 p-6 transition-colors"
                >
                  <span className="text-emerald-bright font-mono text-[0.6rem] tracking-[0.12em] uppercase">
                    {nomCategorie(a.categorie)}
                  </span>
                  <h3 className="font-display text-[1.05rem] leading-tight">{a.titre}</h3>
                  <span className="border-line text-ivory-dim mt-auto border-t pt-3 text-[0.74rem]">
                    {formatDateArticle(a.publieLe)} · {a.lectureMinutes} min
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
