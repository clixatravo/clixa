import { getPayload } from "payload";
import config from "@payload-config";
import { lireRecu } from "@/lib/recus";

/**
 * Servir un justificatif de versement, à l'équipe seule.
 *
 * ── Ce qui tient lieu de garde ──────────────────────────────────────────────
 * La session du back-office, et rien d'autre. Pas la référence du dossier :
 * elle ouvre la fiche du participant parce qu'il l'a reçue, mais un reçu porte
 * un numéro de compte et n'a pas à sortir sur une clef qui circule par WhatsApp
 * et par courriel.
 *
 * ⚠️ `payload.auth` est interrogé avec les en-têtes de la requête, et le
 * résultat est vérifié deux fois : une session doit exister *et* appartenir à
 * la collection du personnel. Sans le second contrôle, un compte participant
 * connecté aurait suffi — c'est précisément le trou qu'on veut fermer.
 *
 * ── Pourquoi on relaie au lieu de rediriger ─────────────────────────────────
 * Le magasin est privé : son adresse ne s'ouvre pas sans le jeton du projet.
 * Rediriger vers elle donnerait une page d'erreur ; relayer le flux garde le
 * jeton au serveur, où il doit rester.
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
  const recu = await payload
    .findByID({
      collection: "recus",
      id,
      overrideAccess: false,
      user,
    })
    .catch(() => undefined);

  if (!recu) return new Response("Introuvable.", { status: 404 });

  const chemin = String((recu as { chemin?: string }).chemin ?? "");
  if (!chemin) return new Response("Ce reçu n'a pas de fichier.", { status: 404 });

  let flux: Awaited<ReturnType<typeof lireRecu>>;
  try {
    flux = await lireRecu(chemin);
  } catch (e) {
    payload.logger.error({ err: e, chemin }, "[recu] lecture impossible");
    return new Response("Fichier illisible.", { status: 502 });
  }

  /*
    Le SDK rend `null` quand le chemin ne désigne rien : la fiche existe, le
    fichier a disparu du magasin. C'est un 404, pas une erreur serveur — et le
    dire permet de nettoyer la fiche plutôt que de chercher une panne.
  */
  if (!flux) {
    payload.logger.warn({ chemin }, "[recu] fiche sans fichier dans le magasin");
    return new Response("Le fichier n'est plus dans le magasin.", { status: 404 });
  }

  const nom = String((recu as { nomOriginal?: string }).nomOriginal ?? "justificatif");
  return new Response(flux.stream as unknown as BodyInit, {
    headers: {
      "Content-Type": String(
        (recu as { typeFichier?: string }).typeFichier ?? "application/octet-stream",
      ),
      /*
        `inline` : l'équipe veut regarder, pas collectionner des fichiers dans
        son dossier de téléchargements. Le nom reste posé pour l'enregistrement
        manuel, débarrassé de tout ce qui pourrait casser l'en-tête.
      */
      "Content-Disposition": `inline; filename="${nom.replace(/[^\w.\-]/g, "_")}"`,
      // Un justificatif n'a rien à faire dans un cache partagé.
      "Cache-Control": "private, no-store",
    },
  });
}
