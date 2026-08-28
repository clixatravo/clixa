import type { Payload, Where } from "payload";

/**
 * Le décompte des places, en un seul endroit.
 *
 * ── Deux moments, une seule règle ───────────────────────────────────────────
 * Une place est retenue par un versement reçu — ou, à défaut, par une
 * inscription encore fraîche : sept jours, assez pour qu'un transfert
 * international parte et arrive, week-end compris.
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

/** La condition, telle que Payload l'attend. */
export function occupeUnePlace(): Where {
  return {
    or: [
      { statut: { in: ["confirmee", "payee", "terminee"] } },
      {
        and: [{ statut: { equals: "demandee" } }, { createdAt: { greater_than: limiteDeGrace() } }],
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
