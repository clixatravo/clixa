import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { getExtrait, getExtraits } from "@/lib/extraits";

/**
 * Un extrait de séance, à l'adresse qu'on partage.
 *
 * ── Pourquoi une page et pas le fichier ─────────────────────────────────────
 * Demandé par la direction le 15 septembre 2026 : une vidéo à envoyer « dans un
 * mail ou un whatsapp », juste un lien. Le lien brut vers le magasin était le
 * chemin court — et c'est celui qu'il ne fallait pas prendre :
 *
 * - son adresse ressemble à `xk3f9.public.blob.vercel-storage.com/…`, soit
 *   exactement l'allure de ce que tout le tunnel apprend au client à refuser ;
 * - WhatsApp n'en tire **aucun aperçu** : ni titre, ni vignette, juste une
 *   adresse nue, ce qui se lit comme un lien douteux ;
 * - et il est définitif. Ici, le titre, l'accroche et même le fichier se
 *   changent après coup sans toucher au lien déjà envoyé.
 *
 * ── `noindex`, et c'est délibéré ────────────────────────────────────────────
 * L'adresse est publique — qui l'a peut regarder, c'est tout l'objet. Mais une
 * page par extrait de cours n'a pas à peupler les résultats de recherche : ce
 * sont des pièces de démarchage, pas des pages de la vitrine. Ce que le site
 * montre de lui-même vit sur `/temoignages`, qui est indexée, elle.
 */

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getExtraits()).map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const extrait = await getExtrait((await params).slug);
  if (!extrait) return {};

  const url = `/v/${extrait.slug}`;
  /*
    ⚠️ L'affiche est ce qui décide de l'aperçu dans la conversation. Sans elle,
    Next retomberait sur l'image de partage générique du site — la même pour
    toutes les pages — et deux extraits envoyés au même prospect seraient
    indiscernables dans son fil.
  */
  const images = extrait.affiche
    ? [
        {
          url: extrait.affiche,
          ...(extrait.afficheLargeur ? { width: extrait.afficheLargeur } : {}),
          ...(extrait.afficheHauteur ? { height: extrait.afficheHauteur } : {}),
          alt: extrait.titre,
        },
      ]
    : undefined;

  return {
    title: extrait.titre,
    ...(extrait.accroche ? { description: extrait.accroche } : {}),
    alternates: { canonical: url },
    robots: { index: false, follow: false },
    openGraph: {
      type: "video.other",
      url,
      title: extrait.titre,
      ...(extrait.accroche ? { description: extrait.accroche } : {}),
      ...(images ? { images } : {}),
      videos: [{ url: extrait.video, ...(extrait.type ? { type: extrait.type } : {}) }],
    },
    twitter: {
      card: "summary_large_image",
      title: extrait.titre,
      ...(extrait.accroche ? { description: extrait.accroche } : {}),
      ...(images ? { images: [extrait.affiche as string] } : {}),
    },
  };
}

export default async function PageExtrait({ params }: Props) {
  const extrait = await getExtrait((await params).slug);
  if (!extrait) notFound();

  return (
    <>
      <FilAriane items={[{ label: "Accueil", href: "/" }, { label: extrait.titre }]} />

      <main className="mx-auto max-w-[900px] px-6 py-12 sm:py-16">
        <p className="text-gold-bright font-mono text-[0.7rem] tracking-[0.18em] uppercase">
          Extrait de séance
        </p>
        <h1 className="font-display text-ivory mt-3 text-2xl leading-tight font-semibold sm:text-3xl">
          {extrait.titre}
        </h1>

        {/*
          ⚠️ `preload="metadata"` et non `auto` : la page s'ouvre souvent depuis
          WhatsApp, sur un forfait mobile. On ne tire que l'entête du fichier
          tant que personne n'a appuyé sur lecture — c'est déjà ce que fait le
          bandeau d'immersion de l'accueil, qui ne coûte que 65 Ko sur 5 Mo.

          `playsInline` : sans lui, l'iPhone ouvre la vidéo en plein écran par
          surprise, hors de la page et de sa marque.
        */}
        <div className="rounded-clixa bg-ink mt-7 overflow-hidden border border-white/[0.08]">
          <video
            controls
            playsInline
            preload="metadata"
            {...(extrait.affiche ? { poster: extrait.affiche } : {})}
            className="block h-auto w-full"
          >
            <source src={extrait.video} {...(extrait.type ? { type: extrait.type } : {})} />
            Votre navigateur ne sait pas lire cette vidéo.{" "}
            <a href={extrait.video}>Télécharger le fichier</a>.
          </video>
        </div>

        {extrait.accroche && (
          <p className="text-ivory-dim/85 mt-6 text-sm leading-relaxed">{extrait.accroche}</p>
        )}

        {extrait.programmeSlug && extrait.programmeTitre && (
          <div className="mt-10 border-t border-white/[0.08] pt-7">
            <p className="text-ivory-dim/70 text-xs">Cet extrait vient du parcours</p>
            <Link
              href={`/formations/${extrait.programmeSlug}` as Route}
              className="text-gold-bright hover:text-gold mt-2 inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <span>{extrait.programmeTitre}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
