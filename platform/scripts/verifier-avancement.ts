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

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const JOUR = "2026-09-05T12:00:00.000Z";

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
  const a = avancementDuDossier(d);
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
const aNous = files.filter((d) => avancementDuDossier(d).ton === "nous").length;
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
  .map((d) => avancementDuDossier(d))
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
].map((d) => avancementDuDossier(d));
const parClef = new Map(toutes.map((a) => [a.clef, a.libelle]));
dire(
  "⚠️ chaque clef ne porte qu'un seul libellé",
  parClef.size === new Set(toutes.map((a) => a.libelle)).size,
  `${parClef.size} clef(s) pour ${new Set(toutes.map((a) => a.libelle)).size} libellé(s)`,
);

console.log(
  manques === 0 ? "\n  La liste dit où en est chaque dossier.\n" : `\n  ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
