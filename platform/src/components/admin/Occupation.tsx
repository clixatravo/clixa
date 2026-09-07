"use client";

import React from "react";
import type { DefaultCellComponentProps } from "payload";
import { occupationDeLaSession, type SessionComptee } from "@/lib/occupation";

/**
 * La colonne qui dit où en est le remplissage, dans la liste des sessions.
 *
 * ── Ce qu'elle remplace ─────────────────────────────────────────────────────
 * Rien : elle s'ajoute. C'est « Places au total » qui ne suffisait pas — elle
 * vaut la capacité, 30 sur les douze sessions, et vaudra 30 quoi qu'il arrive.
 * Le raisonnement complet est dans `lib/occupation.ts`, il n'est pas répété.
 *
 * ⚠️ **Les données viennent de `rowData`, pas de `cellData`.** Le champ est un
 * `ui` : il ne porte aucune valeur, il lit la ligne entière. Si Payload cessait
 * un jour de charger `placesReservees` dans la liste, la cellule annoncerait
 * « 0 / 30 » sur une cohorte pleine — d'où la garde ci-dessous, qui préfère se
 * taire plutôt que d'inventer une cohorte vide.
 */
export function Occupation(props: DefaultCellComponentProps) {
  const ligne = props.rowData as SessionComptee | undefined;

  if (!ligne || ligne.capacite === undefined || ligne.capacite === null) {
    return <span className="clixa-ou__vide">—</span>;
  }

  const { compte, libelle, ton } = occupationDeLaSession(ligne);

  return (
    <span className={`clixa-places clixa-places--${ton}`} title={libelle}>
      <strong className="clixa-places__compte">{compte}</strong>
      <span className="clixa-places__reste">{libelle}</span>
    </span>
  );
}
