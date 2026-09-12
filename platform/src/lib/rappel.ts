/**
 * Envoyer le rappel « il vous reste N jours », et en garder la trace.
 *
 * ── ⚠️ Pourquoi un seul chemin pour deux portes ─────────────────────────────
 * La tâche de 8 h l'envoie toute seule ; le bouton du dossier l'envoie quand
 * l'équipe le décide. Deux chemins pour un même fait finissent toujours par
 * diverger — c'est ce qui est arrivé au numéro d'admissions, aux moyens de
 * paiement affichés sur la fiche, et à la date du contrat vérifié. Ici l'écart
 * se paierait sur un courriel qui part deux fois, ou sur une trace absente qui
 * fait renvoyer le même message le lendemain matin.
 *
 * ⚠️ **Rien n'est écrit avant que l'envoi ait réussi.** Un quota épuisé ne doit
 * pas faire croire que la personne a été prévenue : sans trace, le passage
 * suivant la reprend. Même règle que `placeRappeleeLe`.
 */
import type { Payload } from "payload";
import { courrielPlaceBientotRendue, courrielRappelAvantTerme } from "./courriel";
import { sansLeParcours } from "./inscriptions";
import { finDeLaTenue } from "./places";
import { libelleDuCompte, type CompteNommable } from "./equipe";

const JOUR_MS = 86_400_000;

export interface DossierARappeler {
  id: number | string;
  reference?: unknown;
  apprenantNom?: unknown;
  apprenantEmail?: unknown;
  createdAt?: unknown;
  session?: unknown;
  echanges?: unknown;
  dernierRappelAvantTerme?: number | null;
}

/** Les jours civils restants avant le terme de la tenue. */
export function joursAvantLeTerme(createdAt: unknown, maintenant: number): number {
  return Math.ceil((finDeLaTenue(String(createdAt)).getTime() - maintenant) / JOUR_MS);
}

/**
 * Envoie le rappel et, seulement si le courriel est parti, note ce qu'il faut.
 *
 * @param seuil Le palier à retenir. La tâche passe le sien ; le bouton passe
 *   les jours restants — dans les deux cas c'est un plafond : on ne garde que
 *   le plus petit déjà servi, sans quoi un envoi manuel rouvrirait un palier
 *   que la tâche avait déjà consommé.
 */
export async function envoyerLeRappel(
  payload: Payload,
  dossier: DossierARappeler,
  options: {
    seuil: number;
    jours: number;
    site: string;
    par?: number | string;
    /**
     * Le compte qui déclenche, quand c'est un geste d'équipe. La tâche de 8 h
     * n'en passe pas : la ligne se lit alors « automatique ».
     */
    parCompte?: CompteNommable | null;
  },
): Promise<boolean> {
  const session = typeof dossier.session === "object" ? (dossier.session as never) : undefined;
  const s = session as { reference?: string; programme?: { titre?: string } } | undefined;
  const programme = s && typeof s.programme === "object" ? s.programme : undefined;

  const parti = await courrielRappelAvantTerme(payload, {
    reference: String(dossier.reference),
    apprenantNom: String(dossier.apprenantNom),
    apprenantEmail: String(dossier.apprenantEmail),
    programmeTitre: programme?.titre ?? "votre parcours",
    sessionDetail: sansLeParcours(s?.reference, programme?.titre),
    tenueJusquau: finDeLaTenue(String(dossier.createdAt)).toISOString(),
    urlDossier: `${site(options.site)}/inscription/${dossier.reference}`,
    /*
      ⚠️ Les jours réellement restants, jamais le palier. Un passage manqué peut
      trouver le dossier à J-2 avec le palier 3 encore ouvert : annoncer « il
      vous reste 3 jours » quand il en reste 2 ferait manquer sa place à
      quelqu'un qui fait exactement ce qu'on lui a dit.
    */
    jours: options.jours,
  });

  if (!parti) return false;

  const dejaFait = dossier.dernierRappelAvantTerme;
  const retenu = typeof dejaFait === "number" ? Math.min(dejaFait, options.seuil) : options.seuil;

  /*
    ⚠️ Le journal reçoit la ligne dans la même écriture. Il répond à « quelqu'un
    l'a-t-il déjà contacté ? », et un courriel parti est un contact : sans cette
    ligne, un collègue appellerait en disant « vous n'avez rien reçu de nous » à
    quelqu'un relancé le matin même. Le tableau part **en entier** — Payload
    remplace la liste, il ne la complète pas.
  */
  const journal = Array.isArray(dossier.echanges) ? dossier.echanges : [];
  await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    overrideAccess: true,
    data: {
      dernierRappelAvantTerme: retenu,
      echanges: [
        ...journal,
        {
          quoi: "rappel",
          le: new Date().toISOString(),
          ...(options.par ? { par: options.par } : {}),
          /*
            ⚠️ Le nom est recopié : la relation n'est lisible que par la
            direction, et c'est l'administration qui a besoin de savoir qui a
            écrit. Voir `lib/equipe.ts`.
          */
          ...(options.parCompte ? { parNom: libelleDuCompte(options.parCompte) } : {}),
        },
      ],
    } as never,
  });

  return true;
}

/** Sans barre finale : `${site}/inscription/…` la remettrait en double. */
function site(brut: string): string {
  return brut.replace(/\/+$/, "");
}

/**
 * Annoncer que le terme est atteint — et, seulement si le courriel est parti,
 * poser la date qui ouvre le battement.
 *
 * ── ⚠️ Un seul chemin, pour la même raison que le rappel ────────────────────
 * La tâche de 8 h l'envoyait en ligne dans sa boucle ; le bouton « Relancer
 * pour la signature » l'envoie quand l'équipe le décide, une fois le terme
 * passé. Deux écritures d'un même fait finissent toujours par diverger — et ici
 * l'écart se paierait sur `placeRappeleeLe`, qui commande *à la fois* le
 * battement de deux jours et le fait que la place puisse être rendue.
 *
 * ⚠️ **Rien n'est écrit avant que l'envoi ait réussi.** Tant que la date est
 * vide, la place reste tenue sans terme : un quota épuisé est notre
 * défaillance, elle ne se paie pas sur la place de quelqu'un qui n'a rien vu
 * venir. Le bilan du matin nomme les envois manqués.
 */
export async function annoncerLeTerme(
  payload: Payload,
  dossier: DossierARappeler,
  options: { site: string; par?: number | string; parCompte?: CompteNommable | null },
): Promise<boolean> {
  const session = typeof dossier.session === "object" ? (dossier.session as never) : undefined;
  const s = session as { reference?: string; programme?: { titre?: string } } | undefined;
  const programme = s && typeof s.programme === "object" ? s.programme : undefined;

  const parti = await courrielPlaceBientotRendue(payload, {
    reference: String(dossier.reference),
    apprenantNom: String(dossier.apprenantNom),
    apprenantEmail: String(dossier.apprenantEmail),
    programmeTitre: programme?.titre ?? "votre parcours",
    /*
      ⚠️ La même composition que la page du dossier, importée plutôt que
      recopiée : la référence d'une session s'écrit « Parcours — Mode — Date »,
      et la répéter sous un titre qui nomme déjà le parcours donne
      « Directeur X — Directeur X — Classe virtuelle ».
    */
    sessionDetail: sansLeParcours(s?.reference, programme?.titre),
    tenueJusquau: finDeLaTenue(String(dossier.createdAt)).toISOString(),
    urlDossier: `${site(options.site)}/inscription/${dossier.reference}`,
  });

  if (!parti) return false;

  /*
    ⚠️ Le journal reçoit la ligne dans la même écriture, comme pour le rappel :
    un courriel parti est un contact, et sans cette ligne un collègue
    téléphonerait le lendemain en disant « vous n'avez rien reçu de nous ».
  */
  const journal = Array.isArray(dossier.echanges) ? dossier.echanges : [];
  await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    overrideAccess: true,
    data: {
      placeRappeleeLe: new Date().toISOString(),
      echanges: [
        ...journal,
        {
          quoi: "rappel",
          le: new Date().toISOString(),
          ...(options.par ? { par: options.par } : {}),
          /*
            ⚠️ Le nom est recopié : la relation n'est lisible que par la
            direction, et c'est l'administration qui a besoin de savoir qui a
            écrit. Voir `lib/equipe.ts`.
          */
          ...(options.parCompte ? { parNom: libelleDuCompte(options.parCompte) } : {}),
        },
      ],
    } as never,
  });

  return true;
}
