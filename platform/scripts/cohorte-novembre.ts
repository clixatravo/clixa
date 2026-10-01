/**
 * Clôturer la cohorte d'octobre 2026 et ouvrir la cohorte du soir de novembre.
 *
 *   npx payload run scripts/cohorte-novembre.ts            # montre, n'écrit rien
 *   ECRIRE=1 npx payload run scripts/cohorte-novembre.ts   # écrit
 *
 * Décision de la direction, le 1er octobre 2026 : la cohorte de novembre se
 * donne **le soir, deux soirs par semaine, pendant deux mois**, de 20h00 à
 * 22h00 heure du Maroc — **19h00–21h00 UTC**, l'heure qu'affichent toutes les
 * fiches. Elle **remplace** la cohorte du week-end préparée le 30 septembre
 * (samedi et dimanche dès le 31 octobre), qui n'a jamais été publiée.
 *
 *   lundi et mercredi, du 2 novembre au 23 décembre    DAF, audit interne,
 *                                                      contrôle de gestion,
 *                                                      production, maintenance,
 *                                                      industriel
 *   mardi et jeudi, du 3 novembre au 24 décembre       commercial, marketing, RH,
 *                                                      QHSE, projets, PMP
 *
 * Seize soirées de deux heures, soit les 32 heures du parcours. La préparation
 * PMP® en compte 35 : deux soirées de plus, les vendredis 11 et 18 décembre,
 * comme dans l'emploi du temps validé.
 *
 * ── Ce que le script fait, dans cet ordre ───────────────────────────────────
 * 1. Les sessions qui démarrent le 3 octobre 2026 passent « clôturées » : les
 *    inscriptions ferment, les dossiers déjà ouverts ne bougent pas. Le réglage
 *    « places libres à maintenir » leur est retiré — laissé, il continuerait de
 *    faire suivre le plafond d'une cohorte fermée.
 * 2. Les sessions du week-end de novembre (31 octobre, 1er novembre) sont
 *    retirées. Elles n'existent que sur `dev`, où le premier jet de ce script
 *    les a ouvertes. ⚠️ **Une session qui porte un dossier n'est jamais
 *    retirée** : le script renonce et le dit. Supprimer la session d'un inscrit
 *    lui retirerait sa place sans qu'il le sache.
 * 3. Une session du soir est ouverte par parcours publié, dans son rythme.
 * 4. Les deux textes de la fiche qui comptent les séances suivent : la ligne
 *    « Rythme » (« 8 séances live • 4h chacune » → « 16 soirées live • 2h
 *    chacune ») et l'accroche sous le titre (« 8 séances live » → « 16 soirées
 *    live », « 8 sessions live » → « 18 soirées live » pour la PMP®).
 *    ⚠️ Seulement s'ils portent **mot pour mot** l'ancien texte : un texte que
 *    l'équipe a réécrit n'est pas écrasé, il est nommé pour qu'on le relise.
 *
 * ⚠️ **Un parcours absent de la répartition fait renoncer le script.** Le
 * ranger dans un rythme par défaut, c'est annoncer au visiteur un horaire que
 * personne n'a décidé.
 *
 * ⚠️ **Rejouable.** Une session du soir déjà ouverte n'est pas recréée, une
 * session déjà clôturée n'est pas réécrite, un texte déjà à jour n'est pas
 * touché.
 *
 * Les heures sont posées par le crochet de `Sessions.ts` à partir de la
 * cadence, qui fait foi : le script les écrit aussi, pour que la relecture
 * ci-dessous ne dépende pas de lui. Les dates de chaque séance, elles, se
 * déduisent des jours nommés dans la cadence (`seancesDeLaSession`).
 */
import { getPayload } from "payload";
import config from "@payload-config";

const ECRIRE = process.env.ECRIRE === "1";
const OCTOBRE = "2026-10-03";
const WEEK_END = ["2026-10-31", "2026-11-01"];
const HEURES = { debut: 19, fin: 21 };

type Rythme = "lundi-mercredi" | "mardi-jeudi" | "pmp";

const RYTHMES: Record<Rythme, { debut: string; fin: string; cadence: string }> = {
  "lundi-mercredi": {
    debut: "2026-11-02",
    fin: "2026-12-23",
    cadence: "16 soirées · lundis et mercredis · 19h00–21h00",
  },
  "mardi-jeudi": {
    debut: "2026-11-03",
    fin: "2026-12-24",
    cadence: "16 soirées · mardis et jeudis · 19h00–21h00",
  },
  /*
    Les deux vendredis sont écrits dans la cadence, **avec leurs dates** :
    `planDesSeances` les y lit, et la fiche comme l'emploi du temps public en
    tirent les dix-huit soirées. ⚠️ Écrits « et deux vendredis », sans date,
    ils ne se déduiraient pas — le calendrier se tairait.
  */
  pmp: {
    debut: "2026-11-03",
    fin: "2026-12-24",
    cadence: "18 soirées · mardis et jeudis, et les vendredis 11 et 18 déc. · 19h00–21h00",
  },
};

const REPARTITION: Record<string, Rythme> = {
  "directeur-administratif-et-financier": "lundi-mercredi",
  "directeur-audit-interne": "lundi-mercredi",
  "directeur-controle-de-gestion": "lundi-mercredi",
  "directeur-de-production": "lundi-mercredi",
  "directeur-de-maintenance": "lundi-mercredi",
  "directeur-industriel": "lundi-mercredi",
  "directeur-commercial": "mardi-jeudi",
  "directeur-marketing": "mardi-jeudi",
  "directeur-des-ressources-humaines": "mardi-jeudi",
  "directeur-qhse": "mardi-jeudi",
  "directeur-de-projets": "mardi-jeudi",
  "preparation-a-la-certification-pmp": "pmp",
};

/*
  Chaque texte, avec sa valeur d'avant exacte. Trouvés en cherchant « séance »
  dans tous les champs du catalogue : l'accroche sous le titre disait encore
  « 8 séances live » au-dessus d'un calendrier de seize soirées.
*/
const TEXTES: { champ: "rythme" | "accroche"; avant: string; apres: string }[] = [
  {
    champ: "rythme",
    avant: "32 heures · 8 séances live • 4h chacune",
    apres: "32 heures · 16 soirées live • 2h chacune",
  },
  {
    champ: "accroche",
    avant: "Parcours exécutif • 32 heures • 8 séances live • 100 % en ligne",
    apres: "Parcours exécutif • 32 heures • 16 soirées live • 100 % en ligne",
  },
  {
    champ: "accroche",
    avant: "35 heures • 100 % en ligne • 8 sessions live + test à blanc • PMBOK v8",
    apres: "35 heures • 100 % en ligne • 18 soirées live + test à blanc • PMBOK v8",
  },
];

const aHeure = (jour: string, h: number) =>
  new Date(`${jour}T${String(h).padStart(2, "0")}:00:00.000Z`);

const payload = await getPayload({ config });

const { docs: programmes } = await payload.find({
  collection: "programmes",
  where: { _status: { equals: "published" } },
  limit: 200,
  locale: "fr",
  depth: 0,
  sort: "id",
  overrideAccess: true,
});

const orphelins = programmes.filter((p) => !REPARTITION[String(p.slug)]);
if (orphelins.length > 0) {
  console.log("\n  ✗ Parcours publiés sans rythme décidé :");
  for (const p of orphelins) console.log(`    · ${String(p.titre)} (${String(p.slug)})`);
  console.log("\n  Rien n'est écrit. Ajouter leur rythme dans REPARTITION.\n");
  process.exit(1);
}

/*
  Avant toute écriture : aucune session du week-end ne doit porter de dossier.
  Vérifié d'abord pour toutes, pour ne pas laisser la base à moitié écrite.
*/
const { docs: weekEnd } = await payload.find({
  collection: "sessions",
  where: {
    or: WEEK_END.map((jour) => ({
      debut: {
        greater_than_equal: `${jour}T00:00:00.000Z`,
        less_than: `${jour}T23:59:59.999Z`,
      },
    })),
  },
  limit: 100,
  depth: 0,
  overrideAccess: true,
});
const occupees: string[] = [];
for (const s of weekEnd) {
  const { totalDocs } = await payload.count({
    collection: "inscriptions",
    where: { session: { equals: s.id } },
    overrideAccess: true,
  });
  if (totalDocs > 0 || Number(s.placesReservees ?? 0) > 0) {
    occupees.push(`${String(s.reference)} — ${totalDocs} dossier(s)`);
  }
}
if (occupees.length > 0) {
  console.log("\n  ✗ Des sessions du week-end portent déjà des dossiers :");
  for (const o of occupees) console.log(`    · ${o}`);
  console.log("\n  Rien n'est écrit. Ces inscrits doivent être déplacés à la main d'abord.\n");
  process.exit(1);
}

console.log(
  `\n  ${ECRIRE ? "ÉCRITURE" : "Aperçu (rien n'est écrit)"} — ${programmes.length} parcours publiés\n`,
);

let cloturees = 0;
let retirees = 0;
let ouvertes = 0;
let deja = 0;
let rythmes = 0;

// 2 — la cohorte du week-end, jamais publiée.
for (const s of weekEnd) {
  console.log(`  − week-end  ${String(s.reference)}`);
  if (ECRIRE) await payload.delete({ collection: "sessions", id: s.id, overrideAccess: true });
  retirees += 1;
}

for (const p of programmes) {
  const slug = String(p.slug);
  const rythme = RYTHMES[REPARTITION[slug]!];

  const { docs: sessions } = await payload.find({
    collection: "sessions",
    where: { programme: { equals: p.id } },
    limit: 50,
    depth: 0,
    sort: "debut",
    overrideAccess: true,
  });

  // 1 — la cohorte d'octobre.
  for (const s of sessions.filter((s) => String(s.debut ?? "").slice(0, 10) === OCTOBRE)) {
    if (s.cloturee && s.placesLibresTenues == null) continue;
    console.log(
      `  ◼ clôture   ${String(p.titre).padEnd(42)} ${OCTOBRE}` +
        (s.placesLibresTenues != null
          ? `  (retire « ${s.placesLibresTenues} places tenues »)`
          : ""),
    );
    if (ECRIRE) {
      await payload.update({
        collection: "sessions",
        id: s.id,
        locale: "fr",
        overrideAccess: true,
        data: { cloturee: true, placesLibresTenues: null },
      });
    }
    cloturees += 1;
  }

  // 3 — la cohorte du soir.
  const debut = aHeure(rythme.debut, HEURES.debut);
  const fin = aHeure(rythme.fin, HEURES.fin);
  if (sessions.some((s) => String(s.debut ?? "").slice(0, 10) === rythme.debut)) {
    console.log(`  = soir      ${String(p.titre).padEnd(42)} déjà ouverte`);
    deja += 1;
  } else {
    const modele =
      sessions.find((s) => String(s.debut ?? "").slice(0, 10) === OCTOBRE) ?? sessions.at(-1);
    console.log(
      `  + soir      ${String(p.titre).padEnd(42)} ${rythme.cadence.padEnd(48)} ` +
        `${rythme.debut} → ${rythme.fin}`,
    );
    if (ECRIRE) {
      await payload.create({
        collection: "sessions",
        locale: "fr",
        overrideAccess: true,
        data: {
          reference: `${slug}-${rythme.debut}`,
          programme: p.id,
          mode: "visio",
          debut: debut.toISOString(),
          fin: fin.toISOString(),
          cadence: rythme.cadence,
          fuseau: "UTC",
          capacite: 30,
          placesReservees: 0,
          prix: modele?.prix ?? 423,
          devise: modele?.devise ?? "EUR",
        },
      });
    }
    ouvertes += 1;
  }

  // 4 — les textes de la fiche qui comptent les séances.
  const aEcrire: Partial<Record<"rythme" | "accroche", string>> = {};
  for (const champ of ["rythme", "accroche"] as const) {
    const actuel = String(p[champ] ?? "");
    const regle = TEXTES.find((t) => t.champ === champ && t.avant === actuel);
    if (regle) {
      aEcrire[champ] = regle.apres;
      console.log(`  ~ ${champ.padEnd(9)} ${String(p.titre).padEnd(42)} « ${regle.apres} »`);
    } else if (/s[ée]ances?|sessions? live/i.test(actuel) && !TEXTES.some((t) => t.apres === actuel)) {
      console.log(`  ? ${champ.padEnd(9)} ${String(p.titre).padEnd(42)} réécrit à la main, à relire : « ${actuel} »`);
    }
  }
  if (Object.keys(aEcrire).length > 0) {
    if (ECRIRE) {
      await payload.update({
        collection: "programmes",
        id: p.id,
        locale: "fr",
        overrideAccess: true,
        data: aEcrire,
      });
    }
    rythmes += Object.keys(aEcrire).length;
  }
}

console.log(
  `\n  ${cloturees} session(s) d'octobre à clôturer, ${retirees} session(s) du week-end à retirer, ` +
    `${ouvertes} session(s) du soir à ouvrir, ${deja} déjà ouverte(s), ${rythmes} texte(s) de fiche à mettre à jour.`,
);
if (!ECRIRE) console.log("  Relancer avec ECRIRE=1 pour écrire.\n");

if (ECRIRE) {
  // Relecture : ce que la base dit maintenant, pas ce qu'on a cru écrire.
  const { docs } = await payload.find({
    collection: "sessions",
    where: { debut: { greater_than: "2026-10-30T00:00:00.000Z" } },
    limit: 50,
    depth: 1,
    sort: "debut",
    locale: "fr",
    overrideAccess: true,
  });
  console.log("\n  Relu en base — sessions après le 30 octobre :");
  for (const s of docs) {
    const titre = typeof s.programme === "object" && s.programme ? String(s.programme.titre) : "?";
    console.log(
      `    ${titre.padEnd(42)} ${String(s.cadence).padEnd(48)} ${String(s.debut).slice(0, 16)} → ${String(s.fin).slice(0, 16)}  ${s.capacite} places`,
    );
  }
  console.log("");
}

process.exit(0);
