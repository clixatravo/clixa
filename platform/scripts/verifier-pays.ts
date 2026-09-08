/**
 * Le pays d'un participant : ce qu'on propose, ce qu'on accepte, ce qu'on refuse.
 *
 * ── ⚠️ D'où vient cette garde ───────────────────────────────────────────────
 * Le champ « Pays » du formulaire était libre, posé juste sous le numéro
 * WhatsApp. Un dossier de production porte `22222628` — un morceau du numéro
 * `+22222222628` recopié dans la mauvaise case. La direction a demandé une
 * liste, avec « Autre pays » pour ceux qui n'y figurent pas.
 *
 * Trois défauts sont apparus en éprouvant le correctif, et ce script les garde
 * tous les trois :
 *
 * 1. **Un validateur peut geler un document.** Refuser une valeur numérique
 *    rejouait sur *chaque* écriture, y compris celles qui ne touchent pas au
 *    pays — la tâche de 8 h n'aurait pas pu annoncer à cette personne que sa
 *    place allait repartir, et la place serait restée retenue indéfiniment.
 * 2. **« Amérique du Nord » n'est pas un pays.** La liste dérivait de celle
 *    des indicatifs, où le `+1` est un compromis assumé pour le téléphone.
 * 3. **Latin-1 abîme des réponses justes.** « Česko » ressortait « esko ».
 *
 *   npx payload run scripts/verifier-pays.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { MINIMUM_LETTRES, PAYS_OFFERTS, assainirPays, paysPlausible } from "@/lib/pays";
import { paysValide, paysValideFacultatif } from "@/collections/champs";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  Le pays du participant\n");

/* ── Ce qu'on propose ─────────────────────────────────────────────────────── */

const noms = PAYS_OFFERTS.map((p) => p.nom);

dire(
  "⚠️ « Amérique du Nord » n'est pas proposé comme pays",
  !noms.includes("Amérique du Nord"),
  "c'est une zone d'indicatif, pas un pays",
);
dire(
  "et les deux pays qu'elle recouvrait le sont",
  noms.includes("États-Unis") && noms.includes("Canada"),
);
dire("aucun doublon dans la liste", new Set(noms).size === noms.length);
dire(
  "la liste est ordonnée pour un lecteur francophone",
  noms.every((n, i) => i === 0 || noms[i - 1]!.localeCompare(n, "fr") <= 0),
);
dire(
  "les pays d'où viennent les inscrits y figurent",
  ["Maroc", "Côte d'Ivoire", "Sénégal", "Guinée", "Togo", "Bénin", "Mauritanie"].every((p) =>
    noms.includes(p),
  ),
);
dire(
  "chaque entrée porte un drapeau",
  PAYS_OFFERTS.every((p) => p.drapeau.length > 0),
);

/* ── Ce qu'on nettoie ─────────────────────────────────────────────────────── */

/*
  ⚠️ La faute d'origine, mot pour mot : un morceau de son propre numéro.
  Nettoyé, il ne reste rien — et la route retombe alors sur l'indicatif.
*/
dire(
  "⚠️ « 22222628 » ne laisse rien, comme le dossier de production",
  assainirPays("22222628") === "",
);
dire("un nom mêlé de chiffres perd les chiffres", assainirPays("Maroc123") === "Maroc");

/*
  ⚠️ Ce qui compte pour la sûreté : ni balise, ni caractère de contrôle. Le
  second n'est pas décoratif — un seul dans un nom rend le classeur des
  admissions illisible **en bloc**, et le nom vient d'un formulaire public.
*/
dire(
  "⚠️ une balise ne laisse pas de code derrière elle",
  assainirPays("<script>alert(1)</script>") === "alert",
  `rendu : "${assainirPays("<script>alert(1)</script>")}"`,
);
dire(
  "⚠️ un caractère de contrôle est retiré",
  assainirPays("Maroc") === "Maroc",
  "il casserait le classeur des admissions",
);
/*
  ⚠️ **Écrit d'abord sur une supposition, corrigé sur la mesure.** J'attendais
  « img srcx onerroralert » — le filtre appliqué seul. Mais la balise part
  *avant* : `<img …>` est retiré en entier, il ne reste que `">`, que le filtre
  efface à son tour. Rien ne subsiste, et la route retombe alors sur
  l'indicatif. Une garde écrite sur ce qu'on croit vaut moins que sur ce qu'on
  a vu passer.
*/
dire(
  "une charge d'attribut ne laisse rien du tout",
  assainirPays('"><img src=x onerror=alert(1)>') === "",
  `rendu : "${assainirPays('"><img src=x onerror=alert(1)>')}"`,
);

/*
  ⚠️ **Et ce qui doit passer intact.** Le premier jet filtrait sur `A-Za-zÀ-ÿ`
  et rendait « Česko » → « esko » : une réponse juste, silencieusement abîmée.
  Le tiret et l'apostrophe comptent autant — « Guinée-Bissau », « Côte
  d'Ivoire » sont dans la liste qu'on propose nous-mêmes.
*/
for (const nom of ["Côte d'Ivoire", "Guinée-Bissau", "Türkiye", "Česko", "São Tomé", "Maroc"]) {
  dire(`⚠️ « ${nom} » passe intact`, assainirPays(nom) === nom, `rendu : "${assainirPays(nom)}"`);
}

/*
  ⚠️ Les espaces sont normalisés, pas seulement rognés : « Côte   d'Ivoire »
  et « Côte d'Ivoire » sont le même pays, et deux écritures du même fait
  finissent par se compter deux fois dans un tableau croisé.
*/
dire(
  "les espaces en trop sont ramenés à un seul",
  assainirPays("  Côte    d'Ivoire  ") === "Côte d'Ivoire",
);

/* ── Ce qu'on juge plausible ──────────────────────────────────────────────── */

dire("un pays d'une seule lettre ne l'est pas", !paysPlausible("A"));
dire(`${MINIMUM_LETTRES} lettres suffisent`, paysPlausible("Ci"));
dire("un numéro ne l'est pas", !paysPlausible("22222628"));
dire("le vide ne l'est pas", !paysPlausible("") && !paysPlausible(null));

/* ── ⚠️ Ce qu'un validateur ne doit pas faire : geler un document ─────────── */
/*
  Le premier jet refusait toute valeur numérique, sans regarder si elle
  changeait. Un dossier de production portant déjà `22222628` devenait
  intouchable : `payload.update({ placeRappeleeLe })` levait une
  ValidationError, la tâche de 8 h ne pouvait plus annoncer que la place allait
  repartir — et comme la place ne part **que** si l'annonce est partie, elle
  serait restée retenue indéfiniment. Mesuré avant d'être corrigé.
*/
const options = { previousValue: "22222628" } as never;
dire(
  "⚠️ une valeur fausse mais inchangée ne bloque pas l'écriture",
  paysValide("22222628", options) === true,
  "sinon la tâche de 8 h gèle le dossier",
);
dire("⚠️ mais la corriger en pire est refusé", typeof paysValide("11111111", options) === "string");
dire(
  "un pays vide est refusé",
  typeof paysValide("", { previousValue: "Maroc" } as never) === "string",
);
dire(
  "un pays valide passe",
  paysValide("Mauritanie", { previousValue: "22222628" } as never) === true,
);
dire(
  "et là où il est facultatif, le vide passe",
  paysValideFacultatif("", { previousValue: undefined } as never) === true,
);

/* ── Et les vraies données ────────────────────────────────────────────────── */

const payload = await getPayload({ config });

const { docs } = await payload.find({
  collection: "inscriptions",
  limit: 500,
  depth: 0,
  overrideAccess: true,
});

/*
  ⚠️ **Ceci s'imprime, il ne se contrôle pas.** Un dossier au pays illisible est
  une donnée à corriger, pas une régression du code — et l'exiger vert rendrait
  ce script rouge sur une base qu'on n'a pas encore nettoyée. Il le nomme, ce
  qui suffit à ce qu'on le voie.
*/
const illisibles = docs.filter((d) => !paysPlausible(d.apprenantPays));
console.log(
  illisibles.length === 0
    ? `\n  Les ${docs.length} dossiers portent un pays lisible.`
    : `\n  ⚠️ ${illisibles.length} dossier(s) au pays illisible : ` +
        illisibles.map((d) => `${d.reference} ("${d.apprenantPays}")`).join(" · "),
);

console.log(
  manques === 0
    ? "\n  Le pays se choisit, et ce qu'on tape ne casse rien.\n"
    : `\n  ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
