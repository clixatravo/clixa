/**
 * Les vignettes du tableau de bord mènent-elles à ce qu'elles comptent ?
 *
 * Le bandeau compte des dossiers ; chaque vignette est un lien. Tant que le
 * lien portait la liste entière, le nombre annonçait un tri qui n'avait pas
 * lieu — on cliquait sur « 3 » et l'on tombait sur tout le fichier.
 *
 * ⚠️ Un filtre d'URL faux ne casse rien : Payload rend la liste, simplement
 * sans le tri. Ni erreur, ni type fautif, ni page blanche.
 *
 * ⚠️ Et une base vide rend tous les filtres verts. Le premier jet de ce script
 * s'est félicité de trois « 0 dossier(s) » sur une branche que le ménage des
 * épreuves venait de vider : il mesurait le néant. Il fabrique donc ses quatre
 * cas, les trie, et les retire.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { parse } from "qs-esm";
import type { Where } from "payload";

const payload = await getPayload({ config });
const aSupprimer: (string | number)[] = [];
let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const jour = (decalage: number) =>
  new Date(Date.now() + decalage * 86400000).toISOString().slice(0, 10);

const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 1,
  depth: 0,
  overrideAccess: true,
  where: { fin: { greater_than: new Date().toISOString() } },
});
const session = sessions[0]!;

const creer = async (
  nom: string,
  echeances: { montant: number; statut: string; dateLimite?: string }[],
  vieilliDe = 0,
) => {
  const d = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: session.id,
      statut: "demandee",
      apprenantNom: nom,
      apprenantEmail: `veille.${Date.now()}.${aSupprimer.length}@epreuve.invalid`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      echeances,
    } as never,
  });
  aSupprimer.push(d.id);
  if (vieilliDe > 0) {
    await payload.db.drizzle.execute(
      `UPDATE inscriptions SET created_at = now() - interval '${vieilliDe} days' WHERE id = ${d.id}` as never,
    );
  }
  return d.id;
};

const compter = async (requete: string) => {
  const { where } = parse(requete, { depth: 10 }) as { where?: Where };
  if (!where) throw new Error(`aucun filtre tiré de « ${requete} »`);
  const r = await payload.find({
    collection: "inscriptions",
    where,
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  return r.docs.map((d) => d.id) as (string | number)[];
};

try {
  /*
    Quatre dossiers, un par vignette et un qu'aucune ne doit ramasser. C'est
    ce dernier qui fait l'épreuve : sans lui, un filtre qui rend tout passerait.
  */
  const annonce = await creer("Veille Annoncée", [
    { montant: 423, statut: "annonce", dateLimite: jour(30) },
  ]);
  const retard = await creer("Veille En Retard", [
    { montant: 423, statut: "attendu", dateLimite: jour(-3) },
  ]);
  const ancienne = await creer(
    "Veille Ancienne",
    [{ montant: 423, statut: "attendu", dateLimite: jour(30) }],
    20,
  );
  const calme = await creer("Veille Tranquille", [
    { montant: 423, statut: "attendu", dateLimite: jour(30) },
  ]);

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const ilYASeptJours = new Date(Date.now() - 7 * 86400000).toISOString();

  console.log("\n▸ Chaque vignette mène aux dossiers qu'elle compte\n");

  const verifs: [string, string, (string | number)[], (string | number)[]][] = [
    [
      "transferts à vérifier",
      `where[echeances.statut][equals]=annonce`,
      [annonce],
      [retard, ancienne, calme],
    ],
    [
      "échéances en retard",
      `where[prochaineEcheance][less_than]=${aujourdhui}`,
      [retard],
      [annonce, ancienne, calme],
    ],
    [
      "inscriptions de la semaine",
      `where[createdAt][greater_than]=${ilYASeptJours}`,
      [annonce, retard, calme],
      [ancienne],
    ],
  ];

  for (const [nom, requete, attendus, exclus] of verifs) {
    const trouves = await compter(requete);
    dire(
      `${nom} : ramène les siens`,
      attendus.every((id) => trouves.includes(id)),
    );
    dire(
      `${nom} : et ne ramène pas les autres`,
      exclus.every((id) => !trouves.includes(id)),
      `${trouves.length} ligne(s)`,
    );
  }

  /*
    La quatrième vignette compte les demandes de rappel « nouvelle » et menait
    à l'historique entier — où les appels déjà passés noient ceux qui restent
    à passer.
  */
  const rappel = await payload.create({
    collection: "demandes-rappel",
    overrideAccess: true,
    data: {
      nom: "Veille Rappel",
      whatsapp: "+212600000000",
      pays: "Maroc",
      statut: "rappelee",
    } as never,
  });
  try {
    const { where } = parse("where[statut][equals]=nouvelle", { depth: 10 }) as {
      where?: Where;
    };
    const r = await payload.find({
      collection: "demandes-rappel",
      where: where!,
      limit: 200,
      depth: 0,
      overrideAccess: true,
    });
    dire(
      "rappels : une demande déjà traitée n'y figure pas",
      !r.docs.some((d) => d.id === rappel.id),
      `${r.totalDocs} en attente`,
    );
  } finally {
    await payload.delete({
      collection: "demandes-rappel",
      id: rappel.id,
      overrideAccess: true,
    });
  }

  /*
    ⚠️ Un filtre mal orthographié ne se plaint pas : Payload l'ignore et rend
    tout. C'est la panne qu'on redoute ici, et elle est muette.
  */
  console.log("\n▸ Un filtre ignoré rendrait tout — on le montre\n");
  const sansTri = await compter("where[createdAt][exists]=true");
  dire(
    "un filtre qui n'écarte rien ramène bien les quatre",
    [annonce, retard, ancienne, calme].every((id) => sansTri.includes(id)),
    `${sansTri.length} ligne(s)`,
  );

  console.log("\n▸ La liste montre de quoi joindre le participant\n");
  const colonnes =
    (payload.collections.inscriptions.config.admin?.defaultColumns as string[]) ?? [];
  for (const champ of ["apprenantNom", "apprenantEmail", "apprenantWhatsapp"]) {
    dire(`« ${champ} » est une colonne par défaut`, colonnes.includes(champ));
  }
} finally {
  for (const id of aSupprimer) {
    await payload.delete({ collection: "inscriptions", id, overrideAccess: true });
  }
}

console.log(
  manques === 0 ? "\n✓ Le tableau de bord mène où il dit.\n" : `\n✗ ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
