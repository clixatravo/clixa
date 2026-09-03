import { getDossier } from "@/lib/inscriptions";
import { appelant, cadenceOk, tropVite } from "@/lib/cadence";
import { CertificatPDF } from "@/lib/certificat";
import { renderToBuffer } from "@react-pdf/renderer";

/**
 * Le certificat professionnel, servi au participant.
 *
 * ── Pourquoi maintenant, et pas avec le LMS ─────────────────────────────────
 * `Inscriptions.ts` renvoyait ce document à plus tard, « quand le LMS
 * viendra » — en le confondant avec la progression suivie leçon par leçon,
 * que Décision A écarte pour cette année. Il n'en a pas besoin : il ne dépend
 * que du statut « Terminée », posé à la main par l'équipe, exactement comme
 * le contrat ne dépend que d'une signature simple et non d'un tiers de
 * confiance qualifié.
 *
 * Le dessin vit dans `lib/certificat.tsx`, partagé avec le script qui
 * fabrique le spécimen : un spécimen dessiné à part finit toujours par mentir.
 *
 * ⚠️ La référence imprimée sur le document (« CLIXA-… ») n'est pas la clef de
 * l'URL : elle se dérive de la référence du dossier, sans compteur ni table
 * de plus à tenir à jour — le même choix que la référence du dossier
 * elle-même, tirée une fois et jamais recalculée.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  /*
    Même clef que le contrat et l'attestation : la référence du dossier ouvre
    le document. Le frein est celui de l'attestation, pas celui — absent — du
    contrat : un document qui nomme le participant en clair mérite le même
    plancher que l'attestation d'admission.
  */
  if (!cadenceOk("certificat", appelant(request), 20, 60_000)) return tropVite(60);

  const { reference } = await params;
  const dossier = await getDossier(reference);
  if (!dossier) {
    return new Response("Dossier introuvable.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  /*
    ── Le certificat ne se réclame pas avant d'être mérité ─────────────────────
    Même défaut que celui déjà corrigé pour les instructions de paiement : la
    page ne doit rien promettre qu'elle ne peut pas tenir. Tant que l'équipe
    n'a pas marqué le dossier « Terminée », aucun PDF n'existe.
  */
  if (dossier.statut !== "terminee") {
    return new Response(
      "Certificat pas encore disponible : ce parcours n'est pas encore marqué terminé.",
      { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const buffer = await renderToBuffer(<CertificatPDF dossier={dossier} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="CLIXA-certificat-${dossier.reference}.pdf"`,
      // Un certificat porte le nom du participant : jamais dans un cache partagé.
      "Cache-Control": "private, no-store",
    },
  });
}
