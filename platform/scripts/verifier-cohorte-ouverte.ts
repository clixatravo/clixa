/**
 * Éprouve la cohorte qu'on tient ouverte : le plafond suit les inscriptions,
 * et le nombre de places libres annoncé ne bouge pas.
 *
 * ── ⚠️ Ce que cette garde protège ───────────────────────────────────────────
 * La direction voulait un compteur qui reste à « 20 places » pendant que les
 * inscriptions rentrent. Le chemin court aurait été d'écrire 20 en dur à
 * l'affichage : la fiche dit vingt, la base dit autre chose, et le visiteur
 * décide d'acheter sur une rareté inventée. Ce qui est fait à la place ouvre
 * réellement les places annoncées — le nombre tient parce que la réalité suit.
 *
 * Le jour où quelqu'un « simplifiera » ce réglage en figeant l'affichage, ces
 * contrôles ne le verront pas : ils vérifient que la base dit la vérité. C'est
 * `verifier-occupation.ts` qui garde la lecture, et la fiche publique qui
 * calcule `capacite - placesReservees` sans intermédiaire.
 *
 * ⚠️ **Un témoin, sans quoi la garde ne mesure rien.** Une session *sans* le
 * réglage doit voir ses places libres descendre. Sans lui, une règle qui
 * s'appliquerait à toutes les sessions — ou à aucune — passerait au vert.
 *
 *   npx payload run scripts/verifier-cohorte-ouverte.ts
 *
 * ⚠️ Ne pas le lancer pendant que `next dev` tourne : les deux écrivent sur la
 * même ligne de `sessions`, et Postgres finit par signaler un interblocage.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { capaciteTenue, recompterLesPlaces } from "../src/lib/places.js";
import { occupationDeLaSession } from "../src/lib/occupation.js";

const payload = await getPayload({ config });
let manques = 0;
const dire = (q: string, v: boolean) => {
  console.log(`  ${v ? "✓" : "✗"} ${q}`);
  if (!v) manques += 1;
};

/* ── Le calcul, sans base ────────────────────────────────────────────────── */

console.log("\n  Le plafond qui suit\n");

dire("vide, il n'y a rien à écrire", capaciteTenue({ capacite: 30 }, 26) === undefined);
dire(
  "à zéro, il n'y a rien à écrire",
  capaciteTenue({ capacite: 30, placesLibresTenues: 0 }, 26) === undefined,
);
dire(
  "26 occupants et 20 tenues → 46",
  capaciteTenue({ capacite: 30, placesLibresTenues: 20 }, 26) === 46,
);
dire(
  "le plafond déjà juste ne se réécrit pas",
  capaciteTenue({ capacite: 46, placesLibresTenues: 20 }, 26) === undefined,
);
dire(
  "une place rendue rabaisse le plafond",
  capaciteTenue({ capacite: 46, placesLibresTenues: 20 }, 25) === 45,
);
/*
  ⚠️ Postgres rend `numeric` en texte par une porte et en nombre par une autre.
  Une comparaison entre « 46 » et 46 conclurait qu'il n'y a rien à écrire, et le
  plafond ne suivrait plus — en silence.
*/
dire(
  "un plafond rendu en texte se compare quand même",
  capaciteTenue({ capacite: "46" as unknown as number, placesLibresTenues: 20 }, 26) === undefined,
);

console.log("\n  Ce que l'équipe lit\n");

const ouverte = occupationDeLaSession({
  capacite: 46,
  placesReservees: 26,
  placesLibresTenues: 20,
});
dire("la liste dit « cohorte ouverte »", /cohorte ouverte/.test(ouverte.libelle));
dire("elle dit les 20 libres", ouverte.libelle.startsWith("20 libre"));
/*
  ⚠️ L'or veut dire « il n'en reste presque plus ». Sur une cohorte qui ne peut
  pas se fermer, il enverrait l'équipe se presser pour rien.
*/
dire(
  "trois places tenues ne passent pas à l'or",
  occupationDeLaSession({ capacite: 29, placesReservees: 26, placesLibresTenues: 3 }).ton ===
    "ouvert",
);
dire(
  "sans le réglage, trois places restent une tension",
  occupationDeLaSession({ capacite: 29, placesReservees: 26 }).ton === "tension",
);

/* ── Le crochet, en base ─────────────────────────────────────────────────── */

const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 2,
  depth: 0,
  sort: "id",
  overrideAccess: true,
  where: { fin: { greater_than: new Date().toISOString() } },
});

if (sessions.length < 2) {
  console.log("\n  ⚠️ Moins de deux sessions à venir : le crochet n'est pas éprouvé.\n");
  process.exit(manques > 0 ? 1 : 0);
}

const tenue = sessions[0]!;
const temoin = sessions[1]!;
const avant = {
  tenue: { capacite: tenue.capacite, tenues: tenue.placesLibresTenues ?? null },
  temoin: { capacite: temoin.capacite, tenues: temoin.placesLibresTenues ?? null },
};
const dossiers: (string | number)[] = [];

const relire = async (id: number | string) =>
  payload.findByID({ collection: "sessions", id, depth: 0, overrideAccess: true });

const libres = async (id: number | string) => {
  const s = await relire(id);
  return Number(s.capacite ?? 0) - Number(s.placesReservees ?? 0);
};

const inscrire = async (session: number | string, quoi: string) => {
  const d = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session,
      statut: "demandee",
      apprenantNom: `Cohorte ${quoi}`,
      apprenantEmail: `cohorte.${Date.now()}.${quoi}@epreuve.invalid`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      echeances: [{ montant: 423, statut: "attendu" }],
    } as never,
  });
  dossiers.push(d.id);
  return d.id;
};

try {
  console.log("\n  Le crochet, sur une vraie session\n");

  await payload.update({
    collection: "sessions",
    id: tenue.id,
    data: { placesLibresTenues: 5 },
    overrideAccess: true,
  });

  const auReglage = await libres(tenue.id);
  dire("poser le réglage ouvre aussitôt les 5 places", auReglage === 5);
  const plafondAuReglage = Number((await relire(tenue.id)).capacite ?? 0);

  await inscrire(tenue.id, "tenue");
  const apresUne = await libres(tenue.id);
  dire("une inscription de plus, et il en reste toujours 5", apresUne === 5);

  const apresDeux = await (async () => {
    await inscrire(tenue.id, "tenue2");
    return libres(tenue.id);
  })();
  dire("deux inscriptions de plus, toujours 5", apresDeux === 5);

  /*
    ⚠️ On compare au plafond **du moment où le réglage a été posé**, jamais à
    celui d'avant : sur une session vide, poser « 5 places tenues » abaisse le
    plafond de 30 à 5, et une comparaison à l'état initial passerait au rouge
    sur un code parfaitement juste. C'est ce qu'a fait le premier jet.
  */
  const etat = await relire(tenue.id);
  dire(
    "la cohorte ne se ferme pas, le plafond a grandi",
    occupationDeLaSession(etat as never).libelle !== "Complet" &&
      Number(etat.capacite ?? 0) === plafondAuReglage + 2,
  );

  /*
    ⚠️ La tâche de 8 h écrit `placesReservees` sans rien savoir de ce réglage.
    Elle passe par le même crochet : si elle l'ignorait, le plafond cesserait de
    suivre au premier passage nocturne, c'est-à-dire hors de tout regard.
  */
  await recompterLesPlaces(payload);
  dire("la tâche quotidienne n'y touche pas", (await libres(tenue.id)) === 5);

  console.log("\n  Le témoin — sans le réglage, rien ne change\n");

  const temoinAvant = await libres(temoin.id);
  await inscrire(temoin.id, "temoin");
  const temoinApres = await libres(temoin.id);
  dire(
    `une place de moins sur la session sans réglage (${temoinAvant} → ${temoinApres})`,
    temoinApres === temoinAvant - 1,
  );

  console.log("\n  Le réglage s'efface\n");

  await payload.update({
    collection: "sessions",
    id: tenue.id,
    data: { placesLibresTenues: null },
    overrideAccess: true,
  });
  const efface = await relire(tenue.id);
  dire("la case vidée reste vide", (efface.placesLibresTenues ?? null) === null);

  await inscrire(tenue.id, "apres");
  const apresEffacement = await libres(tenue.id);
  dire(`le plafond ne suit plus (5 → ${apresEffacement})`, apresEffacement === 4);
} finally {
  for (const id of dossiers) {
    await payload.delete({ collection: "inscriptions", id, overrideAccess: true }).catch(() => {});
  }
  for (const [id, etat] of [
    [tenue.id, avant.tenue],
    [temoin.id, avant.temoin],
  ] as const) {
    await payload.update({
      collection: "sessions",
      id,
      data: { placesLibresTenues: etat.tenues, capacite: etat.capacite },
      overrideAccess: true,
    });
  }
  console.log("\n  Les sessions sont remises comme elles étaient.");
}

console.log(manques === 0 ? "\n  Rien à signaler.\n" : `\n  ${manques} contrôle(s) au rouge.\n`);
process.exit(manques > 0 ? 1 : 0);
