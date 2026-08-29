import { appelant, cadenceOk, tropVite } from "@/lib/cadence";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { courrielContrat } from "@/lib/courriel";

/**
 * Le participant demande son contrat de formation.
 *
 * ── Pourquoi une demande, et pas un lien toujours offert ────────────────────
 * La pré-inscription ne coûte rien et n'engage à rien : beaucoup s'arrêteront
 * là, et c'est très bien. Demander son contrat est le geste par lequel on passe
 * de « je me renseigne » à « je m'engage » — et c'est ce geste qui prévient
 * l'équipe qu'il faut appeler, orienter, puis envoyer les instructions de
 * paiement une fois le document signé.
 *
 * Le PDF, lui, se compose depuis le dossier : rien à préparer, rien à attendre.
 * La demande n'ouvre pas un droit, elle déclenche une conversation.
 *
 * ── Ce qu'elle ne fait pas ──────────────────────────────────────────────────
 * Elle ne signe rien, ne réserve rien de plus et ne touche pas à l'échéancier.
 * La clef reste la référence du dossier, comme pour le consulter.
 */

const LEURRE = "site_web";

export async function POST(request: Request) {
  if (!cadenceOk("contrat", appelant(request), 20, 60_000)) return tropVite(60);

  const form = await request.formData();
  const texte = (cle: string) => (form.get(cle) ?? "").toString().trim();

  const reference = texte("dossier").toUpperCase();
  const retour = `/inscription/${encodeURIComponent(reference)}`;

  if (!/^[A-Z0-9-]{4,24}$/.test(reference)) redirect("/" as Route);
  if (texte(LEURRE) !== "") redirect(retour as Route);

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { reference: { equals: reference } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });

  const dossier = docs[0];
  if (!dossier) redirect("/" as Route);

  const statut = String(dossier.statut ?? "");
  if (statut === "annulee" || statut === "terminee") redirect(retour as Route);

  /*
    Une demande déjà faite ne se refait pas : on garde la première date. Le
    participant qui reclique verra le même document, et l'équipe ne recevra pas
    un second courriel pour la même chose.
  */
  if (dossier.contratDemandeLe) redirect(`${retour}?contrat=deja` as Route);

  await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    data: { contratDemandeLe: new Date().toISOString() },
    overrideAccess: true,
  });

  const session = typeof dossier.session === "object" ? dossier.session : undefined;
  const programme =
    session && typeof session.programme === "object" ? session.programme : undefined;

  await courrielContrat(payload, {
    reference,
    dossierId: dossier.id,
    apprenantNom: String(dossier.apprenantNom ?? ""),
    apprenantEmail: String(dossier.apprenantEmail ?? ""),
    apprenantWhatsapp: String(dossier.apprenantWhatsapp ?? ""),
    programmeTitre: String(programme?.titre ?? ""),
  });

  redirect(`${retour}?contrat=ok` as Route);
}
