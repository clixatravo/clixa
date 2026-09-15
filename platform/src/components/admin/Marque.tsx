"use client";

import React, { useEffect } from "react";

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
  useEffect(() => {
    function fermerTiroir() {
      const nav = document.querySelector(".nav--nav-open");
      if (!nav) return;
      const btnFermer = nav.querySelector<HTMLButtonElement>(".nav__mobile-close");
      if (btnFermer) {
        btnFermer.click();
      }
    }

    function gererClic(e: MouseEvent) {
      const nav = document.querySelector(".nav--nav-open");
      if (!nav) return;
      const cible = e.target as HTMLElement | null;
      if (!cible) return;

      // 1. Clic sur un lien dans le tiroir : fermer immédiatement le tiroir pour une navigation fluide
      if (cible.closest(".nav a")) {
        fermerTiroir();
        return;
      }

      // 2. Ne rien faire si on clique dans le tiroir, sur les boutons menu ou sur le bouton Accueil
      if (
        nav.contains(cible) ||
        cible.closest(".app-header__mobile-nav-toggler") ||
        cible.closest(".template-default__nav-toggler") ||
        cible.closest(".step-nav__home")
      ) {
        return;
      }

      // 3. Clic sur le fond assombri (backdrop) : fermer le tiroir
      fermerTiroir();
    }

    document.addEventListener("click", gererClic);
    return () => {
      document.removeEventListener("click", gererClic);
    };
  }, []);
  return (
    <span className="clixa-btn-accueil">
      <span className="clixa-btn-accueil__icone-wrap">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="clixa-admin-icon"
          aria-hidden="true"
        >
          <rect
            x="2"
            y="2"
            width="20"
            height="20"
            rx="4"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="rgba(201, 162, 76, 0.18)"
          />
          <path
            d="M14.5 8.5C13.8 7.9 12.8 7.5 11.8 7.5C9.6 7.5 7.8 9.3 7.8 11.7C7.8 14.1 9.6 15.9 11.8 15.9C12.8 15.9 13.8 15.5 14.5 14.9"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="16" cy="15" r="1.1" fill="currentColor" />
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
