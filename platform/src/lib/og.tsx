import type { ReactElement } from "react";
import { SITE_URL } from "@/lib/seo";

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
/*
  Les polices de la marque, pour les images de partage.

  ⚠️ Servies depuis `public/`, et non lues sur le disque.

  La version précédente lisait les fichiers avec `readFile` et un chemin
  construit sur `process.cwd()`. Elle marchait sur le poste de travail et se
  taisait en production : les cartes y paraissaient dans la police du moteur,
  sans erreur, sans trace. Le répertoire courant d'une fonction déployée n'est
  pas celui du dépôt, et `new URL(..., import.meta.url)` ne résout rien ici
  non plus. Un fichier de `public/` est servi par la plateforme : il n'y a plus
  de chemin à deviner ni de traçage à espérer.

  ⚠️ Des instances statiques, pas les fichiers variables. Satori ne sait pas
  lire une police à axes : nourri du Fraunces variable — quatre axes — comme du
  Manrope variable, il échoue sur une table qu'il croit trouver et l'image
  revient en 500. Les instances servies par Google pour un navigateur ancien
  font 39 Ko chacune, contre 360 et 165.

  Sous licence ouverte (SIL OFL). Elles sont téléchargées par le serveur qui
  dessine l'image, pas par le visiteur qui lit la page.

  Chargées une seule fois par instance — quatre routes composent ces images.
*/
let polices: Promise<
  { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" }[] | undefined
> | null = null;

async function lire(nom: string): Promise<ArrayBuffer> {
  const r = await fetch(`${SITE_URL}/polices/${nom}`);
  if (!r.ok) throw new Error(`${nom} : ${r.status}`);
  return r.arrayBuffer();
}

export function policesOG() {
  polices ??= Promise.all([lire("Fraunces.woff"), lire("Manrope.woff")])
    .catch((e: unknown) => {
      // Dessiner sans les polices plutôt que rendre 500 : une image absente
      // casse l'aperçu d'un lien, une image moins belle ne casse rien.
      console.error("[og] polices illisibles :", e instanceof Error ? e.message : e);
      return null;
    })
    .then((lues) => {
      /*
        ⚠️ `undefined`, pas un tableau vide. Satori refuse de composer sans la
        moindre police — « No fonts are loaded » — et l'image reviendrait en
        500. Omettre l'option le laisse prendre la sienne.
      */
      if (!lues) return undefined;
      const [fraunces, manrope] = lues;
      return [
        { name: "Fraunces", data: fraunces, weight: 600 as const, style: "normal" as const },
        { name: "Manrope", data: manrope, weight: 400 as const, style: "normal" as const },
      ];
    });
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

/**
 * L'étiquette de l'image de partage : le rythme, et la durée quand elle manque.
 *
 * ⚠️ Le rythme dit parfois déjà la durée. Le champ a été pensé pour la seule
 * cadence — son exemple, dans le type comme dans /admin, est « 8 semaines ·
 * mardi soir » — mais les douze parcours y portent aujourd'hui la durée en
 * tête. Concaténer sans regarder donnait la même valeur aux deux bouts d'une
 * seule ligne : « 32 HEURES · 8 SÉANCES LIVE • 4H CHACUNE · 32 HEURES ».
 *
 * On ne réécrit pas la saisie de la direction pour autant : on regarde avant
 * d'ajouter, ce qui reste juste dans les deux cas. C'est cette image que
 * WhatsApp, LinkedIn et Facebook affichent d'un lien — la seule chose que voit
 * quelqu'un qui n'a pas encore cliqué.
 */
export function etiquetteOG(rythme: string, dureeHeures: number): string {
  const ditDejaLaDuree = new RegExp(`\\b${dureeHeures}\\s*h(eures?)?\\b`, "i").test(rythme);
  return ditDejaLaDuree ? rythme : `${rythme} · ${dureeHeures} heures`;
}
