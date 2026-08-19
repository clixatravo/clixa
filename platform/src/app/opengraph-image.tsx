import { ImageResponse } from "next/og";
import { CarteOG, tailleOG } from "@/lib/og";

export const alt = "CLIXA Institute — Formations certifiantes et parcours exécutifs en Afrique";
export const size = tailleOG;
export const contentType = "image/png";

/** Image de partage par défaut, utilisée par toutes les pages sans image propre. */
export default function Image() {
  return new ImageResponse(
    <CarteOG
      badge="Agadir · Abidjan · Dakar"
      etiquette="Certifications · Exécutif · Corporate"
      titre="Des programmes qui changent une trajectoire."
      piedGauche="Présentiel et classe virtuelle"
    />,
    size,
  );
}
