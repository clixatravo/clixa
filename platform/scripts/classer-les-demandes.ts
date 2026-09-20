/**
 * Classer « sans suite » les demandes de rappel de l'ancien formulaire public.
 *
 *   npx payload run scripts/classer-les-demandes.ts            # montre, n'écrit rien
 *   ECRIRE=1 npx payload run scripts/classer-les-demandes.ts   # écrit
 *
 * ── Pourquoi ────────────────────────────────────────────────────────────────
 * Décision de la direction, le 20 septembre 2026 : « diir lihom sans suite dok
 * 36 demandes ». Le formulaire public de `/contact` a été retiré le
 * 18 septembre ; il n'en arrivera plus. Restaient trente-six lignes au statut
 * « nouvelle » — toutes déposées avant le changement, **aucune jamais traitée**,
 * quatre seulement ayant fini par s'inscrire.
 *
 * Tant qu'elles portent « nouvelle », la vignette du tableau de bord annonce
 * trente-six appels à passer. C'est le défaut que ce bandeau existe pour
 * éviter : il dit **ce qu'il reste à faire aujourd'hui**, et trente-six lignes
 * mortes le vident de son sens.
 *
 * ── ⚠️ Ce que le script refuse de toucher ───────────────────────────────────
 * **Les demandes rattachées à un dossier.** Depuis le 18 septembre, une demande
 * ne naît que du bouton « Être rappelé par un conseiller », sur la page d'un
 * dossier — elle porte donc `dossier`. Celles-là sont vivantes : quelqu'un
 * attend un appel, maintenant.
 *
 * Le filtre est `dossier: { exists: false }`, et ce n'est pas une commodité :
 * c'est ce qui rend le script **rejouable sans dégât**. Balayer « toutes les
 * nouvelles » marcherait aujourd'hui — il n'y en a pas encore de neuves — et
 * enterrerait demain une demande déposée il y a cinq minutes. Un script qu'on
 * garde doit être écrit pour le jour où les données auront changé.
 *
 * ⚠️ **La note s'ajoute, elle n'écrase pas.** `notes` est le champ où l'équipe
 * écrit ce qu'elle a compris d'un appel ; le remplacer effacerait son travail
 * sans que rien ne le dise.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const ECRIRE = process.env.ECRIRE === "1";
const MARQUE = "Classée sans suite le 20 septembre 2026 : formulaire public retiré, demande jamais traitée.";

const payload = await getPayload({ config });

const { docs, totalDocs } = await payload.find({
  collection: "demandes-rappel",
  where: { and: [{ statut: { equals: "nouvelle" } }, { dossier: { exists: false } }] },
  limit: 500,
  depth: 0,
  overrideAccess: true,
  sort: "createdAt",
});

/* Le témoin : ce que le script laisse volontairement tranquille. */
const vivantes = await payload.count({
  collection: "demandes-rappel",
  where: { and: [{ statut: { equals: "nouvelle" } }, { dossier: { exists: true } }] },
  overrideAccess: true,
});

console.log(`\n▸ À classer sans suite : ${totalDocs}\n`);
for (const d of docs) {
  console.log(
    `   ${String(d.createdAt).slice(0, 10)} · ${String(d.nom ?? "—").padEnd(28).slice(0, 28)} · ${d.pays ?? "—"}`,
  );
}

console.log(`\n▸ Laissées intactes (rattachées à un dossier) : ${vivantes.totalDocs}`);
console.log("   Ce sont les demandes vivantes — quelqu'un attend un appel.\n");

if (!ECRIRE) {
  console.log("Rien n'a été écrit. Relancer avec ECRIRE=1 pour appliquer.\n");
  process.exit(0);
}

let faites = 0;
for (const d of docs) {
  const notes = String(d.notes ?? "").trim();
  await payload.update({
    collection: "demandes-rappel",
    id: d.id,
    overrideAccess: true,
    data: {
      statut: "sans-suite",
      notes: notes ? `${notes}\n\n${MARQUE}` : MARQUE,
    },
  });
  faites += 1;
}

const restant = await payload.count({
  collection: "demandes-rappel",
  where: { statut: { equals: "nouvelle" } },
  overrideAccess: true,
});

console.log(`✓ ${faites} demande(s) classée(s) sans suite.`);
console.log(`  Restant au statut « nouvelle » : ${restant.totalDocs}\n`);
