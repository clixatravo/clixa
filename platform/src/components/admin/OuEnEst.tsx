"use client";

import React from "react";
import type { DefaultCellComponentProps } from "payload";
import { avancementDuDossier, type FaitsDuDossier } from "@/lib/avancement";

/**
 * La colonne qui dit ce qu'il reste à faire, dans la liste des inscriptions.
 *
 * ── Ce qu'elle remplace ─────────────────────────────────────────────────────
 * Rien : elle s'ajoute. C'est « Statut » qui ne suffisait pas — il annonçait
 * « Demandée — en attente de paiement » sur les douze dossiers de production
 * alors qu'ils étaient dans cinq états différents. Le raisonnement complet est
 * dans `lib/avancement.ts` ; il n'est pas répété ici.
 *
 * ⚠️ **Le calcul n'est pas dans ce fichier**, et ce n'est pas de la
 * coquetterie : une cellule d'administration ne s'éprouve qu'en ouvrant un
 * navigateur et en se connectant. Séparé, le même calcul se déroule sur les
 * dix cas d'un dossier sans base ni écran — comme `prochaineEtape`, et pour
 * la même raison : ce qui se décide au mauvais moment ne se voit ni au type ni
 * à la compilation.
 *
 * ⚠️ **Les données viennent de `rowData`, pas de `cellData`.** Le champ est un
 * `ui` : il ne porte aucune valeur, il lit la ligne entière. Si Payload cessait
 * un jour de charger les échéances dans la liste, la cellule se tromperait sans
 * rien signaler — d'où la garde ci-dessous, qui préfère se taire.
 */
export function OuEnEst(props: DefaultCellComponentProps) {
  const ligne = props.rowData as FaitsDuDossier | undefined;

  /*
    ⚠️ Une ligne sans statut n'est pas un dossier au tout début : c'est une
    ligne qu'on n'a pas reçue. Afficher « pré-inscription » dessus inventerait
    un état, et l'équipe agirait sur cette invention. Un tiret ne trompe
    personne.
  */
  if (!ligne || !ligne.statut) return <span className="clixa-ou__vide">—</span>;

  const { libelle, ton } = avancementDuDossier(ligne);

  return (
    <span className={`clixa-ou clixa-ou--${ton}`} title={libelle}>
      {libelle}
    </span>
  );
}
