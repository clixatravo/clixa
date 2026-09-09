"use client";

import React from "react";
import type { DefaultCellComponentProps } from "payload";
import { dernierSuivi, type Echange } from "@/lib/suivi";

/**
 * La colonne qui dit si quelqu'un a déjà appelé, dans la liste des dossiers.
 *
 * ── Ce qu'elle répond, et que « Où en est » ne répondait pas ────────────────
 * « Où en est » dit où en est le **dossier**. Celle-ci dit où en est la
 * **conversation** — deux questions qu'on se pose l'une après l'autre en
 * choisissant qui appeler ce matin. Les fondre ferait perdre la seconde, et
 * c'est elle qui manquait : un collègue rouvrait la liste le lendemain et
 * rappelait la même personne.
 *
 * ⚠️ **Le vert dit « c'est fait », pas l'or.** L'or est la file de travail du
 * jour ; un dossier qu'on vient d'appeler est exactement l'inverse — c'est
 * celui qu'il faut laisser tranquille. L'employer ici enverrait rappeler
 * précisément ceux qu'on vient d'avoir.
 *
 * ⚠️ **Les données viennent de `rowData`, pas de `cellData`.** Le champ est un
 * `ui` : il ne porte aucune valeur, il lit la ligne entière. Si Payload cessait
 * un jour de charger le journal dans la liste, la cellule annoncerait « jamais
 * appelé » sur un dossier suivi de près — d'où la garde ci-dessous, qui préfère
 * se taire plutôt que d'affirmer un silence.
 */
export function Suivi(props: DefaultCellComponentProps) {
  const ligne = props.rowData as { echanges?: Echange[] | null } | undefined;

  if (!ligne || !("echanges" in ligne)) {
    return <span className="clixa-suivi__vide">—</span>;
  }

  /*
    ⚠️ L'horloge est passée, jamais lue par le calcul : c'est ce qui permet
    d'éprouver « il y a cinq jours » sans attendre cinq jours. Même raison que
    `avancementDuDossier`.
  */
  const { libelle, nombre, ton } = dernierSuivi(ligne.echanges, new Date());

  if (ton === "jamais" && nombre === 0) {
    return <span className="clixa-suivi__vide">Jamais relancé</span>;
  }

  return (
    <span className={`clixa-suivi clixa-suivi--${ton}`} title={libelle}>
      <span className="clixa-suivi__quand">{libelle}</span>
      {nombre > 1 && <span className="clixa-suivi__compte">{nombre} échanges</span>}
    </span>
  );
}
