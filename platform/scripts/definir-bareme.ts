/**
 * Écrit le barème du catalogue.
 *
 * Les douze parcours partagent le même tarif : la direction l'a fixé une fois.
 * Payer en plusieurs fois coûte plus cher — 423 € comptant, 470 € en trois
 * fois — et l'écart est affiché sur la fiche.
 *
 *   npx payload run scripts/definir-bareme.ts
 *
 * Le script écrase le barème existant. Les montants viennent du tableau
 * « Barèmes et plans de paiement » transmis par la direction.
 *
 * ⚠️ Il vise la base pointée par DATABASE_URL.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });

await payload.updateGlobal({
  slug: "tarifs",
  locale: "fr",
  overrideAccess: true,
  data: {
    prixComptant: 423,
    devise: "EUR",
    plans: [
      {
        code: "P1",
        libelle: "1 tranche",
        total: 423,
        echeances: [{ montant: 423 }],
        conditions: "Paiement intégral à la signature",
      },
      {
        code: "P2",
        libelle: "2 tranches",
        total: 448,
        echeances: [{ montant: 224 }, { montant: 224 }],
        conditions: "1re échéance à la signature ; 2e avant la 5e séance",
      },
      {
        code: "P3",
        libelle: "3 tranches",
        total: 470,
        echeances: [{ montant: 170 }, { montant: 150 }, { montant: 150 }],
        conditions: "1re échéance à la signature ; 2e avant la 4e séance ; 3e avant la 7e séance",
      },
    ],
    moyensPaiement: [{ valeur: "Western Union" }, { valeur: "Ria" }, { valeur: "MoneyGram" }],
  },
});

const t = await payload.findGlobal({ slug: "tarifs", locale: "fr", overrideAccess: true });
console.log(`\n  ${t.prixComptant} ${t.devise} comptant`);
for (const p of t.plans ?? []) {
  const suite = (p.echeances ?? []).map((e) => `${e.montant}`).join(" + ");
  console.log(
    `  ${p.code}  ${String(p.libelle).padEnd(12)} ${String(p.total).padStart(4)} = ${suite}`,
  );
}
console.log(`  moyens : ${(t.moyensPaiement ?? []).map((m) => m.valeur).join(", ")}\n`);

process.exit(0);
