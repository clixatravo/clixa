/**
 * Qui a déjà parlé à ce participant, et quand.
 *
 * ── ⚠️ Le défaut que ce module existe pour fermer ───────────────────────────
 * Après une pré-inscription, quelqu'un de l'équipe appelle. Rien ne le notait :
 * le lendemain, un collègue ouvrait la même liste, voyait le même dossier au
 * même état, et rappelait la même personne. Signalé par la direction le
 * 8 septembre 2026 — « si l'administration a parlé au client, il faut le savoir,
 * au cas où quelqu'un d'autre entre pour lui parler ».
 *
 * Deux gestes se notent, et ce sont deux choses différentes :
 *
 * - **Appelé** — on lui a parlé. Peu importe ce qui s'est dit ; ce qui compte
 *   est qu'un second appel dans la foulée ferait désordre.
 * - **Relancé pour signer** — on lui a demandé d'aller signer son contrat.
 *   C'est la relance qui a un objet, et celle qu'on veut pouvoir compter.
 *
 * ⚠️ **Rien ne part au participant.** Ces deux traces disent ce qui s'est passé
 * au téléphone ; lui envoyer un courriel « nous vous avons appelé » ajouterait
 * du bruit à un tunnel qui lui écrit déjà à chaque étape qui le concerne.
 *
 * ── Pourquoi le calcul vit ici ──────────────────────────────────────────────
 * La colonne de la liste et le bloc du dossier le lisent tous les deux. Une
 * cellule d'administration ne s'éprouve qu'en ouvrant un navigateur et en se
 * connectant ; séparé, le même calcul se déroule sur ses cas limites sans base
 * ni écran — comme `avancementDuDossier` et `occupationDeLaSession`.
 */

/** Ce qu'on note : un appel, ou une relance qui vise la signature. */
export type NatureEchange = "appel" | "signature";

/** Une ligne du journal des échanges, telle qu'elle vit en base. */
export interface Echange {
  quoi?: string | null;
  le?: string | Date | null;
}

export type TonSuivi = "recent" | "ancien" | "jamais";

export interface Suivi {
  /** « Appelé hier », « Relancé pour signer · il y a 5 j ». */
  libelle: string;
  /** Combien de fois on a parlé à cette personne, tous gestes confondus. */
  nombre: number;
  /** Jours écoulés depuis le dernier échange, `undefined` s'il n'y en a pas. */
  jours: number | undefined;
  ton: TonSuivi;
}

/**
 * En deçà de ce délai, rappeler ferait double emploi.
 *
 * ⚠️ Trois jours, pas sept : le but n'est pas d'interdire un second appel, c'est
 * d'empêcher celui du lendemain. Passé trois jours, relancer quelqu'un qui n'a
 * pas donné suite est le travail, pas une maladresse.
 */
export const JOURS_RECENT = 3;

const NOMS: Record<string, string> = {
  appel: "Appelé",
  signature: "Relancé pour signer",
};

/** Le jour civil, pour ne pas rendre « il y a 0 j » à minuit passé de peu. */
function jourCivil(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000);
}

/**
 * Ce que la colonne « Suivi » affiche pour ce dossier.
 *
 * ⚠️ **L'horloge est passée, jamais lue ici.** C'est ce qui permet d'éprouver
 * « il y a cinq jours » sans attendre cinq jours, et ce qui rend le contrôle
 * identique demain matin — la même règle que `avancementDuDossier`.
 */
export function dernierSuivi(echanges: unknown, maintenant: Date): Suivi {
  /*
    ⚠️ **Ce n'est pas toujours un tableau, et le supposer faisait tomber la
    page.** L'état du formulaire de Payload ne porte pas les lignes d'un champ
    `array` comme un tableau : `reduceFieldsToValues` rend le *nombre* de
    lignes. Sur un dossier qui en a, on reçoit bien un tableau ; sur un dossier
    qui n'en a aucune — c'est-à-dire tous les dossiers réels tant que personne
    n'a cliqué — on reçoit `0`, et `.filter` n'existe pas dessus.

    Le défaut ne s'est pas vu à l'écran : mes dossiers d'épreuve portaient tous
    trois échanges. Il est tombé sur l'épreuve du bouton « Contrat vérifié »,
    qui fabrique un dossier par le tunnel public — donc sans journal — et la
    fiche entière rendait « This page couldn't load ». Un calcul lu par une
    cellule de liste et par un formulaire ne peut pas lever : il emporte la
    page avec lui.
  */
  const lignes = (Array.isArray(echanges) ? (echanges as Echange[]) : []).filter((e) => e && e.le);

  if (lignes.length === 0) {
    return { libelle: "Jamais appelé", nombre: 0, jours: undefined, ton: "jamais" };
  }

  /*
    ⚠️ On trie plutôt que de prendre la dernière ligne. Le journal s'écrit en
    ajoutant à la fin, mais rien ne l'y oblige : une correction depuis /admin
    peut réordonner les lignes, et « le dernier échange » doit rester le plus
    récent, pas le plus bas dans le tableau.
  */
  const trie = [...lignes].sort((a, b) => new Date(b.le!).getTime() - new Date(a.le!).getTime());
  const dernier = trie[0]!;
  const quand = new Date(dernier.le!);

  if (Number.isNaN(quand.getTime())) {
    return { libelle: "Date illisible", nombre: lignes.length, jours: undefined, ton: "jamais" };
  }

  const jours = Math.max(0, jourCivil(maintenant) - jourCivil(quand));
  const quoi = NOMS[String(dernier.quoi)] ?? "Échange";

  const depuis = jours === 0 ? "aujourd'hui" : jours === 1 ? "hier" : `il y a ${jours} j`;

  return {
    libelle: `${quoi} ${depuis}`,
    nombre: lignes.length,
    jours,
    ton: jours <= JOURS_RECENT ? "recent" : "ancien",
  };
}
