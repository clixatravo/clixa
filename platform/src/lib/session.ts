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
