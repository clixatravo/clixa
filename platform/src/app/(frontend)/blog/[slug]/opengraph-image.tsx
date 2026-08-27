import { ImageResponse } from "next/og";
import { CarteOG, tailleOG, policesOG } from "@/lib/og";
import { formatDateArticle, getArticle, nomCategorie } from "@/lib/blog";

export const alt = "Article — CLIXA Institute";
export const size = tailleOG;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getArticle(slug);

  if (!a) {
    return new ImageResponse(<CarteOG etiquette="Blog" titre="CLIXA Institute" />, {
      ...size,
      fonts: await policesOG(),
    });
  }

  return new ImageResponse(
    <CarteOG
      badge={nomCategorie(a.categorie)}
      etiquette={`${formatDateArticle(a.publieLe)} · ${a.lectureMinutes} min de lecture`}
      titre={a.titre}
      piedGauche={a.auteur}
    />,
    { ...size, fonts: await policesOG() },
  );
}
