"use client";

import React from "react";
import type { DefaultCellComponentProps } from "payload";
import { nomDeLAuteur } from "@/lib/equipe";

/**
 * La colonne qui dit **qui mène** ce dossier, dans la liste.
 *
 * ── Ce qu'elle répond, et que « Relances » ne répond pas ────────────────────
 * « Relances » dit qui a parlé en dernier, et quand. Elle ne dit pas qui s'en
 * occupe : un dossier peut avoir reçu trois courriels automatiques et n'être
 * pris par personne. Or c'est la question qu'on se pose devant une liste de
 * dossiers neufs — lesquels sont pris, lesquels attendent encore quelqu'un.
 *
 * Demandé par la direction le 12 septembre 2026 : « radin nkono 3arfin chkon
 * mjeri dosser ».
 *
 * ⚠️ **Le nom vient de l'instantané, jamais de la relation.**
 * `comptesLecture` ne laisse lire que son propre compte : seule la direction
 * résout `charge`, et l'administration verrait une colonne vide — c'est-à-dire
 * qu'elle serait aveugle précisément là où elle a besoin de voir. Le
 * raisonnement complet est dans `lib/equipe.ts`.
 *
 * ⚠️ **Les données viennent de `rowData`, pas de `cellData`.** Le champ est un
 * `ui` : il ne porte aucune valeur, il lit la ligne. Si Payload cessait de
 * charger `chargeNom` dans la liste, la colonne annoncerait « Libre » sur des
 * dossiers déjà pris — et deux personnes écriraient au même prospect. Elle
 * préfère donc se taire quand le champ n'est pas là.
 */
export function Charge(props: DefaultCellComponentProps) {
  const ligne = props.rowData as
    { chargeNom?: string | null; charge?: unknown; chargeLe?: string | null } | undefined;

  if (!ligne || !("chargeNom" in ligne)) {
    return <span className="clixa-charge__vide">—</span>;
  }

  /*
    On réutilise `nomDeLAuteur` : elle sait déjà lire un instantané, et se
    rabattre sur une relation résolue quand il n'y en a pas. Deux façons de
    nommer la même personne finiraient par ne plus dire la même chose.
  */
  const nom = nomDeLAuteur({ parNom: ligne.chargeNom, par: ligne.charge as never });

  if (!nom) {
    /*
      ⚠️ « Libre » n'est pas une alerte : c'est l'état ordinaire d'un dossier
      qui vient d'arriver. L'or dirait « à faire aujourd'hui » sur trente lignes
      d'un coup, et la file de travail perdrait son sens.
    */
    return <span className="clixa-charge__vide">Libre</span>;
  }

  const depuis = ligne.chargeLe
    ? new Date(String(ligne.chargeLe)).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      })
    : undefined;

  return (
    <span className="clixa-charge" title={depuis ? `Pris en charge le ${depuis}` : nom}>
      <span className="clixa-charge__nom">{nom}</span>
      {depuis && <span className="clixa-charge__depuis">depuis le {depuis}</span>}
    </span>
  );
}
