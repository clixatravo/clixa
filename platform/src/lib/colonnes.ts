/**
 * Une colonne ajoutée à une collection paraît chez tout le monde, sans script.
 *
 * ── Le défaut, revenu trois fois ─────────────────────────────────────────────
 * Payload garde les colonnes d'une liste **par compte** : dès qu'on touche au
 * menu « Colonnes », ou qu'on trie, il enregistre la liste telle qu'elle est ce
 * jour-là, et `defaultColumns` cesse de s'appliquer à ce compte. Toute colonne
 * ajoutée ensuite lui est invisible. Le 21 septembre 2026, le compte
 * `administration` n'avait ni « Suivi par » ni les trois champs de profil ;
 * `scripts/reparer-les-colonnes.ts` les a rendus. Le 25, ils avaient de nouveau
 * disparu — « l administration madam hajar kaymechi liha l colone dyal
 * fonction ».
 *
 * ⚠️ **Réparer la base ne suffisait pas, et c'est ce qui a été mesuré.** Payload
 * porte aussi la liste **dans l'adresse** (`?columns=[…]`) : un favori, un
 * onglet resté ouvert ou une page de l'historique la renvoient à chaque visite,
 * et le serveur la réenregistre par-dessus la réparation. Le 25, la préférence
 * portait de nouveau trente-sept colonnes, triée par « statut », dix lignes par
 * page — exactement la liste d'avant la réparation, rejouée.
 *
 * ── La règle ────────────────────────────────────────────────────────────────
 * Une colonne que la collection déclare dans `defaultColumns` et qui est
 * **absente** de la liste figée est ajoutée, visible, derrière son voisin de
 * gauche. Une colonne **présente mais décochée** reste décochée : c'est un
 * choix, et le défaire ferait réapparaître chaque matin ce que quelqu'un a
 * retiré exprès.
 *
 * Elle s'applique à trois endroits, qui lisent tous cette fonction :
 * - à la lecture d'une préférence (`afterRead`), ce qui répare sans rien écrire ;
 * - à son écriture (`beforeChange`), ce qui empêche une liste d'avant de revenir ;
 * - à l'adresse elle-même (`ColonnesAJour`), ce qui répare ce qui s'affiche.
 *
 * ⚠️ **La liste attendue est celle de la collection, jamais une copie.** Une
 * seconde table des colonnes finirait par diverger — et c'est une divergence
 * entre deux comptes qui a produit ce défaut.
 *
 * Pur, sans Payload : il sert au serveur et au navigateur.
 */

export interface ColonnePreferee {
  accessor: string;
  active?: boolean;
}

export interface ColonnesCompletees<T> {
  colonnes: T[];
  /** Les accesseurs ajoutés — vide quand rien ne manquait. */
  ajoutees: string[];
}

/**
 * Insère les colonnes manquantes derrière leur voisin de gauche.
 *
 * ⚠️ Toutes à la fin, elles se retrouveraient après « créé le » et les colonnes
 * volontairement décochées : présentes, et hors de l'écran — c'est-à-dire
 * inutiles, le défaut même qu'on répare.
 */
function inserer<T>(
  figees: T[],
  attendues: readonly string[],
  accesseur: (c: T) => string,
  fabriquer: (a: string) => T,
): ColonnesCompletees<T> {
  const presentes = new Set(figees.map(accesseur));
  const manquantes = attendues.filter((a) => a && !presentes.has(a));
  if (manquantes.length === 0) return { colonnes: figees, ajoutees: [] };

  const colonnes = [...figees];
  for (const m of manquantes) {
    const rang = attendues.indexOf(m);
    let ou = 0;
    for (let i = rang - 1; i >= 0; i -= 1) {
      const voisin = colonnes.findIndex((c) => accesseur(c) === attendues[i]);
      if (voisin !== -1) {
        ou = voisin + 1;
        break;
      }
    }
    colonnes.splice(ou, 0, fabriquer(m));
  }
  return { colonnes, ajoutees: manquantes };
}

/** La forme enregistrée en base : `{ accessor, active }`. */
export function completerLesColonnes(
  figees: readonly ColonnePreferee[],
  attendues: readonly string[],
): ColonnesCompletees<ColonnePreferee> {
  return inserer(
    [...figees],
    attendues,
    (c) => c.accessor,
    (a) => ({ accessor: a, active: true }),
  );
}

/**
 * La forme de l'adresse : `["reference", "-apprenant"]`, le tiret marquant une
 * colonne décochée — celle de `transformColumnsToSearchParams` chez Payload.
 */
export function completerLesColonnesDeLAdresse(
  figees: readonly string[],
  attendues: readonly string[],
): ColonnesCompletees<string> {
  return inserer(
    [...figees],
    attendues,
    (c) => (c.startsWith("-") ? c.slice(1) : c),
    (a) => a,
  );
}

/** `collection-inscriptions` → `inscriptions` ; toute autre clef → `undefined`. */
export function collectionDeLaClef(clef: unknown): string | undefined {
  return typeof clef === "string" && clef.startsWith("collection-")
    ? clef.slice("collection-".length)
    : undefined;
}
