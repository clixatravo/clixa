/**
 * Ouvrir une session Payload pour un participant, sans mot de passe.
 *
 * `payload.login()` exige un mot de passe : c'est tout son objet. Quand c'est
 * Google qui a prouvé l'identité, il n'y en a pas — et s'en inventer un pour le
 * passer à `login()` reviendrait à écraser celui que le participant a peut-être
 * choisi, en plus d'écrire un secret dont personne n'a besoin.
 *
 * On refait donc ce que fait `login()` une fois le mot de passe vérifié, avec
 * les mêmes outils publics : une session en base, un jeton signé qui la
 * désigne, un cookie qui le porte. Le résultat est indistinguable d'une
 * connexion ordinaire — même cookie, même expiration, même déconnexion.
 *
 * ⚠️ La session en base n'est pas décorative. `auth.useSessions` est actif sur
 * `apprenants` (table `apprenants_sessions`) : un jeton signé dont le `sid` ne
 * correspond à aucune ligne est rejeté. Signer sans écrire donnerait un cookie
 * accepté par le navigateur et refusé à chaque requête.
 */
import { randomUUID } from "crypto";
import { generatePayloadCookie, getFieldsToSign, jwtSign } from "payload";
import type { Payload } from "payload";

/** Les deux seules collections authentifiées ; l'élargir demande d'y penser. */
type CollectionAvecAuth = "apprenants" | "utilisateurs";

interface Session {
  id: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Renvoie la valeur de l'en-tête `Set-Cookie` à poser sur la réponse.
 */
export async function ouvrirSession(
  payload: Payload,
  collection: CollectionAvecAuth,
  id: string | number,
): Promise<string> {
  const config = payload.collections[collection]?.config;
  if (!config?.auth) throw new Error(`La collection « ${collection} » n'a pas d'authentification.`);

  const duree = config.auth.tokenExpiration;
  const maintenant = new Date();
  const sid = randomUUID();

  const utilisateur = (await payload.findByID({
    collection,
    id,
    overrideAccess: true,
    depth: 0,
  })) as unknown as Record<string, unknown> & { sessions?: Session[]; email: string };

  // Les sessions périmées sont retirées au passage : sans cela le tableau
  // grossit à chaque connexion et n'est jamais purgé, une ligne par appareil et
  // par mois.
  const vivantes = (utilisateur.sessions ?? []).filter((s) => new Date(s.expiresAt) > maintenant);

  await payload.update({
    collection,
    id,
    overrideAccess: true,
    data: {
      sessions: [
        ...vivantes,
        {
          id: sid,
          createdAt: maintenant.toISOString(),
          expiresAt: new Date(maintenant.getTime() + duree * 1000).toISOString(),
        },
      ],
    },
  });

  const { token } = await jwtSign({
    fieldsToSign: getFieldsToSign({
      collectionConfig: config,
      email: utilisateur.email,
      sid,
      user: { ...utilisateur, collection } as never,
    }),
    secret: payload.secret,
    tokenExpiration: duree,
  });

  return generatePayloadCookie({
    collectionAuthConfig: config.auth,
    cookiePrefix: payload.config.cookiePrefix,
    token,
  });
}

/**
 * Poser un cookie de session, puis continuer — sans compter sur la redirection.
 *
 * ⚠️ Un cookie `SameSite=Lax` posé au retour d'un site tiers ne repart **pas**
 * sur le saut de redirection qui suit. Le navigateur juge la chaîne entière :
 * partie de `accounts.google.com`, elle reste tierce jusqu'à destination, et le
 * cookie est retenu. La page d'arrivée se rend donc déconnectée. La navigation
 * suivante, elle, part de chez nous : le cookie passe, et tout paraît normal —
 * d'où le « il faut recharger » qui ressemble à un caprice et n'en est pas un.
 *
 * On rend donc une vraie page, en 200, qui porte le cookie ; le saut vers la
 * destination part de cette page, donc de notre site. Reproduit puis vérifié en
 * navigateur, au départ d'une autre origine.
 *
 * ── Pourquoi pas `SameSite=None` ────────────────────────────────────────────
 * Ce serait une ligne au lieu de trente, et le cookie de session partirait
 * alors sur *toutes* les requêtes tierces. `Lax` est aujourd'hui ce qui protège
 * nos routes de formulaire — inscription, transfert, signature — d'une requête
 * montée depuis une autre page. On ne défait pas une garde pour rattraper une
 * redirection.
 *
 * ── Pourquoi une balise `refresh` et pas seulement un script ────────────────
 * Sans JavaScript, un script ne fait rien et le visiteur resterait sur une page
 * vide. La balise agit dans tous les cas, le script la double pour que la
 * transition ne se voie pas, et le lien reste là si les deux échouent.
 */
export function pageDeContinuation(destination: string, cookies: string[]): Response {
  // Une seule interpolation, dans un attribut : on l'échappe pour de bon.
  const cible = destination
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${cible}">
<title>Connexion en cours…</title>
<style>
  html { color-scheme: dark }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#0E0E0F; color:#F3EFE4;
         font:400 0.95rem/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  p { margin:0; text-align:center; padding:2rem }
  a { color:#C6A15B }
</style>
</head>
<body>
<p>Connexion en cours…<br><a id="suite" href="${cible}">Continuer</a></p>
<script>
  /* La cible est relue depuis le lien : rien n'est écrit dans du JavaScript. */
  location.replace(document.getElementById("suite").href);
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: [
      ["Content-Type", "text/html; charset=utf-8"],
      // Une page qui pose une session ne se garde ni ne se rejoue.
      ["Cache-Control", "no-store"],
      ...cookies.map((c) => ["Set-Cookie", c] as [string, string]),
    ],
  });
}
