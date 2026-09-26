"use client";

import React from "react";
import type { DefaultCellComponentProps } from "payload";
import { libelleStatutCourriel } from "@/lib/suivi-courriel";

/**
 * L'état d'un courriel, en pastille.
 *
 * ── Les couleurs, et pourquoi celles-là ─────────────────────────────────────
 * - **Émeraude pour « remis »** : c'est fait, comme dans « Où en est ».
 * - **Rouge pour rejeté, bloqué, non parti, signalé** : ce courriel n'arrivera
 *   pas. C'est la ligne qu'on vient chercher pour relancer autrement — par
 *   WhatsApp, avec la bonne adresse.
 * - **Or pour « retardé »** : il faudra y revenir, mais rien n'est perdu.
 * - **Gris pour « parti »** : l'état ordinaire des premières secondes.
 */
const TON: Record<string, string> = {
  delivre: "remis",
  differe: "attente",
  envoye: "neutre",
  rejete: "perdu",
  bloque: "perdu",
  echec: "perdu",
  plainte: "perdu",
};

export function EtatCourriel({ cellData }: DefaultCellComponentProps) {
  const valeur = typeof cellData === "string" ? cellData : "";
  if (!valeur) return <span className="clixa-etat-courriel">—</span>;
  return (
    <span className={`clixa-etat-courriel clixa-etat-courriel--${TON[valeur] ?? "neutre"}`}>
      {libelleStatutCourriel(valeur)}
    </span>
  );
}
