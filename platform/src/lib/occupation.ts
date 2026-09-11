/**
 * Où en est le remplissage d'une session — ce que l'équipe doit lire d'un œil.
 *
 * ── ⚠️ Le défaut que ce module existe pour corriger ─────────────────────────
 * La liste des sessions de /admin portait une seule colonne de places :
 * « Places au total ». Elle vaut la **capacité** — 30, sur les douze sessions,
 * et elle vaudra 30 quoi qu'il arrive. La direction l'a lue le 7 septembre 2026
 * et en a conclu que les places ne descendaient pas, alors que la cohorte du
 * parcours porté par l'annonce Facebook était à **22 dossiers sur 30**.
 *
 * Rien n'était cassé : le décompte était exact, le site public affichait bien
 * « 8 places » sur la fiche. C'est l'écran de l'équipe qui ne montrait que
 * l'invariant, et jamais ce qui bouge — le seul écran depuis lequel on décide
 * d'ouvrir une seconde cohorte.
 *
 * ⚠️ **Un chiffre juste au mauvais endroit se lit comme un chiffre faux.**
 * C'est le même défaut que la colonne « Statut » qui annonçait « Demandée » sur
 * douze dossiers dans cinq états différents : l'information existait, elle
 * n'était simplement pas là où le regard se pose.
 *
 * ── Pourquoi un module à part ───────────────────────────────────────────────
 * Une cellule d'administration ne s'éprouve qu'en ouvrant un navigateur et en
 * se connectant. Séparé, le même calcul se déroule sur ses cas limites sans
 * base ni écran — comme `avancementDuDossier` et `prochaineEtape`, et pour la
 * même raison.
 */

/** Le seuil à partir duquel une cohorte se remplit vite et appelle un geste. */
export const SEUIL_TENSION = 5;

export type TonOccupation = "complet" | "tension" | "ouvert" | "vide" | "inconnu";

export interface Occupation {
  /** « 22 / 30 », ce que l'équipe lit d'abord. */
  compte: string;
  /** Ce qu'il en reste, dit en toutes lettres. */
  libelle: string;
  restantes: number;
  ton: TonOccupation;
}

/** Ce qu'il faut d'une session pour dire où elle en est. */
export interface SessionComptee {
  capacite?: number | null;
  placesReservees?: number | null;
  /**
   * Réglé, le plafond suit les inscriptions : la cohorte ne se ferme pas.
   * Voir `capaciteTenue` dans `lib/places.ts`.
   */
  placesLibresTenues?: number | null;
}

/**
 * Le remplissage d'une session, tel qu'il doit s'afficher.
 *
 * ⚠️ **Postgres rend `numeric` en texte par une porte et en nombre par une
 * autre** — le journal le documente pour `places_reservees`. Les deux valeurs
 * sont donc converties plutôt que supposées : une comparaison entre `"22"` et
 * `22` conclurait à un écart qui n'existe pas.
 */
export function occupationDeLaSession(s: SessionComptee): Occupation {
  const capacite = Number(s.capacite ?? Number.NaN);
  const prises = Number(s.placesReservees ?? 0);

  /*
    ⚠️ Sans capacité, on se tait. Une session à capacité nulle n'est pas
    « complète » : elle n'existe pas commercialement, et l'épreuve du tunnel
    l'a déjà appris à ses dépens. Afficher « complet » ici enverrait l'équipe
    ouvrir une cohorte pour une session qui n'a jamais été ouverte.
  */
  if (!Number.isFinite(capacite) || capacite <= 0) {
    return { compte: "—", libelle: "Capacité non renseignée", restantes: 0, ton: "inconnu" };
  }

  const reservees = Number.isFinite(prises) ? Math.max(0, prises) : 0;
  const restantes = Math.max(0, capacite - reservees);
  const compte = `${reservees} / ${capacite}`;

  /*
    ── ⚠️ Une cohorte tenue ouverte ne se lit pas comme les autres ───────────
    Son plafond suit les inscriptions : « 26 / 46 » n'annonce pas une cohorte
    plus grande, il annonce qu'on en ouvre à mesure. Sans le dire, l'équipe
    lirait 46 comme une capacité décidée — et c'est cet écran qui sert à
    décider d'ouvrir une seconde cohorte.

    ⚠️ **Et l'or ne convient pas ici.** Le ton « tension » veut dire « il n'en
    reste presque plus » ; sur une cohorte qui ne peut pas se fermer, il
    enverrait l'équipe se presser pour rien. Un réglage à trois places libres
    resterait donc calme, à raison.
  */
  const tenues = Number(s.placesLibresTenues ?? Number.NaN);
  if (Number.isFinite(tenues) && tenues >= 1) {
    return {
      compte,
      libelle: `${restantes} libre${restantes > 1 ? "s" : ""} · cohorte ouverte`,
      restantes,
      ton: "ouvert",
    };
  }

  if (restantes === 0) return { compte, libelle: "Complet", restantes, ton: "complet" };
  if (reservees === 0) return { compte, libelle: "Aucune inscription", restantes, ton: "vide" };

  const reste = `${restantes} restante${restantes > 1 ? "s" : ""}`;
  if (restantes <= SEUIL_TENSION) {
    return { compte, libelle: reste, restantes, ton: "tension" };
  }
  return { compte, libelle: reste, restantes, ton: "ouvert" };
}
