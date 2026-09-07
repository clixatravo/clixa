/**
 * Le classeur des admissions s'ouvre-t-il vraiment ?
 *
 * ⚠️ **Un `.xlsx` cassé ne casse rien d'autre.** La route répond 200, le
 * navigateur télécharge, le fichier a la bonne taille et la bonne extension —
 * et Excel affiche « le format est incorrect », sans dire lequel des sept
 * fichiers XML gêne. Aucun type, aucune compilation, aucune épreuve de parcours
 * ne verrait passer cela : le seul contrôle qui vaille est d'ouvrir l'archive
 * et de regarder dedans.
 *
 * ⚠️ Et c'est **le fichier clients entier** : ce que l'équipe emporte en
 * réunion, et parfois la seule copie qu'elle regarde.
 *
 *   npx payload run scripts/verifier-tableur.ts
 */
import { classeur, lireClasseur } from "@/lib/tableur";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  Le classeur des admissions\n");

/*
  ⚠️ Des valeurs qui ont déjà cassé quelque chose : une esperluette et un
  chevron (XML), une apostrophe (le nom « N'Guessan » est réel), un caractère
  de contrôle — qu'aucun formulaire ne devrait laisser passer, mais le nom
  vient d'une saisie publique.
*/
const octets = classeur([
  {
    nom: "Inscriptions",
    colonnes: [
      { entete: "Référence", largeur: 15 },
      { entete: "Déposé le", largeur: 12 },
      { entete: "Nom", largeur: 26 },
      { entete: "Total dû", largeur: 13 },
    ],
    lignes: [
      ["CLX-3RTYUX33", new Date("2026-10-03T09:00:00.000Z"), "Kouamé N'Guessan", 423],
      ["CLX-BGXC8G5U", undefined, 'Marie & <Cie> "Sarl"', undefined],
    ],
  },
  { nom: "Demandes de rappel", colonnes: [{ entete: "Reçue le", largeur: 12 }], lignes: [] },
]);

/* ── L'archive ────────────────────────────────────────────────────────────── */

const fichiers = lireClasseur(octets);

const ATTENDUS = [
  "[Content_Types].xml",
  "_rels/.rels",
  "xl/workbook.xml",
  "xl/_rels/workbook.xml.rels",
  "xl/styles.xml",
  "xl/worksheets/sheet1.xml",
  "xl/worksheets/sheet2.xml",
];

dire(
  "l'archive se relit par son index, et rien n'y manque",
  ATTENDUS.every((n) => fichiers.has(n)),
  `${fichiers.size} fichier(s)`,
);

const texte = (nom: string) => fichiers.get(nom) ?? "";

/* ── Ce que le classeur déclare ───────────────────────────────────────────── */
dire(
  "⚠️ chaque feuille est déclarée dans les trois fichiers qui la nomment",
  texte("xl/workbook.xml").includes('name="Inscriptions"') &&
    texte("xl/_rels/workbook.xml.rels").includes("worksheets/sheet1.xml") &&
    texte("[Content_Types].xml").includes("/xl/worksheets/sheet1.xml"),
);

/*
  ⚠️ Excel désigne ses styles par leur **rang**. Les deux premiers
  remplissages sont imposés par le format — `none` et `gray125` — et glisser le
  nôtre avant eux ouvrirait un fichier aux couleurs déplacées, sans erreur.
*/
const styles = texte("xl/styles.xml");
dire(
  "⚠️ les deux remplissages imposés par le format viennent en premier",
  styles.indexOf('patternType="none"') < styles.indexOf('patternType="gray125"') &&
    styles.indexOf('patternType="gray125"') < styles.indexOf("FFC9A24C"),
);
dire("les quatre styles employés sont déclarés", styles.includes('count="4"'));

/* ── Ce que la feuille contient ───────────────────────────────────────────── */
const feuille = texte("xl/worksheets/sheet1.xml");

dire("l'en-tête reste visible au défilement", feuille.includes('state="frozen"'));
dire("le filtre porte sur toute la table", feuille.includes('autoFilter ref="A1:D3"'));

/*
  ⚠️ **Une date est un nombre, pas du texte.** « 03/10/2026 » écrit en chaîne
  ne se trie pas et ne se soustrait pas ; c'est tout l'intérêt d'un tableur sur
  un CSV. La série 46298 vaut le 3 octobre 2026 — la cohorte ouverte.
*/
dire(
  "⚠️ une date sort en nombre, à la bonne série",
  feuille.includes('s="2"><v>46298'),
  "46298 = 3 octobre 2026",
);
dire("⚠️ un montant sort en nombre, pas en « 423 EUR »", feuille.includes('s="3"><v>423</v>'));

/*
  ⚠️ Une cellule vide est **omise**, pas remplie d'une chaîne vide : un tableur
  distingue « rien » de « une chaîne de longueur nulle », et les formules aussi.
*/
dire("une cellule sans valeur est absente, pas vide", !feuille.includes("<is><t></t></is>"));

/* ── Ce qui casse un XML ──────────────────────────────────────────────────── */
dire(
  "⚠️ l'esperluette et les chevrons sont échappés",
  feuille.includes("Marie &amp; &lt;Cie&gt;") && feuille.includes("&quot;Sarl&quot;"),
);
/*
  ⚠️ Un caractère de contrôle rend le fichier illisible **en bloc** : Excel
  refuse de l'ouvrir et ne dit pas lequel gêne. Il n'a rien à faire dans un nom,
  mais le nom vient d'un formulaire public.
*/
dire("⚠️ un caractère de contrôle est retiré", !feuille.includes(""));
dire("l'apostrophe d'un nom réel passe telle quelle", feuille.includes("Kouamé N'Guessan"));

/*
  ⚠️ Une feuille vide reste une feuille valide : sans demandes de rappel, le
  classeur ne doit pas rendre un onglet qu'Excel refuse.
*/
const vide = texte("xl/worksheets/sheet2.xml");
dire("une feuille sans ligne reste valide", vide.includes("<sheetData>") && vide.includes("A1:A1"));

console.log(
  manques === 0 ? "\n  Le classeur s'ouvre et dit ce qu'il faut.\n" : `\n  ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
