/**
 * Complète les parcours déjà en base avec ce que le premier import avait laissé.
 *
 * Trois rubriques du catalogue Word n'étaient pas reprises : le positionnement,
 * l'approche pédagogique, et les livrables annoncés séance par séance — cent
 * treize lignes écrites par la direction. Ce script les pose sur les parcours
 * existants, sans toucher au reste.
 *
 *   npx payload run scripts/completer-catalogue.ts <fichier.json>
 *
 * Il n'écrit que sur les trois champs concernés et ne crée aucun parcours : un
 * parcours absent est signalé, pas ajouté. Les modules sont retrouvés par leur
 * rang, l'ordre des séances étant celui du document.
 *
 * ⚠️ Il vise la base pointée par DATABASE_URL.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { readFileSync } from "node:fs";

interface Seance {
  numero: number;
  titre: string;
  objectif: string;
  livrables: string;
  points: string[];
}

interface ParcoursExtrait {
  titre: string;
  slug: string;
  approche: string[];
  _positionnement: string[];
  seances: Seance[];
}

const chemin = process.argv.find((a) => a.endsWith(".json"));
if (!chemin) {
  console.error("Usage : npx payload run scripts/completer-catalogue.ts <fichier.json>");
  process.exit(1);
}

const parcours: ParcoursExtrait[] = JSON.parse(readFileSync(chemin, "utf-8"));
const payload = await getPayload({ config });

let completes = 0;
let absents = 0;

for (const p of parcours) {
  const { docs } = await payload.find({
    collection: "programmes",
    where: { slug: { equals: p.slug } },
    limit: 1,
    locale: "fr",
    depth: 0,
    draft: true,
    overrideAccess: true,
  });
  const doc = docs[0];
  if (!doc) {
    console.log(`  ! ${p.titre} — absent de la base`);
    absents++;
    continue;
  }

  // Les modules gardent l'ordre du document : on les apparie par rang, en
  // conservant tout ce qu'ils portent déjà.
  const modules = (doc.modules ?? []).map((m, i) => {
    const s = p.seances[i];
    return s?.livrables ? { ...m, livrables: s.livrables } : m;
  });

  const livrablesPoses = modules.filter((m) => (m as { livrables?: string }).livrables).length;

  await payload.update({
    collection: "programmes",
    id: doc.id,
    locale: "fr",
    depth: 0,
    overrideAccess: true,
    data: {
      ...(p._positionnement.length ? { positionnement: p._positionnement.join(" · ") } : {}),
      ...(p.approche.length ? { approche: p.approche.map((valeur) => ({ valeur })) } : {}),
      modules,
    },
  });

  console.log(
    `  + ${p.titre.padEnd(38)} approche ${String(p.approche.length).padStart(2)} · ` +
      `livrables ${livrablesPoses}/${modules.length}` +
      `${p._positionnement.length ? " · positionnement" : ""}`,
  );
  completes++;
}

console.log(`\n  ${completes} parcours complété(s), ${absents} absent(s).\n`);
process.exit(0);
