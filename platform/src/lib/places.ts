import type { Payload, Where } from "payload";

/**
 * Le décompte des places, en un seul endroit.
 *
 * ── Le délai court à partir du moment où le participant peut agir ───────────
 * Une place est retenue par un versement reçu — sans limite. À défaut, elle est
 * tenue sept jours : assez pour qu'un transfert international parte et arrive,
 * week-end compris.
 *
 * ⚠️ Sept jours **à partir de quoi**, voilà toute la question. Le compte à
 * rebours partait de la pré-inscription. Depuis que le tunnel a deux temps, le
 * participant ne peut rien verser avant que l'équipe lui envoie les
 * coordonnées — ce qui vient après la consultation, la demande de contrat et
 * la signature. Le délai pouvait donc être épuisé avant qu'il ait eu le droit
 * d'agir, et sa place partait pendant qu'il attendait de nos nouvelles.
 *
 * Le départ est donc le dernier moment qui compte :
 *
 * | État du dossier | La place est tenue |
 * |---|---|
 * | un versement reçu | sans limite |
 * | contrat signé, coordonnées pas encore envoyées | sans limite — **la balle est chez nous** |
 * | coordonnées envoyées | sept jours à partir de cet envoi |
 * | pré-inscription seule | sept jours à partir du dépôt |
 *
 * ⚠️ Un contrat signé qui attend nos coordonnées tient sa place sans terme, et
 * c'est voulu : rendre au catalogue la place de quelqu'un qui s'est engagé par
 * écrit, parce que *nous* n'avons pas envoyé un courriel, serait lui faire
 * payer notre retard. Le bandeau du tableau de bord compte ces dossiers ; c'est
 * là que le rattrapage se fait, pas en leur reprenant leur place.
 *
 * Le crochet `recompter` applique cette règle quand quelqu'un agit ; la tâche
 * quotidienne l'applique quand le temps passe. Le temps, lui, n'écrit rien :
 * sans ce second passage, une place expirée resterait retenue jusqu'à ce qu'un
 * hasard touche à sa session.
 *
 * ⚠️ `e2e/menage.ts` refait le même calcul en SQL, une suppression directe ne
 * déclenchant aucun crochet. Les trois formulations doivent rester d'accord.
 */

export const JOURS_DE_GRACE = 7;

/**
 * Ce qu'on garde en plus, sans le dire.
 *
 * ── ⚠️ Deux dates, et une seule s'annonce ───────────────────────────────────
 * Le participant lit « votre place vous est tenue jusqu'au [J+7] » : c'est
 * cette date-là qui le fait agir, et l'allonger ne ferait que déplacer le
 * moment où il s'y met. Mais rendre la place à la seconde près punit celui qui
 * s'y prend le lendemain — pour un parcours qui commence dans un mois, et une
 * cohorte qui n'est pas pleine.
 *
 * La place part donc **deux jours après** la date annoncée. Décision de la
 * direction, le 7 septembre 2026. Le battement ne se promet nulle part : une
 * échéance qu'on annonce plus longue est une échéance qu'on repousse.
 *
 * ⚠️ **Et la page ne prétend pas que la place est partie tant qu'elle est
 * là.** Passé J+7 elle change de ton — « le délai est passé, elle n'est pas
 * encore repartie, écrivez-nous aujourd'hui » — plutôt que d'annoncer une
 * perte qui n'a pas eu lieu. Faire dire au site le contraire de ce qui est,
 * même dans le sens généreux, c'est exactement le défaut que la colonne « Où
 * en est » a corrigé la veille.
 */
export const JOURS_DE_BATTEMENT = 2;

/** La limite en deçà de laquelle un dossier « demandée » tient encore sa place. */
export function limiteDeGrace(): string {
  const jours = JOURS_DE_GRACE + JOURS_DE_BATTEMENT;
  return new Date(Date.now() - jours * 86_400_000).toISOString();
}

/**
 * Le jour où la place part réellement — la date annoncée, plus le battement.
 *
 * ⚠️ À ne jamais afficher au participant : c'est `finDeLaTenue` qu'il lit, et
 * les deux ne doivent pas se confondre dans un gabarit.
 */
export function finDuBattement(depuis: Date | string): Date {
  const debut = typeof depuis === "string" ? new Date(depuis) : depuis;
  return new Date(debut.getTime() + (JOURS_DE_GRACE + JOURS_DE_BATTEMENT) * 86_400_000);
}

/** Ce qu'il faut d'un dossier pour savoir d'où court sa tenue. */
export interface DossierTenu {
  createdAt?: string | Date | null;
  contratSigneLe?: string | Date | null;
  coordonneesEnvoyeesLe?: string | Date | null;
  /** Quand l'annonce « votre place n'est pas encore repartie » est partie. */
  placeRappeleeLe?: string | Date | null;
}

/**
 * D'où court la tenue de la place — ou `undefined` quand elle n'a pas de terme.
 *
 * `undefined` ne veut pas dire « on ne sait pas » : il veut dire « rien
 * n'expire », le cas du contrat signé dont les coordonnées ne sont pas encore
 * parties. L'appelant doit alors se taire plutôt qu'afficher une date.
 */
export function departDeLaTenue(dossier: DossierTenu): Date | undefined {
  if (dossier.coordonneesEnvoyeesLe) return new Date(dossier.coordonneesEnvoyeesLe);
  // Signé, mais rien ne lui a été envoyé : c'est nous qu'on attend.
  if (dossier.contratSigneLe) return undefined;
  return dossier.createdAt ? new Date(dossier.createdAt) : undefined;
}

/**
 * Jusqu'à quand la place d'un dossier non réglé est tenue.
 *
 * ⚠️ Le participant doit pouvoir lire cette date. Retenir une place sans dire
 * qu'elle expire, c'est promettre plus qu'on ne tient : qui lit « place
 * retenue » et prend trois semaines pour organiser son transfert la trouverait
 * rendue, sans avoir jamais été prévenu. La page du dossier et le courriel de
 * confirmation l'annoncent donc tous les deux, à partir d'ici.
 */
export function finDeLaTenue(depuis: Date | string): Date {
  const debut = typeof depuis === "string" ? new Date(depuis) : depuis;
  return new Date(debut.getTime() + JOURS_DE_GRACE * 86_400_000);
}

/**
 * Le moment où la place part **réellement** — ou `undefined` si rien ne la fera
 * partir aujourd'hui.
 *
 * ── ⚠️ Pourquoi `finDuBattement` ne suffisait pas ───────────────────────────
 * Le battement courait depuis le terme annoncé, sur l'hypothèse que l'annonce
 * part **le jour du terme**. Elle ne part pas toujours : c'est tout l'objet de
 * `placeRappeleeLe`, qui n'est écrite qu'après un envoi réussi — quota épuisé,
 * service en panne, tâche interrompue. Une annonce en retard de deux jours
 * trouvait alors le battement déjà consommé, et **le même passage de 8 h
 * envoyait le courriel puis rendait la place**.
 *
 * Reproduit sur un dossier de douze jours : le participant lit « votre place
 * n'est pas encore repartie » à 8 h 00, elle est repartie à 8 h 00, et le bilan
 * annonce à l'équipe « leur place part dans deux jours ». La garde tenait sa
 * promesse à la lettre — un courriel est bien parti d'abord — et la trahissait
 * entièrement : ce que la direction a demandé, c'est qu'il ait le temps d'agir.
 *
 * ── La règle, et pourquoi elle est plus simple ──────────────────────────────
 * Le battement court depuis **l'annonce**, pas depuis le terme. Comme l'annonce
 * ne part jamais avant le terme, cette date est toujours postérieure à
 * l'ancienne : personne n'y perd un jour, et celui qu'on a prévenu en retard
 * garde ses deux jours pleins. Deux branches deviennent une.
 *
 * `undefined` ne veut pas dire « on ne sait pas », mais « rien n'expire » :
 * le contrat signé qui attend nos coordonnées, et la pré-inscription qu'on n'a
 * pas encore su prévenir. L'appelant doit alors se taire.
 */
export function finDeLaPlace(dossier: DossierTenu): Date | undefined {
  const depart = departDeLaTenue(dossier);
  if (!depart) return undefined;

  // Coordonnées parties : le participant peut payer, et les relances le disent.
  if (dossier.coordonneesEnvoyeesLe) return finDuBattement(depart);

  // Pré-inscription : rien ne part tant qu'on ne l'a pas prévenue.
  if (!dossier.placeRappeleeLe) return undefined;
  return new Date(new Date(dossier.placeRappeleeLe).getTime() + JOURS_DE_BATTEMENT * 86_400_000);
}

/**
 * La même condition, en SQL — pour qui ne passe pas par Payload.
 *
 * ⚠️ Cette constante existe pour qu'il n'y ait **pas** de troisième
 * formulation. `e2e/menage.ts` recopiait la règle à la main, une suppression
 * directe ne déclenchant aucun crochet ; deux textes tenus séparément finissent
 * toujours par diverger, et celui-ci diverge en silence — le décompte des
 * places reste simplement faux. Il l'importe désormais.
 *
 * `i` est l'alias attendu pour la table `inscriptions`.
 */
export const OCCUPE_UNE_PLACE_SQL = `(
  i.statut IN ('confirmee', 'payee', 'terminee')
  OR (i.statut = 'demandee' AND i.contrat_signe_le IS NOT NULL
        AND i.coordonnees_envoyees_le IS NULL)
  OR (i.statut = 'demandee'
        AND i.coordonnees_envoyees_le > now() - interval '${JOURS_DE_GRACE + JOURS_DE_BATTEMENT} days')
  OR (i.statut = 'demandee' AND i.contrat_signe_le IS NULL
        AND i.place_rappelee_le IS NULL)
  OR (i.statut = 'demandee' AND i.contrat_signe_le IS NULL
        AND i.place_rappelee_le > now() - interval '${JOURS_DE_BATTEMENT} days')
)`;

/**
 * La condition, telle que Payload l'attend.
 *
 * Les quatre branches partitionnent les dossiers : elles ne se recouvrent pas,
 * et aucun dossier « demandée » n'en manque. Voir le tableau en tête de
 * fichier — et `OCCUPE_UNE_PLACE_SQL` juste au-dessus, qui doit dire la même
 * chose : `verifier-places.ts` compte les deux façons et les compare.
 */
export function occupeUnePlace(): Where {
  const limite = limiteDeGrace();
  const demandee = { statut: { equals: "demandee" } } as const;

  return {
    or: [
      { statut: { in: ["confirmee", "payee", "terminee"] } },
      // Signé, coordonnées pas encore parties : la place ne se rend pas.
      {
        and: [
          demandee,
          { contratSigneLe: { exists: true } },
          { coordonneesEnvoyeesLe: { exists: false } },
        ],
      },
      // Coordonnées parties : sept jours pour que le transfert arrive, plus le battement.
      { and: [demandee, { coordonneesEnvoyeesLe: { greater_than: limite } }] },

      /*
        ── ⚠️ Jamais rendue sans avoir été annoncée ──────────────────────────
        Une pré-inscription qu'on n'a pas su prévenir garde sa place, si vieille
        soit-elle. La tâche quotidienne réessaie l'envoi chaque matin et ne pose
        la date qu'une fois le courriel parti ; tant qu'il ne part pas — quota
        épuisé, service en panne — c'est **notre** défaillance, et elle ne se
        paie pas sur la place de quelqu'un qui n'a rien vu venir.

        Décision de la direction, le 7 septembre 2026 : « sa place ne part pas
        tant qu'un courriel ne lui est pas parvenu ». C'est le même principe que
        le contrat signé qui attend nos coordonnées — la balle est chez nous.

        ⚠️ Le revers est réel : si l'expédition reste en panne, des places
        dorment. Le bilan quotidien les nomme, comme il nomme déjà les envois
        manqués.
      */
      {
        and: [
          demandee,
          { contratSigneLe: { exists: false } },
          { placeRappeleeLe: { exists: false } },
        ],
      },
      /*
        ── ⚠️ Et deux jours **après l'annonce**, pas après le terme ──────────
        Le battement courait depuis la date annoncée, sur l'hypothèse que
        l'annonce part le jour du terme. Une annonce retardée par une panne
        d'expédition trouvait le battement déjà écoulé : le même passage de
        8 h envoyait le courriel *et* rendait la place. Voir `finDeLaPlace`.
      */
      {
        and: [
          demandee,
          { contratSigneLe: { exists: false } },
          {
            placeRappeleeLe: {
              greater_than: new Date(Date.now() - JOURS_DE_BATTEMENT * 86_400_000).toISOString(),
            },
          },
        ],
      },
    ],
  };
}

/**
 * Recompte les sessions à venir et renvoie le nombre de places rendues.
 *
 * Appelée une fois par jour. Le décompte peut donc être en retard d'au plus
 * une journée, ce qui est sans conséquence pour des places qu'on réserve à des
 * semaines de distance.
 */
export async function rendreLesPlacesExpirees(payload: Payload): Promise<number> {
  const { docs: sessions } = await payload.find({
    collection: "sessions",
    where: { fin: { greater_than: new Date().toISOString() } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });

  let rendues = 0;

  for (const session of sessions) {
    const { totalDocs } = await payload.count({
      collection: "inscriptions",
      where: { and: [{ session: { equals: session.id } }, occupeUnePlace()] },
      overrideAccess: true,
    });

    const avant = (session as { placesReservees?: number }).placesReservees ?? 0;
    if (avant === totalDocs) continue;

    rendues += Math.max(0, avant - totalDocs);
    await payload.update({
      collection: "sessions",
      id: session.id,
      overrideAccess: true,
      data: { placesReservees: totalDocs },
    });
  }

  if (rendues > 0) payload.logger.info(`[places] ${rendues} place(s) rendue(s) au catalogue`);
  return rendues;
}
