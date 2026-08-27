/**
 * Un frein sur les routes publiques.
 *
 * ── Ce qu'il protège ────────────────────────────────────────────────────────
 * La référence de dossier est la seule clef qui ouvre une fiche — nom, adresse,
 * téléphone, échéancier — et l'annonce d'un transfert. Sans frein, on peut
 * l'essayer aussi vite que le réseau le permet. Les formulaires publics, eux,
 * écrivent en base : rien n'empêchait d'y verser mille dossiers en une minute.
 *
 * ── Ce qu'il ne protège pas, et il faut le savoir ──────────────────────────
 * Le compte est tenu en mémoire, dans l'instance qui répond. Vercel en démarre
 * plusieurs, et chacune a la sienne : un assaillant réparti sur beaucoup de
 * connexions verra un plafond plus haut que celui annoncé. Ce frein arrête ce
 * qu'on arrête avec un frein — la boucle d'un script, la salve d'un curieux —
 * et pas une attaque distribuée, qui se traite à l'étage du réseau.
 *
 * Le choix est assumé : une limite imparfaite, sans dépendance ni service à
 * régler, vaut mieux que l'absence de limite en attendant le jour où l'on
 * branchera un compteur partagé.
 */

interface Fenetre {
  /** Horodatages des passages, du plus ancien au plus récent. */
  passages: number[];
  /** Dernier passage — sert à purger les clefs oubliées. */
  vu: number;
}

const registres = new Map<string, Map<string, Fenetre>>();

/*
  Plafond de clefs par registre. Sans lui, chaque adresse vue laisse une entrée
  et la mémoire de l'instance grandit avec le trafic. Au-delà, les moitiés les
  plus anciennes partent — elles ont, par construction, cessé d'appeler.
*/
const CLEFS_MAX = 5000;

/**
 * L'adresse qui appelle.
 *
 * Derrière Vercel, `x-forwarded-for` porte la chaîne des relais ; la première
 * entrée est le client. En développement, il n'y a pas d'en-tête : tout le
 * monde partage la même clef, ce qui suffit à éprouver le mécanisme.
 */
export function appelant(request: Request): string {
  const chaine = request.headers.get("x-forwarded-for") ?? "";
  return chaine.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

/**
 * Vrai si l'appel passe, faux s'il dépasse la cadence.
 *
 * @param registre  Ce qu'on compte — les registres sont indépendants, pour
 *                  qu'une salve sur un formulaire ne ferme pas les autres.
 * @param clef      L'appelant.
 * @param plafond   Nombre d'appels tolérés dans la fenêtre.
 * @param fenetreMs Durée de la fenêtre glissante.
 */
export function cadenceOk(
  registre: string,
  clef: string,
  plafond: number,
  fenetreMs: number,
): boolean {
  const maintenant = Date.now();

  let table = registres.get(registre);
  if (!table) {
    table = new Map();
    registres.set(registre, table);
  }

  if (table.size > CLEFS_MAX) purger(table, maintenant, fenetreMs);

  const fenetre = table.get(clef) ?? { passages: [], vu: maintenant };
  // Fenêtre glissante : on ne garde que ce qui est encore dedans.
  fenetre.passages = fenetre.passages.filter((t) => maintenant - t < fenetreMs);

  if (fenetre.passages.length >= plafond) {
    fenetre.vu = maintenant;
    table.set(clef, fenetre);
    return false;
  }

  fenetre.passages.push(maintenant);
  fenetre.vu = maintenant;
  table.set(clef, fenetre);
  return true;
}

function purger(table: Map<string, Fenetre>, maintenant: number, fenetreMs: number): void {
  for (const [clef, f] of table) {
    if (maintenant - f.vu > fenetreMs) table.delete(clef);
  }
  // Toujours trop ? On vide : mieux vaut recompter à zéro que grossir sans fin.
  if (table.size > CLEFS_MAX) table.clear();
}

/**
 * La réponse à servir quand la cadence est dépassée.
 *
 * 429 avec `Retry-After` : c'est ce qu'un client correct sait lire, et ce
 * qu'un moteur d'indexation comprend comme « reviens plus tard » plutôt que
 * comme une page en panne.
 */
export function tropVite(secondes: number): Response {
  return new Response("Trop de requêtes. Réessayez dans un instant.", {
    status: 429,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Retry-After": String(secondes),
    },
  });
}
