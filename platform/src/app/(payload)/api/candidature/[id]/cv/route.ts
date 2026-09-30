import { getPayload } from "payload";
import config from "@payload-config";
import { lireCv } from "@/lib/cv";

/**
 * Servir le CV d'un candidat formateur, à l'équipe seule.
 *
 * Même garde que `api/recu/[id]` : une session *et* un compte du personnel.
 * `apprenants` est aussi une collection authentifiée ; sans le second contrôle,
 * un participant connecté lirait le CV de n'importe quel candidat.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const payload = await getPayload({ config });

  const { user } = await payload.auth({ headers: request.headers });
  if (!user || user.collection !== "utilisateurs") {
    return new Response("Non autorisé.", { status: 401 });
  }

  const { id } = await params;
  const candidature = await payload
    .findByID({ collection: "candidatures-formateurs", id, overrideAccess: false, user })
    .catch(() => undefined);
  if (!candidature) return new Response("Introuvable.", { status: 404 });

  const chemin = String(candidature.cvChemin ?? "");
  if (!chemin) return new Response("Cette candidature n'a pas de CV.", { status: 404 });

  let flux: Awaited<ReturnType<typeof lireCv>>;
  try {
    flux = await lireCv(chemin);
  } catch (e) {
    payload.logger.error({ err: e, chemin }, "[candidature] lecture du CV impossible");
    return new Response("Fichier illisible.", { status: 502 });
  }
  if (!flux) return new Response("Le fichier n'est plus dans le magasin.", { status: 404 });

  const nom = String(candidature.cvNom ?? "cv");
  return new Response(flux.stream as unknown as BodyInit, {
    headers: {
      "Content-Type": String(candidature.cvType ?? "application/octet-stream"),
      "Content-Disposition": `inline; filename="${nom.replace(/[^\w.\-]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
