import React from "react";

/**
 * La marque du back-office CLIXA.
 * Logo vectoriel SVG haute définition avec monogramme doré et typographie d'autorité.
 */
export function Logo() {
  return (
    <div className="clixa-marque">
      <div className="clixa-marque__monogramme">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="1.5"
            y="1.5"
            width="21"
            height="21"
            rx="4"
            stroke="#c9a24c"
            strokeWidth="1.5"
            fill="rgba(201, 162, 76, 0.15)"
          />
          <path
            d="M15 8.5C14.2 7.8 13.1 7.4 11.9 7.4C9.5 7.4 7.5 9.4 7.5 12C7.5 14.6 9.5 16.6 11.9 16.6C13.1 16.6 14.2 16.2 15 15.5"
            stroke="#c9a24c"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="16.5" cy="15.5" r="1.2" fill="#e9cd84" />
        </svg>
      </div>
      <div className="clixa-marque__textes">
        <span className="clixa-marque__mot">
          CLIXA<span className="clixa-marque__point">.</span>
        </span>
        <span className="clixa-marque__legende">Administration · Institut</span>
      </div>
    </div>
  );
}

/** Le bouton d'accueil explicite pour le fil d'Ariane et l'en-tête (StepNav) */
export function Icone() {
  return (
    <span className="clixa-btn-accueil">
      <span className="clixa-btn-accueil__icone-wrap">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="clixa-admin-icon"
          aria-hidden="true"
        >
          <path
            d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15C14.4477 21 14 20.5523 14 20V15H10V20C10 20.5523 9.55228 21 9 21H4C3.44772 21 3 20.5523 3 20V10.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="clixa-btn-accueil__label">
        <span className="clixa-btn-accueil__marque">CLIXA</span>
        <span className="clixa-btn-accueil__sep">·</span>
        <span className="clixa-btn-accueil__texte">Accueil</span>
      </span>
    </span>
  );
}
