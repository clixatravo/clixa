import type { Metadata } from "next";
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
 * ⚠️ **La page a toujours quelque chose à montrer depuis le 13 septembre 2026
 * au soir** : le bandeau `TrailerImmersion` porte deux vidéos servies par nous.
 * Elle ne répond donc plus 404 quand la base est vide, et son lien reste dans
 * la navigation. La règle d'avant — « l'adresse n'existe que si elle a quelque
 * chose à montrer » — n'a pas changé ; c'est ce qu'elle a à montrer qui a
 * changé.
 *
 * ⚠️ **Et chaque vidéo n'est ici qu'une fois.** Le bandeau porte les deux
 * séances mises en avant, la galerie en dessous **les autres** — celles que la
 * rédaction ajoute depuis /admin. Les mêmes vidéos ont paru un moment dans les
 * deux blocs, l'une sous forme de fichier, l'autre encadrée depuis Instagram :
 * deux sources pour un même fait, qui auraient fini par diverger.
 */
export default async function PageTemoignages() {
  const { temoignages, realisations } = await getVitrine();

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
              Ce que la page promet doit correspondre à ce qu'elle porte. La
              vidéo, elle, y est toujours — le bandeau la porte ; c'est la
              parole des participants qui peut manquer.
            */}
            {phraseDIntroduction(temoignages.length)}
          </p>
        </div>
      </section>

      <TrailerImmersion
        titre="Les séances de formation en vidéo"
        sousTitre="Extrait de masterclass en direct et retours d'expérience à chaud de nos participants."
      />

      <Temoignages temoignages={temoignages} titre="Ce qu'ils en disent" />
      {/*
        Le bandeau au-dessus porte les deux séances mises en avant ; celle-ci
        montre les autres. Tant qu'il n'y en a pas, elle se tait.
      */}
      <GalerieRealisations realisations={realisations} titre="Les autres séances filmées" />

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
function phraseDIntroduction(temoignages: number): string {
  const commun =
    " Aucune mise en scène : des participants réels, sur des parcours réellement donnés.";

  return temoignages > 0
    ? "Ce que disent celles et ceux qui ont suivi nos parcours, et les séances déjà tenues, en vidéo." +
        commun
    : "Les séances déjà tenues, en vidéo." + commun;
}

/*
  La page se rend depuis le cache de données, levé par le crochet des deux
  collections. Elle n'a rien de personnel : le même rendu vaut pour tout le
  monde, et `lecturePubliee` écarte déjà les brouillons pour un anonyme.
*/
export const revalidate = 3600;
