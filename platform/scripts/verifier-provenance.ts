/**
 * Par où l'on nous a connus — la liste, et ce qu'on en compte.
 *
 *   npx tsx scripts/verifier-provenance.ts
 *
 * Aucune base, aucun réseau : la liste et la répartition sont pures. Ce qui est
 * gardé n'est pas l'arithmétique, c'est ce que le code **refuse** de faire —
 * ranger une valeur inventée dans « Autre », ou rendre une part du total que
 * les dossiers d'avant le 26 septembre 2026 fausseraient.
 */
import {
  OPTIONS_PROVENANCE,
  PROVENANCES,
  libelleProvenance,
  provenanceValide,
  repartitionParProvenance,
} from "@/lib/provenance";
import { repartitionParDomaine } from "@/lib/profil";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  La liste que la direction a dictée\n");

const valeurs = PROVENANCES.map((p) => p.valeur);
dire(
  "les six provenances, dans l'ordre donné",
  valeurs.join(",") === "linkedin,facebook,instagram,email,entourage,autre",
  valeurs.join(", "),
);
dire("aucune valeur n'apparaît deux fois", new Set(valeurs).size === valeurs.length);
dire(
  "chacune a un logo et une couleur",
  PROVENANCES.every((p) => p.logo.chemin.length > 10 && /^#[0-9a-f]{6}$/i.test(p.couleur)),
);
dire(
  "le menu de /admin porte les mêmes valeurs que le formulaire",
  OPTIONS_PROVENANCE.map((o) => o.value).join(",") === valeurs.join(","),
);

console.log("\n  Ce qui se refuse\n");

dire("une provenance offerte est reconnue", provenanceValide("entourage") === "entourage");
dire("⚠️ une provenance inventée ne l'est pas", provenanceValide("tiktok") === undefined);
dire("⚠️ ni l'intitulé à la place de la valeur", provenanceValide("LinkedIn") === undefined);
dire("le vide non plus", provenanceValide("") === undefined);
dire("l'intitulé s'affiche en clair", libelleProvenance("email") === "E-mail");
dire("un dossier d'avant la question affiche le tiret", libelleProvenance(null) === "—");

console.log("\n  La répartition ne dit pas plus qu'elle ne sait\n");

const vide = repartitionParProvenance([null, undefined]);
dire(
  "personne n'a répondu : rien à montrer",
  vide.lignes.length === 0 && vide.declares === 0 && vide.total === 2,
);

const r = repartitionParProvenance([
  "facebook",
  "facebook",
  "facebook",
  "facebook",
  "linkedin",
  "linkedin",
  "entourage",
  "tiktok",
  null,
  null,
]);
dire(
  "la plus fournie d'abord",
  r.lignes.map((l) => l.valeur).join(",") === "facebook,linkedin,entourage",
  r.lignes.map((l) => `${l.libelle} ${l.nombre}`).join(" · "),
);
dire(
  "⚠️ la barre se mesure à la plus fournie, pas au total",
  r.lignes[0]?.barre === 100 && r.lignes[1]?.barre === 50 && r.lignes[2]?.barre === 25,
  r.lignes.map((l) => `${l.barre} %`).join(" · "),
);
dire(
  "⚠️ une valeur inventée n'est pas versée dans « Autre »",
  !r.lignes.some((l) => l.valeur === "autre"),
);
dire(
  "la couverture compte les réponses reconnues, sur tous les dossiers",
  r.declares === 7 && r.total === 10,
  `${r.declares} sur ${r.total}`,
);

const egalite = repartitionParProvenance(["instagram", "linkedin"]);
dire(
  "à égalité, l'ordre de la liste tranche",
  egalite.lignes.map((l) => l.valeur).join(",") === "linkedin,instagram",
);

/*
  Le témoin : la répartition par domaine passe désormais par la même fonction.
  Elle doit rendre ce qu'elle rendait.
*/
const d = repartitionParDomaine(["finance", "finance", "audit", "astrophysique"]);
dire(
  "le domaine se compte toujours de la même façon",
  d.lignes.map((l) => `${l.valeur}:${l.nombre}:${l.barre}`).join(",") ===
    "finance:2:100,audit:1:50" && d.declares === 3,
);

console.log(manques === 0 ? "\n  Tout tient.\n" : `\n  ${manques} contrôle(s) au rouge.\n`);
process.exit(manques === 0 ? 0 : 1);
