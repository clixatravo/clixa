/**
 * Combien de temps reste-t-il à cette place — et depuis quand attend-elle.
 *
 * ── ⚠️ Le défaut que ce calcul ferme ────────────────────────────────────────
 * « Où en est » ne parle du délai **qu'une fois qu'il est passé** : un dossier
 * au premier jour et un au sixième affichent la même phrase, « Pré-inscription
 * — rien ne l'engage encore ». L'équipe ne voyait donc jamais l'échéance
 * arriver ; elle la découvrait franchie, le lendemain du courriel qui annonce
 * au participant que sa place va repartir. Demandé par la direction le
 * 9 septembre 2026 : « ziid lih la date imta dar inscription, bax fax i9areb
 * issali lih l mohla, diir lih 3alama ».
 *
 * ⚠️ **Aucune règle n'est réécrite ici.** Le départ de la tenue, son terme et
 * le départ réel de la place viennent de `lib/places.ts` — la même source que
 * la tâche de 8 h, la page du participant et la colonne « Où en est ». Une
 * seconde lecture des mêmes champs finirait par annoncer un autre jour que
 * celui où le courriel part vraiment, ce qui est pire que de ne rien annoncer.
 *
 * ⚠️ **L'horloge est passée, jamais lue ici** — de quoi éprouver « il reste
 * deux jours » sans attendre cinq jours, et rendre le contrôle identique
 * demain matin.
 */
import { departDeLaTenue, finDeLaPlace, finDeLaTenue, type DossierTenu } from "./places";

/**
 * En deçà de ce reste, la place se joue aujourd'hui.
 *
 * ⚠️ Deux jours, parce que c'est ce que dure le battement : passé le terme, le
 * participant est prévenu et il lui reste exactement ce délai pour agir. Poser
 * l'alerte plus tôt la banaliserait — la plupart des dossiers y resteraient
 * une semaine entière.
 */
export const JOURS_DE_PRESSE = 2;

export type TonDelai = "presse" | "terme" | "passe" | "calme" | "sansTerme";

export interface Delai {
  /** Quand le dossier a été déposé. C'est la date que la direction réclamait. */
  inscritLe: Date | undefined;
  /** Le jour annoncé au participant, ou `undefined` quand rien n'expire. */
  terme: Date | undefined;
  /** Jours civils restants avant ce terme. Négatif une fois passé. */
  jours: number | undefined;
  libelle: string;
  ton: TonDelai;
}

/** Le jour civil, pour ne pas rendre « il reste 0 j » à minuit passé de peu. */
function jourCivil(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000);
}

export interface DossierDate extends DossierTenu {
  createdAt?: string | Date | null;
}

export function delaiDuDossier(d: DossierDate, maintenant: Date): Delai {
  const brut = d.createdAt ? new Date(d.createdAt) : undefined;
  const inscritLe = brut && !Number.isNaN(brut.getTime()) ? brut : undefined;

  const depart = departDeLaTenue(d);

  /*
    ⚠️ **Pas de terme n'est pas « on ne sait pas ».** `departDeLaTenue` rend
    `undefined` pour un contrat signé qui attend nos coordonnées : la balle est
    chez nous, et rien n'expire. Annoncer un délai là serait faire payer notre
    retard à quelqu'un qui s'est engagé par écrit.
  */
  if (!depart) {
    return {
      inscritLe,
      terme: undefined,
      jours: undefined,
      libelle: "Sans terme",
      ton: "sansTerme",
    };
  }

  const terme = finDeLaTenue(depart);
  const jours = jourCivil(terme) - jourCivil(maintenant);

  /*
    ⚠️ La place n'est pas repartie au terme : elle part au bout du battement, et
    seulement une fois l'annonce envoyée. C'est `finDeLaPlace` qui le sait, et
    c'est elle qui décide de ce mot-là — dire « repartie » un jour trop tôt
    ferait renoncer à rappeler quelqu'un qui a encore sa place.
  */
  const partie = finDeLaPlace(d);
  if (partie && partie.getTime() <= maintenant.getTime()) {
    return { inscritLe, terme, jours, libelle: "Place repartie", ton: "passe" };
  }

  if (jours <= 0) {
    return { inscritLe, terme, jours, libelle: "Terme atteint", ton: "terme" };
  }

  return {
    inscritLe,
    terme,
    jours,
    libelle: jours === 1 ? "Reste 1 jour" : `Reste ${jours} jours`,
    ton: jours <= JOURS_DE_PRESSE ? "presse" : "calme",
  };
}

/**
 * Ceux à qui le courriel « votre place n'est pas encore repartie » va partir.
 *
 * ⚠️ **C'est la seule question à laquelle la direction voulait répondre** :
 * qui va recevoir ce message, avant qu'il ne parte. La tâche de 8 h est le seul
 * endroit du système où quelque chose change sans que personne ait agi — on ne
 * peut pas l'éprouver après coup, le tort est fait, et il est fait à des gens
 * venus d'une annonce.
 */
export function laPresseEstProche(d: DossierDate, maintenant: Date): boolean {
  const { ton } = delaiDuDossier(d, maintenant);
  return ton === "presse" || ton === "terme";
}

/**
 * Qui reçoit — ou va recevoir — le courriel « votre place va repartir ».
 *
 * ⚠️ **Ce sont les conditions de la tâche de 8 h, à la lettre**
 * (`api/relances`) : statut « demandée », contrat non signé, annonce pas encore
 * partie. Seul le seuil change selon qui demande — la tâche prend le terme, la
 * vignette du tableau de bord deux jours plus tôt, pour laisser le temps d'un
 * appel. Une seconde lecture des mêmes champs finirait par nommer quelqu'un
 * d'autre que celui qui reçoit le message.
 */
export function conditionsDesPlacesAuTerme(avant: string) {
  return {
    and: [
      { statut: { equals: "demandee" } },
      { contratSigneLe: { exists: false } },
      { placeRappeleeLe: { exists: false } },
      { createdAt: { less_than: avant } },
    ],
  };
}

/**
 * Le même tri, écrit pour l'URL d'une liste de /admin.
 *
 * ⚠️ **Deux formes du même tri, et c'est le danger.** Un filtre d'URL faux ne
 * casse rien : Payload rend la liste, simplement sans le tri — ni erreur, ni
 * type fautif, ni page blanche. Le nombre annoncerait alors un tri que le lien
 * ne fait pas. Elles sont donc écrites côte à côte, et `verifier-delai.ts` les
 * confronte en tirant vraiment la route.
 */
export function filtreDesPlacesAuTerme(avant: string): string {
  return (
    "/admin/collections/inscriptions" +
    "?where[and][0][statut][equals]=demandee" +
    "&where[and][1][contratSigneLe][exists]=false" +
    "&where[and][2][placeRappeleeLe][exists]=false" +
    `&where[and][3][createdAt][less_than]=${encodeURIComponent(avant)}`
  );
}
