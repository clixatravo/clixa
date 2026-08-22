/**
 * Ouvre une cohorte : une session par parcours publié.
 *
 * Les parcours se donnent le week-end, à raison de huit séances hebdomadaires.
 * Le catalogue Word documente deux rythmes : le samedi de 9 h à 13 h UTC pour
 * les parcours exécutifs, le dimanche de 13 h à 17 h UTC pour la préparation
 * PMP. Les dix autres parcours suivent celui des exécutifs, faute d'indication
 * contraire.
 *
 *   npx payload run scripts/ouvrir-cohorte.ts 2026-09-19
 *
 * La date passée est celle du premier samedi. Le dimanche suit, et la huitième
 * séance tombe sept semaines plus tard.
 *
 * ⚠️ La capacité vaut 20 par défaut : le chiffre n'est pas dans les fiches. Il
 * se corrige session par session depuis /admin, et il gouverne le décompte de
 * places affiché au visiteur.
 *
 * Le script ne touche pas à une session déjà ouverte pour le même parcours à la
 * même date : il peut être rejoué.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const SEANCES = 8;
const CAPACITE_PAR_DEFAUT = 20;

const jour = process.argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
if (!jour) {
  console.error("Usage : npx payload run scripts/ouvrir-cohorte.ts AAAA-MM-JJ (un samedi)");
  process.exit(1);
}

const samedi = new Date(`${jour}T00:00:00Z`);
if (samedi.getUTCDay() !== 6) {
  console.error(`${jour} n'est pas un samedi. Les parcours se donnent le week-end.`);
  process.exit(1);
}

/** Ajoute n jours à une date, en UTC. */
const plus = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

/** Pose l'heure UTC sur une date. */
const a = (d: Date, h: number) => {
  const x = new Date(d);
  x.setUTCHours(h, 0, 0, 0);
  return x;
};

const dimanche = plus(samedi, 1);

const RYTHMES = {
  samedi: {
    premier: samedi,
    heureDebut: 9,
    heureFin: 13,
    cadence: `${SEANCES} samedis · 9h00–13h00`,
  },
  dimanche: {
    premier: dimanche,
    heureDebut: 13,
    heureFin: 17,
    cadence: `${SEANCES} dimanches · 13h00–17h00`,
  },
} as const;

const payload = await getPayload({ config });

const { docs: programmes } = await payload.find({
  collection: "programmes",
  limit: 200,
  locale: "fr",
  depth: 0,
  sort: "id",
  overrideAccess: true,
});

let ouvertes = 0;
let ignorees = 0;

for (const p of programmes) {
  // La préparation PMP se donne le dimanche ; tout le reste, le samedi.
  const cle = p.type === "certification" ? "dimanche" : "samedi";
  const r = RYTHMES[cle];

  const debut = a(r.premier, r.heureDebut);
  const derniere = plus(r.premier, 7 * (SEANCES - 1));
  const fin = a(derniere, r.heureFin);

  const deja = await payload.find({
    collection: "sessions",
    where: {
      and: [{ programme: { equals: p.id } }, { debut: { equals: debut.toISOString() } }],
    },
    limit: 1,
    overrideAccess: true,
  });
  if (deja.docs[0]) {
    console.log(`  = ${String(p.titre)} — déjà ouverte`);
    ignorees++;
    continue;
  }

  await payload.create({
    collection: "sessions",
    locale: "fr",
    overrideAccess: true,
    data: {
      reference: `${p.slug}-${jour}`,
      programme: p.id,
      // « visio » et non « en-ligne » : les séances sont live, à heure fixe.
      // « en-ligne » désigne un accès permanent, et la fiche l'affiche ainsi —
      // promettre au visiteur qu'il suit à son rythme serait faux.
      mode: "visio",
      debut: debut.toISOString(),
      fin: fin.toISOString(),
      cadence: r.cadence,
      fuseau: "UTC",
      capacite: CAPACITE_PAR_DEFAUT,
      placesReservees: 0,
      prix: 423,
      devise: "EUR",
    },
  });

  console.log(
    `  + ${String(p.titre).padEnd(38)} ${cle.padEnd(9)} ` +
      `${debut.toISOString().slice(0, 10)} → ${fin.toISOString().slice(0, 10)}`,
  );
  ouvertes++;
}

console.log(`\n  ${ouvertes} session(s) ouverte(s), ${ignorees} déjà en place.`);
console.log(`  Capacité posée à ${CAPACITE_PAR_DEFAUT} — à ajuster depuis /admin.\n`);

process.exit(0);
