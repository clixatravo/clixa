"use client";

import React from "react";
import { useDocumentInfo, useField, useForm } from "@payloadcms/ui";

/**
 * Déclarer un contrat vérifié, et le dire au participant.
 *
 * ── Le moment que ce bouton comble ──────────────────────────────────────────
 * Signer est le geste du participant ; relire est le nôtre. Entre les deux, il
 * attendait sans nouvelle : le courriel de signature annonce que l'équipe lui
 * enverra de quoi payer, puis plus rien jusqu'à ce que quelqu'un s'en occupe.
 * C'est l'endroit du tunnel où il vient de s'engager et où il ne voit rien
 * bouger.
 *
 * ⚠️ Vérifier n'est pas envoyer les coordonnées. Ce sont deux gestes, et
 * l'ordre compte : on relit d'abord, on envoie ensuite. Le bouton suivant
 * (« J'ai envoyé les instructions de paiement ») pose la date que le
 * participant voit sur son dossier, et qui lui permet de reconnaître notre
 * courriel d'un hameçonnage.
 *
 * Le courriel part depuis le crochet `afterChange` de la collection, pas d'ici :
 * une date saisie à la main dans le champ doit produire exactement le même
 * effet qu'un clic.
 */
export function VerifierContrat() {
  const { id } = useDocumentInfo();
  const { submit } = useForm();
  const signe = useField<string>({ path: "contratSigneLe" });
  const verifie = useField<string>({ path: "contratVerifieLe" });
  const reference = useField<string>({ path: "reference" });

  if (!id) return null;

  if (!signe.value) {
    return (
      <div className="field-type">
        <p style={{ color: "var(--theme-elevation-500)", margin: 0, fontSize: "0.85rem" }}>
          Rien à vérifier tant que le contrat n&apos;est pas signé.
        </p>
      </div>
    );
  }

  if (verifie.value) {
    const quand = new Date(verifie.value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    return (
      <div className="field-type">
        <p style={{ margin: 0, fontSize: "0.85rem" }}>
          Contrat vérifié le <strong>{quand}</strong>. Le participant en a été prévenu par courriel.
        </p>
      </div>
    );
  }

  return (
    <div className="field-type">
      {reference.value && (
        <p style={{ margin: "0 0 10px" }}>
          <a
            className="btn btn--style-secondary btn--size-small"
            style={{ margin: 0 }}
            href={`/inscription/${reference.value}/contrat`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Lire le contrat avant de vérifier
          </a>
        </p>
      )}

      <button
        type="button"
        className="btn btn--style-primary btn--size-small"
        style={{ margin: 0 }}
        onClick={() => {
          /*
            On pose la date puis on enregistre : sans le `submit`, le champ
            paraîtrait rempli, rien n'irait en base, et aucun courriel ne
            partirait — l'équipe croirait avoir prévenu quelqu'un.
          */
          verifie.setValue(new Date().toISOString());
          void submit();
        }}
      >
        Contrat vérifié — prévenir le participant
      </button>

      <p style={{ color: "var(--theme-elevation-500)", fontSize: "0.8rem", margin: "8px 0 0" }}>
        Lui annonce que son contrat est accepté et que de quoi régler lui parvient. Les coordonnées
        elles-mêmes s&apos;envoient à l&apos;étape suivante.
      </p>
    </div>
  );
}
