import React from "react";

/**
 * Les pictogrammes des boutons d'envoi — un trait, à la couleur du texte.
 * Décoratifs : le libellé du bouton dit toujours ce qu'il fait.
 */
const TRACES = {
  envoyer: "M4 12l16-8-6 16-3-7-7-1z M11 13l9-9",
  relire: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  listes: "M8 6h12 M8 12h12 M8 18h12 M4 6h.01 M4 12h.01 M4 18h.01",
  corriger: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z M13.5 7.5l3 3",
  recommencer: "M4 4v6h6 M20 20v-6h-6 M5.6 15A8 8 0 0 0 19 17 M18.4 9A8 8 0 0 0 5 7",
  suite: "M5 12h14 M13 6l6 6-6 6",
} as const;

export function IconeBouton({ nom }: { nom: keyof typeof TRACES }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="clixa-bouton__icone">
      <path d={TRACES[nom]} />
    </svg>
  );
}
