/**
 * Corriger un pays illisible, en le dérivant du numéro — jamais en l'inventant.
 *
 * ── ⚠️ Pourquoi ce script existe ────────────────────────────────────────────
 * Le champ « Pays » du formulaire était libre, posé juste sous le numéro
 * WhatsApp. Un dossier de production porte `22222628` pour un numéro en
 * `+22222222628` : un morceau de son propre numéro, recopié dans la mauvaise
 * case. Ce n'est pas une faute de la personne — c'est un formulaire qui posait
 * deux fois la même question, l'une sous l'autre.
 *
 * La saisie est corrigée depuis le 8 septembre 2026 (`lib/pays.ts`, une liste
 * et une porte de sortie). Restait la donnée déjà écrite.
 *
 * ── ⚠️ Ce qu'il ne fait pas : deviner ───────────────────────────────────────
 * Il ne choisit pas un pays « probable ». Il applique la règle que la route
 * applique déjà elle-même quand la saisie ne laisse rien de lisible :
 * `paysDeLIndicatif(whatsapp)`. Pour le dossier ci-dessus, `+222` rend
 * « Mauritanie » — un fait tiré du numéro que la personne a donné, pas une
 * supposition sur elle.
 *
 * Un numéro dont l'indicatif n'est pas dans la table rend « À préciser », et le
 * script **s'abstient** plutôt que d'écrire cela : mieux vaut un pays faux que
 * l'équipe voit qu'un pays vague qu'elle croira vérifié.
 *
 * ── ⚠️ Il n'écrit rien sans qu'on le lui demande ────────────────────────────
 * Sans `ECRIRE=1`, il montre ce qu'il ferait et s'arrête. C'est de la donnée
 * client réelle : on la lit avant de la toucher.
 *
 *   # voir, sans rien changer
 *   set -a && . ./.env.prod && set +a && npx payload run scripts/corriger-pays.ts
 *
 *   # corriger
 *   set -a && . ./.env.prod && set +a && ECRIRE=1 npx payload run scripts/corriger-pays.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { paysDeLIndicatif } from "@/lib/indicatifs";
import { paysPlausible } from "@/lib/pays";

const payload = await getPayload({ config });
const ecrire = process.env.ECRIRE === "1";

const { docs } = await payload.find({
  collection: "inscriptions",
  limit: 500,
  depth: 0,
  sort: "createdAt",
  overrideAccess: true,
});

const aCorriger = docs.filter((d) => !paysPlausible(d.apprenantPays));

console.log(`\n  ${docs.length} dossier(s) · ${aCorriger.length} au pays illisible\n`);

if (aCorriger.length === 0) {
  console.log("  Rien à corriger.\n");
  process.exit(0);
}

let corriges = 0;
let abstentions = 0;

for (const d of aCorriger) {
  const derive = paysDeLIndicatif(String(d.apprenantWhatsapp ?? ""));

  /*
    ⚠️ « À préciser » est ce que `paysDeLIndicatif` rend quand l'indicatif n'est
    pas dans la table. L'écrire donnerait à l'équipe une valeur qui *ressemble*
    à une donnée renseignée. On préfère laisser la faute visible.
  */
  if (!paysPlausible(derive) || derive === "À préciser") {
    console.log(
      `  ⊘ ${d.reference} · "${d.apprenantPays}" · ${d.apprenantWhatsapp} — ` +
        `indicatif hors table, laissé tel quel`,
    );
    abstentions += 1;
    continue;
  }

  console.log(
    `  ${ecrire ? "✎" : "·"} ${d.reference} · "${d.apprenantPays}" → "${derive}" ` +
      `(depuis ${d.apprenantWhatsapp})`,
  );

  if (ecrire) {
    await payload.update({
      collection: "inscriptions",
      id: d.id,
      overrideAccess: true,
      data: { apprenantPays: derive },
    });
    corriges += 1;
  }
}

console.log(
  ecrire
    ? `\n  ${corriges} corrigé(s), ${abstentions} laissé(s) tel(s) quel(s).\n`
    : `\n  Rien n'a été écrit. Relancer avec ECRIRE=1 pour appliquer.\n`,
);
process.exit(0);
