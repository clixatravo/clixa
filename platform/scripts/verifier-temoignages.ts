/**
 * Les témoignages déposés par d'anciens participants — ce que la route accepte,
 * ce qu'elle refuse, et ce qu'elle ne publie jamais d'elle-même.
 *
 *   npx tsx scripts/verifier-temoignages.ts
 *
 * Aucune base, aucun réseau. Ce qui est gardé :
 *
 * - `validerTemoignage` refuse un dépôt incomplet, une cohorte inventée, un
 *   texte trop court ou trop long, et surtout **un dépôt sans accord de
 *   publication** — avec son témoin : un dépôt complet passe, sans quoi une
 *   validation qui refuserait tout passerait au vert sur les refus ;
 * - la carte écrit « Cohorte d'octobre 2025 », pas une valeur brute ;
 * - la route crée **un brouillon**. Ce dernier point lit la source, faute de
 *   pouvoir l'appeler sans base : le défaut qu'il garde n'est pas une valeur,
 *   c'est un oubli — retirer `_status: "draft"` mettrait en ligne, sur
 *   l'accueil et sur la fiche du parcours, ce que n'importe qui écrit.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  COHORTES,
  MESSAGES_TEMOIGNAGE,
  TEXTE_MAX,
  TEXTE_MIN,
  cohorteValide,
  libelleCohorte,
  validerTemoignage,
  type SaisieTemoignage,
} from "@/lib/temoignages";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const bon: SaisieTemoignage = {
  nom: "Aminata Diallo",
  fonction: "Responsable administrative et financière",
  cohorte: "2026-06",
  formation: "directeur-administratif-et-financier",
  texte: "Le cash à treize semaines a changé ma façon de présenter la trésorerie à ma direction.",
  consentement: "oui",
};
const refus = (s: Partial<SaisieTemoignage>) => {
  const r = validerTemoignage({ ...bon, ...s });
  return r.ok ? "accepté" : r.erreur;
};

console.log("\n▸ Ce que la route accepte\n");

const temoin = validerTemoignage(bon);
dire("témoin : un dépôt complet passe", temoin.ok, temoin.ok ? temoin.cohorte : temoin.erreur);

console.log("\n▸ Ce qu'elle refuse\n");

dire("⚠️ sans accord de publication", refus({ consentement: "" }) === "consentement");
dire(
  "un accord qui n'est pas « oui » ne vaut pas accord",
  refus({ consentement: "on" }) === "consentement",
);
for (const champ of ["nom", "fonction", "cohorte", "formation", "texte"] as const) {
  dire(`sans ${champ}`, refus({ [champ]: "" }) === "champs");
}
dire("une cohorte inventée", refus({ cohorte: "2024-01" }) === "cohorte");
dire(
  `un texte de moins de ${TEXTE_MIN} caractères`,
  refus({ texte: "Très bien, merci." }) === "court",
);
dire(
  `un texte de plus de ${TEXTE_MAX} caractères`,
  refus({ texte: "a".repeat(TEXTE_MAX + 1) }) === "long",
);
dire("un nom démesuré", refus({ nom: "A".repeat(121) }) === "long");
dire(
  "chaque refus a sa phrase",
  (["champs", "cohorte", "formation", "court", "long", "consentement", "technique"] as const).every(
    (e) => MESSAGES_TEMOIGNAGE[e].length > 20,
  ),
);

console.log("\n▸ Les cohortes\n");

dire(
  "les cinq cohortes dictées par la direction",
  COHORTES.map((c) => c.libelle).join(" · ") ===
    "Octobre 2025 · Février 2026 · Avril 2026 · Juin 2026 · Octobre 2026",
);
dire(
  "chaque valeur se reconnaît",
  COHORTES.every((c) => cohorteValide(c.valeur) === c.valeur),
);
dire(
  "la carte écrit « Cohorte d'octobre 2025 »",
  libelleCohorte("2025-10") === "Cohorte d'octobre 2025",
  libelleCohorte("2025-10"),
);
dire("et « Cohorte de juin 2026 »", libelleCohorte("2026-06") === "Cohorte de juin 2026");
dire("une valeur inconnue ne s'écrit pas", libelleCohorte("2024-01") === undefined);

console.log("\n▸ Ce que la route ne publie jamais\n");

const route = readFileSync(
  path.join(process.cwd(), "src/app/(payload)/api/temoignage/route.ts"),
  "utf8",
);
const creation = route.slice(route.indexOf("payload.create("));
dire(
  "⚠️ le dépôt est créé en brouillon (draft: true)",
  /draft:\s*true/.test(creation.slice(0, 400)),
);
dire(
  "⚠️ et porte _status « draft » — l'un sans l'autre publie",
  /_status:\s*"draft"/.test(creation.slice(0, 600)),
);
dire(
  "l'accord est daté par la route, pas par le formulaire",
  /consentementLe:\s*new Date\(\)/.test(creation.slice(0, 900)),
);
dire(
  "la formation est cherchée parmi les parcours publiés",
  /_status:\s*\{\s*equals:\s*"published"\s*\}/.test(route),
);

console.log(manques === 0 ? "\n  ✓ Tout tient.\n" : `\n  ✗ ${manques} contrôle(s) au rouge.\n`);
if (manques > 0) process.exit(1);
