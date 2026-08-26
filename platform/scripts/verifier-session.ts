/**
 * Éprouve `lib/session.ts` — l'ouverture de session sans mot de passe.
 *
 * Ce code refait à la main ce que fait `payload.login()` : une ligne de session
 * en base, un jeton signé qui la désigne, un cookie qui le porte. Il s'appuie
 * sur `getFieldsToSign`, `jwtSign` et `generatePayloadCookie`, exportés par
 * Payload mais rarement appelés de l'extérieur. Une montée de version qui
 * changerait la forme du jeton ou le nom du cookie casserait la connexion
 * Google sans casser une seule compilation — d'où cette épreuve.
 *
 * Elle crée un compte jetable en `@epreuve.invalid` (domaine réservé, qui ne
 * peut appartenir à personne) et le supprime à la fin, y compris en cas
 * d'échec.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { ouvrirSession } from "../src/lib/session.js";

const payload = await getPayload({ config });
const email = `session-${Date.now()}@epreuve.invalid`;
let compteId: number | string | undefined;
let manques = 0;

function verifier(quoi: string, vrai: boolean) {
  console.log(`  ${vrai ? "✓" : "✗"} ${quoi}`);
  if (!vrai) manques += 1;
}

try {
  const compte = await payload.create({
    collection: "apprenants",
    overrideAccess: true,
    data: { email, password: crypto.randomUUID(), nom: "Épreuve Session", emailVerifie: true },
  });
  compteId = compte.id;

  const cookie = await ouvrirSession(payload, "apprenants", compte.id);

  verifier("un cookie est renvoyé", cookie.length > 0);
  verifier(
    "il porte le préfixe attendu",
    cookie.startsWith(`${payload.config.cookiePrefix}-token=`),
  );
  verifier("il est HttpOnly", /HttpOnly/i.test(cookie));

  // La session doit exister en base : sans elle, Payload rejette le jeton.
  const relu = await payload.findByID({
    collection: "apprenants",
    id: compte.id,
    overrideAccess: true,
    depth: 0,
  });
  const sessions = (relu as { sessions?: unknown[] }).sessions ?? [];
  verifier("une session est écrite en base", sessions.length === 1);

  // L'épreuve qui compte : le cookie authentifie-t-il vraiment ?
  const jeton = cookie.split(";")[0] ?? "";
  const entetes = new Headers({ cookie: jeton });
  const { user } = await payload.auth({ headers: entetes });

  verifier("le cookie authentifie", Boolean(user));
  verifier("il désigne le bon compte", String(user?.id) === String(compte.id));
  verifier("il désigne la bonne collection", user?.collection === "apprenants");

  // Une seconde ouverture ne doit pas empiler les sessions périmées ni perdre
  // la première : deux appareils, deux sessions.
  await ouvrirSession(payload, "apprenants", compte.id);
  const relu2 = await payload.findByID({
    collection: "apprenants",
    id: compte.id,
    overrideAccess: true,
    depth: 0,
  });
  verifier(
    "une seconde connexion ajoute une session sans effacer la première",
    ((relu2 as { sessions?: unknown[] }).sessions ?? []).length === 2,
  );
} finally {
  if (compteId !== undefined) {
    await payload.delete({ collection: "apprenants", id: compteId, overrideAccess: true });
    console.log("  · compte d'épreuve supprimé");
  }
}

console.log(manques === 0 ? "\nSession : tout tient." : `\nSession : ${manques} manque(s).`);
process.exit(manques === 0 ? 0 : 1);
