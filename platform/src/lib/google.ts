/**
 * Connexion par compte Google, côté serveur.
 *
 * ── Pourquoi ce chemin existe ───────────────────────────────────────────────
 * Un participant qui revient sur son dossier six semaines plus tard a oublié le
 * mot de passe qu'il s'était inventé. Aucun lien « mot de passe oublié » ne lui
 * était offert sur l'espace participant, et l'équipe finissait par retrouver la
 * référence à la main. Un compte Google, il l'a déjà.
 *
 * ── Ce que Google prouve, et ce qu'il ne prouve pas ─────────────────────────
 * Google atteste que la personne contrôle l'adresse — à condition que
 * `email_verified` soit vrai. Un compte Workspace mal configuré peut porter une
 * adresse non vérifiée ; on refuse alors, plutôt que d'accorder à une adresse
 * non prouvée ce que la référence de dossier protégeait.
 *
 * ── La signature du jeton n'est pas vérifiée ici, exprès ────────────────────
 * Le jeton est reçu *de Google directement*, sur un canal TLS que nous ouvrons
 * et dont nous avons authentifié le pair. Google documente ce cas : la
 * vérification par clé publique sert à qui reçoit le jeton d'un tiers — un
 * navigateur, un client mobile. Ici elle n'ajouterait rien et ferait dépendre
 * la connexion d'un second appel réseau.
 */

const AUTORISATION = "https://accounts.google.com/o/oauth2/v2/auth";
const JETON = "https://oauth2.googleapis.com/token";

export const COOKIE_ETAT = "clixa-oauth-etat";
export const COOKIE_SUITE = "clixa-oauth-suite";

export interface IdentiteGoogle {
  googleId: string;
  email: string;
  nom: string;
  emailVerifie: boolean;
}

/** Vraie quand les deux variables sont posées. Sans elles, aucun bouton n'est offert. */
export function googleConfigure(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * L'adresse de retour doit être identique, au caractère près, à celle déclarée
 * dans la console Google — sinon l'échange du code échoue avec
 * `redirect_uri_mismatch`, message que Google n'explique pas davantage.
 */
export function adresseRetour(origine: string): string {
  return `${origine}/api/auth/google/retour`;
}

export function urlAutorisation(origine: string, etat: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: adresseRetour(origine),
    response_type: "code",
    scope: "openid email profile",
    state: etat,
    // Sans cela, Google renvoie sur le compte déjà connecté sans jamais
    // demander lequel : une machine partagée rattacherait le dossier au voisin.
    prompt: "select_account",
  });
  return `${AUTORISATION}?${p}`;
}

/** Échange le code contre l'identité. Renvoie undefined si Google refuse. */
export async function identite(code: string, origine: string): Promise<IdentiteGoogle | undefined> {
  const reponse = await fetch(JETON, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: adresseRetour(origine),
      grant_type: "authorization_code",
    }),
  });

  if (!reponse.ok) {
    console.error("[google] échange du code refusé", reponse.status, await reponse.text());
    return undefined;
  }

  const { id_token } = (await reponse.json()) as { id_token?: string };
  if (!id_token) return undefined;

  const charge = decoder(id_token);
  if (!charge) return undefined;

  const { sub, email, email_verified, name, given_name } = charge;
  if (typeof sub !== "string" || typeof email !== "string") return undefined;

  return {
    googleId: sub,
    email: email.toLowerCase(),
    nom: (typeof name === "string" && name) || (typeof given_name === "string" && given_name) || "",
    emailVerifie: email_verified === true || email_verified === "true",
  };
}

/** Lit la charge utile du JWT sans en vérifier la signature — voir l'en-tête. */
function decoder(jeton: string): Record<string, unknown> | undefined {
  const charge = jeton.split(".")[1];
  if (!charge) return undefined;
  try {
    return JSON.parse(Buffer.from(charge, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}
