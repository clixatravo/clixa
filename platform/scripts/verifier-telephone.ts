/**
 * Le numéro qu'on compose à partir de deux cases.
 *
 * ⚠️ **Deux numéros de production ont motivé ce fichier**, tous deux reçus de
 * la campagne le 6 septembre 2026, tous deux injoignables, tous deux acceptés
 * sans un mot par le site. Ils sont éprouvés ici tels qu'ils ont été saisis.
 *
 * ⚠️ Un numéro faux ne casse rien : il s'enregistre, il s'affiche, il a l'air
 * d'un numéro. On ne l'apprend qu'en appelant, c'est-à-dire jamais — l'équipe
 * conclut que la personne ne répond pas.
 *
 *   npx payload run scripts/verifier-telephone.ts
 */
import { composerNumero } from "@/lib/telephone";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const rend = (quoi: string, indicatif: string, saisi: string, attendu: string) => {
  const { complet } = composerNumero(indicatif, saisi);
  dire(quoi, complet === attendu, `« ${indicatif} » + « ${saisi} » → ${complet || "(rien)"}`);
};

console.log("\n  Composer un numéro joignable\n");

// ── 1. Le cas ordinaire ─────────────────────────────────────────────────────
rend("le numéro local, tel qu'on le connaît", "212", "6 12 34 56 78", "+212612345678");
rend("son zéro de tête part", "212", "06 12 34 56 78", "+212612345678");
rend("les espaces et les tirets aussi", "225", "07-12-34-56-78", "+2250712345678");

/*
  ── ⚠️ Le zéro de tête ne se retire pas partout ─────────────────────────────
  Il était retiré pour tout le monde. C'est juste au Maroc et **faux en Côte
  d'Ivoire**, où les numéros font dix chiffres depuis 2021 et où le zéro
  appartient au numéro. `+225712345678` ne joint personne — dans un pays que le
  site nomme et où l'annonce tourne.

  Le Bénin suit la même règle depuis 2022, et un dossier de production en porte
  un : `+2290163903882`. Son zéro est à sa place ; c'est bien le seul des trois
  numéros douteux de ce fichier qui n'avait rien.
*/
rend("⚠️ en Côte d'Ivoire le zéro fait partie du numéro", "225", "0712345678", "+2250712345678");
rend("⚠️ au Bénin aussi — le cas réel de production", "229", "0163903882", "+2290163903882");
rend("au Sénégal il n'y en a pas à retirer", "221", "770790537", "+221770790537");
rend("⚠️ et au Maroc il part toujours", "212", "0612345678", "+212612345678");

// ── 2. ⚠️ L'indicatif tapé deux fois ────────────────────────────────────────
/*
  Le cas réel : `+221221770790537`, quinze chiffres. La personne a tapé son
  numéro complet dans la case du numéro local, et le sélecteur y a ajouté
  `+221` une seconde fois. Rien ne le lui a dit.
*/
rend(
  "⚠️ l'indicatif déjà tapé n'est pas doublé — le cas réel du 6 septembre",
  "221",
  "221770790537",
  "+221770790537",
);
dire("et on le lui dit", composerNumero("221", "221770790537").rattrape === "indicatif-en-double");

/*
  ⚠️ **Le rattrapage a un plancher.** Sans lui, un numéro court dont les
  premiers chiffres ressemblent à l'indicatif serait amputé — on rendrait un
  numéro faux en croyant en corriger un.
*/
rend("⚠️ mais un numéro trop court n'est pas amputé", "221", "22177", "+22122177");

// ── 3. ⚠️ Le numéro international écrit en entier ───────────────────────────
/*
  Un `+` ou un `00` en tête ne laisse aucune place au doute : la saisie est
  plus explicite que le sélecteur, et c'est elle qui gagne.
*/
rend("⚠️ un « + » en tête l'emporte sur la liste", "212", "+228 98 53 43 97", "+22898534397");
rend("un « 00 » aussi", "212", "0022898534397", "+22898534397");
dire(
  "et on le dit également",
  composerNumero("212", "+22898534397").rattrape === "numero-international",
);

/*
  ⚠️ Le cas qui a réellement fait perdre un prospect : la personne est au Togo,
  n'a pas touché au sélecteur resté sur son défaut, et son numéro est parti en
  `+21298534397`. Le défaut a été retiré ; mais si elle écrit son indicatif
  elle-même, la liste ne doit plus pouvoir la contredire.
*/
rend(
  "⚠️ le sélecteur ne recouvre pas un indicatif écrit à la main",
  "212",
  "+22898534397",
  "+22898534397",
);

// ── 4. Ce qui ne compose rien ───────────────────────────────────────────────
/*
  ⚠️ Rien plutôt qu'un morceau. Un champ caché portant « +221 » seul passerait
  la garde de forme du serveur et ouvrirait un dossier avec un numéro qui
  n'appelle personne.
*/
rend("sans pays choisi, rien ne part", "", "612345678", "");
rend("sans numéro non plus", "212", "", "");
rend("ni avec des zéros seuls", "212", "000", "");
rend("ni avec du texte", "212", "appelez-moi", "");

// ── 5. La relecture ─────────────────────────────────────────────────────────
/*
  ⚠️ C'est la seule chose qui rende la faute visible au moment où on peut
  encore la corriger. Elle doit se reconnaître d'un coup d'œil.
*/
dire(
  "le numéro se relit espacé",
  composerNumero("212", "0612345678").lisible === "+212 6 12 34 56 78",
  composerNumero("212", "0612345678").lisible,
);
dire(
  "⚠️ mais ce qui part reste continu",
  !composerNumero("212", "0612345678").complet.includes(" "),
);

console.log(
  manques === 0 ? "\n  Les numéros composés joignent quelqu'un.\n" : `\n  ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
