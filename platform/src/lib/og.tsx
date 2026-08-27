import type { ReactElement } from "react";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const tailleOG = { width: 1200, height: 630 };

/*
  Les polices de la marque, pour les images de partage.

  ⚠️ next/og ne peut pas se servir de ce que charge next/font : Satori réclame
  des fichiers, et next/font ne produit que du woff2, qu'il ne lit pas. Les
  images paraissaient donc dans la police par défaut du moteur — c'est-à-dire
  dans aucune des deux du site, sur la seule chose que voient les gens qui
  n'ont pas encore cliqué.

  ⚠️ Des instances statiques, pas les fichiers variables. Satori ne sait pas
  lire une police à axes : nourri du Fraunces variable — quatre axes — comme du
  Manrope variable, il échoue sur une table qu'il croit trouver et l'image
  revient en 500. Les instances servies par Google pour un navigateur ancien
  font 39 Ko chacune, contre 360 et 165 pour les variables : dix fois moins,
  et elles se lisent.

  Sous licence ouverte (SIL OFL). Elles ne partent jamais chez le visiteur :
  elles sont lues au serveur, le temps de dessiner l'image.

  Chargés une seule fois par instance. Quatre routes composent ces images ;
  relire un demi-mégaoctet à chacune serait payé à chaque partage.
*/
const DOSSIER = join(process.cwd(), "src", "assets", "fonts");
let polices: Promise<
  { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" }[]
> | null = null;

/*
  Satori veut un ArrayBuffer, pas le Buffer que rend `readFile`.

  Un Buffer de Node est une vue sur un tampon partagé, souvent plus grand que
  le fichier : le passer tel quel fait lire au moteur de police des octets qui
  ne sont pas les siens, et il échoue sur une table qu'il croit trouver là.
  `slice` détache la portion exacte.
*/
const detacher = (b: Buffer): ArrayBuffer =>
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

export function policesOG() {
  polices ??= Promise.all([
    readFile(join(DOSSIER, "Fraunces.woff")),
    readFile(join(DOSSIER, "Manrope.woff")),
  ]).then(([fraunces, manrope]) => [
    {
      name: "Fraunces",
      data: detacher(fraunces),
      weight: 600 as const,
      style: "normal" as const,
    },
    { name: "Manrope", data: detacher(manrope), weight: 400 as const, style: "normal" as const },
  ]);
  return polices;
}

/**
 * Gabarit commun des images de partage.
 *
 * Le titre porte Fraunces, le reste Manrope — la même hiérarchie que le site,
 * pour qu'une carte partagée et la page qu'elle annonce se ressemblent.
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
        // Manrope porte tout, sauf le titre — comme sur le site.
        fontFamily: "Manrope",
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
            fontFamily: "Fraunces",
            fontWeight: 600,
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
