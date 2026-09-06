/**
 * Ce que la liste des inscriptions dit de chaque dossier.
 *
 * `avancementDuDossier` est pure : ni base, ni réseau, ni navigateur. On lui
 * donne les faits d'un dossier et l'on regarde la phrase et le ton rendus.
 *
 * ⚠️ **C'est le seul écran où l'équipe voit ses dossiers.** Une erreur ici ne
 * casse rien de visible : elle range un dossier dans la mauvaise file. Un
 * transfert annoncé qu'on ne vérifie pas, un contrat signé qu'on ne relit pas
 * — le participant a fait ce qu'on lui demandait et attend une réponse qui ne
 * vient jamais. Rien ne remonte jamais sous forme d'erreur.
 *
 * ⚠️ **L'ordre des questions compte autant que les réponses**, et c'est là que
 * les fautes se logent : chaque cas ci-dessous porte au moins un fait qui
 * pourrait le faire ranger ailleurs si l'ordre se déplaçait.
 *
 *   npx payload run scripts/verifier-avancement.ts
 */
import { avancementDuDossier, type FaitsDuDossier } from "@/lib/avancement";
import { prochaineEtape, type Dossier } from "@/lib/inscriptions";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const JOUR = "2026-09-05T12:00:00.000Z";

/**
 * L'instant depuis lequel on regarde.
 *
 * ⚠️ **Passé, jamais lu par le calcul.** C'est ce qui permet de dérouler la
 * tenue d'une place sur trois semaines sans attendre trois semaines — et ce
 * qui rend l'épreuve identique demain matin. Même raison que `prochainGeste`.
 */
const MAINTENANT = new Date("2026-09-06T12:00:00.000Z");

/** Un dossier au tout début : rien de demandé, rien de versé. */
const neuf: FaitsDuDossier = {
  statut: "demandee",
  echeances: [{ statut: "attendu" }, { statut: "attendu" }],
};

const attendu = (
  quoi: string,
  d: FaitsDuDossier,
  libelle: string,
  ton: "nous" | "attente" | "fait" | "clos",
) => {
  const a = avancementDuDossier(d, MAINTENANT);
  dire(quoi, a.libelle === libelle && a.ton === ton, `rendu « ${a.libelle} » (${a.ton})`);
};

console.log("\n  Où en est un dossier\n");

// ── 1. Le parcours ordinaire, dans l'ordre ──────────────────────────────────
attendu("pré-inscription seule", neuf, "Pré-inscription — rien ne l'engage encore", "attente");
attendu(
  "contrat demandé, pas signé",
  { ...neuf, contratDemandeLe: JOUR },
  "Contrat demandé — attend sa signature",
  "attente",
);
attendu(
  "⚠️ signé : c'est à nous de relire",
  { ...neuf, contratDemandeLe: JOUR, contratSigneLe: JOUR },
  "Contrat signé — à relire",
  "nous",
);
attendu(
  "⚠️ vérifié : c'est à nous d'envoyer de quoi régler",
  { ...neuf, contratDemandeLe: JOUR, contratSigneLe: JOUR, contratVerifieLe: JOUR },
  "Contrat vérifié — envoyer de quoi régler",
  "nous",
);
attendu(
  "coordonnées parties : la balle est chez lui",
  {
    ...neuf,
    contratDemandeLe: JOUR,
    contratSigneLe: JOUR,
    contratVerifieLe: JOUR,
    coordonneesEnvoyeesLe: JOUR,
  },
  "En attente de son transfert",
  "attente",
);

// ── 2. L'argent ─────────────────────────────────────────────────────────────
/*
  ⚠️ **L'annonce passe avant le contrat, et devant tout le reste.** C'est le
  seul état où de l'argent est peut-être déjà arrivé sans que personne l'ait
  constaté. Le cas porte exprès un contrat vérifié et des coordonnées
  envoyées : si l'ordre se déplaçait, il ressortirait en « en attente de son
  transfert » — et le versement resterait sur le compte sans que personne le
  cherche.
*/
attendu(
  "⚠️ un transfert annoncé passe devant tout",
  {
    statut: "demandee",
    contratDemandeLe: JOUR,
    contratSigneLe: JOUR,
    contratVerifieLe: JOUR,
    coordonneesEnvoyeesLe: JOUR,
    echeances: [{ statut: "annonce" }, { statut: "attendu" }],
  },
  "Transfert annoncé — à vérifier",
  "nous",
);
attendu(
  "un acompte reçu, le solde attendu",
  { statut: "confirmee", echeances: [{ statut: "regle" }, { statut: "attendu" }] },
  "Acompte reçu — reste à solder",
  "attente",
);
attendu(
  "tout est réglé",
  { statut: "payee", echeances: [{ statut: "regle" }, { statut: "regle" }] },
  "Payé intégralement",
  "fait",
);

/*
  ⚠️ **Un dossier payé sans contrat signé existe** : l'équipe peut avoir tout
  mené de vive voix. Le ranger en « contrat demandé — attend sa signature »
  ferait relancer pour une signature quelqu'un qui a déjà versé son argent.
  C'est la même règle que `prochaineEtape` applique de son côté.
*/
attendu(
  "⚠️ payé sans contrat signé : l'argent l'emporte",
  { statut: "payee", echeances: [{ statut: "regle" }] },
  "Payé intégralement",
  "fait",
);

// ── 3. Les états qui ferment ────────────────────────────────────────────────
/*
  ⚠️ « Annulée » et « terminée » passent avant l'examen des échéances : un
  dossier annulé dont une échéance porte encore « annonce » ne doit pas
  réapparaître dans la file de vérification.
*/
attendu(
  "⚠️ un dossier annulé ne revient pas dans la file",
  { statut: "annulee", echeances: [{ statut: "annonce" }] },
  "Annulé",
  "clos",
);
attendu(
  "un dossier terminé le dit",
  { statut: "terminee", echeances: [{ statut: "regle" }] },
  "Terminé — certificat émis",
  "fait",
);

// ── 4. Ce qu'on ne sait pas ─────────────────────────────────────────────────
/*
  ⚠️ Payload ne charge pas forcément les tableaux dans la liste. Une absence
  d'échéances doit se lire comme « pas encore d'échéance », jamais comme
  « toutes réglées » — `every` sur un tableau vide rend `true`, et le dossier
  passerait pour payé.
*/
attendu(
  "⚠️ sans échéance chargée, rien n'est déclaré payé",
  { statut: "demandee" },
  "Pré-inscription — rien ne l'engage encore",
  "attente",
);
attendu(
  "⚠️ un tableau vide non plus",
  { statut: "demandee", echeances: [] },
  "Pré-inscription — rien ne l'engage encore",
  "attente",
);

// ── 4 bis. ⚠️ La place tenue, puis repartie ─────────────────────────────────
/*
  Sept jours après le dépôt, sans contrat demandé, la place retourne au
  catalogue — la tâche quotidienne s'en charge. La page du participant le lui
  dit en toutes lettres ; la colonne de l'équipe affichait encore « rien ne
  l'engage encore ». Deux versions du même dossier, et c'est la sienne qui
  était juste.

  ⚠️ Sur les quatorze dossiers de production du 6 septembre 2026, **neuf**
  étaient dans cet état. Au 13 septembre, la liste de l'équipe en aurait montré
  neuf identiques dont plus aucun ne réservait quoi que ce soit.
*/
const ilYA = (jours: number) => new Date(MAINTENANT.getTime() - jours * 86_400_000).toISOString();

attendu(
  "une pré-inscription d'hier tient toujours sa place",
  { statut: "demandee", createdAt: ilYA(1), echeances: [{ statut: "attendu" }] },
  "Pré-inscription — rien ne l'engage encore",
  "attente",
);
attendu(
  "⚠️ passé sept jours, la place est repartie",
  { statut: "demandee", createdAt: ilYA(8), echeances: [{ statut: "attendu" }] },
  "Pré-inscription expirée — sa place est repartie",
  "attente",
);
/*
  ⚠️ La veille du terme, rien n'a expiré. Sans ce cas, un calcul décalé d'un
  jour passerait inaperçu — et annoncerait à l'équipe une place perdue que le
  participant voit encore tenue.
*/
attendu(
  "⚠️ la veille du terme, elle tient encore",
  { statut: "demandee", createdAt: ilYA(6), echeances: [{ statut: "attendu" }] },
  "Pré-inscription — rien ne l'engage encore",
  "attente",
);
/*
  ⚠️ **Un contrat signé n'expire jamais**, si vieux soit-il : la balle est chez
  nous tant que les coordonnées ne sont pas parties, et `departDeLaTenue` rend
  alors `undefined`. Le confondre avec une pré-inscription dormante ferait
  perdre de vue le dossier le plus engagé qui soit.
*/
attendu(
  "⚠️ un contrat signé de longue date n'expire pas",
  {
    statut: "demandee",
    createdAt: ilYA(30),
    contratDemandeLe: ilYA(29),
    contratSigneLe: ilYA(28),
    echeances: [{ statut: "attendu" }],
  },
  "Contrat signé — à relire",
  "nous",
);
/*
  ⚠️ Et sans date de dépôt, on n'invente pas une expiration : une ligne qu'on
  n'a pas su lire vaut mieux qu'un état affirmé de travers.
*/
attendu(
  "⚠️ sans date de dépôt, rien n'est déclaré expiré",
  { statut: "demandee", echeances: [{ statut: "attendu" }] },
  "Pré-inscription — rien ne l'engage encore",
  "attente",
);

// ── 5. Le ton, qui est la vraie sortie ──────────────────────────────────────
/*
  ⚠️ C'est le ton `nous` qui fait la file de travail. Trois moments seulement
  appellent un geste de l'équipe ; en compter un de plus ou de moins vide la
  colonne de son intérêt.
*/
const files = [
  neuf,
  { ...neuf, contratDemandeLe: JOUR },
  { ...neuf, contratDemandeLe: JOUR, contratSigneLe: JOUR },
  { ...neuf, contratDemandeLe: JOUR, contratSigneLe: JOUR, contratVerifieLe: JOUR },
  {
    ...neuf,
    contratDemandeLe: JOUR,
    contratSigneLe: JOUR,
    contratVerifieLe: JOUR,
    coordonneesEnvoyeesLe: JOUR,
  },
  { statut: "demandee", echeances: [{ statut: "annonce" }] },
  { statut: "payee", echeances: [{ statut: "regle" }] },
  { statut: "annulee" },
];
const aNous = files.filter((d) => avancementDuDossier(d, MAINTENANT).ton === "nous").length;
dire(
  "⚠️ trois moments seulement appellent un geste de l'équipe",
  aNous === 3,
  `${aNous} trouvé(s)`,
);

/*
  ── ⚠️ Les clefs que le tableau de bord compte ────────────────────────────────
  Le bandeau ne lit pas les libellés — une virgule réécrite ferait tomber sa
  vignette à zéro sans que rien ne passe au rouge, et l'équipe conclurait qu'il
  n'y a rien à faire. Il compte `annonce` d'un côté, `a-relire` et `a-envoyer`
  de l'autre. Ces trois noms sont donc une interface : les changer sans changer
  `Veille.tsx` viderait la vignette en silence.
*/
const clefsANous = files
  .map((d) => avancementDuDossier(d, MAINTENANT))
  .filter((a) => a.ton === "nous")
  .map((a) => a.clef)
  .sort();
dire(
  "⚠️ ce sont bien les trois clefs que compte le tableau de bord",
  JSON.stringify(clefsANous) === JSON.stringify(["a-envoyer", "a-relire", "annonce"]),
  clefsANous.join(", "),
);

/*
  ⚠️ Une clef par état, et jamais deux états sous la même clef : le bandeau
  additionnerait alors deux files distinctes sous un seul nombre.
*/
const toutes = [
  ...files,
  { statut: "demandee", echeances: [{ statut: "regle" }, { statut: "attendu" }] },
  { statut: "terminee" },
].map((d) => avancementDuDossier(d, MAINTENANT));
const parClef = new Map(toutes.map((a) => [a.clef, a.libelle]));
dire(
  "⚠️ chaque clef ne porte qu'un seul libellé",
  parClef.size === new Set(toutes.map((a) => a.libelle)).size,
  `${parClef.size} clef(s) pour ${new Set(toutes.map((a) => a.libelle)).size} libellé(s)`,
);

// ── 6. ⚠️ Les deux moitiés du même dossier ──────────────────────────────────
/*
  `avancementDuDossier` dit ce que **l'équipe** doit faire ; `prochaineEtape`
  dit ce que **le participant** doit faire. Ce sont deux lectures du même
  moment, écrites séparément — et rien jusqu'ici ne les empêchait de se
  contredire.

  ⚠️ **L'invariant qui compte : quand la balle est chez nous, la page ne doit
  rien réclamer.** C'est exactement le défaut corrigé le 30 août pour le texte
  de la page, le 5 septembre pour le formulaire d'annonce, et le 6 septembre
  pour la relance quotidienne. Trois portes, la même faute — parce que rien ne
  tenait la règle en un seul endroit. Ceci la tient.
*/
const RECLAME = /nous attendons|il reste à signer|prochaine échéance/i;

/** Un dossier complet, à partir des seuls faits qui décident. */
const enDossier = (f: FaitsDuDossier): Dossier => ({
  reference: "CLX-EPREUVE",
  statut: String(f.statut ?? "demandee"),
  programmeTitre: "Parcours d'épreuve",
  sessionLibelle: "Classe virtuelle",
  sessionDetail: "Classe virtuelle",
  contratDemandeLe: f.contratDemandeLe ?? undefined,
  contratSigneLe: f.contratSigneLe ?? undefined,
  contratVerifieLe: f.contratVerifieLe ?? undefined,
  coordonneesEnvoyeesLe: f.coordonneesEnvoyeesLe ?? undefined,
  echeances: (f.echeances ?? []).map((e) => ({
    montantCentimes: 42300,
    statut: (e?.statut ?? "attendu") as "attendu" | "annonce" | "regle",
  })),
});

for (const f of files) {
  const av = avancementDuDossier(f, MAINTENANT);
  if (av.ton !== "nous") continue;
  const phrase = prochaineEtape(enDossier(f));
  dire(
    `⚠️ « ${av.libelle} » ne réclame rien au participant`,
    !RECLAME.test(phrase),
    `la page dit « ${phrase} »`,
  );
}

/*
  ⚠️ Et le contraire : quand la page réclame un transfert, l'équipe ne doit pas
  lire « à relire » ou « envoyer de quoi régler ». Sans ce second sens, une
  seule des deux moitiés pourrait dériver — celle qui ne réclame jamais rien
  passerait toujours.
*/
const reclamants = files.filter((f) => RECLAME.test(prochaineEtape(enDossier(f))));
dire(
  "⚠️ aucun dossier réclamant n'attend un geste de notre côté",
  reclamants.every((f) => avancementDuDossier(f, MAINTENANT).ton !== "nous"),
  `${reclamants.length} dossier(s) réclament quelque chose`,
);

console.log(
  manques === 0 ? "\n  La liste dit où en est chaque dossier.\n" : `\n  ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
