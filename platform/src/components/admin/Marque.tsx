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

/** L'icône compacte pour le fil d'Ariane de l'en-tête (StepNav) */
export function Icone() {
  return (
    <span className="clixa-icone-wrap">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="clixa-admin-icon"
        aria-label="CLIXA"
      >
        <rect
          x="1.5"
          y="1.5"
          width="21"
          height="21"
          rx="4"
          stroke="#c9a24c"
          strokeWidth="1.5"
          fill="rgba(201, 162, 76, 0.12)"
        />
        <path
          d="M15 8.5C14.2 7.8 13.1 7.4 11.9 7.4C9.5 7.4 7.5 9.4 7.5 12C7.5 14.6 9.5 16.6 11.9 16.6C13.1 16.6 14.2 16.2 15 15.5"
          stroke="#c9a24c"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="16.5" cy="15.5" r="1" fill="#e9cd84" />
      </svg>
    </span>
  );
}
