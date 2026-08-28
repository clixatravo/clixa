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
import { rendreLesPlacesExpirees } from "../src/lib/places.js";

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

const creer = async (jours: number, nom: string, acompte = false) => {
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
  // On vieillit la ligne en base : Payload pose `createdAt` lui-même.
  if (jours > 0) {
    await payload.db.drizzle.execute(
      `UPDATE inscriptions SET created_at = now() - interval '${jours} days' WHERE id = ${d.id}` as never,
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
} finally {
  for (const id of aSupprimer) {
    await payload.delete({ collection: "inscriptions", id, overrideAccess: true });
  }
  console.log("  · dossiers d'épreuve supprimés");
}

console.log(manques === 0 ? "\nPlaces : tout tient." : `\nPlaces : ${manques} manque(s).`);
process.exit(manques === 0 ? 0 : 1);
