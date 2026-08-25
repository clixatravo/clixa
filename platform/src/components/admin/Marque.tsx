import React from "react";

/**
 * La marque du back-office.
 *
 * Payload affiche son propre logo par défaut : l'équipe de CLIXA se connectait
 * chaque matin à une page portant le nom d'un autre. L'outil est à nous, il
 * doit le dire.
 *
 * Rendu en texte plutôt qu'en image : c'est le même signe que l'en-tête du
 * site — le mot en romaine à empattements, le point en or — et il reste net à
 * toutes les densités d'écran, sans fichier à charger.
 */
export function Logo() {
  return (
    <div className="clixa-marque">
      <span className="clixa-marque__mot">
        CLIXA<span className="clixa-marque__point">.</span>
      </span>
      <span className="clixa-marque__legende">Back-office</span>
    </div>
  );
}

/** La même, réduite au monogramme : la barre latérale n'a pas la place du mot. */
export function Icone() {
  return (
    <span className="clixa-icone">
      C<span className="clixa-marque__point">.</span>
    </span>
  );
}
