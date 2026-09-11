/**
 * Rouvrir des places sur une session, en visant ce que le visiteur lira.
 *
 * ── ⚠️ On règle le nombre affiché, pas le plafond ───────────────────────────
 * La fiche publique n'affiche pas la capacité : elle affiche
 * `capacite - placesReservees`. Décider « la capacité passe à 46 » demande donc
 * de savoir combien de dossiers occupent la session **à cet instant** — un
 * nombre qui bouge tout seul, puisque la tâche de 8 h rend les places non
 * confirmées. Une capacité posée de tête affiche alors autre chose que ce qu'on
 * voulait montrer, et personne ne le voit avant d'ouvrir la fiche.
 *
 * On donne donc le nombre de places **libres** voulu, et la capacité s'en
 * déduit. Le script relit ensuite la session et imprime la phrase exacte du
 * badge — c'est la seule vérification qui vaille.
 *
 *   npx payload run scripts/ouvrir-des-places.ts "Directeur Administratif" 20
 *   ECRIRE=1 npx payload run scripts/ouvrir-des-places.ts "Directeur Administratif" 20
 *
 * ⚠️ Sans `ECRIRE=1`, il montre et s'arrête : la capacité commande ce que le
 * site public annonce et ce que le tunnel accepte. Même prudence que
 * `corriger-pays.ts`.
 *
 * ⚠️ Il vise la base pointée par `DATABASE_URL`. Pour la production :
 *
 *   set -a && . ./.env.prod && set +a && ECRIRE=1 npx payload run \
 *     scripts/ouvrir-des-places.ts "Directeur Administratif" 20
 *
 * ⚠️ Un script ne rafraîchit pas le site : `revalidatePath` exige le contexte
 * de requête de Next, et les crochets le taisent. La fiche peut servir
 * l'ancien décompte jusqu'à une heure — redéployer pour le voir tout de suite.
 *
 * Rejouable : le viser deux fois de suite avec le même nombre ne change rien la
 * seconde fois. Le relancer plus tard **rouvre** le compte à la même valeur.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { occupationDeLaSession } from "../src/lib/occupation";
import { occupeUnePlace } from "../src/lib/places";

/*
  ⚠️ `payload run` réécrit `process.argv` : il retire « run » et le chemin du
  script, et **convertit ce qui ressemble à un nombre** — `argv` porte donc un
  `20` entier, pas la chaîne « 20 ». Un `.endsWith()` posé dessus lève
  « a.endsWith is not a function », et l'on cherche le défaut dans le script.
  On repasse par `String` avant toute chose, et l'on tolère les deux formes
  d'invocation.
*/
const suite = process.argv
  .slice(2)
  .map((a) => String(a))
  .filter((a) => a !== "run" && !a.endsWith(".ts"));
const [fragment, libresBrut] = suite;
const libres = Number(libresBrut);

if (!fragment || !Number.isInteger(libres) || libres < 0 || libres > 1000) {
  console.error(
    'Usage : npx payload run scripts/ouvrir-des-places.ts "<référence>" <places libres>',
  );
  process.exit(1);
}

const payload = await getPayload({ config });

const { docs } = await payload.find({
  collection: "sessions",
  limit: 500,
  depth: 0,
  overrideAccess: true,
});

const trouvees = docs.filter((s) =>
  String(s.reference ?? "")
    .toLowerCase()
    .includes(fragment.toLowerCase()),
);

if (trouvees.length === 0) {
  console.error(`Aucune session ne porte « ${fragment} ».`);
  process.exit(1);
}
if (trouvees.length > 1) {
  console.error(`« ${fragment} » désigne ${trouvees.length} sessions :`);
  for (const s of trouvees) console.error(`  ${s.reference}`);
  console.error("Préciser — on n'ouvre pas des places sur une session qu'on n'a pas nommée.");
  process.exit(1);
}

const session = trouvees[0]!;

/*
  ⚠️ On recompte plutôt que de croire `placesReservees`. Le champ est tenu par
  le crochet `recompter` et par la tâche de 8 h ; entre deux passages il peut
  être en retard d'une journée, et la capacité qu'on en déduirait afficherait
  alors un autre nombre que celui qu'on visait.
*/
const { totalDocs: occupants } = await payload.count({
  collection: "inscriptions",
  where: { and: [{ session: { equals: session.id } }, occupeUnePlace()] },
  overrideAccess: true,
});

const reservees = Number((session as { placesReservees?: number }).placesReservees ?? 0);
const capaciteActuelle = Number(session.capacite ?? 0);
const capaciteVoulue = occupants + libres;

const avant = occupationDeLaSession({ capacite: capaciteActuelle, placesReservees: reservees });

console.log(`\n${session.reference}`);
console.log(`  aujourd'hui   capacité ${capaciteActuelle} · ${avant.compte} · ${avant.libelle}`);
if (reservees !== occupants) {
  console.log(`  ⚠️ le champ dit ${reservees} occupant(s), le recompte en trouve ${occupants}`);
}
console.log(
  `  visé          capacité ${capaciteVoulue} · ${occupants} / ${capaciteVoulue} · ${libres} libre(s)`,
);

if (capaciteVoulue === capaciteActuelle && reservees === occupants) {
  console.log("\nRien à faire : la fiche affiche déjà ce nombre.");
  process.exit(0);
}

if (!process.env.ECRIRE) {
  console.log("\nRien n'a été écrit. Relancer avec ECRIRE=1 pour appliquer.");
  process.exit(0);
}

await payload.update({
  collection: "sessions",
  id: session.id,
  data: { capacite: capaciteVoulue },
  overrideAccess: true,
});

/*
  On relit depuis la base, et on imprime ce que le visiteur lira. L'écriture
  déclenche `recompter`, qui peut corriger `placesReservees` au passage : la
  seule valeur qui compte est celle d'après.
*/
const apres = await payload.findByID({
  collection: "sessions",
  id: session.id,
  depth: 0,
  overrideAccess: true,
});
const etat = occupationDeLaSession({
  capacite: apres.capacite,
  placesReservees: (apres as { placesReservees?: number }).placesReservees,
});

console.log(`\n  après         capacité ${apres.capacite} · ${etat.compte} · ${etat.libelle}`);
console.log(`  la fiche affichera « ${etat.restantes} place${etat.restantes > 1 ? "s" : ""} »`);
console.log("\n⚠️ Redéployer pour que la fiche publique le montre tout de suite.\n");
process.exit(0);
