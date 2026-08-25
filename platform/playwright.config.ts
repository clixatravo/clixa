import { defineConfig, devices } from "@playwright/test";
import verifierLaBase from "./e2e/garde";

// Avant tout : refuser de courir sur la production. Voir e2e/garde.ts.
verifierLaBase();

/**
 * INT-10 — La recette automatisée.
 *
 * Ce que ces épreuves remplacent : les vérifications faites à la main après
 * chaque changement — chercher « financière », remplir le tunnel, regarder si
 * le formulaire déborde au téléphone. Elles ne se souvenaient de rien ; celles-ci
 * si.
 *
 * ── Contre le serveur de développement ──────────────────────────────────────
 * Et non contre un build : `next dev` et `next build` écrivent tous deux dans
 * `.next` et ne peuvent pas coexister. Les épreuves portent sur des parcours,
 * pas sur le cache — dont l'effet ne s'observe de toute façon pas en
 * développement, chaque page y étant recalculée à chaque requête.
 *
 * Le prix de ce choix est la première visite de chaque page, que `next dev`
 * compile à la demande. `e2e/chauffe.ts` la paie une fois pour toutes avant que
 * la première épreuve ne démarre : sans cela, la compilation tombait dans le
 * temps imparti aux épreuves elles-mêmes, et la machine, occupée à compiler,
 * n'arrivait plus à lancer un navigateur dans les délais.
 *
 * ── Un seul projet ──────────────────────────────────────────────────────────
 * Les épreuves de mise en page fixent elles-mêmes leur largeur. Les faire aussi
 * tourner sous un profil « mobile » les jouait deux fois, pour le même verdict.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/chauffe.ts",
  globalTeardown: "./e2e/menage.ts",

  // Les épreuves écrivent en base : les faire courir ensemble ferait diverger
  // les décomptes de places qu'elles vérifient.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "clixa", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    /*
      Cinq minutes, et ce n'est pas de la prudence : Payload interroge le schéma
      de Neon au démarrage — près d'une minute — avant que Next ne compile la
      page d'accueil, que cette sonde réclame. Trois minutes ne suffisaient pas,
      et la série entière échouait sans qu'aucune épreuve n'ait été jouée.
    */
    timeout: 300_000,
  },
});
