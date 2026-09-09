"use client";

import React from "react";
import type { DefaultCellComponentProps } from "payload";
import { delaiDuDossier } from "@/lib/delai";

/**
 * La colonne « Délai » : depuis quand, et combien de temps encore.
 *
 * ── Ce qu'elle répond, et qu'aucune autre colonne ne répondait ──────────────
 * « Où en est » dit l'état du dossier, et ne parle du délai qu'une fois qu'il
 * est **passé**. Celle-ci le montre venir : « Reste 2 jours », en or, sur un
 * dossier qui recevra après-demain le courriel annonçant que sa place va
 * repartir. Et elle porte la date de dépôt, que l'équipe n'avait nulle part.
 *
 * ⚠️ **L'or ici, et nulle part ailleurs dans cette colonne.** C'est la file de
 * travail du jour ; une place qui se joue dans deux jours en fait partie, une
 * pré-inscription de la veille non. Les neuf dossiers dormants du 6 septembre
 * y seraient restés gris — c'est exactement pourquoi `avancement.ts` leur garde
 * le ton « attente ».
 *
 * ⚠️ **Les données viennent de `rowData`.** Le champ est un `ui` : il ne porte
 * aucune valeur, il lit la ligne entière. Si Payload cessait un jour de charger
 * ces dates dans la liste, la cellule annoncerait « Sans terme » sur un dossier
 * qui expire demain — d'où la garde ci-dessous, qui préfère se taire.
 */
export function Delai(props: DefaultCellComponentProps) {
  const ligne = props.rowData as Record<string, unknown> | undefined;

  if (!ligne || !("createdAt" in ligne)) {
    return <span className="clixa-delai__vide">—</span>;
  }

  const { inscritLe, terme, jours, libelle, ton } = delaiDuDossier(ligne, new Date());

  const jour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

  return (
    <span className={`clixa-delai clixa-delai--${ton}`}>
      <span className="clixa-delai__reste">
        {libelle}
        {terme && ton !== "sansTerme" && jours !== undefined && jours > 0 && (
          <span className="clixa-delai__terme"> · jusqu&apos;au {jour(terme)}</span>
        )}
      </span>
      <span className="clixa-delai__depuis">
        {inscritLe ? `Inscrit le ${jour(inscritLe)}` : "Date de dépôt inconnue"}
      </span>
    </span>
  );
}
