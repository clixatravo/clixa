/**
 * Retire des dossiers nommément désignés, en passant par Payload.
 *
 * Une suppression en SQL ne déclenche pas le crochet `recompter` : le décompte
 * de places resterait gonflé, et le site annoncerait deux places prises pour
 * des dossiers qui n'existent plus. Payload fait tourner le crochet.
 *
 *   npx payload run scripts/retirer-dossiers.ts CLX-AAAAA CLX-BBBBB
 */
import { getPayload } from "payload";
import config from "@payload-config";

const references = process.argv.slice(2).filter((a) => /^CLX-[A-Z0-9]+$/i.test(a));

if (references.length === 0) {
  console.error("Aucune référence valide. Usage : retirer-dossiers.ts CLX-XXXXX [CLX-YYYYY]");
  process.exit(1);
}

const payload = await getPayload({ config });

for (const reference of references) {
  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { reference: { equals: reference.toUpperCase() } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const dossier = docs[0];
  if (!dossier) {
    console.log(`  · ${reference} : introuvable, rien à faire`);
    continue;
  }

  await payload.delete({ collection: "inscriptions", id: dossier.id, overrideAccess: true });
  console.log(`  ✓ ${reference} retiré`);
}

console.log("\nLe crochet a recompté les places de chaque session touchée.");
