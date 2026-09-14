/**
 * Ce que la FAQ affirme, confronté à ce que le site tient.
 *
 * ── ⚠️ Pourquoi cette garde existe ──────────────────────────────────────────
 * Une FAQ est la page qui vieillit le plus vite : un prix, un délai, une date
 * y restent vrais jusqu'au jour où la fiche change sans elle. `lib/faq.ts` lit
 * donc tout ce qui se compte aux mêmes sources que la fiche — et ce script
 * vérifie que ce qu'elle dit suit bien ces sources, **dans les deux sens** :
 * qu'elle reprend ce qu'on lui donne, et qu'elle ne dit rien qu'on ne lui a pas
 * donné.
 *
 * Le calcul est pur : ni base, ni réseau, ni navigateur.
 *
 *   npx payload run scripts/verifier-faq.ts
 */
import { enLettres, questionsFrequentes, type EntreeFaq, type QuestionFaq } from "@/lib/faq";
import { formatPrix } from "@/lib/format";
import { MOYENS_AFFICHES } from "@/lib/moyens";
import { JOURS_DE_GRACE } from "@/lib/places";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

/** Tout le texte d'une FAQ, tel qu'un visiteur le lirait. */
const aPlat = (qs: QuestionFaq[]) =>
  qs
    .flatMap((q) => [
      q.question,
      ...q.reponse.flatMap((b) =>
        b.type === "texte"
          ? [b.texte]
          : b.type === "liste"
            ? b.items
            : b.liens.map((l) => l.libelle),
      ),
    ])
    .join("\n");
const reponse = (qs: QuestionFaq[], id: string) =>
  aPlat(qs.filter((q) => q.id === id)).replace(/\s+/g, " ");

const MAINTENANT = new Date("2026-09-14T10:00:00Z");

const base: EntreeFaq = {
  programmes: [
    { titre: "Directeur Administratif et Financier", dureeHeures: 32 },
    {
      titre: "Préparation à la certification PMP®",
      dureeHeures: 35,
      certification: "PMP® — Project Management Institute",
    },
  ],
  sessions: [
    { mode: "visio", debut: "2026-10-03T09:00:00.000Z", fuseau: "UTC" },
    { mode: "visio", debut: "2026-10-03T13:00:00.000Z", fuseau: "UTC" },
  ],
  tarifs: {
    prixComptantCentimes: 42300,
    devise: "EUR",
    plans: [
      {
        code: "P1",
        libelle: "Paiement comptant (1 tranche)",
        totalCentimes: 42300,
        echeancesCentimes: [42300],
        conditions: "",
      },
      {
        code: "P2",
        libelle: "2 tranches",
        totalCentimes: 44800,
        echeancesCentimes: [22400, 22400],
        conditions: "",
      },
      {
        code: "P3",
        libelle: "3 tranches",
        totalCentimes: 47000,
        echeancesCentimes: [17000, 15000, 15000],
        conditions: "",
      },
    ],
    moyensPaiement: ["Western Union", "Ria", "MoneyGram"],
  },
  moyens: MOYENS_AFFICHES,
  joursTenue: JOURS_DE_GRACE,
  whatsapp: { url: "https://wa.me/212669303467", numeroAffiche: "+212 6 69 30 34 67" },
  email: "contact@clixa.africa",
  maintenant: MAINTENANT,
};

console.log("\n▸ Elle reprend ce qu'on lui donne\n");

const faq = questionsFrequentes(base);
const tout = aPlat(faq).replace(/\s+/g, " ");
const prix = (c: number) => formatPrix(c, "EUR").replace(/\s+/g, " ");

dire(
  "le prix comptant est celui du barème, formaté comme la fiche",
  reponse(faq, "prix").includes(prix(42300)),
  prix(42300),
);
dire(
  "chaque plan échelonné et chacune de ses échéances",
  [44800, 22400, 47000, 17000, 15000].every((c) => reponse(faq, "prix").includes(prix(c))),
);
dire(
  "le comptant n'est pas relisté parmi les plans échelonnés",
  !reponse(faq, "prix").includes("1 tranche"),
);
dire(
  "l'écart des paiements échelonnés est annoncé",
  /coûte un peu plus cher/.test(reponse(faq, "prix")),
);

/*
  ⚠️ La liste des moyens est celle du code, jamais celle du CMS. Le CMS porte
  encore « Western Union · Ria · MoneyGram » seul : l'assistant l'a récitée et a
  dit à un prospect qu'on ne prenait pas la carte. La fixture passe exprès
  l'ancienne liste dans `tarifs.moyensPaiement` — elle ne doit pas ressortir.
*/
dire(
  "⚠️ les moyens de paiement sont ceux du code — la carte comprise",
  MOYENS_AFFICHES.every((m) => reponse(faq, "paiement").includes(m)) &&
    reponse(faq, "paiement").includes("Carte bancaire"),
);
dire(
  "la tenue de la place est celle de `lib/places.ts`",
  reponse(faq, "engagement").includes(`tenue ${enLettres(JOURS_DE_GRACE)} jours`),
  `${JOURS_DE_GRACE} jours`,
);
dire(
  "la rentrée unique est dite avec son jour",
  reponse(faq, "rentree").includes("samedi 3 octobre 2026"),
  reponse(faq, "rentree").slice(0, 80),
);
dire(
  "la durée suit les parcours publiés",
  reponse(faq, "format").includes("entre 32 et 35 heures de formation"),
);
dire("le fuseau est celui des sessions", reponse(faq, "horaire").includes("UTC"));
dire(
  "la certification préparée précise que l'examen se passe ailleurs",
  /l'examen PMP® se passe séparément, auprès de l'organisme certificateur : Project Management Institute/.test(
    reponse(faq, "certificat"),
  ),
);
dire(
  "le certificat mène à la page de vérification",
  faq
    .find((q) => q.id === "certificat")
    ?.reponse.some((b) => b.type === "liens" && b.liens.some((l) => l.href === "/verifier")) ===
    true,
);
dire(
  "le contact est celui de `lib/reseaux.ts`",
  reponse(faq, "contact").includes("+212 6 69 30 34 67") &&
    reponse(faq, "contact").includes("contact@clixa.africa"),
);

console.log("\n▸ Elle ne dit rien qu'on ne lui a pas donné\n");

/*
  ⚠️ La moitié qui compte. Ces mots-là ne sont tenus par rien dans le système :
  aucune séance n'est enregistrée pour être revue, aucun taux de réussite n'est
  mesuré, aucune garantie n'est offerte. Un seul d'entre eux, et la FAQ promet
  ce que personne ne délivre.
*/
for (const [mot, pourquoi] of [
  [/replay|rediffusion|revoir les séances/i, "rien ne produit de replays"],
  [
    /taux de réussite|réussir (dès|du premier)|garanti/i,
    "aucun résultat d'examen n'est mesuré ni promis",
  ],
  [
    /code unique de vérification|diplôme d'État|accrédité/i,
    "aucune reconnaissance de ce type n'existe",
  ],
] as const) {
  dire(`jamais « ${mot.source.split("|")[0]} » — ${pourquoi}`, !mot.test(tout));
}
dire(
  "⚠️ Abidjan et Dakar ne sont jamais présentés comme ouverts",
  !/Abidjan|Dakar/.test(tout) || /Abidjan et Dakar ouvriront prochainement/.test(tout),
);

console.log("\n▸ Elle suit quand les données changent\n");

/*
  ── Les témoins ────────────────────────────────────────────────────────────
  Sans eux, une FAQ qui écrirait « 423 € » en dur passerait tous les contrôles
  ci-dessus. On change la source, et la réponse doit changer avec elle.
*/
const autreBareme = questionsFrequentes({
  ...base,
  tarifs: {
    ...base.tarifs,
    prixComptantCentimes: 51000,
    plans: [{ ...base.tarifs.plans[0]!, totalCentimes: 51000, echeancesCentimes: [51000] }],
  },
});
dire(
  "⚠️ un autre barème donne un autre prix",
  reponse(autreBareme, "prix").includes(prix(51000)) &&
    !reponse(autreBareme, "prix").includes(prix(42300)),
);
dire(
  "sans plan échelonné, ni liste vide ni écart annoncé",
  !/plusieurs fois|plus cher/.test(reponse(autreBareme, "prix")),
);

const sansDate = questionsFrequentes({ ...base, sessions: [] });
dire(
  "sans session à venir, elle le dit au lieu d'inventer une date",
  /Aucune date n'est publiée/.test(reponse(sansDate, "rentree")),
);
const passee = questionsFrequentes({ ...base, maintenant: new Date("2026-12-01T00:00:00Z") });
dire(
  "⚠️ une session déjà commencée n'est plus annoncée comme la prochaine",
  /Aucune date n'est publiée/.test(reponse(passee, "rentree")),
);
const deuxDates = questionsFrequentes({
  ...base,
  sessions: [...base.sessions, { mode: "visio", debut: "2027-01-09T09:00:00.000Z", fuseau: "UTC" }],
});
dire(
  "deux rentrées se listent toutes les deux",
  /Plusieurs dates/.test(reponse(deuxDates, "rentree")) &&
    reponse(deuxDates, "rentree").includes("2027"),
);

const avecPresentiel = questionsFrequentes({
  ...base,
  sessions: [
    ...base.sessions,
    {
      mode: "presentiel",
      debut: "2026-11-07T09:00:00.000Z",
      fuseau: "UTC",
      ville: "Agadir",
      pays: "Maroc",
    },
  ],
});
dire(
  "une session en présentiel change la réponse sur le présentiel",
  /Oui, à Agadir, Maroc/.test(reponse(avecPresentiel, "presentiel")),
);
dire(
  "et la réponse sur le format cesse de dire « en classe virtuelle » partout",
  /Selon les sessions/.test(reponse(avecPresentiel, "format")),
);

console.log(manques === 0 ? "\n  ✓ Tout tient.\n" : `\n  ✗ ${manques} contrôle(s) au rouge.\n`);
if (manques > 0) process.exit(1);
