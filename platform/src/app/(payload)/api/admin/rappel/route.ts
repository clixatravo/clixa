/**
 * Envoyer le rappel « il vous reste N jours » à la demande de l'équipe.
 *
 * ── Pourquoi une route, et non un bouton qui enregistre le dossier ──────────
 * Les quatre boutons du fil des étapes posent une date et laissent un crochet
 * faire le reste. Celui-ci **envoie un courriel** : cela ne peut pas se faire
 * depuis le navigateur, et cela ne doit pas dépendre d'un enregistrement qui
 * pourrait réussir à moitié. La route envoie, puis note — dans cet ordre, et
 * par le même chemin que la tâche de 8 h (`lib/rappel.ts`).
 *
 * ⚠️ **Une session d'équipe, et pas seulement une session.** `apprenants` est
 * une collection authentifiée elle aussi : sans le second contrôle, n'importe
 * quel participant connecté ferait partir des courriels au nom de la maison.
 * C'est le trou trouvé sur `api/admin/export-admissions` le 1er septembre 2026,
 * et il se referme ici de la même façon.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { envoyerLeRappel, joursAvantLeTerme } from "@/lib/rappel";
import { NextResponse } from "next/server";

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
    .findByID({ collection: "inscriptions", id: String(corps.id), depth: 2, overrideAccess: true })
    .catch(() => null);
  if (!dossier) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }

  /*
    ⚠️ On refuse ce que le message rendrait faux. Le courriel dit « il vous reste
    N jours » : passé le terme il en resterait zéro, et c'est un autre message —
    celui que la tâche envoie au terme. Un contrat signé, lui, n'attend pas ce
    geste et n'a pas ce délai.
  */
  if (dossier.statut !== "demandee" || dossier.contratSigneLe) {
    return NextResponse.json(
      { erreur: "Ce rappel ne vaut que pour une pré-inscription sans contrat signé." },
      { status: 409 },
    );
  }
  if (dossier.placeRappeleeLe) {
    return NextResponse.json(
      { erreur: "Le terme est déjà annoncé : ce rappel n'a plus lieu d'être." },
      { status: 409 },
    );
  }

  const jours = joursAvantLeTerme(dossier.createdAt, Date.now());
  if (jours < 1) {
    return NextResponse.json(
      { erreur: "Le délai est atteint : c'est l'annonce du terme qui part, au prochain passage." },
      { status: 409 },
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.clixa.africa";
  const parti = await envoyerLeRappel(payload, dossier as never, {
    /*
      Le palier retenu est le nombre de jours restants : `envoyerLeRappel` ne
      garde que le plus petit déjà servi, si bien qu'un envoi manuel ne rouvre
      jamais un palier que la tâche a consommé, et ne bloque pas les suivants.
    */
    seuil: jours,
    jours,
    site,
    par: user.id,
  });

  if (!parti) {
    /*
      ⚠️ Rien n'a été noté — `envoyerLeRappel` n'écrit qu'après un envoi réussi.
      L'équipe doit le savoir : un bouton qui dit « c'est parti » sur un envoi
      manqué ferait croire la personne prévenue.
    */
    return NextResponse.json(
      { erreur: "Le courriel n'est pas parti. Rien n'a été noté ; réessayez." },
      { status: 502 },
    );
  }

  return NextResponse.json({ jours });
}
