"use client";

import React from "react";
import { useDocumentInfo } from "@payloadcms/ui";

/**
 * Ouvrir le justificatif depuis sa fiche.
 *
 * ── Pourquoi un composant, et pas un lien dans un champ texte ───────────────
 * Le fichier n'est pas chez nous : il vit dans un magasin privé dont l'adresse
 * ne s'ouvre pas seule — il faut le jeton du projet. La seule façon de le lire
 * est `api/recu/[id]`, qui vérifie la session avant de relayer le contenu. Un
 * champ texte aurait affiché un chemin qu'on ne peut ni cliquer ni utiliser.
 *
 * ⚠️ Le lien s'ouvre dans un onglet neuf. Un PDF rendu dans le cadre du
 * back-office remplacerait la fiche, et l'équipe perdrait ce qu'elle était en
 * train de saisir.
 */
export function LienRecu() {
  const { id } = useDocumentInfo();

  if (!id) {
    return (
      <div className="field-type">
        <p style={{ color: "var(--theme-elevation-500)", margin: 0 }}>
          Le fichier apparaîtra une fois la fiche enregistrée.
        </p>
      </div>
    );
  }

  return (
    <div className="field-type">
      <label className="field-label">Le fichier</label>
      <p style={{ margin: "0 0 8px" }}>
        <a
          className="btn btn--style-primary btn--size-small"
          href={`/api/recu/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ margin: 0 }}
        >
          Ouvrir le justificatif ↗
        </a>
      </p>
      <p style={{ color: "var(--theme-elevation-500)", fontSize: "0.8rem", margin: 0 }}>
        Le fichier est privé : ce lien ne fonctionne que depuis une session d&apos;équipe.
      </p>
    </div>
  );
}
