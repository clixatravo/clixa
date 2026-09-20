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
import { repartitionParDomaine } from "@/lib/profil";
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

  /*
    ── ⚠️ La répartition par domaine ────────────────────────────────────────
    Elle se mesure **sans base et sans navigateur**, parce que le calcul est
    pur. C'est tout l'intérêt de l'avoir sorti du composant : une répartition
    écrite dans `Veille.tsx` ne s'éprouverait qu'en se connectant à /admin, et
    les six défauts de la supervision du 12 septembre y ont été trouvés en
    relisant, pas au rouge.

    Ce qui est gardé n'est pas l'arithmétique — additionner sept nombres ne se
    casse pas. C'est ce que la fonction **refuse** de faire.
  */
  console.log("\n▸ La répartition par domaine ne dit pas plus qu'elle ne sait\n");

  const vide = repartitionParDomaine([]);
  dire(
    "aucune réponse : rien à montrer, et le bloc ne se rend pas",
    vide.lignes.length === 0 && vide.declares === 0,
    `${vide.lignes.length} ligne(s)`,
  );

  /*
    ⚠️ **Le cas du jour de la mise en ligne** : des dossiers, aucun domaine. Le
    bloc doit rester invisible — sept lignes à zéro se liraient comme un écran
    cassé.
  */
  const aucunDeclare = repartitionParDomaine([null, undefined, null, undefined]);
  dire(
    "des dossiers, mais aucun domaine déclaré : toujours rien",
    aucunDeclare.lignes.length === 0 && aucunDeclare.total === 4,
    `total ${aucunDeclare.total}, déclarés ${aucunDeclare.declares}`,
  );

  const melange = repartitionParDomaine([
    "finance",
    "finance",
    "audit",
    null,
    undefined,
    "tresorerie",
  ]);
  dire(
    "le plus fourni vient en premier",
    melange.lignes[0]?.valeur === "finance" && melange.lignes[0]?.nombre === 2,
    melange.lignes.map((l) => `${l.libelle} ${l.nombre}`).join(" · "),
  );
  /*
    ⚠️ Quatre déclarés — finance, finance, audit, trésorerie — sur six lignes
    regardées. Le premier jet attendait trois et le contrôle est passé au rouge
    sur un calcul parfaitement juste : c'était l'attente qui comptait mal. Une
    garde qu'on corrige en changeant le code aurait enterré la vraie valeur.
  */
  dire(
    "⚠️ la couverture dit la partie et le tout — 4 déclarés sur 6",
    melange.declares === 4 && melange.total === 6,
    `${melange.declares}/${melange.total}`,
  );
  /*
    ⚠️ **Le contrôle qui compte.** La barre est proportionnelle au domaine le
    plus fourni, jamais au total : « Finance » doit remplir la sienne alors
    qu'elle ne représente que deux dossiers sur six. Une barre calculée sur le
    total rendrait 33 % et se lirait « un tiers de mes inscrits » — le défaut de
    « Places au total : 30 », sur l'écran où l'on décide d'ouvrir une cohorte.
  */
  dire(
    "⚠️ la barre mesure « lequel domine », pas « quelle proportion »",
    melange.lignes[0]?.barre === 100 && melange.lignes[1]?.barre === 50,
    melange.lignes.map((l) => `${l.libelle} ${l.barre}%`).join(" · "),
  );
  /*
    ⚠️ Une valeur hors table ne se range pas dans « Autre » : ce serait inventer
    une réponse que personne n'a cochée. Elle sort du décompte, et l'écart avec
    le total la rend visible.
  */
  const inconnu = repartitionParDomaine(["finance", "astrophysique"]);
  dire(
    "un domaine hors liste est ignoré, jamais versé dans « Autre »",
    inconnu.declares === 1 && !inconnu.lignes.some((l) => l.valeur === "autre"),
    inconnu.lignes.map((l) => l.libelle).join(" · ") || "rien",
  );
  /* Le témoin : « Autre » compte quand il est réellement choisi. */
  const autre = repartitionParDomaine(["autre", "autre"]);
  dire(
    "mais « Autre » choisi pour de vrai se compte",
    autre.lignes[0]?.valeur === "autre" && autre.lignes[0]?.nombre === 2,
  );
} finally {
  for (const id of aSupprimer) {
    await payload.delete({ collection: "inscriptions", id, overrideAccess: true });
  }
}

console.log(
  manques === 0 ? "\n✓ Le tableau de bord mène où il dit.\n" : `\n✗ ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
