/**
 * Ce que le tableau de supervision dit de chaque formation.
 *
 * ── ⚠️ Pourquoi ce calcul a quitté le composant ─────────────────────────────
 * Il vivait dans `Veille.tsx`, au milieu d'un composant serveur : il ne pouvait
 * s'éprouver qu'en ouvrant un navigateur et en se connectant. Six défauts y ont
 * été trouvés d'un coup, le 12 septembre 2026, **en relisant** — pas un n'était
 * tombé au rouge, aucun n'aurait cassé quoi que ce soit :
 *
 * 1. `capacite ?? 30` — un dénominateur inventé. C'est le défaut corrigé le
 *    7 septembre sur les jauges du tableau de bord, où il s'écrivait `?? 20`.
 * 2. `placesReservees ?? conf.length` — un second repli inventé, en désaccord
 *    avec le premier.
 * 3. Le pourcentage recalculé à la main alors qu'`occupationDeLaSession` est
 *    appelée deux lignes plus haut : deux lectures d'un même état.
 * 4. Les dossiers **annulés** comptés parmi les clients — or c'est exactement
 *    le dossier dont la place vient de repartir, et depuis le 11 septembre
 *    c'est le seul moyen de la rendre : ils vont s'accumuler.
 * 5. `Math.max(dossiers.length, pre.length + placesReservees)` — le plus grand
 *    de deux mesures différentes, c'est-à-dire ni l'une ni l'autre.
 * 6. Sur une cohorte tenue ouverte, un pourcentage qui ne monte jamais.
 *
 * Séparé, le calcul se déroule sur ses cas limites sans base ni écran — même
 * raison que `lib/occupation.ts` et `lib/avancement.ts`, et
 * `verifier-supervision.ts` l'y éprouve.
 */
import { occupationDeLaSession, type TonOccupation } from "./occupation";

/** Ce qu'il faut d'une session pour la résumer. */
export interface SessionResumee {
  id?: number | null;
  reference?: string | null;
  debut?: string | null;
  mode?: string | null;
  capacite?: number | null;
  placesReservees?: number | null;
  placesLibresTenues?: number | null;
}

/** Ce qu'il faut d'un dossier. Le statut suffit : on compte, on ne détaille pas. */
export interface DossierCompte {
  statut?: string | null;
}

export interface ResumeDeFormation {
  placesReservees: number;
  /** `NaN` quand la session n'en déclare aucune : on ne devine pas un plafond. */
  capacite: number;
  /** Le plafond suit les inscriptions ; un pourcentage n'aurait pas de sens. */
  cohorteOuverte: boolean;
  remplissageTon: TonOccupation;
  remplissageLibelle: string;
  /** `null` quand la question ne se pose pas : cohorte ouverte, ou capacité absente. */
  pct: number | null;
  preInscriptionsCount: number;
  confirmeesCount: number;
  totalInscriptionsCount: number;
}

/**
 * Résume une formation à partir de sa session et de ses dossiers.
 *
 * ⚠️ **Le remplissage vient d'`occupationDeLaSession`**, importé et non
 * recopié : la colonne « Remplissage » de la liste des sessions le lit par la
 * même porte, et les deux écrans se consultent à deux clics l'un de l'autre.
 */
export function resumerLaFormation(
  session: SessionResumee | undefined,
  dossiers: DossierCompte[],
): ResumeDeFormation {
  /*
    ⚠️ Un dossier annulé n'est pas un client. C'est celui dont la place est
    repartie au catalogue — et depuis le 11 septembre 2026, l'annulation est le
    **seul** moyen de la rendre. Les compter ferait grossir le nombre de clients
    à mesure qu'on en perd, sur l'écran qui sert à décider d'ouvrir une cohorte.
  */
  const vivants = dossiers.filter((d) => d.statut !== "annulee");
  const pre = vivants.filter((d) => d.statut === "demandee");
  const conf = vivants.filter((d) => d.statut === "confirmee" || d.statut === "payee");

  /*
    ⚠️ Le dénominateur ne s'invente pas. `?? 30` faisait afficher un pourcentage
    calculé sur des places qui n'existent nulle part — `occupationDeLaSession`
    rend le ton « inconnu », et l'écran le dit.
  */
  const capacite = Number(session?.capacite ?? Number.NaN);
  const placesReservees = Number(session?.placesReservees ?? 0);

  const remplissage = session
    ? occupationDeLaSession(session)
    : { ton: "inconnu" as const, libelle: "À planifier" };

  /*
    ⚠️ Pas de pourcentage sur une cohorte tenue ouverte. Son plafond suit les
    inscriptions : à 26 dossiers elle affiche 26/46, à 40 elle affichera 40/60.
    La jauge stagne autour de 57 % quoi qu'il arrive — et une barre à moitié
    pleine se lit « il reste de la place », indéfiniment, sur l'écran depuis
    lequel on décide d'ouvrir une seconde cohorte.
  */
  const cohorteOuverte = Number(session?.placesLibresTenues ?? Number.NaN) >= 1;
  const pct =
    !cohorteOuverte && Number.isFinite(capacite) && capacite > 0
      ? Math.min(100, Math.round((placesReservees / capacite) * 100))
      : null;

  return {
    placesReservees,
    capacite,
    cohorteOuverte,
    remplissageTon: remplissage.ton,
    remplissageLibelle: remplissage.libelle,
    pct,
    preInscriptionsCount: pre.length,
    confirmeesCount: conf.length,
    // Les dossiers vivants, et rien d'autre.
    totalInscriptionsCount: vivants.length,
  };
}
