"use client";

import React from "react";
import { useDocumentInfo, useField } from "@payloadcms/ui";

/**
 * Montrer la signature, et mener au contrat signé.
 *
 * ── Ce que ce composant remplace ────────────────────────────────────────────
 * Le tracé est un PNG encodé en base64 : une centaine de milliers de caractères
 * que le champ « zone de texte » affichait tels quels. Sur téléphone, ouvrir le
 * dossier depuis le courriel « Contrat signé » donnait un mur de charabia — et
 * ce qu'on venait vérifier, la signature, n'était nulle part.
 *
 * ⚠️ Le fond est sombre, exprès. Le tracé est dessiné en ivoire (#F3EFE4), la
 * couleur du site : sur le thème clair de Payload, une signature ivoire sur
 * blanc est invisible. On ne peut pas recolorer un PNG déjà tracé — donc c'est
 * le cadre qui s'adapte, dans les deux thèmes.
 *
 * ── Ce qu'on vérifie vraiment ───────────────────────────────────────────────
 * Le tracé se regarde, mais il ne prouve rien : ce qui défend la signature,
 * c'est l'empreinte des termes, gardée à côté. Le bouton mène au contrat tel
 * qu'il a été signé — c'est lui qu'on relit avant d'envoyer de quoi payer.
 */
export function SignatureVue() {
  const { id } = useDocumentInfo();
  const trace = useField<string>({ path: "contratTrace" });
  const signeLe = useField<string>({ path: "contratSigneLe" });
  const signataire = useField<string>({ path: "contratSignataire" });
  const reference = useField<string>({ path: "reference" });

  if (!id) return null;

  if (!trace.value) {
    return (
      <div className="field-type">
        <p style={{ color: "var(--theme-elevation-500)", margin: 0, fontSize: "0.85rem" }}>
          Le contrat n&apos;est pas encore signé.
        </p>
      </div>
    );
  }

  const quand = signeLe.value
    ? new Date(signeLe.value).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : undefined;

  return (
    <div className="field-type">
      <div
        style={{
          color: "var(--theme-elevation-800)",
          fontSize: "0.8rem",
          marginBottom: 6,
        }}
      >
        Signature de {signataire.value || "—"}
        {quand ? ` — le ${quand}` : ""}
      </div>

      {/*
        Le PNG est posé tel quel : le recomposer ou le redimensionner côté
        serveur casserait son empreinte, qui est ce qui le protège d'un
        remplacement après coup.
      */}
      <div
        style={{
          background: "#0E0E0F",
          border: "1px solid var(--theme-elevation-150)",
          borderRadius: 4,
          padding: 12,
          maxWidth: 460,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trace.value}
          alt={`Signature de ${signataire.value || "la personne signataire"}`}
          style={{ display: "block", width: "100%", height: "auto" }}
        />
      </div>

      {reference.value && (
        <p style={{ margin: "10px 0 0" }}>
          <a
            className="btn btn--style-secondary btn--size-small"
            style={{ margin: 0 }}
            href={`/inscription/${reference.value}/contrat`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ouvrir le contrat signé (PDF)
          </a>
        </p>
      )}

      <p
        style={{
          color: "var(--theme-elevation-500)",
          fontSize: "0.78rem",
          margin: "8px 0 0",
          maxWidth: 460,
        }}
      >
        Le tracé se regarde ; il ne prouve rien à lui seul. Ce qui défend la signature est
        l&apos;empreinte des termes, conservée juste en dessous.
      </p>
    </div>
  );
}
