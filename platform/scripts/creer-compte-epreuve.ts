/**
 * Créer le compte de back-office dont la série d'épreuves a besoin.
 *
 * ── Pourquoi un compte à part ───────────────────────────────────────────────
 * `e2e/admin.spec.ts` doit se connecter à /admin pour vérifier que les boutons
 * enregistrent vraiment. Elle ne passe pas par une route de développement qui
 * ouvrirait une session sans mot de passe : une telle porte, même gardée par
 * `NODE_ENV`, est le genre de garde qui s'efface quand la configuration change.
 *
 * ⚠️ Ce script ne touche que la base de **développement**. Il refuse de
 * s'exécuter ailleurs : un compte d'épreuve n'a rien à faire en production.
 *
 * ⚠️ Le mot de passe est tiré au hasard et **n'est jamais affiché**. Il est
 * écrit directement dans `.env.local`, qui n'est pas suivi par git. Personne ne
 * le lit, ni ne le recopie, ni ne le transporte.
 *
 * ── Le rôle est le plus faible qui suffise ──────────────────────────────────
 * `pedagogie`, pas `direction`. La série ouvre un dossier et clique un bouton :
 * `connecte` autorise déjà la lecture et l'écriture. Seule la suppression est
 * réservée à la direction — et une épreuve n'a aucune raison de supprimer quoi
 * que ce soit.
 *
 *   npx payload run scripts/creer-compte-epreuve.ts
 */
import { randomBytes } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { getPayload } from "payload";
import config from "@payload-config";

const CHEMIN_ENV = ".env.local";
const EMAIL = "epreuve@epreuve.invalid";

/*
  La base visée doit être celle de développement. On la reconnaît à l'hôte de
  sa chaîne de connexion : celui de production porte un autre nom de branche.
*/
const chaine = process.env.DATABASE_URL ?? "";
const hoteProd = (() => {
  try {
    const l = readFileSync(".env.prod", "utf8")
      .split("\n")
      .find((x) => x.startsWith("DATABASE_URL"));
    return l ? /@([^/]+)\//.exec(l)?.[1] : undefined;
  } catch {
    return undefined;
  }
})();

if (hoteProd && chaine.includes(hoteProd)) {
  console.error("⚠️  DATABASE_URL désigne la PRODUCTION. Refus : ce compte est pour dev.");
  process.exit(1);
}

const payload = await getPayload({ config });

const { docs } = await payload.find({
  collection: "utilisateurs",
  where: { email: { equals: EMAIL } },
  limit: 1,
  overrideAccess: true,
});

/* Trente-deux caractères tirés au hasard : jamais réutilisé, jamais montré. */
const motDePasse = randomBytes(24).toString("base64url");

if (docs[0]) {
  await payload.update({
    collection: "utilisateurs",
    id: docs[0].id,
    overrideAccess: true,
    data: { password: motDePasse },
  });
  console.log(`  ✓ compte existant, mot de passe renouvelé : ${EMAIL}`);
} else {
  await payload.create({
    collection: "utilisateurs",
    overrideAccess: true,
    data: {
      email: EMAIL,
      password: motDePasse,
      nom: "Compte d'épreuve",
      role: "pedagogie",
    } as never,
  });
  console.log(`  ✓ compte créé : ${EMAIL} · rôle pedagogie`);
}

/*
  On réécrit les deux lignes plutôt que d'en empiler : relancer ce script doit
  laisser le fichier dans le même état, pas y ajouter un doublon qui masquerait
  le premier.
*/
const avant = readFileSync(CHEMIN_ENV, "utf8")
  .split("\n")
  .filter((l) => !l.startsWith("E2E_ADMIN_"))
  .join("\n")
  .replace(/\n+$/, "");

const { writeFileSync } = await import("node:fs");
writeFileSync(
  CHEMIN_ENV,
  `${avant}\n\n# Compte de la base dev, pour e2e/admin.spec.ts. Mot de passe tiré au hasard.\n` +
    `E2E_ADMIN_EMAIL="${EMAIL}"\nE2E_ADMIN_PASSWORD="${motDePasse}"\n`,
);
void appendFileSync;

console.log("  ✓ .env.local mis à jour (le mot de passe n'est affiché nulle part)");
process.exit(0);
