/**
 * Fixer la capacité des sessions ouvertes.
 *
 * La capacité valait 20 depuis l'ouverture de la cohorte de septembre — un
 * chiffre que rien ne fondait, les fiches de la direction n'en donnant aucun.
 * C'est elle qui produit le décompte de places montré au visiteur.
 *
 *   npx payload run scripts/definir-capacite.ts 30
 *
 * ⚠️ Elle vise la base pointée par DATABASE_URL. Pour la production :
 *
 *   set -a && . ./.env.prod && set +a && npx payload run scripts/definir-capacite.ts 30
 *
 * Le script est rejouable : il écrit la même valeur autant de fois qu'on veut.
 * Il ne touche pas aux places déjà réservées — seulement au plafond.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const argument = process.argv.find((a) => /^\d+$/.test(a));
const capacite = argument ? Number(argument) : NaN;

if (!Number.isInteger(capacite) || capacite < 1 || capacite > 10000) {
  console.error("Usage : npx payload run scripts/definir-capacite.ts <nombre>");
  process.exit(1);
}

const payload = await getPayload({ config });

const { docs } = await payload.find({
  collection: "sessions",
  limit: 500,
  depth: 0,
  overrideAccess: true,
});

let touchees = 0;
for (const session of docs) {
  if (session.capacite === capacite) continue;
  await payload.update({
    collection: "sessions",
    id: session.id,
    data: { capacite },
    overrideAccess: true,
  });
  touchees += 1;
}

console.log(`\nCapacité portée à ${capacite} sur ${touchees} session(s).`);

/*
  On relit pour montrer l'effet réel plutôt que l'intention : le décompte de
  places est ce que le visiteur verra.
*/
const { docs: apres } = await payload.find({
  collection: "sessions",
  limit: 500,
  depth: 0,
  sort: "debut",
  overrideAccess: true,
});

for (const s of apres.slice(0, 3)) {
  const restantes = (s.capacite ?? 0) - (s.placesReservees ?? 0);
  console.log(`  ${String(s.reference).slice(0, 52).padEnd(54)} ${restantes} place(s) libre(s)`);
}
if (apres.length > 3) console.log(`  … et ${apres.length - 3} autres`);

process.exit(0);
