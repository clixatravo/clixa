/**
 * Éprouve la règle « une personne, un compte », que la connexion Google porte.
 *
 * Le cas n'est jamais survenu en production : personne n'avait de compte au mot
 * de passe avant l'arrivée de Google. Il surviendra pourtant au premier
 * participant inscrit avant aujourd'hui qui essaiera Google — et le rater
 * donnerait deux comptes pour une personne, donc un dossier visible depuis
 * l'un et invisible depuis l'autre.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });
const email = `liaison-${Date.now()}@epreuve.invalid`;
const sub = `9${Date.now()}${Math.floor(Math.random() * 1000)}`;
let id: string | number | undefined;
let manques = 0;
const dire = (q: string, v: boolean) => {
  console.log(`  ${v ? "✓" : "✗"} ${q}`);
  if (!v) manques += 1;
};

try {
  // Un compte comme il en existait avant Google : adresse et mot de passe.
  const ancien = await payload.create({
    collection: "apprenants",
    overrideAccess: true,
    data: { email, password: "un-mot-de-passe-choisi", nom: "Ancien Compte", _verified: true },
  });
  id = ancien.id;
  dire("le compte au mot de passe existe, sans identifiant Google", !ancien.googleId);

  // Ce que fait la route au retour de Google : chercher par sub, puis par adresse.
  const parSub = await payload.find({
    collection: "apprenants",
    where: { googleId: { equals: sub } },
    limit: 1,
    overrideAccess: true,
  });
  dire("aucun compte ne porte encore ce sub", parSub.docs.length === 0);

  const parEmail = await payload.find({
    collection: "apprenants",
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });
  dire("le compte est retrouvé par son adresse", parEmail.docs.length === 1);

  await payload.update({
    collection: "apprenants",
    id: parEmail.docs[0]!.id,
    overrideAccess: true,
    data: { googleId: sub, emailVerifie: true },
  });

  const total = await payload.count({
    collection: "apprenants",
    where: { email: { equals: email } },
    overrideAccess: true,
  });
  dire("il n'y a toujours qu'un seul compte pour cette personne", total.totalDocs === 1);

  const relu = await payload.findByID({
    collection: "apprenants",
    id: ancien.id,
    overrideAccess: true,
  });
  dire("le même compte porte désormais l'identifiant Google", relu.googleId === sub);
  dire("son adresse est marquée vérifiée", relu.emailVerifie === true);

  // Le mot de passe d'origine doit rester valable : les deux chemins mènent au
  // même compte, et lier Google ne doit fermer aucune porte.
  const ouverture = await payload.login({
    collection: "apprenants",
    data: { email, password: "un-mot-de-passe-choisi" },
  });
  dire("le mot de passe d'origine fonctionne encore", Boolean(ouverture.user));

  // Deux comptes ne peuvent pas partager un sub — la base doit le refuser.
  let refuse = false;
  try {
    await payload.create({
      collection: "apprenants",
      overrideAccess: true,
      data: {
        email: `doublon-${Date.now()}@epreuve.invalid`,
        password: crypto.randomUUID(),
        nom: "Doublon",
        googleId: sub,
      },
    });
  } catch {
    refuse = true;
  }
  dire("un second compte portant le même sub est refusé", refuse);
} finally {
  if (id !== undefined) {
    await payload.delete({ collection: "apprenants", id, overrideAccess: true });
    console.log("  · compte d'épreuve supprimé");
  }
}

console.log(manques === 0 ? "\nLiaison : tout tient." : `\nLiaison : ${manques} manque(s).`);
process.exit(manques === 0 ? 0 : 1);
