/**
 * Le champ piège des formulaires publics, et la trace qu'il laisse.
 *
 *   npx tsx scripts/verifier-leurre.ts
 *
 * Le 1er octobre 2026, une candidature de formateur envoyée en production n'est
 * arrivée nulle part, sans une ligne au journal. Le piège s'appelait
 * `site_web` — un nom que le remplissage automatique d'un navigateur reconnaît.
 * Voir `lib/leurre.ts`. Ce qui est gardé :
 *
 * - le nom ne ressemble à rien qu'un navigateur sache remplir ;
 * - l'ancien nom a disparu de partout, et chaque route passe par
 *   `leurreRempli`, qui écrit une ligne quand il se déclenche ;
 * - les trois formulaires où un refus se perdait le plus — inscription,
 *   candidature, témoignage — écrivent la raison de chaque refus.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { NOM_DU_LEURRE, leurreRempli } from "@/lib/leurre";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const fichiers = (dossier: string): string[] =>
  readdirSync(dossier).flatMap((f) => {
    const p = path.join(dossier, f);
    return statSync(p).isDirectory() ? fichiers(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
const sources = fichiers(path.join(process.cwd(), "src")).map((p) => ({
  p,
  s: readFileSync(p, "utf8"),
}));

console.log("\n▸ Le nom\n");

dire(
  "⚠️ il ne contient aucun mot qu'un navigateur sait remplir",
  !/site|web|url|mail|name|nom|tel|phone|adress|company|org|city|ville|zip|code|pass/i.test(
    NOM_DU_LEURRE,
  ),
  NOM_DU_LEURRE,
);
dire(
  "⚠️ l'ancien nom « site_web » a disparu des sources",
  !sources.some(({ s }) => /["']site_web/.test(s)),
  sources
    .filter(({ s }) => /["']site_web/.test(s))
    .map(({ p }) => path.relative(process.cwd(), p))
    .join(", "),
);

console.log("\n▸ Le déclenchement\n");

const avec = (v: string) => {
  const f = new FormData();
  f.set(NOM_DU_LEURRE, v);
  return f;
};
const journal: string[] = [];
const avertir = console.warn;
console.warn = (...a: unknown[]) => journal.push(a.join(" "));
const rempli = leurreRempli(avec("https://exemple.test"), "essai");
const vide = leurreRempli(avec(""), "essai");
const absent = leurreRempli(new FormData(), "essai");
console.warn = avertir;

dire("rempli, l'envoi est ignoré", rempli);
dire("témoin : vide, il passe", !vide && !absent);
dire(
  "⚠️ il laisse une ligne au journal, sans la valeur",
  journal.length === 1 && journal[0]!.includes("[essai]") && !journal[0]!.includes("exemple"),
  journal[0],
);

console.log("\n▸ Les routes et les formulaires\n");

const routes = sources.filter(({ p }) => /api[/\\][^/\\]+[/\\]route\.ts$/.test(p));
const avecLeurre = routes.filter(({ s }) => s.includes("leurreRempli("));
dire(
  "les huit routes qui avaient un piège passent par `leurreRempli`",
  avecLeurre.length >= 8,
  String(avecLeurre.length),
);
const champs = sources.reduce((n, { s }) => n + (s.match(/<ChampLeurre[\s/]/g) ?? []).length, 0);
dire("les formulaires portent le champ partagé", champs >= 8, `${champs} formulaires`);

for (const r of ["inscription", "candidature", "temoignage"]) {
  const s = routes.find(({ p }) => p.includes(`${path.sep}${r}${path.sep}route.ts`))?.s ?? "";
  dire(
    `⚠️ /api/${r} écrit la raison de chaque refus`,
    /console\.warn\(`\[[^\]]+\] refusée?/.test(s),
  );
}

console.log(manques === 0 ? "\n  ✓ Tout tient.\n" : `\n  ✗ ${manques} contrôle(s) au rouge.\n`);
if (manques > 0) process.exit(1);
