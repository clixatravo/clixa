/**
 * Lance les gardes `scripts/verifier-*.ts`, et sort en 1 si une seule tombe.
 *
 *   npm run gardes           # les gardes sans base : quelques secondes
 *   npm run gardes:tout      # toutes, contre la base de `.env.local` (dev)
 *
 * ── Pourquoi ce lanceur existe ───────────────────────────────────────────────
 * Quarante-cinq gardes gardent ce que ce journal a corrigé — une colonne qui
 * disparaît d'un compte, un courriel qui réclame de l'argent trop tôt, un
 * dossier rangé dans le mauvais groupe de versements. Jusqu'au 25 septembre
 * 2026, **aucune ne tournait toute seule** : l'intégration continue passait
 * les types, le lint, le build et Playwright, jamais elles. Une modification
 * pouvait défaire une correction sans que rien ne passe au rouge, tant que
 * personne ne pensait à relancer la bonne.
 *
 * Les gardes **sans base** tournent désormais à chaque push (`ci.yml`). Une
 * garde est « sans base » si elle n'ouvre pas Payload — elle ne mentionne ni
 * `getPayload` ni `@payload-config`. C'est lu dans le fichier, pas tenu dans
 * une liste : une garde ajoutée demain rejoint la série sans qu'on y pense.
 *
 * ⚠️ **Les gardes avec base ne tournent pas en CI**, et c'est un choix. Chacune
 * met près d'une minute à démarrer contre Neon, plusieurs versent dans les
 * magasins de fichiers — partagés avec la production — et deux ne supportent
 * pas un `next dev` sur la même base. `npm run gardes:tout` les lance, en
 * série, contre `dev`.
 */
import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const tout = process.argv.includes("--tout");
const dossier = path.join(process.cwd(), "scripts");

const gardes = readdirSync(dossier)
  .filter((f) => /^verifier-.+\.ts$/.test(f))
  .sort()
  .map((f) => {
    const source = readFileSync(path.join(dossier, f), "utf8");
    return { fichier: f, base: /getPayload|@payload-config/.test(source) };
  })
  .filter((g) => tout || !g.base);

const tombees = [];
for (const g of gardes) {
  const t = Date.now();
  const commande = g.base
    ? ["payload", "run", `scripts/${g.fichier}`]
    : ["tsx", `scripts/${g.fichier}`];
  const r = spawnSync("npx", commande, { encoding: "utf8", env: process.env });
  const sortie = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const verts = (sortie.match(/✓/g) ?? []).length;
  const rouges = (sortie.match(/✗/g) ?? []).length;
  const ok = r.status === 0;
  console.log(
    `${ok ? "✓" : "✗"} ${g.fichier.padEnd(36)} ${String(verts).padStart(3)} vert(s)` +
      `${rouges ? ` · ${rouges} rouge(s)` : ""} · ${((Date.now() - t) / 1000).toFixed(1)} s`,
  );
  if (!ok) {
    tombees.push(g.fichier);
    /* Ce qui a échoué se relit ici, pas seulement à sa place : la leçon de la recette. */
    for (const l of sortie
      .split("\n")
      .filter((l) => /✗|Error|error/.test(l))
      .slice(0, 8)) {
      console.log(`    ${l.trim()}`);
    }
  }
}

console.log(
  tombees.length === 0
    ? `\n${gardes.length} garde(s), toutes vertes.`
    : `\n${tombees.length} garde(s) au rouge sur ${gardes.length} : ${tombees.join(", ")}`,
);
process.exit(tombees.length === 0 ? 0 : 1);
