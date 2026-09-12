/**
 * Relancer un versement à la demande de l'équipe.
 *
 * ── Pourquoi une route, et non un bouton qui enregistre le dossier ──────────
 * Comme `api/admin/rappel` : ce bouton **fait partir un courriel**, ce qui ne
 * peut pas se faire depuis le navigateur et ne doit pas dépendre d'un
 * enregistrement qui pourrait réussir à moitié. On envoie, puis on note — dans
 * cet ordre, jamais l'inverse.
 *
 * ⚠️ **Une session d'équipe, et pas seulement une session.** `apprenants` est
 * authentifiée elle aussi : sans le second contrôle, un participant connecté
 * ferait partir des réclamations d'argent au nom de la maison. C'est le trou
 * d'`export-admissions`, refermé de la même façon.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { courrielRelance } from "@/lib/courriel";
import { libelleDuCompte } from "@/lib/equipe";
import { NextResponse } from "next/server";

const JOUR_MS = 86_400_000;

interface Echeance {
  montant?: number | null;
  statut?: string | null;
  dateLimite?: string | null;
  relanceeLe?: string | null;
}

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
    ── ⚠️ On ne réclame rien à qui n'a nulle part où l'envoyer ───────────────
    Les coordonnées de règlement ne figurent nulle part sur le site : elles
    partent par courriel, composées par l'équipe, après la signature. Écrire
    « venez terminer votre paiement » à qui ne les a pas reçues lui demande un
    geste qu'il n'a aucun moyen de faire — le défaut que `prochaineEtape`
    corrige sur la page du dossier, et que le formulaire d'annonce de transfert
    a coûté à un vrai prospect le 5 septembre 2026.

    C'est la même règle que la tâche de 8 h applique, et pour la même raison.
  */
  if (!dossier.coordonneesEnvoyeesLe) {
    return NextResponse.json(
      {
        erreur:
          "Il n'a pas encore reçu de quoi régler. Envoyez-lui les instructions de paiement " +
          "d'abord — sans elles, cette relance lui demanderait un geste impossible.",
      },
      { status: 409 },
    );
  }

  const echeances = (dossier.echeances ?? []) as Echeance[];
  /*
    ⚠️ La première non réglée, dans l'ordre — jamais « la plus en retard ». Un
    échéancier se solde dans l'ordre, et réclamer la deuxième quand la première
    n'est pas arrivée ferait payer deux fois ou pas du tout.
  */
  const rang = echeances.findIndex((e) => e.statut !== "regle");
  if (rang < 0) {
    return NextResponse.json(
      { erreur: "Tout est réglé sur ce dossier : il n'y a rien à relancer." },
      { status: 409 },
    );
  }

  const due = echeances[rang]!;
  if (!due.dateLimite) {
    return NextResponse.json(
      { erreur: "Cette échéance n'a pas de date limite : le courriel n'aurait rien à annoncer." },
      { status: 409 },
    );
  }

  const session = typeof dossier.session === "object" ? dossier.session : undefined;
  const programme =
    session && typeof session.programme === "object" ? session.programme : undefined;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.clixa.africa").replace(/\/+$/, "");
  const joursRestants = Math.floor((new Date(due.dateLimite).getTime() - Date.now()) / JOUR_MS);

  const parti = await courrielRelance(payload, {
    reference: String(dossier.reference),
    apprenantNom: String(dossier.apprenantNom),
    apprenantEmail: String(dossier.apprenantEmail),
    programmeTitre: programme?.titre ?? "votre parcours",
    montant: due.montant ?? 0,
    dateLimite: String(due.dateLimite),
    enRetard: joursRestants < 0,
    urlDossier: `${site}/inscription/${dossier.reference}`,
  });

  if (!parti) {
    /*
      ⚠️ Rien n'est noté : sans trace, la tâche du lendemain reprend l'échéance.
      Un bouton qui dirait « c'est parti » sur un envoi manqué ferait croire la
      personne relancée, et l'échéance se tairait sept jours.
    */
    return NextResponse.json(
      { erreur: "Le courriel n'est pas parti. Rien n'a été noté ; réessayez." },
      { status: 502 },
    );
  }

  /*
    La trace fait taire cette échéance pour la tâche quotidienne — c'est voulu :
    l'équipe vient de la relancer à la main, et un second message le lendemain
    matin se lirait comme de l'insistance. Le journal, lui, reçoit la ligne qui
    répond à « quelqu'un l'a-t-il déjà contacté ? ».
  */
  const maintenant = new Date().toISOString();
  const journal = Array.isArray(dossier.echanges) ? dossier.echanges : [];
  await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    overrideAccess: true,
    data: {
      echeances: echeances.map((e, i) => (i === rang ? { ...e, relanceeLe: maintenant } : e)),
      echanges: [
        ...journal,
        {
          quoi: "paiement",
          le: maintenant,
          par: user.id,
          // Recopié : la relation n'est lisible que par la direction.
          parNom: libelleDuCompte(user as never),
        },
      ],
    } as never,
  });

  return NextResponse.json({ montant: due.montant ?? 0, enRetard: joursRestants < 0 });
}
