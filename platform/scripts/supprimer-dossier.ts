/**
 * Supprimer un ou plusieurs dossiers, par référence.
 *
 *   npx payload run scripts/supprimer-dossier.ts CLX-XXXXXXXX [CLX-YYYYYYYY …]
 *
 * ⚠️ Passe par l'API de Payload, jamais par SQL. Une suppression directe en
 * base ne déclenche aucun crochet : le décompte de places de la session
 * resterait gonflé, et la place ne reviendrait au catalogue qu'au prochain
 * passage de la tâche quotidienne — ou jamais, si plus rien ne touche à cette
 * session.
 *
 * ⚠️ Un script ne rafraîchit pas le site : `revalidatePath` exige le contexte
 * de requête de Next. Redéployer après, sinon les pages servies continuent
 * d'annoncer l'ancien décompte.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const references = process.argv.slice(2).filter((a) => a.startsWith("CLX-"));
if (references.length === 0) {
  console.error("  Aucune référence. Usage : supprimer-dossier.ts CLX-XXXXXXXX");
  process.exit(1);
}

const payload = await getPayload({ config });

for (const reference of references) {
  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { reference: { equals: reference } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });

  const dossier = docs[0];
  if (!dossier) {
    console.log(`  ✗ ${reference} — introuvable, rien fait`);
    continue;
  }

  const session = typeof dossier.session === "object" ? dossier.session : undefined;
  console.log(
    `  · ${reference} — ${dossier.apprenantNom} <${dossier.apprenantEmail}> · ${session?.reference ?? "session inconnue"}`,
  );

  await payload.delete({ collection: "inscriptions", id: dossier.id, overrideAccess: true });
  console.log(`  ✓ ${reference} supprimé`);
}

// Le crochet `recompter` s'est déclenché à chaque suppression : on relit.
const { docs: sessions } = await payload.find({
  collection: "sessions",
  where: { placesReservees: { greater_than: 0 } },
  limit: 100,
  depth: 0,
  overrideAccess: true,
});
console.log(
  sessions.length === 0
    ? "\n  Aucune session ne retient de place."
    : "\n  Places encore tenues :\n" +
        sessions.map((s) => `    ${s.reference} · ${s.placesReservees}/${s.capacite}`).join("\n"),
);
