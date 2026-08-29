import { put, get, del } from "@vercel/blob";

/** 5 Mo. Vercel refuse le corps d'une requête au-delà de 4,5 Mo ; on borne avant. */
export const TAILLE_MAX = 5 * 1024 * 1024;

/**
 * Ce qu'un guichet remet, et rien d'autre.
 *
 * ⚠️ Pas de SVG : c'est du XML, il exécute du script, et aucun guichet n'en
 * délivre. Le PDF est admis — la moitié des reçus de virement sortent ainsi
 * d'une application bancaire — parce qu'il n'est jamais rendu au visiteur : il
 * est téléchargé par l'équipe, derrière une session.
 */
export const TYPES_ACCEPTES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

export const estTypeAccepte = (t: string): boolean =>
  (TYPES_ACCEPTES as readonly string[]).includes(t);

/**
 * Le dépôt et la lecture des justificatifs de versement.
 *
 * ── Pourquoi ce fichier existe, plutôt que le greffon de Payload ────────────
 * `@payloadcms/storage-vercel-blob` ne sait écrire qu'en `access: 'public'` —
 * son propre type le dit, et le magasin privé refuse net : « Cannot use public
 * access on a private store ». Un dépôt public aurait marché, à une condition
 * près : que personne ne trouve jamais l'adresse du fichier. Un reçu porte un
 * nom, un montant et parfois un numéro de compte ; le protéger par une adresse
 * qu'on espère introuvable, ce n'est pas le protéger.
 *
 * Le SDK, lui, sait faire du privé. Ces trois fonctions sont tout ce qu'il
 * fallait.
 *
 * ⚠️ Sans `BLOB_READ_WRITE_TOKEN`, rien n'est déposé et l'appel le dit. On ne
 * retombe pas en silence sur le disque : sur Vercel il est en lecture seule, et
 * un reçu écrit là disparaîtrait sans erreur — c'est exactement ce qui est
 * arrivé à `Medias`, qui n'a jamais reçu un fichier en production sans que
 * personne le remarque.
 */
export function stockageConfigure(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Dépose le fichier et rend son chemin dans le magasin. */
export async function deposerRecu(
  reference: string,
  fichier: File,
): Promise<{ chemin: string; taille: number; type: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN absent : aucun reçu ne peut être déposé.");

  const extension = fichier.name.split(".").pop()?.toLowerCase().slice(0, 5) ?? "bin";
  /*
    Le chemin porte la référence du dossier : l'équipe qui ouvre le magasin
    voit à quel dossier chaque fichier appartient sans ouvrir la base. Le
    suffixe aléatoire est posé par Vercel — sans lui, deux reçus déposés pour
    la même échéance se seraient écrasés.
  */
  const { pathname } = await put(`recus/${reference}/versement.${extension}`, fichier, {
    access: "private",
    addRandomSuffix: true,
    token,
  });

  return { chemin: pathname, taille: fichier.size, type: fichier.type };
}

/** Relit un reçu. Réservé aux appelants qui ont déjà vérifié la session. */
export async function lireRecu(chemin: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN absent : aucun reçu ne peut être relu.");
  return get(chemin, { access: "private", token });
}

/** Supprime un reçu du magasin. Appelé quand son dossier disparaît. */
export async function retirerRecu(chemin: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  await del(chemin, { token });
}
