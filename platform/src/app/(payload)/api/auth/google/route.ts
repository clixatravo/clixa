/**
 * Départ de la connexion Google : on fabrique l'état, on l'écrit dans un
 * cookie, et on envoie le visiteur chez Google.
 *
 * L'état sert à une seule chose, mais elle compte : au retour, il prouve que la
 * requête vient bien du départ qu'on a nous-même provoqué. Sans lui, un tiers
 * peut fabriquer une adresse de retour avec *son* code d'autorisation et faire
 * atterrir le visiteur dans le compte de l'attaquant, où il déposera ensuite
 * ses propres informations.
 */
import { randomUUID } from "crypto";
import { COOKIE_ETAT, COOKIE_SUITE, googleConfigure, urlAutorisation } from "@/lib/google";

const QUART_D_HEURE = 15 * 60;

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (!googleConfigure()) {
    return Response.redirect(new URL("/compte/connexion?erreur=google-absent", url.origin), 303);
  }

  const etat = randomUUID();

  // Où revenir une fois connecté. Restreint aux chemins internes : « suite »
  // vient de la barre d'adresse, et une adresse absolue en ferait une
  // redirection ouverte — un lien clixa.africa qui dépose ailleurs.
  const demande = url.searchParams.get("suite") ?? "";
  const suite = demande.startsWith("/") && !demande.startsWith("//") ? demande : "/compte";

  const commun = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${QUART_D_HEURE}${
    url.protocol === "https:" ? "; Secure" : ""
  }`;

  return new Response(null, {
    status: 303,
    headers: [
      ["Location", urlAutorisation(url.origin, etat)],
      ["Set-Cookie", `${COOKIE_ETAT}=${etat}; ${commun}`],
      ["Set-Cookie", `${COOKIE_SUITE}=${encodeURIComponent(suite)}; ${commun}`],
    ],
  });
}
