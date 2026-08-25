import type { Temoignage } from "@/lib/types";

/**
 * FE-15 — Paroles de participants.
 *
 * Rien ne s'affiche si la liste est vide. Ce n'est pas une précaution de
 * confort : tant que l'équipe n'a pas recueilli de vrais témoignages, une
 * section vide vaut mieux qu'un mur de citations inventées. `lecturePubliee`
 * écarte déjà les brouillons pour un visiteur anonyme.
 */
export function Temoignages({
  temoignages,
  titre = "Ils ont suivi le parcours",
}: {
  temoignages: Temoignage[];
  titre?: string;
}) {
  if (temoignages.length === 0) return null;

  return (
    <section className="border-line border-t px-8 py-16">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-9">
          <span className="mono-label text-gold mb-3 block">Témoignages &amp; Retours</span>
          <h2 className="font-display text-[clamp(1.5rem,2.8vw,2.1rem)]">{titre}</h2>
        </div>

        <div className="carte-grid sm:grid-cols-2 lg:grid-cols-3">
          {temoignages.map((t) => {
            const initiales = t.auteur
              .split(" ")
              .map((w) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <figure
                key={t.id}
                className="executive-card rounded-clixa flex flex-col justify-between gap-6 p-7"
              >
                <div className="relative">
                  <span className="text-gold/20 pointer-events-none absolute -top-3 -left-1 font-serif text-5xl leading-none select-none">
                    “
                  </span>
                  <blockquote className="text-ivory/95 relative z-10 pl-3 text-[0.96rem] leading-relaxed italic">
                    {t.texte}
                  </blockquote>
                </div>

                <figcaption className="border-line/60 flex items-center gap-3.5 border-t pt-4">
                  <span className="border-gold/30 bg-gold/10 text-gold-bright flex size-9 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold">
                    {initiales || "CL"}
                  </span>
                  <div>
                    <span className="text-ivory block text-[0.88rem] font-semibold">
                      {t.auteur}
                    </span>
                    <span className="text-ivory-dim block font-mono text-[0.76rem]">
                      {t.fonction}
                    </span>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
