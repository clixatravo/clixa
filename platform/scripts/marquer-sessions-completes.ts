/**
 * Marquer 5 formations comme « COMPLET » pour créer un effet marketing de rareté et preuve sociale.
 *
 * Choix des 5 formations (0 inscription, non promues par annonce active) :
 * 1. Directeur des Ressources Humaines
 * 2. Directeur Marketing
 * 3. Directeur Audit Interne
 * 4. Directeur Industriel
 * 5. Directeur Commercial
 *
 * Utilisation :
 *   npx payload run scripts/marquer-sessions-completes.ts
 *   set -a && . ./.env.prod && set +a && npx payload run scripts/marquer-sessions-completes.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";

const SLUGS_COMPLETS = [
  "directeur-des-ressources-humaines",
  "directeur-marketing",
  "directeur-audit-interne",
  "directeur-industriel",
  "directeur-commercial",
];

const payload = await getPayload({ config });

console.log("\nRecherche des programmes cibles...");

const { docs: programmes } = await payload.find({
  collection: "programmes",
  where: {
    slug: { in: SLUGS_COMPLETS },
  },
  depth: 0,
  overrideAccess: true,
});

console.log(`Trouvé ${programmes.length} programme(s) correspondant(s).`);

const idsProgrammes = programmes.map((p) => p.id);

const { docs: sessions } = await payload.find({
  collection: "sessions",
  where: {
    programme: { in: idsProgrammes },
  },
  depth: 1,
  limit: 100,
  overrideAccess: true,
});

console.log(`Trouvé ${sessions.length} session(s) à clôturer/marquer comme COMPLET.`);

let misesAJour = 0;
for (const session of sessions) {
  const progTitre = typeof session.programme === "object" ? session.programme?.titre : session.programme;
  console.log(`- Clôture de la session [${session.id}] : ${session.reference ?? progTitre}`);
  
  await payload.update({
    collection: "sessions",
    id: session.id,
    data: {
      complete: true,
    },
    overrideAccess: true,
  });
  misesAJour++;
}

console.log(`\nSuccès : ${misesAJour} session(s) marquée(s) comme COMPLET !`);

// Vérification de lecture
const { docs: apres } = await payload.find({
  collection: "sessions",
  limit: 100,
  depth: 1,
  overrideAccess: true,
});

console.log("\n=== ÉTAT ACTUEL DU CATALOGUE ===");
for (const s of apres) {
  const progTitre = typeof s.programme === "object" ? s.programme?.titre : s.programme;
  const isComplete = Boolean(s.complete);
  const restantes = isComplete ? 0 : (s.capacite ?? 0) - (s.placesReservees ?? 0);
  const statut = isComplete ? "🔴 COMPLET (Inscriptions fermées)" : `🟢 Ouvert (${restantes} places libres)`;
  console.log(`  ${String(s.reference ?? progTitre).padEnd(65)} -> ${statut}`);
}

process.exit(0);
