"use client";

import React from "react";
import { useDocumentInfo, useField, useForm } from "@payloadcms/ui";

/**
 * Faire passer un dossier signé à l'étape du paiement.
 *
 * ── Ce que ce bouton remplace ───────────────────────────────────────────────
 * Ouvrir le dépliant « Le règlement », trouver le champ « Coordonnées envoyées
 * le », déplier un calendrier, choisir aujourd'hui, refermer, enregistrer.
 * Cinq gestes pour dire « c'est parti », plusieurs fois par jour — et le champ
 * est assez discret pour qu'on l'oublie, ce qui laisse le participant devant
 * une page qui ne confirme rien.
 *
 * ⚠️ Cette date n'est pas une trace interne : elle s'affiche sur la page du
 * dossier. C'est elle qui permet au participant de distinguer notre courriel
 * d'un hameçonnage — un message qui ne correspond à aucune date affichée n'est
 * pas de nous. L'oublier, c'est retirer cette garantie.
 *
 * Le bouton ne s'affiche qu'une fois le contrat signé : envoyer des
 * instructions de paiement avant la signature inverserait le tunnel.
 */
export function PasserAuPaiement() {
  const { id } = useDocumentInfo();
  const { submit } = useForm();
  const signe = useField<string>({ path: "contratSigneLe" });
  const envoye = useField<string>({ path: "coordonneesEnvoyeesLe" });

  if (!id) return null;

  if (!signe.value) {
    return (
      <div className="field-type">
        <p style={{ color: "var(--theme-elevation-500)", margin: 0, fontSize: "0.85rem" }}>
          Le contrat n&apos;est pas encore signé : les instructions de paiement viennent après.
        </p>
      </div>
    );
  }

  if (envoye.value) {
    const quand = new Date(envoye.value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    return (
      <div className="field-type">
        <p style={{ margin: 0, fontSize: "0.85rem" }}>
          Instructions envoyées le <strong>{quand}</strong>. Le participant voit cette date sur son
          dossier.
        </p>
      </div>
    );
  }

  return (
    <div className="field-type">
      <button
        type="button"
        className="btn btn--style-primary btn--size-small"
        style={{ margin: 0 }}
        onClick={() => {
          /*
            On pose la date puis on enregistre : sans le `submit`, le champ
            paraîtrait rempli et rien ne partirait en base — l'équipe croirait
            avoir agi.
          */
          envoye.setValue(new Date().toISOString());
          void submit();
        }}
      >
        J&apos;ai envoyé les instructions de paiement
      </button>
      <p style={{ color: "var(--theme-elevation-500)", fontSize: "0.8rem", margin: "8px 0 0" }}>
        Date du jour, visible par le participant sur son dossier : c&apos;est ce qui lui permet de
        reconnaître notre courriel.
      </p>
    </div>
  );
}
