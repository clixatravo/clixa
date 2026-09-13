"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useState } from "react";

/*
  La fenêtre n'est téléchargée qu'au premier clic : le bouton seul ne pèse rien
  sur le premier affichage, que les polices tiennent déjà à elles seules.
*/
const AssistantFenetre = dynamic(
  () => import("@/components/AssistantFenetre").then((m) => m.AssistantFenetre),
  { ssr: false },
);

/** Les étincelles, pictogramme reconnu de l'IA (dessin Lucide, licence ISC). */
export function Etincelle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}

export function AssistantIA() {
  const [ouvert, setOuvert] = useState(false);
  const [charge, setCharge] = useState(false);
  const chemin = usePathname();

  /*
    ⚠️ Pas sur le parcours d'inscription ni dans l'espace du participant : on y
    signe, on y paie, on y lit son dossier. Un robot qui répond « en général »
    à côté d'un échéancier personnel est la meilleure façon de contredire ce que
    la page affiche. Là, c'est un conseiller qu'il faut.
  */
  if (chemin.startsWith("/inscription") || chemin.startsWith("/compte")) return null;

  return (
    <>
      {charge && <AssistantFenetre ouvert={ouvert} onFermer={() => setOuvert(false)} />}
      {/*
        Rond et doré, comme le bouton d'action du site de conseil : c'est la forme
        qu'on reconnaît d'un coup d'œil comme « poser une question ». Le point vert
        dit qu'il répond tout de suite, à toute heure.
      */}
      <div className="group fixed right-5 bottom-5 z-30 flex items-center gap-3">
        {!ouvert && (
          <span className="border-line bg-panel text-ivory rounded-clixa pointer-events-none hidden border px-3 py-1.5 text-[0.78rem] font-semibold whitespace-nowrap opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 sm:inline-block">
            Assistant IA · vos questions sur les formations
          </span>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setCharge(true);
              setOuvert((o) => !o);
            }}
            aria-expanded={ouvert}
            aria-label={ouvert ? "Fermer l'assistant" : "Poser une question à l'assistant IA"}
            className="text-ink ring-gold-bright/40 flex size-14 cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(135deg,#e9cd84_0%,#c9a24c_100%)] shadow-[0_10px_30px_rgba(201,162,76,0.35)] ring-2 transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {ouvert ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
                className="size-6"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <Etincelle className="size-7" />
            )}
          </button>
          {!ouvert && (
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex size-3.5">
              <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
              <span className="border-ink relative inline-flex size-3.5 rounded-full border-2 bg-emerald-500" />
            </span>
          )}
        </div>
      </div>
    </>
  );
}
