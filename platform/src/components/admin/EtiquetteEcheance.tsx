"use client";

import React from "react";
import { useRowLabel } from "@payloadcms/ui";

/**
 * Ce qu'une échéance dit d'elle-même quand elle est repliée.
 *
 * ── Ce que ce composant remplace ────────────────────────────────────────────
 * « Échéance 01 ». Sur un dossier réglé en trois fois, l'équipe voyait trois
 * lignes numérotées et devait toutes les déplier pour savoir laquelle attendait
 * de l'argent. Le rang d'une échéance est la seule chose qu'on n'a pas besoin
 * qu'on lui dise : ce qu'on cherche, c'est le montant, la date et l'état.
 *
 * ⚠️ L'état porte une couleur, mais jamais **seulement** une couleur : le mot
 * est écrit. Une pastille verte et une pastille dorée ne se distinguent pas
 * pour qui voit mal les couleurs, et c'est l'information qui décide s'il faut
 * relancer quelqu'un.
 */

const EUROS = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const JOUR = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });

/** Le mot et la couleur de chaque état, dans l'ordre du parcours de l'argent. */
const ETATS: Record<string, { mot: string; teinte: string }> = {
  attendu: { mot: "Attendu", teinte: "var(--theme-elevation-400)" },
  annonce: { mot: "À vérifier", teinte: "#c9a24c" },
  regle: { mot: "Réglé", teinte: "#2fa37d" },
};

interface Echeance {
  montant?: number | string | null;
  dateLimite?: string | null;
  statut?: string | null;
}

export function EtiquetteEcheance() {
  const { data, rowNumber } = useRowLabel<Echeance>();

  const rang = String((rowNumber ?? 0) + 1).padStart(2, "0");
  const montant = Number(data?.montant ?? 0);
  const etat = ETATS[String(data?.statut ?? "attendu")] ?? ETATS.attendu!;

  const quand = data?.dateLimite ? JOUR.format(new Date(data.dateLimite)) : undefined;

  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 10 }}>
      <span
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "0.72rem",
          color: "var(--theme-elevation-400)",
        }}
      >
        {rang}
      </span>

      <strong style={{ fontSize: "0.92rem" }}>
        {montant > 0 ? EUROS.format(montant) : "montant à saisir"}
      </strong>

      {quand && (
        <span style={{ fontSize: "0.8rem", color: "var(--theme-elevation-500)" }}>
          avant le {quand}
        </span>
      )}

      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: etat.teinte }}>{etat.mot}</span>
    </span>
  );
}
