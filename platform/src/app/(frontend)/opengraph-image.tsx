import { ImageResponse } from "next/og";
import { villesDisponibles } from "@/lib/catalogue";
import { CarteOG, tailleOG, policesOG } from "@/lib/og";

export const alt = "CLIXA Institute — Formations certifiantes et parcours exécutifs en Afrique";
export const size = tailleOG;
export const contentType = "image/png";

/**
 * Image de partage par défaut, utilisée par toutes les pages sans image propre.
 *
 * C'est elle qui paraît quand on colle le lien dans WhatsApp ou LinkedIn —
 * souvent la première chose qu'on voit du site, et parfois la seule.
 *
 * Elle annonçait « Agadir · Abidjan · Dakar » et « Présentiel et classe
 * virtuelle ». Les douze sessions se donnent toutes à distance et aucune ville
 * n'y figure : le partage promettait des lieux là où il n'y en a pas. Les deux
 * lignes se déduisent maintenant du catalogue, comme l'accroche du héros.
 */
export default async function Image() {
  const villes = await villesDisponibles();

  return new ImageResponse(
    <CarteOG
      badge={villes.length > 0 ? villes.join(" · ") : "Classe virtuelle · Live"}
      etiquette="Certifications · Exécutif · Corporate"
      titre="Des programmes qui changent une trajectoire."
      piedGauche={villes.length > 0 ? "Présentiel et classe virtuelle" : "À distance, en direct"}
    />,
    { ...size, fonts: await policesOG() },
  );
}
