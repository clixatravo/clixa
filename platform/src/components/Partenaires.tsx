import Image from "next/image";
import type { Partenaire } from "@/lib/types";

/**
 * FE-16 — Bandeau des partenaires et référentiels.
 *
 * Rien ne s'affiche tant que la liste est vide, et c'est délibéré. Le site
 * statique d'origine portait cet avertissement au-dessus du même bandeau :
 *
 *   « À VÉRIFIER AVANT PUBLICATION : confirmez que CLIXA a une relation réelle
 *     et documentée avec chacune de ces organisations. »
 *
 * Annoncer une institution comme partenaire sans convention est une affirmation
 * que le visiteur croira. Le composant ne montre que ce que quelqu'un a
 * délibérément publié depuis le back-office.
 */
export function Partenaires({ partenaires }: { partenaires: Partenaire[] }) {
  if (partenaires.length === 0) return null;

  return (
    <section className="border-line border-t px-8 py-11">
      <div className="mx-auto max-w-[1180px]">
        <span className="mono-label text-ivory-dim mb-6 block text-center text-[0.62rem]">
          Partenaires et référentiels
        </span>

        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {partenaires.map((p) => {
            const contenu = p.logoUrl ? (
              <Image
                src={p.logoUrl}
                alt={p.logoAlt ?? p.nom}
                width={120}
                height={40}
                className="h-8 w-auto opacity-70 transition-opacity hover:opacity-100"
              />
            ) : (
              /*
                Sans logo, le nom fait l'affaire. Un cadre vide en attendant un
                fichier donnerait l'air d'une image cassée.
              */
              <span className="font-display text-ivory-dim hover:text-ivory text-[0.95rem] transition-colors">
                {p.nom}
              </span>
            );

            return (
              <li key={p.id}>
                {p.lien ? (
                  <a
                    href={p.lien}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block py-1"
                  >
                    {contenu}
                  </a>
                ) : (
                  <span className="inline-block py-1">{contenu}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
