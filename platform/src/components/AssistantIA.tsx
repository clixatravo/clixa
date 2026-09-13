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

/**
 * Un robot : ce que le visiteur reconnaît, sans lire, comme « quelqu'un qui
 * répond ». Les étincelles, pictogramme habituel de l'IA, se lisaient comme une
 * décoration de plus sur une page qui en compte déjà.
 */
export function Robot({ className }: { className?: string }) {
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
      <path d="M12 6V3.5" />
      <circle cx="12" cy="2.6" r="1.1" fill="currentColor" stroke="none" />
      <rect x="4" y="6" width="16" height="13" rx="4" />
      <path d="M2 11v3" />
      <path d="M22 11v3" />
      <circle cx="9" cy="11.8" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11.8" r="1.7" fill="currentColor" stroke="none" />
      <path d="M9.5 15.6c1.5 1.1 3.5 1.1 5 0" />
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
        Rond et doré, comme le bouton d'action du site de conseil, et un robot
        dedans : on le reconnaît d'un coup d'œil comme « poser une question ». Le point vert
        dit qu'il répond tout de suite, à toute heure.
      */}
      <div className="group fixed right-5 bottom-5 z-30 flex items-center gap-3">
        {!ouvert && (
          <span className="border-line bg-panel text-ivory rounded-clixa pointer-events-none hidden border px-3 py-1.5 text-[0.78rem] font-semibold whitespace-nowrap opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 sm:inline-block">
            Une question ? Demandez à l&apos;assistant
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
              <Robot className="size-8" />
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
