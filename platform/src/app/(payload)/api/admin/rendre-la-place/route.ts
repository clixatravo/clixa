/**
 * Rendre une place au catalogue — le geste que le temps ne fait plus.
 *
 * ── ⚠️ Pourquoi ce bouton existe ────────────────────────────────────────────
 * Jusqu'au 11 septembre 2026, la tâche de 8 h rendait la place d'un dossier
 * dont le délai était écoulé. La direction l'a retiré : « khali suppression
 * automatique, hayedha — ana nb9a nthakem imta ». Sur une campagne qui achète
 * chaque prospect, une place reprise par un calcul est une vente perdue sans
 * que personne l'ait décidé.
 *
 * Le geste reste nécessaire — sans lui une session compterait des gens qui ne
 * viendront jamais — mais il devient un geste, et il est ici.
 *
 * ⚠️ **Jamais avant la date annoncée.** Le participant a lu « votre place est
 * tenue jusqu'au X », puis a reçu « le délai est passé, elle n'est pas encore
 * repartie ». Reprendre la place avant le battement de deux jours reviendrait à
 * lui retirer un délai promis par écrit — la route refuse, et le dit.
 *
 * ⚠️ **Une session d'équipe, et pas seulement une session.** Sans le second
 * contrôle, un participant connecté annulerait le dossier de quelqu'un d'autre.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { placeRendableDepuis } from "@/lib/places";
import { NextResponse } from "next/server";

const JOUR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export async function POST(requete: Request): Promise<Response> {
  const payload = await getPayload({ config });

  const { user } = await payload.auth({ headers: requete.headers });
  if (!user || user.collection !== "utilisateurs") {
    return NextResponse.json({ erreur: "Réservé à l'équipe." }, { status: 401 });
  }

  let corps: { id?: unknown };
  try {
    corps = (await requete.json()) as { id?: unknown };
  } catch {
    return NextResponse.json({ erreur: "Requête illisible." }, { status: 400 });
  }
  if (corps.id === undefined || corps.id === null) {
    return NextResponse.json({ erreur: "Dossier manquant." }, { status: 400 });
  }

  const dossier = await payload
    .findByID({ collection: "inscriptions", id: String(corps.id), depth: 0, overrideAccess: true })
    .catch(() => null);
  if (!dossier) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }

  if (dossier.statut === "annulee") {
    return NextResponse.json(
      { erreur: "Ce dossier est déjà annulé : sa place est au catalogue." },
      { status: 409 },
    );
  }

  /*
    ⚠️ Un versement reçu retient la place sans limite, et ce bouton ne peut pas
    l'annuler : rendre la place de quelqu'un qui a payé se réglerait avec un
    remboursement, pas avec un clic. Le statut se change alors à la main, en
    connaissance de cause.
  */
  if (dossier.statut !== "demandee") {
    return NextResponse.json(
      {
        erreur:
          "Ce dossier porte un versement. Sa place ne se rend pas d'un bouton — " +
          "changez le statut à la main si c'est vraiment ce que vous voulez.",
      },
      { status: 409 },
    );
  }

  const rendable = placeRendableDepuis(dossier as never);

  if (!rendable) {
    /*
      Deux cas, et la phrase les distingue parce que le geste à faire n'est pas
      le même : prévenir, ou attendre notre propre courriel.
    */
    return NextResponse.json(
      {
        erreur: dossier.contratSigneLe
          ? "Il a signé son contrat et attend nos coordonnées : sa place est tenue sans terme."
          : "Il n'a pas encore été prévenu. Envoyez-lui d'abord la relance pour la signature.",
      },
      { status: 409 },
    );
  }

  if (rendable.getTime() > Date.now()) {
    return NextResponse.json(
      {
        erreur:
          `Le délai annoncé court encore : sa place peut être rendue à partir du ` +
          `${JOUR.format(rendable)}.`,
      },
      { status: 409 },
    );
  }

  /*
    Le crochet `recompter` d'`Inscriptions` recalcule la session dans la foulée :
    la place revient au catalogue sans second aller-retour, et le décompte du
    site public suit.
  */
  await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    overrideAccess: true,
    data: { statut: "annulee" },
  });

  return NextResponse.json({ reference: dossier.reference });
}
