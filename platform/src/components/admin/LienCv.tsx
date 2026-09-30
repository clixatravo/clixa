"use client";

import React from "react";
import { useDocumentInfo, useField } from "@payloadcms/ui";

/**
 * Ouvrir le CV d'un candidat formateur, et son profil LinkedIn.
 *
 * Le CV vit dans le magasin privé : seule `api/candidature/[id]/cv`, derrière
 * une session d'équipe, le relit. Même raisonnement que `LienRecu`.
 *
 * ⚠️ « Pas de CV » n'est pas une panne : la candidature peut n'avoir que son
 * lien LinkedIn. Le composant le dit, plutôt que d'afficher un bouton qui
 * mènerait à un 404.
 */
export function LienCv() {
  const { id } = useDocumentInfo();
  const chemin = useField<string>({ path: "cvChemin" });
  const linkedin = useField<string>({ path: "linkedin" });

  if (!id) return null;

  return (
    <div className="field-type">
      <label className="field-label">Le parcours du candidat</label>
      <p style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "0 0 8px" }}>
        {chemin.value ? (
          <a
            className="btn btn--style-primary btn--size-small"
            href={`/api/candidature/${id}/cv`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ margin: 0 }}
          >
            Ouvrir le CV ↗
          </a>
        ) : null}
        {linkedin.value ? (
          <a
            className="btn btn--style-secondary btn--size-small"
            href={linkedin.value}
            target="_blank"
            rel="noopener noreferrer"
            style={{ margin: 0 }}
          >
            Profil LinkedIn ↗
          </a>
        ) : null}
      </p>
      {!chemin.value && (
        <p style={{ color: "var(--theme-elevation-500)", fontSize: "0.8rem", margin: 0 }}>
          Pas de CV joint : le candidat a donné son profil LinkedIn.
        </p>
      )}
      {chemin.value && (
        <p style={{ color: "var(--theme-elevation-500)", fontSize: "0.8rem", margin: 0 }}>
          Le CV est privé : ce lien ne fonctionne que depuis une session d&apos;équipe.
        </p>
      )}
    </div>
  );
}
