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

/** La limite en deçà de laquelle un dossier « demandée » tient encore sa place. */
export function limiteDeGrace(): string {
  return new Date(Date.now() - JOURS_DE_GRACE * 86_400_000).toISOString();
}

/** Ce qu'il faut d'un dossier pour savoir d'où court sa tenue. */
export interface DossierTenu {
  createdAt?: string | Date | null;
  contratSigneLe?: string | Date | null;
  coordonneesEnvoyeesLe?: string | Date | null;
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
        AND i.coordonnees_envoyees_le > now() - interval '${JOURS_DE_GRACE} days')
  OR (i.statut = 'demandee' AND i.contrat_signe_le IS NULL
        AND i.created_at > now() - interval '${JOURS_DE_GRACE} days')
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
      // Coordonnées parties : sept jours pour que le transfert arrive.
      { and: [demandee, { coordonneesEnvoyeesLe: { greater_than: limite } }] },
      // Pré-inscription seule : sept jours à partir du dépôt, comme avant.
      {
        and: [
          demandee,
          { contratSigneLe: { exists: false } },
          { createdAt: { greater_than: limite } },
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
