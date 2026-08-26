/**
 * Retour de Google : on vérifie l'état, on échange le code, on ouvre la session.
 *
 * ── Ce qui identifie le compte ──────────────────────────────────────────────
 * L'identifiant Google (`sub`), pas l'adresse. Une adresse change, se cède, se
 * récupère après abandon ; `sub` ne se réattribue jamais. L'adresse ne sert
 * qu'une fois, pour reconnaître un compte créé plus tôt avec un mot de passe et
 * le rejoindre au lieu d'en ouvrir un second.
 *
 * ── Pourquoi le rattachement est ici plus large qu'ailleurs ─────────────────
 * Créer un compte par formulaire exige l'adresse *et* la référence du dossier,
 * parce qu'une adresse saisie ne prouve rien. Google, lui, atteste que la
 * personne contrôle l'adresse. L'adresse seule suffit donc — c'est exactement
 * la preuve qui manquait. Si `email_verified` est faux, on retombe sous la
 * règle stricte : aucun rattachement.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { COOKIE_ETAT, COOKIE_SUITE, googleConfigure, identite } from "@/lib/google";
import { ouvrirSession } from "@/lib/session";

const EFFACER = "Path=/; HttpOnly; Max-Age=0";

function versConnexion(origine: string, erreur: string): Response {
  return new Response(null, {
    status: 303,
    headers: [
      ["Location", new URL(`/compte/connexion?erreur=${erreur}`, origine).toString()],
      ["Set-Cookie", `${COOKIE_ETAT}=; ${EFFACER}`],
      ["Set-Cookie", `${COOKIE_SUITE}=; ${EFFACER}`],
    ],
  });
}

function lireCookie(request: Request, nom: string): string | undefined {
  for (const morceau of (request.headers.get("cookie") ?? "").split(";")) {
    const [cle, ...reste] = morceau.trim().split("=");
    if (cle === nom) return reste.join("=");
  }
  return undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origine = url.origin;

  if (!googleConfigure()) return versConnexion(origine, "google-absent");

  // Le visiteur a refusé, ou fermé la fenêtre de Google. Ce n'est pas une panne.
  if (url.searchParams.get("error")) return versConnexion(origine, "google-refus");

  const attendu = lireCookie(request, COOKIE_ETAT);
  const recu = url.searchParams.get("state");
  if (!attendu || !recu || attendu !== recu) return versConnexion(origine, "google-etat");

  const code = url.searchParams.get("code");
  if (!code) return versConnexion(origine, "google-etat");

  const personne = await identite(code, origine);
  if (!personne) return versConnexion(origine, "google-echange");

  // Une adresse que Google lui-même ne confirme pas ne vaut pas mieux qu'une
  // adresse tapée dans un formulaire.
  if (!personne.emailVerifie) return versConnexion(origine, "google-non-verifie");

  const payload = await getPayload({ config });

  const parGoogle = await payload.find({
    collection: "apprenants",
    where: { googleId: { equals: personne.googleId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  let compte = parGoogle.docs[0];

  if (!compte) {
    const parEmail = await payload.find({
      collection: "apprenants",
      where: { email: { equals: personne.email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    compte = parEmail.docs[0];

    if (compte) {
      /*
        Le compte existait, créé au mot de passe. On y accroche l'identifiant
        Google plutôt que d'ouvrir un doublon : deux comptes pour une personne,
        c'est un dossier visible depuis l'un et invisible depuis l'autre, et
        l'équipe qui cherche au téléphone n'a aucun moyen de savoir lequel.

        Le mot de passe existant reste valable — les deux chemins mènent
        désormais au même endroit.
      */
      compte = await payload.update({
        collection: "apprenants",
        id: compte.id,
        overrideAccess: true,
        data: { googleId: personne.googleId, emailVerifie: true },
      });
    } else {
      compte = await payload.create({
        collection: "apprenants",
        overrideAccess: true,
        data: {
          email: personne.email,
          // Payload exige un mot de passe à la création. Celui-ci n'est jamais
          // communiqué ni réutilisable : il tient la place, et le participant
          // passera par « mot de passe oublié » s'il veut s'en donner un.
          password: crypto.randomUUID() + crypto.randomUUID(),
          nom: personne.nom || personne.email.split("@")[0] || "Participant",
          googleId: personne.googleId,
          emailVerifie: true,
        },
      });
    }
  }

  await rattacherParAdresse(payload, personne.email, Number(compte.id));

  const cookie = await ouvrirSession(payload, "apprenants", compte.id);
  const suite = decodeURIComponent(lireCookie(request, COOKIE_SUITE) ?? "") || "/compte";

  return new Response(null, {
    status: 303,
    headers: [
      ["Location", new URL(suite.startsWith("/") ? suite : "/compte", origine).toString()],
      ["Set-Cookie", cookie],
      ["Set-Cookie", `${COOKIE_ETAT}=; ${EFFACER}`],
      ["Set-Cookie", `${COOKIE_SUITE}=; ${EFFACER}`],
    ],
  });
}

/**
 * Rattache les dossiers portant cette adresse — et seulement quand Google l'a
 * confirmée. Sans cela, qui s'est inscrit puis se connecte trouve une page vide
 * et croit son inscription perdue : c'est l'appel que l'équipe recevait.
 */
async function rattacherParAdresse(
  payload: Awaited<ReturnType<typeof getPayload>>,
  email: string,
  compteId: number,
): Promise<void> {
  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { apprenantEmail: { equals: email }, apprenant: { exists: false } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });

  for (const dossier of docs) {
    await payload.update({
      collection: "inscriptions",
      id: dossier.id,
      overrideAccess: true,
      data: { apprenant: compteId },
    });
  }
}
