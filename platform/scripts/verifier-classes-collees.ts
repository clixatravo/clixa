/**
 * Aucune classe conditionnelle collée à la précédente.
 *
 *   npx tsx scripts/verifier-classes-collees.ts
 *
 * ── Le défaut, trouvé quatre fois le 26 septembre 2026 ──────────────────────
 * `` `clixa-agir${arme ? " clixa-agir--arme" : ""}` `` est juste tel qu'on
 * l'écrit. Mais `prettier-plugin-tailwindcss` « nettoie » les classes et
 * retire l'espace en tête de `" clixa-agir--arme"` : il reste
 * `clixa-agirclixa-agir--arme`, une classe qui n'existe pas. L'élément perd
 * tout son dessin **au moment précis où l'état change** — la liste qu'on
 * coche, le premier domaine, le bouton armé.
 *
 * Rien ne l'attrape : ni type, ni lint, ni build, ni épreuve. Pire, la
 * correction elle-même disparaît au formatage suivant — la barre des domaines,
 * « corrigée » le matin, est partie en production sans son espace.
 *
 * **La forme qui tient** : l'espace hors de la chaîne,
 * `` `clixa-agir ${arme ? "clixa-agir--arme" : ""}` ``. Le formateur ne touche
 * pas au gabarit lui-même.
 *
 * ⚠️ Un suffixe de modificateur reste permis : `` `btn--${ton}` `` ou
 * `` `x--${a ? "b" : "c"}` `` — le caractère qui précède est un tiret, c'est
 * voulu.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

/** Une lettre, un chiffre ou une accolade fermante, collés à un ternaire qui rend une classe. */
const COLLEE = /[A-Za-z0-9}]\$\{[^{}`]*\?\s*["'][A-Za-z]/;

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.tsx$/.test(nom) ? [chemin] : [];
  });
}

console.log("\n  Les classes conditionnelles\n");

dire("témoin : la forme fautive est reconnue", COLLEE.test('`a${x ? "b" : ""}`'));
dire("témoin : deux interpolations collées aussi", COLLEE.test('`a--${t}${x ? "b" : ""}`'));
dire("la forme qui tient passe", !COLLEE.test('`a ${x ? "b" : ""}`'));
dire("un suffixe de modificateur passe", !COLLEE.test('`a--${x ? "b" : "c"}`'));
const PLURIEL = '{`${n} formation${n > 1 ? "s" : ""}`}';
dire(
  "un pluriel hors de className n'est pas une classe",
  !(PLURIEL.includes("className") && COLLEE.test(PLURIEL)),
);

const fautes: string[] = [];
for (const f of fichiers(path.join(process.cwd(), "src"))) {
  readFileSync(f, "utf8")
    .split("\n")
    .forEach((ligne, i) => {
      /*
        Seulement les `className` : c'est là que le formateur agit. Ailleurs,
        « formation${n > 1 ? "s" : ""} » est un pluriel, et il est juste collé.
      */
      if (ligne.includes("className") && ligne.includes("`") && COLLEE.test(ligne)) {
        fautes.push(`${path.relative(process.cwd(), f)}:${i + 1}`);
      }
    });
}
dire(
  "aucune classe collée dans src/",
  fautes.length === 0,
  fautes.length ? fautes.join(" · ") : "",
);

console.log(manques === 0 ? "\n  Tout tient.\n" : `\n  ${manques} contrôle(s) au rouge.\n`);
process.exit(manques === 0 ? 0 : 1);
