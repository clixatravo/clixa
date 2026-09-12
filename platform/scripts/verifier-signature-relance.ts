/**
 * Qui a relancé — nommé, et lisible par toute l'équipe.
 *
 * ── ⚠️ Le défaut que cette garde protège ────────────────────────────────────
 * Le journal des relances portait une **relation** vers le compte auteur, et
 * l'écran affichait « vous » ou « un collègue ». Or `comptesLecture` ne laisse
 * lire que son propre compte : seule la direction résout la relation, et
 * l'administration lisait donc « un collègue » sur une ligne écrite par le
 * directeur. Elle n'apprenait rien, et reprenait la conversation sur un autre
 * WhatsApp — ce que ce journal existe précisément pour éviter.
 *
 * ⚠️ **Le contrôle qui compte est celui du compte non-direction** : c'est lui
 * qui échouait, et lui seul. Un contrôle écrit avec une session de direction
 * serait resté vert des deux côtés du défaut.
 *
 *   npx payload run scripts/verifier-signature-relance.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { libelleDuCompte, nomDeLAuteur } from "@/lib/equipe";
import { dernierSuivi } from "@/lib/suivi";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  Qui a relancé\n");

/* ── Comment on nomme un compte ──────────────────────────────────────────── */

dire("un nom est un nom", libelleDuCompte({ nom: "Mounir", email: "m@clixa.africa" }) === "Mounir");
dire(
  "sans nom, le rôle",
  libelleDuCompte({ email: "admin@clixa.africa", role: "direction" }) === "Direction",
  libelleDuCompte({ email: "admin@clixa.africa", role: "direction" }),
);
/*
  ⚠️ L'adresse entière ferait déborder la colonne, et le domaine n'apprend rien.
*/
dire(
  "à défaut, ce qui précède l'arobase",
  libelleDuCompte({ email: "mounir@clixa.africa" }) === "mounir",
);
dire("un compte vide ne s'invente pas", libelleDuCompte({}) === "");
dire("ni un compte absent", libelleDuCompte(null) === "");

/* ── Ce que l'écran affiche ──────────────────────────────────────────────── */

console.log("\n  Ce que la ligne dit\n");

dire("le nom recopié l'emporte", nomDeLAuteur({ parNom: "Mounir", par: 3 }) === "Mounir");
/*
  ⚠️ Le cas d'une ligne d'avant le 12 septembre 2026, ouverte par la direction :
  la relation est résolue, on s'en sert plutôt que de dire « un collègue ».
*/
dire(
  "sans nom recopié, la relation résolue sert de repli",
  nomDeLAuteur({ par: { id: 3, nom: "Rida" } }) === "Rida",
);
/*
  ⚠️ **Et c'est ici que le défaut vivait.** Pour un compte non-direction, la
  relation n'est pas résolue : elle arrive en identifiant nu. Sans instantané,
  il n'y a rien à afficher — c'est ce qui donnait « un collègue ».
*/
dire("un identifiant nu ne nomme personne", nomDeLAuteur({ par: 3 }) === "");
dire("ni une ligne sans auteur — c'est la tâche de 8 h", nomDeLAuteur({ le: "x" } as never) === "");

/* ── La colonne de la liste ──────────────────────────────────────────────── */

console.log("\n  La colonne de la liste\n");

const maintenant = new Date("2026-09-12T12:00:00.000Z");
const hier = new Date("2026-09-11T09:00:00.000Z").toISOString();

const avecNom = dernierSuivi(
  [{ quoi: "signature", le: hier, par: 3, parNom: "Mounir" }],
  maintenant,
);
dire("elle nomme l'auteur du dernier geste", avecNom.auteur === "Mounir", avecNom.auteur);
dire("et dit toujours quand", avecNom.libelle === "Relance signature · hier", avecNom.libelle);

/*
  ⚠️ Le **dernier**, pas le premier : c'est la personne à qui parler avant de
  composer le numéro. Les lignes sont données à l'envers exprès — le journal
  s'écrit en ajoutant à la fin, mais une correction depuis /admin peut les
  réordonner.
*/
const deux = dernierSuivi(
  [
    { quoi: "signature", le: hier, parNom: "Mounir" },
    { quoi: "paiement", le: new Date("2026-09-12T08:00:00.000Z").toISOString(), parNom: "Rida" },
  ],
  maintenant,
);
dire("celui du dernier geste, pas du premier", deux.auteur === "Rida", deux.auteur);

const auto = dernierSuivi([{ quoi: "rappel", le: hier }], maintenant);
dire("une ligne de la tâche de 8 h n'a pas d'auteur", auto.auteur === "");

const jamais = dernierSuivi([], maintenant);
dire("un dossier jamais relancé non plus", jamais.auteur === "" && jamais.ton === "jamais");

/* ── En base : la relance de l'équipe porte son nom ──────────────────────── */

const payload = await getPayload({ config });
const { docs: comptes } = await payload.find({
  collection: "utilisateurs",
  limit: 5,
  depth: 0,
  overrideAccess: true,
});

if (comptes.length === 0) {
  console.log("\n  · Aucun compte d'équipe : la partie en base est sautée.\n");
} else {
  console.log("\n  Les comptes réels se nomment tous\n");
  const sansNom = comptes.filter((c) => libelleDuCompte(c as never) === "");
  dire(
    "⚠️ chacun a de quoi être nommé à l'écran",
    sansNom.length === 0,
    sansNom.length > 0
      ? `${sansNom.length} sans nom, ni rôle, ni adresse`
      : comptes.map((c) => libelleDuCompte(c as never)).join(", "),
  );
}

console.log(
  manques === 0 ? "\n  On sait qui a parlé au client.\n" : `\n  ${manques} contrôle(s) au rouge.\n`,
);
process.exit(manques > 0 ? 1 : 0);
