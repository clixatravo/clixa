/**
 * Éprouve la règle des places : tenue sept jours, puis rendue.
 *
 * Le temps n'écrit rien. Une place expirée ne le sait pas tant que rien ne
 * touche à sa session — c'est la tâche quotidienne qui repasse. Ce script
 * fabrique un dossier daté d'hier, un autre d'il y a huit jours, et vérifie
 * que le catalogue dit la vérité dans les deux cas.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import {
  OCCUPE_UNE_PLACE_SQL,
  occupeUnePlace,
  rendreLesPlacesExpirees,
} from "../src/lib/places.js";

const payload = await getPayload({ config });
const aSupprimer: (string | number)[] = [];
let manques = 0;
const dire = (q: string, v: boolean) => {
  console.log(`  ${v ? "✓" : "✗"} ${q}`);
  if (!v) manques += 1;
};

const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 1,
  depth: 0,
  overrideAccess: true,
  where: { fin: { greater_than: new Date().toISOString() } },
});
const session = sessions[0]!;
const compter = async () => {
  const s = await payload.findByID({
    collection: "sessions",
    id: session.id,
    overrideAccess: true,
    depth: 0,
  });
  return (s as { placesReservees?: number }).placesReservees ?? 0;
};

/**
 * Crée un dossier d'épreuve, vieilli de `jours`.
 *
 * `signe` et `coordonneesIlYa` servent au second temps du tunnel : depuis que
 * le participant signe avant de recevoir de quoi payer, le délai ne court plus
 * depuis le dépôt. `coordonneesIlYa` vaut `undefined` tant que rien ne lui a
 * été envoyé — le cas où la place se tient sans terme.
 */
const creer = async (
  jours: number,
  nom: string,
  acompte = false,
  options: { signe?: boolean; coordonneesIlYa?: number } = {},
) => {
  const d = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: session.id,
      statut: "demandee",
      apprenantNom: nom,
      apprenantEmail: `places.${Date.now()}.${jours}@epreuve.invalid`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      echeances: [{ montant: 423, statut: acompte ? "regle" : "attendu" }],
    } as never,
  });
  aSupprimer.push(d.id);
  /*
    On vieillit la ligne en base : Payload pose `createdAt` lui-même, et passer
    par l'API le réécrirait. Les dates du contrat sont posées ici pour la même
    raison — et parce qu'un `update` déclencherait le crochet, ce qui
    fausserait le décompte qu'on est en train de mesurer.
  */
  const poser: string[] = [];
  if (jours > 0) poser.push(`created_at = now() - interval '${jours} days'`);
  if (options.signe) poser.push(`contrat_signe_le = now() - interval '${jours} days'`);
  if (options.coordonneesIlYa !== undefined) {
    poser.push(`coordonnees_envoyees_le = now() - interval '${options.coordonneesIlYa} days'`);
  }
  if (poser.length > 0) {
    await payload.db.drizzle.execute(
      `UPDATE inscriptions SET ${poser.join(", ")} WHERE id = ${d.id}` as never,
    );
  }
  return d.id;
};

try {
  const depart = await compter();

  await creer(0, "Épreuve Fraîche");
  const { GET } = await import("../src/app/(payload)/api/relances/route.js").catch(
    () => ({ GET: null }) as never,
  );
  void GET;
  const apresFraiche = await compter();
  dire("une inscription du jour retient une place", apresFraiche === depart + 1);

  await creer(8, "Épreuve Périmée");

  /*
    ⚠️ Le crochet a compté cette inscription : au moment où il s'est exécuté,
    elle datait de l'instant. C'est le vieillissement qui la périme, et le
    vieillissement n'écrit rien. Tant que la tâche quotidienne n'est pas
    passée, la place reste retenue — comportement voulu, pas défaut.
  */
  dire(
    "une inscription vieillie reste comptée jusqu'au passage suivant",
    (await compter()) === apresFraiche + 1,
  );

  const rendues = await rendreLesPlacesExpirees(payload);
  dire("la tâche quotidienne rend la place périmée", rendues >= 1);
  dire("le décompte revient à la vérité", (await compter()) === apresFraiche);

  /*
    ── Le cas qui a coûté une place à quelqu'un qui avait payé ───────────────
    Un acompte marqué « réglé » laissait le dossier en « demandée » : rien ne
    faisait le lien entre l'argent reçu et l'état du dossier. Passé sept jours,
    la tâche quotidienne rendait sa place — la tâche ne lit que le statut du
    dossier, et jusque-là elle avait raison de s'en contenter.

    L'épreuve vieillit le dossier de dix jours, bien au-delà du délai : s'il
    tient encore sa place, c'est que l'acompte l'a confirmé.
  */
  const avantAcompte = await compter();
  await creer(10, "Épreuve Acompte", true);
  dire(
    "un acompte reçu confirme le dossier et retient sa place",
    (await compter()) === avantAcompte + 1,
  );
  dire(
    "et la tâche quotidienne ne la lui reprend pas",
    (await rendreLesPlacesExpirees(payload), (await compter()) === avantAcompte + 1),
  );

  /*
    ── Le délai court depuis le moment où l'on peut agir ─────────────────────
    Depuis que le tunnel a deux temps, le participant ne peut rien verser avant
    que l'équipe lui envoie les coordonnées. Un compte à rebours parti du dépôt
    pouvait donc s'épuiser pendant qu'il attendait de nos nouvelles — et rendre
    au catalogue la place de quelqu'un qui avait signé un contrat.

    Les trois épreuves qui suivent vieillissent tout de dix jours, bien au-delà
    du délai, et regardent qui tient encore sa place.
  */
  const avantContrat = await compter();

  await creer(10, "Épreuve Signée Sans Coordonnées", false, { signe: true });
  await rendreLesPlacesExpirees(payload);
  dire(
    "un contrat signé dont les coordonnées ne sont pas parties tient sa place",
    (await compter()) === avantContrat + 1,
  );

  await creer(10, "Épreuve Coordonnées Fraîches", false, { signe: true, coordonneesIlYa: 0 });
  await rendreLesPlacesExpirees(payload);
  dire(
    "des coordonnées envoyées ce jour relancent le délai",
    (await compter()) === avantContrat + 2,
  );

  await creer(10, "Épreuve Coordonnées Vieilles", false, { signe: true, coordonneesIlYa: 10 });
  await rendreLesPlacesExpirees(payload);
  dire(
    "passé sept jours après l'envoi, la place repart au catalogue",
    (await compter()) === avantContrat + 2,
  );

  /*
    ── Les deux façons de poser la même question ─────────────────────────────
    Payload interroge par `occupeUnePlace()` ; `e2e/menage.ts` recompte en SQL,
    une suppression directe ne déclenchant aucun crochet. Les deux viennent
    maintenant du même fichier, mais la traduction reste écrite deux fois — une
    fois en `Where`, une fois en SQL — et rien ne garantit qu'elles disent la
    même chose.

    On les compte donc toutes les deux, sur les mêmes dossiers d'épreuve, dont
    l'un au moins tombe dans chacune des quatre branches. Un écart ici est
    exactement le défaut qui rendrait le décompte faux sans rien casser.
  */
  const { totalDocs: parPayload } = await payload.count({
    collection: "inscriptions",
    where: { and: [{ session: { equals: session.id } }, occupeUnePlace()] },
    overrideAccess: true,
  });

  const parSql = await payload.db.drizzle.execute(
    `SELECT count(*)::int AS n FROM inscriptions i
     WHERE i.session_id = ${session.id} AND ${OCCUPE_UNE_PLACE_SQL}` as never,
  );
  const lignes = (parSql as unknown as { rows?: Record<string, unknown>[] }).rows ?? [];
  const compteSql = Number(lignes[0]?.n ?? -1);

  dire(
    `les deux formulations comptent pareil (Payload ${parPayload}, SQL ${compteSql})`,
    parPayload === compteSql,
  );
} finally {
  for (const id of aSupprimer) {
    await payload.delete({ collection: "inscriptions", id, overrideAccess: true });
  }
  console.log("  · dossiers d'épreuve supprimés");
}

console.log(manques === 0 ? "\nPlaces : tout tient." : `\nPlaces : ${manques} manque(s).`);
process.exit(manques === 0 ? 0 : 1);
