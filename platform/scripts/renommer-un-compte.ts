/**
 * Donner son nom à un compte du back-office.
 *
 * ── Pourquoi cela compte ────────────────────────────────────────────────────
 * Depuis le 12 septembre 2026, le journal des relances écrit le nom de qui
 * agit, et la liste des dossiers l'affiche en or : « par Mounir MOUKHTARI ».
 * Un compte sans nom se replie sur son rôle, puis sur son adresse — « par
 * administration » plutôt que « par Hajar El Khadiri ». C'est lisible, mais ce
 * n'est pas quelqu'un à qui l'on parle.
 *
 *   npx payload run scripts/renommer-un-compte.ts administration@clixa.africa "Hajar El Khadiri"
 *   ECRIRE=1 npx payload run scripts/renommer-un-compte.ts …
 *
 * ⚠️ **Sans `ECRIRE=1`, il montre et s'arrête.**
 *
 * ⚠️ **Il ne retouche pas le journal**, et c'est voulu. Les lignes déjà écrites
 * portent le nom qu'avait le compte **au moment du geste** : c'est ce qu'un
 * journal enregistre, et le réécrire ferait dire à une trace d'hier ce qu'on
 * sait aujourd'hui. Les prochaines lignes porteront le nouveau nom.
 * `nommer-les-relances.ts` sert au cas différent d'une ligne qui n'a **aucun**
 * nom.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { libelleDuCompte } from "@/lib/equipe";

const suite = process.argv
  .slice(2)
  .map((a) => String(a))
  .filter((a) => a !== "run" && !a.endsWith(".ts"));
const [adresse, nom] = suite;

if (!adresse || !adresse.includes("@") || !nom || nom.trim().length < 2) {
  console.error('Usage : npx payload run scripts/renommer-un-compte.ts <email> "<Nom Complet>"');
  process.exit(1);
}

const payload = await getPayload({ config });

const { docs } = await payload.find({
  collection: "utilisateurs",
  where: { email: { equals: adresse.trim().toLowerCase() } },
  limit: 2,
  depth: 0,
  overrideAccess: true,
});

if (docs.length === 0) {
  console.error(`Aucun compte ne porte l'adresse « ${adresse} ».`);
  process.exit(1);
}

const compte = docs[0]!;
/*
  ⚠️ On coupe les blancs de bord. Un compte de production portait
  « Mounir MOUKHTARI » avec une espace finale : invisible à l'écran, elle
  ressort dans un export, un tri, ou une comparaison de chaînes.
*/
const voulu = nom.trim().replace(/\s+/g, " ");

console.log(`\n  ${compte.email}`);
console.log(
  `  avant  nom=${JSON.stringify(compte.nom ?? null)} · affiché « ${libelleDuCompte(compte as never)} »`,
);
console.log(`  après  nom=${JSON.stringify(voulu)} · affiché « ${voulu} »`);

if ((compte.nom ?? "") === voulu) {
  console.log("\n  Rien à faire : c'est déjà son nom.\n");
  process.exit(0);
}

if (!process.env.ECRIRE) {
  console.log("\n  Rien n'a été écrit. Relancer avec ECRIRE=1 pour appliquer.\n");
  process.exit(0);
}

await payload.update({
  collection: "utilisateurs",
  id: compte.id,
  data: { nom: voulu },
  overrideAccess: true,
});

const relu = await payload.findByID({
  collection: "utilisateurs",
  id: compte.id,
  depth: 0,
  overrideAccess: true,
});
console.log(`\n  Enregistré : « ${libelleDuCompte(relu as never)} »`);
console.log("  ⚠️ Le journal des relances garde le nom qu'il portait au moment de chaque geste.\n");
process.exit(0);
