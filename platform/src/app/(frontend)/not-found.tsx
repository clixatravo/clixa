import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: true },
};

export default function Introuvable() {
  return (
    <section className="px-8 py-28">
      <div className="mx-auto max-w-[640px] text-center">
        <div className="mono-label text-gold mb-6">Erreur 404</div>
        <h1 className="mb-5 text-[clamp(1.9rem,4vw,2.8rem)]">Cette page n&apos;existe pas.</h1>
        <p className="text-ivory-dim mx-auto mb-10 max-w-[46ch] text-[0.98rem]">
          Le lien est peut-être ancien, ou la formation que vous cherchiez a été renommée. Le
          catalogue reste le meilleur point de départ.
        </p>
        <div className="flex flex-wrap justify-center gap-5">
          <Button href="/formations">Voir le catalogue</Button>
          <Button href="/contact" variante="contour">
            Être rappelé
          </Button>
        </div>
      </div>
    </section>
  );
}
