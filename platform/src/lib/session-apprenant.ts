import { cookies, headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";

/**
 * La session d'un participant.
 *
 * Le jeton voyage dans le même cookie que celui du back-office — c'est celui
 * que Payload lit — mais il porte sa collection : un jeton de participant ne
 * vaut rien sur /admin, dont `admin.user` ne désigne que `utilisateurs`.
 */

const NOM_COOKIE = "payload-token";

/** Pose le jeton, en HttpOnly : le script de la page n'y touche pas. */
export async function ouvrirSession(jeton: string, expiration?: number): Promise<void> {
  const boite = await cookies();
  boite.set(NOM_COOKIE, jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Payload rend une expiration en secondes depuis l'époque.
    ...(expiration ? { expires: new Date(expiration * 1000) } : {}),
  });
}

export async function fermerSession(): Promise<void> {
  const boite = await cookies();
  boite.delete(NOM_COOKIE);
}

export interface Participant {
  id: number | string;
  email: string;
  nom: string;
  /** Repris tels quels dans le tunnel : on ne redemande pas ce qu'on sait déjà. */
  telephone?: string;
  pays?: string;
}

/**
 * Le participant connecté, s'il y en a un.
 *
 * Rend `undefined` pour un membre du personnel : le back-office a ses propres
 * écrans, et une page « mon dossier » n'a rien à lui montrer.
 */
export async function participantConnecte(): Promise<Participant | undefined> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });

  if (!user || user.collection !== "apprenants") return undefined;

  const u = user as { nom?: unknown; telephone?: unknown; pays?: unknown };

  return {
    id: user.id,
    email: String(user.email),
    nom: String(u.nom ?? ""),
    ...(u.telephone ? { telephone: String(u.telephone) } : {}),
    ...(u.pays ? { pays: String(u.pays) } : {}),
  };
}
