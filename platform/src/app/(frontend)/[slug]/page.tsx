import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { BlocRendu } from "@/components/BlocRendu";
import { getPage, getPages } from "@/lib/pages";

/**
 * Les pages libres du CMS, à la racine du site.
 *
 * ── Pourquoi à la racine ────────────────────────────────────────────────────
 * `/mentions-legales` se cite dans un pied de page, dans un courriel, dans un
 * contrat. `/pages/mentions-legales` porte un détail d'implémentation que le
 * lecteur n'a pas à connaître.
 *
 * ── Ce que cela impose ──────────────────────────────────────────────────────
 * Cette route attrape tout ce qui n'a pas trouvé preneur ailleurs. Next donne
 * la priorité aux routes concrètes — `/formations`, `/contact` — donc aucune
 * page existante n'est masquée ; mais un slug de CMS qui reprendrait l'un de ces
 * noms resterait invisible, éclipsé par la vraie page. Cela ne casse rien : la
 * page existe, elle n'est simplement pas atteignable, et le CMS ne peut pas le
 * deviner.
 */

const JOUR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

export async function generateStaticParams() {
  return (await getPages()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const page = await getPage((await params).slug);
  return page ? { title: page.titre } : {};
}

export default async function PageLibre({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getPage((await params).slug);
  if (!page) notFound();

  return (
    <>
      <FilAriane items={[{ label: "Accueil", href: "/" }, { label: page.titre }]} />

      <section className="px-8 py-13">
        {/*
          Une mesure de lecture, pas la largeur du catalogue : ces pages sont
          faites de texte suivi, et une ligne trop longue s'y perd.
        */}
        <div className="mx-auto max-w-[70ch]">
          <h1 className="mb-3 text-[clamp(1.5rem,2.8vw,2.1rem)]">{page.titre}</h1>

          {page.miseAJour && (
            <p className="text-ivory-dim mb-9 font-mono text-[0.78rem]">
              Mise à jour le {JOUR.format(new Date(page.miseAJour))}
            </p>
          )}

          <div className="flex flex-col gap-6">
            {page.contenu.map((bloc, i) => (
              <BlocRendu key={i} bloc={bloc} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
