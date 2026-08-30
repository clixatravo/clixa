"use client";

import React from "react";
import type { DefaultCellComponentProps } from "payload";

/**
 * Ouvrir WhatsApp depuis la liste des inscriptions.
 *
 * ── Ce que ça remplace ──────────────────────────────────────────────────────
 * Ouvrir le dossier, copier le numéro, basculer sur WhatsApp, coller, écrire
 * le message depuis le début. Cinq gestes par candidat, plusieurs fois par
 * jour, et le message n'est jamais tout à fait le même d'une fois sur l'autre.
 *
 * ── Ce que le message dit, et ce qu'il ne dit pas ───────────────────────────
 * Il annonce que la demande est reçue et rappelle la référence. Rien d'autre :
 * ni date de séance, ni montant. La date vit dans une relation que la liste ne
 * charge pas toujours, et un message qui annoncerait la mauvaise date coûterait
 * plus cher que celui qu'on écrit à la main.
 *
 * C'est un brouillon, pas un envoi : WhatsApp s'ouvre avec le texte prérempli,
 * et c'est la personne qui décide de l'envoyer.
 */

/** Le prénom seul : « Bonjour Aïcha » se lit mieux que « Bonjour Aïcha Benali ». */
function prenom(nom: unknown): string {
  const complet = String(nom ?? "").trim();
  return complet.split(/\s+/)[0] || "";
}

/**
 * Le numéro au format international, ou rien.
 *
 * Le formulaire demande l'indicatif du pays, mais on ne peut pas s'y fier : un
 * numéro saisi « 0689… » n'a pas de pays, et le déduire de la fiche reviendrait
 * à tenir une table des indicatifs qui vieillirait dans son coin. Mieux vaut le
 * dire que d'ouvrir une conversation avec un numéro inventé.
 */
function international(brut: unknown): string | undefined {
  let chiffres = String(brut ?? "").replace(/\D/g, "");
  if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);
  if (!chiffres || chiffres.startsWith("0")) return undefined;
  return chiffres.length >= 8 ? chiffres : undefined;
}

export function BoutonWhatsapp(props: DefaultCellComponentProps) {
  const { cellData, rowData } = props;
  const numero = international(cellData);
  const affiche = String(cellData ?? "").trim();

  if (!affiche) return <span className="clixa-wa__vide">—</span>;

  if (!numero) {
    return (
      <span
        className="clixa-wa__incomplet"
        title="Numéro sans indicatif international : à compléter dans la fiche pour pouvoir écrire."
      >
        {affiche}
      </span>
    );
  }

  const texte = [
    `Bonjour ${prenom(rowData?.apprenantNom)},`,
    "",
    "Ici l'équipe admissions de CLIXA Institute.",
    `Nous avons bien reçu votre demande d'inscription (référence ${rowData?.reference ?? ""}).`,
    "",
    "Nous restons à votre disposition pour toute question.",
  ].join("\n");

  return (
    <span className="clixa-wa">
      <a
        href={`https://wa.me/${numero}?text=${encodeURIComponent(texte)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="clixa-wa__bouton"
        // Sans cela, un clic sur la cellule ouvrirait aussi la fiche derrière.
        onClick={(e) => e.stopPropagation()}
        title={`Écrire à ${prenom(rowData?.apprenantNom)} sur WhatsApp`}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="clixa-wa__icon"
          aria-hidden="true"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span>WhatsApp</span>
      </a>
      <span className="clixa-wa__numero">{affiche}</span>
    </span>
  );
}
