import React from "react";

/**
 * Message d'information sécurisé sous le formulaire de connexion.
 */
export function AvantConnexion() {
  return (
    <div className="clixa-avis">
      <div className="clixa-avis__en-tete">
        <span className="clixa-avis__icone">✦</span>
        <span className="clixa-avis__titre">Espace d&apos;administration sécurisé</span>
      </div>
      <p className="clixa-avis__texte">
        L&apos;accès est strictement réservé à la direction et aux conseillers pédagogiques de CLIXA
        Institute. En cas d&apos;oubli d&apos;identifiants, contactez directement l&apos;équipe
        technique.
      </p>
    </div>
  );
}
