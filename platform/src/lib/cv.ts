import { put, get, del } from "@vercel/blob";

/**
 * Le dépôt et la lecture des CV des candidats formateurs.
 *
 * Le même magasin privé que les justificatifs de versement, et pour la même
 * raison (voir `lib/recus.ts`) : un CV porte une adresse, un numéro, parfois
 * une date de naissance. Le protéger par une adresse qu'on espère
 * introuvable, ce n'est pas le protéger. Seule `api/candidature/[id]/cv`,
 * derrière une session d'équipe, relit le fichier.
 *
 * ⚠️ Sans `BLOB_READ_WRITE_TOKEN`, rien n'est déposé et l'appel le dit : on ne
 * retombe pas en silence sur le disque de Vercel, qui est en lecture seule.
 */
export function stockageCvConfigure(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Dépose le CV et rend son chemin.
 *
 * Le chemin ne porte ni le nom ni l'adresse du candidat : un nom de fichier se
 * voit dans les journaux et dans le tableau de bord du magasin. Le suffixe
 * aléatoire de Vercel évite que deux CV s'écrasent.
 */
export async function deposerCv(
  fichier: File,
): Promise<{ chemin: string; taille: number; type: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN absent : aucun CV ne peut être déposé.");

  const extension =
    fichier.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z]/g, "")
      .slice(0, 5) || "bin";
  const { pathname } = await put(`candidatures/cv.${extension}`, fichier, {
    access: "private",
    addRandomSuffix: true,
    token,
  });
  return { chemin: pathname, taille: fichier.size, type: fichier.type };
}

/** Relit un CV. Réservé aux appelants qui ont déjà vérifié la session d'équipe. */
export async function lireCv(chemin: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN absent : aucun CV ne peut être relu.");
  return get(chemin, { access: "private", token });
}

/** Retire un CV du magasin, quand sa candidature est supprimée. */
export async function retirerCv(chemin: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  await del(chemin, { token });
}
