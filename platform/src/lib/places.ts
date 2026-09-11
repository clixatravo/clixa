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

/**
 * Les jours restants où l'on rappelle au participant que son délai court.
 *
 * ── ⚠️ Pourquoi trois rappels, et pas un seul ───────────────────────────────
 * Il n'y avait qu'un message, au **terme** — c'est-à-dire quand il est déjà
 * trop tard pour s'organiser. La direction l'a demandé le 9 septembre 2026 :
 * « nass li mazal lihom 4j, 3j o 2j », prévenir pendant qu'il reste du temps.
 * La cohorte portée par l'annonce était ce jour-là **complète à 30/30** : une
 * place perdue ne se retrouve pas.
 *
 * ⚠️ **Un seul message par seuil, jamais un par jour.** Le dossier retient le
 * plus petit seuil déjà envoyé ; on n'envoie que si le seuil visé est plus
 * petit. Un passage manqué — serveur arrêté, quota épuisé — ne produit donc pas
 * un rattrapage de trois messages le lendemain : on part du seuil courant.
 *
 * ⚠️ **Décroissants, et lus dans cet ordre.** À J-3, les seuils 4 et 3
 * conviennent tous deux ; c'est le plus grand encore valable qu'on prend, sans
 * quoi on brûlerait le dernier rappel trop tôt.
 */
export const SEUILS_DE_RAPPEL = [4, 3, 2] as const;

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
 * À partir de quand l'équipe **peut** rendre la place — ou `undefined` tant
 * qu'elle ne le peut pas.
 *
 * ── ⚠️ Elle ne part plus toute seule, et le nom le dit ──────────────────────
 * La fonction s'appelait `finDeLaPlace` et rendait « le moment où la place part
 * réellement ». Depuis le 11 septembre 2026 plus rien ne la fait partir : c'est
 * un geste de l'équipe. Garder l'ancien nom aurait laissé trois écrans annoncer
 * « place repartie » sur une place encore tenue — le mensonge exact que la
 * troisième fenêtre de la page du participant existe pour éviter. Le
 * changement de nom a désigné lui-même les quatre lecteurs à corriger.
 *
 * Ce qu'elle rend est donc une **autorisation**, pas un fait : la date à partir
 * de laquelle le bouton « Rendre la place » s'ouvre, c'est-à-dire le terme
 * annoncé plus le battement de deux jours. Avant elle, rendre la place
 * reprendrait à quelqu'un un délai qu'on lui a promis par écrit.
 *
 * `undefined` veut dire « pas encore, et on ne sait pas quand » : le contrat
 * signé qui attend nos coordonnées, et la pré-inscription qu'on n'a pas encore
 * prévenue. Les deux tiennent leur place sans terme.
 */
export function placeRendableDepuis(dossier: DossierTenu): Date | undefined {
  const depart = departDeLaTenue(dossier);
  if (!depart) return undefined;

  // Coordonnées parties : le participant peut payer, et les relances le disent.
  if (dossier.coordonneesEnvoyeesLe) return finDuBattement(depart);

  // Pré-inscription : on ne reprend rien à qui n'a pas été prévenu.
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
export const OCCUPE_UNE_PLACE_SQL = `(i.statut <> 'annulee')`;

/**
 * La condition, telle que Payload l'attend — et `OCCUPE_UNE_PLACE_SQL`
 * juste au-dessus, qui doit dire la même chose : `verifier-places.ts` compte
 * les deux façons et les compare.
 *
 * ── ⚠️ Une place ne part plus toute seule ───────────────────────────────────
 * Décision de la direction, le 11 septembre 2026 : « khali suppression
 * automatique, hayedha — ana nb9a nthakem imta ». Le temps ne rend plus rien
 * au catalogue. Un dossier tient sa place tant que quelqu'un de l'équipe ne l'a
 * pas annulé, si vieux soit-il.
 *
 * Ce qui l'a emporté : le délai était devenu la première cause de perte, sur
 * une campagne qui achète chaque prospect. Une pré-inscription qui dort n'est
 * pas une place perdue tant que la cohorte n'est pas pleine — et depuis
 * `placesLibresTenues`, la cohorte portée par l'annonce ne se ferme plus.
 *
 * ⚠️ **Ce que cela coûte, écrit ici pour qu'on le sache** : le décompte du site
 * ne se vide plus de lui-même. Si l'équipe n'annule rien, une session finit par
 * compter des gens qui ne viendront jamais. C'est exactement le défaut que les
 * sept jours avaient corrigé le 28 août 2026 — il est réintroduit sciemment, et
 * la contrepartie est la vignette « Places à rendre » du tableau de bord, qui
 * nomme chaque matin ceux dont le délai annoncé est passé.
 *
 * ⚠️ **Les délais, eux, continuent d'être annoncés.** Le participant lit
 * toujours « votre place est tenue jusqu'au X », et les rappels partent
 * toujours : ce qui a changé, c'est qu'aucune place ne se rend sans un geste.
 * Annoncer un terme et le tenir plus longtemps ne trompe personne ; l'inverse,
 * si. Aucun message n'a donc été réécrit.
 */
export function occupeUnePlace(): Where {
  return { statut: { not_equals: "annulee" } };
}

/**
 * Recompte les sessions à venir et renvoie le nombre de places retrouvées.
 *
 * ── ⚠️ Elle ne rend plus rien, elle recompte ────────────────────────────────
 * Elle s'appelait `rendreLesPlacesExpirees`, et c'était juste : le temps rendait
 * les places, et ce passage quotidien était le seul endroit du système où
 * quelque chose changeait sans que personne ait agi. Depuis que la place ne part
 * plus toute seule, elle ne peut plus rien libérer par elle-même — elle
 * rattrape les écarts, par exemple une annulation faite en base sans passer par
 * un crochet.
 *
 * Le nom a changé avec le rôle : garder l'ancien aurait fait chercher, dans le
 * bilan du matin, une libération qui ne peut plus se produire.
 */
export async function recompterLesPlaces(payload: Payload): Promise<number> {
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

/* ── La cohorte qu'on garde ouverte ───────────────────────────────────────── */

/** Ce qu'il faut d'une session pour savoir si son plafond suit les inscriptions. */
export interface SessionTenue {
  capacite?: number | null;
  placesLibresTenues?: number | null;
}

/**
 * Le plafond à écrire pour laisser toujours le même nombre de places libres —
 * ou `undefined` quand il n'y a rien à changer.
 *
 * ── ⚠️ Ce que ce réglage règle, et ce qu'il ne fait pas ─────────────────────
 * La direction a demandé, le 11 septembre 2026, que la fiche du parcours porté
 * par l'annonce Facebook annonce « 20 places » sans jamais se fermer, le temps
 * de remplir la cohorte : « tal3 l nass beli mazal 20 place walakin hna l
 * dakhel tkon 3adna pré-inscription mamhdodach ».
 *
 * Un nombre **figé** à l'affichage aurait été le chemin court : la fiche dit
 * 20, la base dit autre chose. C'est une rareté inventée, sur la page même où
 * le visiteur décide d'acheter — et c'est ce qui le fait se dépêcher. Le site
 * ne dit pas au participant ce qui l'arrange : c'est la règle qui a fait
 * réécrire l'annonce d'une place perdue, l'attestation « officielle » et le
 * courriel qui promettait un délai déjà passé.
 *
 * Ici, il n'y a rien à inventer : **on ouvre réellement les places qu'on
 * annonce**. Le plafond suit les inscriptions, la cohorte ne se ferme pas, et
 * les vingt places affichées existent vraiment — quelqu'un qui lit « 20 places »
 * et s'inscrit en trouve une. Le nombre reste stable parce que la réalité le
 * suit, pas parce qu'on l'a arrêté.
 *
 * ⚠️ **Un seul crochet applique cette règle** (`Sessions.ts`, `beforeChange`),
 * et il la tient pour *toute* écriture de la ligne : le recompte d'une
 * inscription, la tâche de 8 h qui rend une place, une correction à la main.
 * L'appliquer chez chacun d'eux aurait fait trois copies d'une même décision —
 * et le journal en compte déjà assez qui ont divergé.
 *
 * ⚠️ **Vide, ce réglage n'existe pas.** Une session sans lui se remplit et se
 * ferme comme avant ; c'est le cas des onze autres cohortes, et le seul que les
 * épreuves du tunnel connaissent.
 */
export function capaciteTenue(session: SessionTenue, occupants: number): number | undefined {
  const tenues = Number(session.placesLibresTenues ?? Number.NaN);
  if (!Number.isFinite(tenues) || tenues < 1) return undefined;

  const prises = Number.isFinite(Number(occupants))
    ? Math.max(0, Math.trunc(Number(occupants)))
    : 0;
  const voulue = prises + Math.trunc(tenues);

  // Rien à écrire quand le plafond y est déjà : on n'élargit pas une écriture
  // sur la ligne `sessions` sans raison — c'est celle de l'interblocage.
  return voulue === Number(session.capacite ?? Number.NaN) ? undefined : voulue;
}
