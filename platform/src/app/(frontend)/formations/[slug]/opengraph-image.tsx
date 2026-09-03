import { ImageResponse } from "next/og";
import { CarteOG, etiquetteOG, tailleOG, policesOG } from "@/lib/og";
import {
  formatPrix,
  getProgramme,
  getSessions,
  getTarifs,
  libelleMode,
  prixAffiche,
} from "@/lib/catalogue";

export const alt = "Formation CLIXA Institute";
export const size = tailleOG;
export const contentType = "image/png";

/**
 * INT-03 — Image de partage par formation.
 *
 * Sur nos marchés, les liens circulent surtout par WhatsApp, où un lien nu
 * convertit mal. Une image est générée au build pour chaque programme.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProgramme(slug);

  if (!p) {
    return new ImageResponse(
      <CarteOG etiquette="CLIXA Institute" titre="Formations certifiantes en Afrique" />,
      { ...size, fonts: await policesOG() },
    );
  }

  const modes = [...new Set((await getSessions(p.slug)).map((s) => s.mode))];
  const prix = prixAffiche(await getTarifs());

  return new ImageResponse(
    <CarteOG
      badge={p.certification ?? "Formation certifiante"}
      etiquette={etiquetteOG(p.rythme, p.dureeHeures)}
      titre={p.titre}
      piedGauche={modes.map((m) => libelleMode[m]).join("  ·  ")}
      piedDroit={
        prix !== undefined ? (
          <div style={{ display: "flex", alignItems: "baseline" }}>
            {modes.length > 1 && (
              <span style={{ fontSize: 20, color: "#B9B7AC", marginRight: 12 }}>dès</span>
            )}
            <span style={{ fontSize: 46, color: "#E9CD84" }}>{formatPrix(prix)}</span>
          </div>
        ) : undefined
      }
    />,
    { ...size, fonts: await policesOG() },
  );
}
