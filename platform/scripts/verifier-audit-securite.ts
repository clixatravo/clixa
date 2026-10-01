/**
 * Ce que l'audit de sécurité du 1er octobre 2026 a fermé — sans base ni réseau.
 *
 *   npx tsx scripts/verifier-audit-securite.ts
 *
 * Les règles pures, et quatre lectures de source là où le défaut n'était pas
 * une valeur mais une ligne : un mot de passe écrit dans une route, GraphQL
 * ouvert par défaut, un cookie d'équipe sans `Secure`, un crochet absent. La
 * même chose éprouvée contre la vraie API vit dans
 * `verifier-securite-comptes.ts`, qui demande une base.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { cadenceDesPortesDeCompte } from "@/lib/cadence";
import { MOT_DE_PASSE_MIN, motDePasseAcceptable } from "@/lib/mot-de-passe";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};
const lire = (f: string) => readFileSync(path.join(process.cwd(), f), "utf8");

console.log("\n▸ Le frein des portes de compte\n");

const oublie = cadenceDesPortesDeCompte("/api/apprenants/forgot-password");
dire(
  "⚠️ « mot de passe oublié » est freiné — il envoie un courriel à chaque appel",
  oublie?.plafond === 5,
  JSON.stringify(oublie),
);
dire(
  "la connexion de l'équipe est freinée",
  cadenceDesPortesDeCompte("/api/utilisateurs/login")?.registre === "compte-login",
);
dire(
  "la confirmation par jeton aussi",
  cadenceDesPortesDeCompte("/api/apprenants/verify/abc123")?.registre === "compte-verify",
);
dire(
  "témoin : la lecture d'un dossier n'est pas une porte de compte",
  cadenceDesPortesDeCompte("/api/inscriptions/12") === undefined,
);
dire(
  "témoin : une collection sans compte n'est pas freinée par cette règle",
  cadenceDesPortesDeCompte("/api/programmes/login") === undefined,
);

console.log("\n▸ La longueur des mots de passe\n");

dire(`⚠️ « abc » est refusé (Payload l'acceptait)`, !motDePasseAcceptable("abc"));
dire(
  `${MOT_DE_PASSE_MIN - 1} caractères sont refusés`,
  !motDePasseAcceptable("a".repeat(MOT_DE_PASSE_MIN - 1)),
);
dire(
  `témoin : ${MOT_DE_PASSE_MIN} caractères passent`,
  motDePasseAcceptable("a".repeat(MOT_DE_PASSE_MIN)),
);
dire("témoin : une écriture sans mot de passe n'est pas jugée", motDePasseAcceptable(undefined));

console.log("\n▸ Les lignes qui avaient laissé la porte ouverte\n");

const revalider = lire("src/app/(payload)/api/revalider/route.ts");
dire(
  "⚠️ /api/revalider ne porte plus de mot de passe écrit en dur",
  !/=== ?"clixa|"clixa-revalider"/.test(revalider),
);
dire("et refuse quand CRON_SECRET manque", /status: 503/.test(revalider));

const config = lire("src/payload.config.ts");
dire("⚠️ GraphQL est fermé", /graphQL:\s*\{\s*disable:\s*true\s*\}/.test(config));

const utilisateurs = lire("src/collections/Utilisateurs.ts");
dire(
  "⚠️ le cookie d'équipe porte Secure en production",
  /secure:\s*process\.env\.NODE_ENV === "production"/.test(utilisateurs),
);
dire("le mot de passe d'équipe passe par la règle", /exigerUnMotDePasseSolide/.test(utilisateurs));

const apprenants = lire("src/collections/Apprenants.ts");
dire(
  "⚠️ un participant ne réécrit pas ses champs de connexion",
  /beforeChange:\s*\[figerLesChampsDeConnexion\]/.test(apprenants) &&
    /"email", "googleId", "emailVerifie", "_verified"/.test(apprenants),
);

console.log(manques === 0 ? "\n  ✓ Tout tient.\n" : `\n  ✗ ${manques} contrôle(s) au rouge.\n`);
if (manques > 0) process.exit(1);
