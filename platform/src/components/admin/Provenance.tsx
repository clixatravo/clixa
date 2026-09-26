"use client";

import React from "react";
import type { DefaultCellComponentProps } from "payload";
import { ficheProvenance } from "@/lib/provenance";
import { LogoSvg } from "@/components/LogoSvg";

/**
 * La colonne « Nous a connus par », avec le logo de chaque provenance.
 *
 * Demandé par la direction le 26 septembre 2026, le jour même où la question
 * est partie en ligne : « zid l logos f colonne dyal /admin tahiya ». La liste
 * affichait l'intitulé nu ; le logo se reconnaît avant d'avoir lu, et c'est ce
 * qu'on fait en parcourant cent lignes.
 *
 * Même dessin que le bloc « Comment ils nous ont connus » du tableau de bord
 * (`.clixa-provenance`) : une provenance ne doit pas se reconnaître à deux
 * signes différents selon l'écran.
 *
 * ⚠️ **Le tiret n'est pas « Autre ».** Il dit que la question n'a pas été
 * posée — les dossiers déposés avant le 26 septembre 2026. Les confondre
 * ferait croire que cent vingt-sept personnes ont répondu « Autre ».
 *
 * ⚠️ **Une valeur hors liste s'écrit telle quelle, sans logo.** Elle ne peut
 * venir que d'une écriture faite en base ; lui prêter le logo de « Autre »
 * serait inventer une réponse.
 */
export function Provenance({ cellData }: DefaultCellComponentProps) {
  const valeur = typeof cellData === "string" ? cellData : "";
  if (!valeur) return <span className="clixa-provenance__vide">—</span>;

  const fiche = ficheProvenance(valeur);
  if (!fiche) return <span>{valeur}</span>;

  return (
    <span className="clixa-provenance">
      <span
        className="clixa-provenance__logo"
        style={{ backgroundColor: `${fiche.couleur}2e`, color: fiche.couleur }}
      >
        <LogoSvg logo={fiche.logo} className="clixa-provenance__svg" />
      </span>
      {fiche.libelle}
    </span>
  );
}
