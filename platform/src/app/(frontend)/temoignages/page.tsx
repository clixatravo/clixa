import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { Temoignages } from "@/components/Temoignages";
import { GalerieRealisations } from "@/components/GalerieRealisations";
import { TrailerImmersion } from "@/components/TrailerImmersion";
import { Button } from "@/components/ui/Button";
import { getVitrine } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "Ils l'ont fait",
  description:
    "Les retours des participants de CLIXA Institute et les séances déjà données, en vidéo.",
  alternates: { canonical: "/temoignages" },
};

/**
 * La preuve par ceux qui y sont passés.
 *
 * ── Ce que cette page répond ────────────────────────────────────────────────
 * Demandée par la direction le 13 septembre 2026 : « page dyal les commentaires
 * dyal les clients, bhal l ichhar, o that fih les formations li deja daro ». Le
 * site dit ce qu'on propose ; il ne montrait nulle part ce qu'on a **déjà
 * fait**. Un prospect venu de l'annonce Facebook lit douze programmes et n'a
 * aucune preuve qu'une seule séance ait eu lieu.
 *
 * Deux temps, dans cet ordre : ce que les participants disent, puis ce qu'on
 * voit. La parole d'abord — c'est elle qu'on lit en diagonale ; la vidéo
 * ensuite, parce qu'elle demande un clic et du réseau.
 *
 * ⚠️ **L'adresse n'existe que si elle a quelque chose à montrer.** Sans
 * témoignage ni vidéo publiés, la page répond 404 et le lien disparaît de la
 * navigation. C'est la règle de la rubrique de filtre sans choix : un intitulé
 * qui mène à une page nue se lit comme un site à moitié chargé, et cela tombe
 * sur le trafic acheté. Rien à faire le jour de la première publication — le
 * crochet `revaliderVitrine` remet la page et le plan du site à jour.
 */
export default async function PageTemoignages() {
  const { temoignages, realisations } = await getVitrine();

  if (temoignages.length === 0 && realisations.length === 0) notFound();

  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "Ils l'ont fait" }]} />

      <section className="border-line relative overflow-hidden border-b px-8 py-16 lg:py-20">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1180px]">
          <div className="eyebrow mono-label mb-5">Ils l&apos;ont fait</div>
          <h1 className="mb-5 max-w-[20ch] text-[clamp(2.2rem,4.6vw,3.4rem)] font-bold">
            Des dirigeants formés, <span className="gold-gradient-text">des séances tenues</span>.
          </h1>
          <p className="text-ivory-dim/95 max-w-[62ch] text-[1.05rem] leading-relaxed">
            {/*
              Ce que la page promet doit correspondre à ce qu'elle porte : les
              deux moitiés de la phrase se taisent quand leur section est vide.
              Une introduction qui annonce des vidéos au-dessus d'une page qui
              n'en a pas est le même défaut qu'un compteur de places inventé.
            */}
            {phraseDIntroduction(temoignages.length, realisations.length)}
          </p>
        </div>
      </section>

      <TrailerImmersion
        titre="Les séances de formation en vidéo"
        sousTitre="Extrait de masterclass en direct et retours d'expérience à chaud de nos participants."
      />

      <Temoignages temoignages={temoignages} titre="Ce qu'ils en disent" />
      <GalerieRealisations realisations={realisations} />

      <section className="border-line border-t px-8 py-16">
        <div className="mx-auto max-w-[1180px] text-center">
          <h2 className="font-display mb-4 text-[clamp(1.4rem,2.6vw,2rem)]">
            La prochaine cohorte est ouverte.
          </h2>
          <p className="text-ivory-dim/90 mx-auto mb-7 max-w-[52ch] text-[0.98rem] leading-relaxed">
            Retenir une place n&apos;engage à rien : aucun règlement n&apos;est demandé à
            l&apos;inscription, et vous pouvez poser vos questions avant d&apos;aller plus loin.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button href="/formations">Voir les formations</Button>
            <Button href="/contact" variante="contour">
              Nous écrire
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

/** L'introduction ne promet que ce que la page porte réellement. */
function phraseDIntroduction(temoignages: number, videos: number): string {
  const commun =
    " Aucune mise en scène : des participants réels, sur des parcours réellement donnés.";

  if (temoignages > 0 && videos > 0) {
    return (
      "Ce que disent celles et ceux qui ont suivi nos parcours, et les séances déjà tenues, en vidéo." +
      commun
    );
  }
  if (videos > 0) {
    return "Les séances déjà tenues, en vidéo." + commun;
  }
  return "Ce que disent celles et ceux qui ont suivi nos parcours." + commun;
}

/*
  La page se rend depuis le cache de données, levé par le crochet des deux
  collections. Elle n'a rien de personnel : le même rendu vaut pour tout le
  monde, et `lecturePubliee` écarte déjà les brouillons pour un anonyme.
*/
export const revalidate = 3600;
