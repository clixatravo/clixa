/**
 * Les comptes, éprouvés par la vraie API — contre `dev`, serveur lancé.
 *
 *   npx payload run scripts/verifier-securite-comptes.ts
 *
 * Trouvé en audit le 1er octobre 2026, et reproduit avant d'être corrigé : un
 * participant connecté réécrivait par `PATCH /api/apprenants/<id>` son
 * adresse, son identifiant Google, « adresse vérifiée » et `_verified`. Avec
 * l'adresse d'une autre personne, sa première connexion Google lui apportait
 * ses dossiers. Voir `figerLesChampsDeConnexion`.
 *
 * ⚠️ **Le témoin fait la garde** : le même participant doit pouvoir corriger
 * son nom. Le premier jet du correctif retirait l'adresse de l'écriture, et la
 * validation refusait alors **toute** écriture — un contrôle qui ne regardait
 * que les refus serait resté vert.
 *
 * Et la longueur du mot de passe, éprouvée par l'API locale : la règle de
 * Payload (trois caractères) n'est pas réglable, c'est notre crochet qui tient.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const ENTETES = {
  origin: BASE,
  "sec-fetch-site": "same-origin",
  "content-type": "application/json",
};

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const email = `garde-compte-${Date.now()}@epreuve.invalid`;
const mdp = "Garde-Epreuve-2026!";
const cree = await payload.create({
  collection: "apprenants",
  data: { email, password: mdp, nom: "Garde Épreuve", _verified: true },
  disableVerificationEmail: true,
  overrideAccess: true,
});

const relire = async () =>
  (await payload.findByID({
    collection: "apprenants",
    id: cree.id,
    overrideAccess: true,
    showHiddenFields: true,
  })) as unknown as Record<string, unknown>;

try {
  console.log("\n▸ Ce qu'un participant ne réécrit pas\n");

  const login = await fetch(`${BASE}/api/apprenants/login`, {
    method: "POST",
    headers: ENTETES,
    body: JSON.stringify({ email, password: mdp }),
  });
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  dire("prémisse : le participant est connecté", login.status === 200 && cookie !== "");

  const ecrire = (data: Record<string, unknown>) =>
    fetch(`${BASE}/api/apprenants/${cree.id}`, {
      method: "PATCH",
      headers: { ...ENTETES, cookie },
      body: JSON.stringify(data),
    });

  await ecrire({
    email: `victime-${Date.now()}@epreuve.invalid`,
    googleId: "9999999999",
    emailVerifie: true,
    _verified: false,
  });
  const apres = await relire();
  dire("⚠️ son adresse ne change pas", apres.email === email, String(apres.email));
  dire("⚠️ ni son identifiant Google", !apres.googleId, String(apres.googleId));
  dire("ni « adresse vérifiée »", apres.emailVerifie !== true);
  dire("ni _verified", apres._verified === true);

  const nom = await ecrire({ nom: "Nom Corrigé" });
  dire(
    "témoin : il corrige son nom",
    nom.status === 200 && (await relire()).nom === "Nom Corrigé",
    String(nom.status),
  );

  console.log("\n▸ La longueur du mot de passe\n");

  let refus = "";
  try {
    await payload.update({
      collection: "apprenants",
      id: cree.id,
      data: { password: "abc" },
      overrideAccess: true,
    });
  } catch (e) {
    refus = e instanceof Error ? e.message : String(e);
  }
  dire(
    "⚠️ « abc » est refusé, même par l'API locale",
    /au moins 8/.test(refus),
    refus.slice(0, 80),
  );

  let accepte = true;
  try {
    await payload.update({
      collection: "apprenants",
      id: cree.id,
      data: { password: "Un-Mot-De-Passe-Long-2026" },
      overrideAccess: true,
    });
  } catch {
    accepte = false;
  }
  dire("témoin : un mot de passe long passe", accepte);
} finally {
  await payload.delete({ collection: "apprenants", id: cree.id, overrideAccess: true });
}

console.log(manques === 0 ? "\n  ✓ Tout tient.\n" : `\n  ✗ ${manques} contrôle(s) au rouge.\n`);
process.exit(manques > 0 ? 1 : 0);
