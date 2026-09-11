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
import { departDeLaTenue, placeRendableDepuis, finDeLaTenue, type DossierTenu } from "./places";

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
    ⚠️ **« Repartie » ne se dit plus, parce que ce n'est plus vrai.** Depuis le
    11 septembre 2026 aucune place ne se rend toute seule : le battement de deux
    jours n'ouvre que la porte, et c'est l'équipe qui la franchit. Écrire
    « repartie » ferait renoncer à rappeler quelqu'un qui a encore sa place —
    et cette colonne existe pour l'inverse.
  */
  const rendable = placeRendableDepuis(d);
  if (rendable && rendable.getTime() <= maintenant.getTime()) {
    return { inscritLe, terme, jours, libelle: "Place à rendre", ton: "passe" };
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

/* ── Les places qui attendent le geste de l'équipe ────────────────────────── */

/**
 * Ceux dont le délai annoncé est passé et dont la place attend d'être rendue.
 *
 * ── ⚠️ La contrepartie de la suppression automatique retirée ────────────────
 * Jusqu'au 11 septembre 2026, la tâche de 8 h rendait ces places toute seule.
 * La direction a retiré ce geste au calcul pour le garder à la main — sur une
 * campagne qui achète chaque prospect, une place reprise par une horloge est
 * une vente perdue que personne n'a décidée.
 *
 * Le revers est réel, et il est écrit ici : **si personne ne regarde, plus
 * aucune place ne revient au catalogue**, et une session finit par compter des
 * gens qui ne viendront jamais. C'est exactement le défaut que les sept jours
 * avaient corrigé le 28 août 2026. Cette vignette est ce qui empêche qu'il
 * passe inaperçu — elle, et la ligne que le bilan du matin porte désormais.
 *
 * ⚠️ **Elle ne compte que ce sur quoi le geste est possible** : le participant
 * a reçu l'annonce, et le battement de deux jours est écoulé. Avant cela, le
 * bouton refuse — reprendre une place avant la date promise par écrit serait
 * lui retirer un délai qu'on lui a donné.
 */
export function conditionsDesPlacesARendre(avant: string) {
  return {
    and: [
      { statut: { equals: "demandee" } },
      { contratSigneLe: { exists: false } },
      { placeRappeleeLe: { less_than: avant } },
    ],
  };
}

/**
 * Le même tri, écrit pour l'URL d'une liste de /admin.
 *
 * ⚠️ Deux formes du même tri : un filtre d'URL faux ne casse rien — Payload rend
 * la liste sans le tri, et le nombre annoncerait alors un tri que le lien ne
 * fait pas. `verifier-delai.ts` les confronte en tirant vraiment la route.
 */
export function filtreDesPlacesARendre(avant: string): string {
  return (
    "/admin/collections/inscriptions" +
    "?where[and][0][statut][equals]=demandee" +
    "&where[and][1][contratSigneLe][exists]=false" +
    `&where[and][2][placeRappeleeLe][less_than]=${encodeURIComponent(avant)}`
  );
}
