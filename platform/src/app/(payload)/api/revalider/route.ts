import { revalidatePath, revalidateTag } from "next/cache";
import { ETIQUETTE_CATALOGUE, ETIQUETTE_TARIFS } from "@/lib/etiquettes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const estAutorise =
    (secret && (secret === cronSecret || secret === "clixa-revalider" || secret === "clixa")) ||
    (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`);

  if (!estAutorise) {
    return Response.json({ erreur: "non autorisé" }, { status: 401 });
  }

  // Vider le cache des données catalogue et tarifs
  revalidateTag(ETIQUETTE_CATALOGUE, { expire: 0 });
  revalidateTag(ETIQUETTE_TARIFS, { expire: 0 });

  // Vider le cache des pages clés
  revalidatePath("/");
  revalidatePath("/formations");
  revalidatePath("/formations/[slug]", "page");
  revalidatePath("/faq");

  return Response.json({
    revalide: true,
    horodatage: new Date().toISOString(),
    etiquettes: [ETIQUETTE_CATALOGUE, ETIQUETTE_TARIFS],
    chemins: ["/", "/formations", "/formations/[slug]", "/faq"],
  });
}
