import type { ReactElement } from "react";

export const tailleOG = { width: 1200, height: 630 };

/**
 * Gabarit commun des images de partage.
 *
 * ⚠️ POLICES — next/og ne peut pas utiliser les polices chargées par next/font :
 * Satori exige des fichiers de police fournis explicitement. Ces images utilisent
 * donc la police par défaut, pas Fraunces ni Manrope.
 *
 * Correction prévue avec DES-02 (acquisition des licences) : déposer
 * Fraunces-SemiBold.ttf et Manrope-Regular.ttf dans src/assets/fonts/, puis
 * passer l'option `fonts` à ImageResponse — une dizaine de lignes. Le reste de
 * la composition (couleurs, trame, hiérarchie) est déjà conforme.
 */
export function CarteOG({
  etiquette,
  badge,
  titre,
  piedGauche,
  piedDroit,
}: {
  etiquette: string;
  badge?: string;
  titre: string;
  piedGauche?: string;
  piedDroit?: ReactElement;
}): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#080C18",
        padding: 72,
        backgroundImage:
          "linear-gradient(rgba(243,239,228,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(243,239,228,0.05) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#F3EFE4" }}>
          CLIXA<span style={{ color: "#C9A24C" }}>.</span>
        </div>
        {badge && (
          <div
            style={{
              display: "flex",
              fontSize: 18,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#C9A24C",
            }}
          >
            {badge}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
          <div style={{ width: 48, height: 2, background: "#C9A24C", marginRight: 18 }} />
          <div
            style={{
              display: "flex",
              fontSize: 20,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#C9A24C",
            }}
          >
            {etiquette}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: titre.length > 60 ? 56 : 68,
            lineHeight: 1.1,
            color: "#F3EFE4",
            maxWidth: 1000,
          }}
        >
          {titre}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid rgba(243,239,228,0.24)",
          paddingTop: 28,
          minHeight: 60,
        }}
      >
        <div style={{ display: "flex", fontSize: 24, color: "#B9B7AC" }}>{piedGauche ?? ""}</div>
        {piedDroit ?? <div style={{ display: "flex" }} />}
      </div>
    </div>
  );
}
