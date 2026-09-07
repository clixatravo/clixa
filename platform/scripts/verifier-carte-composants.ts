/**
 * Chaque composant d'administration déclaré est-il dans la carte ?
 *
 * ── ⚠️ La panne est silencieuse, et elle a eu lieu ──────────────────────────
 * Le 7 septembre 2026, la colonne « Remplissage » a été ajoutée à la liste des
 * sessions et poussée en production **sans son entrée dans `importMap.js`** —
 * le fichier par lequel Payload résout `"@/components/admin/X#X"` en composant
 * réel. Il est généré par `next dev` et par `payload generate:importmap` ; il
 * s'était régénéré *après* le `git add`, et le commit est parti sans lui.
 *
 * Résultat : la colonne ne s'affichait pas. Aucune erreur, aucun type fautif,
 * aucun build cassé, aucune épreuve au rouge — la cellule ne se rend
 * simplement pas. La direction a rouvert /admin et n'a rien vu changer.
 *
 * C'est la même famille que « un sélecteur inventé ne casse rien et ne fait
 * rien », et que le disque de Vercel qui accepte un dépôt puis le perd : le
 * repli muet est ce qui rend la panne invisible.
 *
 * ⚠️ **Ce contrôle est statique**, sans base ni réseau : il lit les
 * déclarations dans `src/collections/`, `src/globals/` et la configuration, et
 * les confronte à la carte. Il tient donc dans `npm run verify`, à côté des
 * types — un défaut qui se voit à la lecture n'a pas à attendre un navigateur.
 *
 *   npx tsx scripts/verifier-carte-composants.ts
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const RACINE = process.cwd();
const CARTE = join(RACINE, "src/app/(payload)/admin/importMap.js");

/** Les fichiers où un composant d'administration peut être déclaré. */
function sourcesDeclarantes(): string[] {
  const fichiers: string[] = [];
  for (const dossier of ["src/collections", "src/globals"]) {
    const chemin = join(RACINE, dossier);
    if (!existsSync(chemin)) continue;
    for (const nom of readdirSync(chemin)) {
      if (nom.endsWith(".ts") || nom.endsWith(".tsx")) fichiers.push(join(chemin, nom));
    }
  }
  const config = join(RACINE, "src/payload.config.ts");
  if (existsSync(config)) fichiers.push(config);
  return fichiers;
}

/*
  ⚠️ On cherche la forme exacte que Payload attend — `"chemin#Export"` — et non
  un import quelconque. Une expression plus large ramasserait les alias de
  `@/lib`, et le contrôle accuserait des fichiers parfaitement sains ; un
  contrôle qui crie sur du code juste finit par ne plus être lu.
*/
const FORME = /"(@\/[^"#]+#[A-Za-z0-9_]+)"/g;

const declares = new Map<string, string>();
for (const fichier of sourcesDeclarantes()) {
  const source = readFileSync(fichier, "utf8");
  for (const trouve of source.matchAll(FORME)) {
    declares.set(trouve[1]!, fichier.replace(`${RACINE}/`, ""));
  }
}

if (!existsSync(CARTE)) {
  console.error("\n  ✗ importMap.js est introuvable — /admin ne rendrait aucun composant.\n");
  process.exit(1);
}
const carte = readFileSync(CARTE, "utf8");

console.log("\n  La carte des composants d'administration\n");

const manquants = [...declares].filter(([chemin]) => !carte.includes(`"${chemin}"`));

for (const [chemin, source] of declares) {
  const present = carte.includes(`"${chemin}"`);
  console.log(`  ${present ? "✓" : "✗"} ${chemin}${present ? "" : `  — déclaré dans ${source}`}`);
}

if (manquants.length > 0) {
  console.error(
    `\n  ${manquants.length} composant(s) déclaré(s) mais absent(s) de la carte.\n` +
      `  /admin ne les rendra pas, et rien d'autre ne le signalera.\n\n` +
      `    cd platform && npx payload generate:importmap\n\n` +
      `  ⚠️ Puis **commiter le fichier généré** : c'est l'oubli d'origine.\n`,
  );
  process.exit(1);
}

console.log(`\n  Les ${declares.size} composants déclarés sont tous résolus.\n`);
process.exit(0);
