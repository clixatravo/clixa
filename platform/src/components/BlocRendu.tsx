import React from "react";
import type { Bloc } from "@/lib/blog";

/**
 * Le rendu d'un bloc de contenu.
 *
 * Il vivait dans la page d'article, seule à en afficher. Les pages libres —
 * mentions légales, confidentialité — portent les mêmes blocs et doivent les
 * rendre pareil : deux copies auraient divergé au premier ajustement de marge.
 */
export function BlocRendu({ bloc }: { bloc: Bloc }) {
  switch (bloc.type) {
    case "intertitre":
      return <h2 className="mt-4 text-[1.35rem]">{bloc.texte}</h2>;

    case "paragraphe":
      return <p className="text-ivory-dim text-[1rem] leading-relaxed">{bloc.texte}</p>;

    case "liste":
      return (
        <ul className="flex flex-col gap-3">
          {bloc.items.map((item) => (
            <li key={item} className="text-ivory-dim relative pl-5 text-[1rem] leading-relaxed">
              <span className="bg-gold absolute top-[0.7em] left-0 block h-px w-2.5" />
              {item}
            </li>
          ))}
        </ul>
      );

    case "citation":
      return (
        <blockquote className="border-gold my-2 border-l-2 py-2 pl-6">
          <p className="font-display text-ivory text-[1.15rem] leading-snug italic">{bloc.texte}</p>
          <footer className="text-gold-bright mt-3 text-[0.82rem]">— {bloc.auteur}</footer>
        </blockquote>
      );
  }
}
