/**
 * Repasse en brouillon les témoignages et partenaires de démonstration.
 *
 * Ces contenus ont été écrits pour construire le front. Les témoignages citent
 * des personnes qui n'existent pas ; la liste de partenaires nomme des
 * institutions — IFC, World Bank Group, EC-Council — dont le site d'origine
 * portait déjà l'avertissement :
 *
 *   « À VÉRIFIER AVANT PUBLICATION : confirmez que CLIXA a une relation réelle
 *     et documentée avec chacune de ces organisations. »
 *
 * Une citation inventée est une preuve sociale fabriquée ; un partenariat
 * annoncé sans convention est une affirmation que le visiteur croira. Ni l'une
 * ni l'autre ne doit passer en ligne par simple inertie.
 *
 *   npx payload run scripts/depublier-demonstration.ts
 *
 * Rien n'est supprimé : les documents restent en base, dépubliés. L'équipe les
 * republie un par un après vérification, ou les remplace.
 *
 * ⚠️ Il vise la base pointée par DATABASE_URL.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });

let depublies = 0;

for (const collection of ["temoignages", "partenaires"] as const) {
  const { docs } = await payload.find({
    collection,
    limit: 200,
    locale: "fr",
    depth: 0,
    draft: true,
    overrideAccess: true,
  });

  for (const d of docs) {
    if (d._status !== "published") continue;
    await payload.update({
      collection,
      id: d.id,
      locale: "fr",
      overrideAccess: true,
      data: { _status: "draft" },
    });
    const nom = "auteur" in d ? `${d.auteur} — ${d.fonction}` : String(d.nom);
    console.log(`  dépublié : ${collection.padEnd(12)} ${nom}`);
    depublies++;
  }
}

console.log(`\n  ${depublies} document(s) retiré(s) du site public.`);
console.log("  Ils restent en base, en brouillon, dans /admin.\n");

process.exit(0);
