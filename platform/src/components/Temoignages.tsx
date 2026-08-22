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
    <section className="border-line border-t px-8 py-14">
      <div className="mx-auto max-w-[1180px]">
        <span className="mono-label text-gold mb-3 block">Témoignages</span>
        <h2 className="font-display mb-9 text-[1.7rem]">{titre}</h2>

        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
          {temoignages.map((t) => (
            <figure key={t.id} className="bg-panel flex flex-col justify-between gap-5 p-6">
              <blockquote className="text-ivory text-[0.95rem] leading-relaxed">
                {/*
                  Les guillemets sont dans le balisage, pas dans la donnée :
                  l'équipe saisit une phrase, pas de la ponctuation typographique.
                */}
                «&nbsp;{t.texte}&nbsp;»
              </blockquote>
              <figcaption className="border-line border-t pt-4">
                <span className="text-ivory block text-[0.86rem] font-semibold">{t.auteur}</span>
                <span className="text-ivory-dim block text-[0.78rem]">{t.fonction}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
