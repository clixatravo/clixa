"use client";

import { useRowLabel } from "@payloadcms/ui";

/**
 * Étiquette d'une ligne « Module » dans le back-office.
 *
 * Sans elle, les modules repliés s'affichent « Module 01, Module 02 … » et
 * l'équipe pédagogique doit tous les déplier pour retrouver le bon.
 */
export function EtiquetteModule() {
  const { data, rowNumber } = useRowLabel<{ titre?: string }>();
  const numero = String((rowNumber ?? 0) + 1).padStart(2, "0");

  return <span>{data?.titre ? `${numero} — ${data.titre}` : `Module ${numero}`}</span>;
}
