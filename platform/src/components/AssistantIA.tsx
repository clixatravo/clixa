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

export function Etincelle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16z" fill="currentColor" />
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
      <button
        type="button"
        onClick={() => {
          setCharge(true);
          setOuvert((o) => !o);
        }}
        aria-expanded={ouvert}
        aria-label={ouvert ? "Fermer l'assistant" : "Poser une question à l'assistant IA"}
        className="border-gold bg-panel text-gold hover:bg-gold hover:text-ink rounded-clixa fixed right-4 bottom-4 z-30 flex h-13 cursor-pointer items-center gap-2 border px-4 shadow-2xl transition-colors"
      >
        {ouvert ? (
          <span aria-hidden="true" className="text-xl leading-none">
            ×
          </span>
        ) : (
          <Etincelle className="size-5" />
        )}
        <span className="mono-label hidden text-[0.66rem] sm:inline">
          {ouvert ? "Fermer" : "Assistant IA"}
        </span>
      </button>
    </>
  );
}
