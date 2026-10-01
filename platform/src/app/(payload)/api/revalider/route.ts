import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { ETIQUETTE_CATALOGUE, ETIQUETTE_TARIFS } from "@/lib/etiquettes";

export const dynamic = "force-dynamic";

/**
 * Vider le cache du catalogue et des tarifs, à la demande.
 *
 * ⚠️ **Elle s'ouvrait avec « clixa »** (trouvé en audit le 1er octobre 2026).
 * Deux mots de passe étaient écrits dans le code, à côté de `CRON_SECRET` :
 * `?secret=clixa` suffisait. Vider le cache n'expose aucune donnée, mais
 * quiconque pouvait le faire en boucle, et chaque page du catalogue retournait
 * alors interroger la base à chaque visite — ce que le cache existe pour
 * éviter.
 *
 * Désormais seul `CRON_SECRET` ouvre la route, comparé en temps constant comme
 * dans `api/relances`, et elle répond 503 quand il manque : une garde qui
 * s'efface quand on oublie de la régler n'en est pas une.
 */
function memeSecret(recu: string, attendu: string): boolean {
  // Les empreintes ont toujours la même longueur : `timingSafeEqual` ne lève pas.
  const a = createHash("sha256").update(recu).digest();
  const b = createHash("sha256").update(attendu).digest();
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ erreur: "service non configuré" }, { status: 503 });
  }

  const url = new URL(request.url);
  const parAdresse = url.searchParams.get("secret") ?? "";
  const parEntete = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const estAutorise =
    (parAdresse !== "" && memeSecret(parAdresse, cronSecret)) ||
    (parEntete !== "" && memeSecret(parEntete, cronSecret));

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
