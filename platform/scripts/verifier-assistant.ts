/**
 * Ce que l'assistant a le droit de dire, et ce qu'il fait quand il est coupé.
 *
 * ── ⚠️ Pourquoi cette garde ─────────────────────────────────────────────────
 * L'assistant parle à des prospects venus d'une annonce, en leur nom à nous.
 * Trois choses se sont révélées fausses en l'interrogeant en production le
 * 14 septembre 2026, et aucune n'aurait été vue par un type ou un build :
 *
 *   1. il récitait la liste de moyens de paiement **du CMS** — celle d'avant le
 *      28 août, retirée de la fiche le 1er septembre — et répondait donc « non »
 *      à qui demandait s'il pouvait payer par carte ;
 *   2. une réponse coupée en plein mot sortait telle quelle, sans un mot ;
 *   3. un 503 de Gemini (« modèle surchargé ») était présenté au visiteur comme
 *      « l'assistant est en cours de mise en service ».
 *
 * Tout est pur : ni base, ni réseau, ni clef.
 *
 *   npx payload run scripts/verifier-assistant.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { connaissancesCatalogue, consignesAssistant, extraireTexte } from "@/lib/assistant";
import { MOYENS_AFFICHES } from "@/lib/moyens";
import type { Programme, Session, Specialisation, Tarifs } from "@/lib/types";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n▸ Ce que le modèle reçoit\n");

const session: Session = {
  id: "1",
  programmeSlug: "directeur-administratif-et-financier",
  mode: "visio",
  debut: "2026-10-03T09:00:00.000Z",
  fin: "2026-11-21T13:00:00.000Z",
  cadence: "8 samedis · 9h00–13h00",
  capacite: 46,
  placesReservees: 26,
  prixCentimes: 42300,
  devise: "EUR",
  /*
    ⚠️ **Le lien de la classe est posé exprès dans la fixture.** C'est la seule
    façon de prouver qu'il ne ressort pas : une session sans lien passerait au
    vert quoi qu'on écrive dans `decrireSession`.
  */
  lienVisio: "https://meet.exemple.test/daf-secret",
  fuseau: "UTC",
};

const programme = {
  slug: "directeur-administratif-et-financier",
  titre: "Directeur Administratif et Financier",
  accroche: "",
  objectifs: "",
  specialisation: "finance",
  type: "certifiante",
  niveau: "avance",
  langue: "fr",
  dureeHeures: 32,
  rythme: "",
  publicVise: [],
  competences: [],
  prerequis: "",
  debouches: [],
  modules: [],
} as unknown as Programme;

const tarifs: Tarifs = {
  prixComptantCentimes: 42300,
  devise: "EUR",
  plans: [
    {
      code: "P1",
      libelle: "Comptant",
      totalCentimes: 42300,
      echeancesCentimes: [42300],
      conditions: "",
    },
  ],
  /*
    ⚠️ Ce que le CMS porte encore — la liste d'avant, masquée dans /admin. La
    fixture la met délibérément : c'est elle qui ressortait dans les réponses.
  */
  moyensPaiement: ["Western Union · Ria · MoneyGram"],
};

const specialisations = [{ slug: "finance", nom: "Finance" }] as unknown as Specialisation[];

const catalogue = connaissancesCatalogue({
  programmes: [programme],
  specialisations,
  sessions: [session],
  tarifs,
  site: "https://www.clixa.africa",
  maintenant: new Date("2026-09-14T00:00:00.000Z"),
});
const consignes = consignesAssistant(catalogue, "https://www.clixa.africa", new Date("2026-09-14"));

/* ── 1. ⚠️ Ce qui ne doit jamais partir ──────────────────────────────────── */

dire(
  "le lien de la classe virtuelle ne part pas au modèle",
  !consignes.includes("meet.exemple.test"),
);
dire(
  "ni le mot de passe d'aucun bénéficiaire",
  !/IBAN|RIB|bénéficiaire/i.test(consignes),
  "aucune coordonnée bancaire",
);

/* ── 2. ⚠️ Les moyens de paiement sont ceux du code ─────────────────────── */
/*
  Chaque moyen commande ce que le participant reçoit par courriel et ce que le
  contrat écrit : la liste du CMS ne peut pas faire foi. Un prospect qui veut
  payer par carte doit lire qu'il le peut.
*/
for (const moyen of MOYENS_AFFICHES) {
  dire(`« ${moyen} » est annoncé`, consignes.includes(moyen));
}

/* ── 3. Ce que le catalogue doit porter ──────────────────────────────────── */

dire("les places restantes sont dites", /places restantes\s*:\s*20/.test(consignes), "46 − 26");
dire("la durée vient du catalogue", consignes.includes("Durée : 32 heures"));
dire("la page de la formation est citée", consignes.includes("/formations/directeur-"));
dire(
  "la règle « ne rien inventer » est en tête",
  /N'invente jamais un prix, une date/.test(consignes),
);

console.log("\n▸ Une réponse coupée le dit\n");

/** Fabrique un flux SSE comme celui de Gemini. */
const flux = (evenements: string[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      const e = new TextEncoder();
      for (const ev of evenements) c.enqueue(e.encode(`data: ${ev}\n\n`));
      c.close();
    },
  });

const lire = async (evenements: string[]) => {
  const r = extraireTexte(flux(evenements));
  let texte = "";
  const d = new TextDecoder();
  for await (const morceau of r as unknown as AsyncIterable<Uint8Array>) texte += d.decode(morceau);
  return texte;
};

const evt = (texte: string, finishReason?: string) =>
  JSON.stringify({
    candidates: [
      { ...(finishReason ? { finishReason } : {}), content: { parts: [{ text: texte }] } },
    ],
  });

const complete = await lire([evt("Le tarif est de "), evt("423 EUR.", "STOP")]);
dire("une réponse normale sort telle quelle", complete === "Le tarif est de 423 EUR.", complete);

const coupee = await lire([evt("Le tarif est de "), evt("423 EU")]);
dire(
  "une réponse interrompue le dit",
  coupee.includes("Réponse interrompue"),
  coupee.slice(-60).replace(/\n/g, " "),
);
dire("et elle garde ce qui était arrivé", coupee.startsWith("Le tarif est de 423 EU"));

const plafond = await lire([evt("Les douze formations sont "), evt("…", "MAX_TOKENS")]);
dire("un plafond de jetons atteint compte comme une coupure", plafond.includes("interrompue"));

/*
  ⚠️ Sans texte du tout, il n'y a rien à marquer : la route rendra son erreur.
  Coller « réponse interrompue » sur une réponse vide ferait croire à un début
  de réponse qui n'a jamais existé.
*/
const vide = await lire([evt("")]);
dire("un flux sans texte ne fabrique pas de mention", vide === "", JSON.stringify(vide));

console.log("\n▸ « Non configuré » ne se dit que si la clef manque\n");

/*
  ⚠️ **Ces deux contrôles lisent la source**, ce qui est inhabituel ici et
  assumé : le défaut ne se voit ni dans une valeur ni dans un rendu, il est dans
  un `if`. Un 503 de Gemini — « modèle surchargé », deux requêtes sur huit
  mesurées en production — était traduit en « l'assistant est en cours de mise
  en service », et sortait de la boucle sans essayer les autres modèles.

  Deux sessions ont corrigé ce défaut en parallèle. La forme retenue est celle
  d'`origin/main` : un **drapeau** porté par l'erreur (`nonConfigure`), et non un
  statut inventé — un faux code HTTP finit toujours par être traité comme un
  vrai. C'est ce branchement qu'il faut garder.
*/
const source = (chemin: string) => readFileSync(resolve(import.meta.dirname, "..", chemin), "utf8");

const route = source("src/app/(payload)/api/assistant/route.ts");
dire(
  "seule une clef absente donne « non configuré »",
  /e\.nonConfigure/.test(route) && !/status === 503[\s\S]{0,80}NOT_CONFIGURED/.test(route),
);
dire(
  "un modèle surchargé est dit surchargé, pas absent",
  /status === 429 \|\| status === 503/.test(route),
);

const bibliotheque = source("src/lib/assistant.ts");
dire(
  "et l'assistant essaie le modèle suivant quand celui-ci est surchargé",
  /status === 404 \|\| status === 429 \|\| status >= 500/.test(bibliotheque) &&
    /if \(!reessayable\(reponse\.status\)\) break;/.test(bibliotheque),
  "404, 429 et toute 5xx",
);
dire(
  "la clef absente porte le drapeau, pas un faux statut",
  /new ErreurAssistant\("GEMINI_API_KEY absente", 503, true\)/.test(bibliotheque),
);

console.log(manques === 0 ? "\n  ✓ Tout tient.\n" : `\n  ✗ ${manques} contrôle(s) au rouge.\n`);
process.exit(manques > 0 ? 1 : 0);
