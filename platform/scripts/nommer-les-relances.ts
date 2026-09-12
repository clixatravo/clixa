/**
 * Rétablir le nom de l'auteur sur les lignes de journal écrites avant le
 * 12 septembre 2026.
 *
 * ── ⚠️ Pourquoi un script, et pas un crochet ────────────────────────────────
 * Depuis le 12 septembre, chaque écriture du journal recopie le nom de qui
 * agit : la relation seule n'est lisible que par la direction, et
 * l'administration lisait « un collègue » sur une ligne écrite par le
 * directeur. Les lignes déjà en base, elles, n'ont que l'identifiant — et
 * personne ne les réécrira jamais tout seul.
 *
 * Le script les nomme, une fois. Il lit le compte par l'API locale, donc sans
 * la restriction de `comptesLecture` : c'est ici, et seulement ici, qu'on peut
 * résoudre ce que l'écran ne peut pas.
 *
 * ⚠️ **Sans `ECRIRE=1`, il montre et s'arrête.** C'est de la donnée client
 * réelle, et un nom posé de travers se lirait comme une trace d'une personne
 * qui n'a rien fait. Même prudence que `corriger-pays.ts`.
 *
 *   npx payload run scripts/nommer-les-relances.ts
 *   set -a && . ./.env.prod && set +a && ECRIRE=1 npx payload run scripts/nommer-les-relances.ts
 *
 * Rejouable : une ligne déjà nommée n'est pas retouchée.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { libelleDuCompte } from "@/lib/equipe";

const payload = await getPayload({ config });

const { docs: comptes } = await payload.find({
  collection: "utilisateurs",
  limit: 200,
  depth: 0,
  overrideAccess: true,
});
const nomDe = new Map(comptes.map((c) => [String(c.id), libelleDuCompte(c as never)]));

const { docs } = await payload.find({
  collection: "inscriptions",
  limit: 500,
  depth: 0,
  overrideAccess: true,
});

interface Ligne {
  quoi?: string | null;
  le?: string | null;
  par?: unknown;
  parNom?: string | null;
}

let aNommer = 0;
let sansCompte = 0;
const touches: { id: number | string; lignes: Ligne[] }[] = [];

for (const d of docs) {
  const journal = (d.echanges ?? []) as Ligne[];
  if (journal.length === 0) continue;

  let change = false;
  const suivantes = journal.map((l) => {
    if (l.parNom) return l;
    const id = l.par && typeof l.par === "object" ? (l.par as { id?: unknown }).id : l.par;
    if (id === undefined || id === null) return l; // la tâche de 8 h : rien à nommer
    const nom = nomDe.get(String(id));
    if (!nom) {
      /*
        ⚠️ Le compte n'existe plus, ou n'a rien de nommable. On s'abstient : un
        « Utilisateur 3 » posé là se lirait comme un nom, et l'écran dit déjà
        « un collègue », ce qui est au moins vrai.
      */
      sansCompte += 1;
      return l;
    }
    change = true;
    aNommer += 1;
    return { ...l, parNom: nom };
  });

  if (change) touches.push({ id: d.id, lignes: suivantes });
}

console.log(`\n  ${docs.length} dossier(s) lus · ${aNommer} ligne(s) à nommer`);
if (sansCompte > 0)
  console.log(
    `  ⚠️ ${sansCompte} ligne(s) dont le compte est introuvable — laissées telles quelles`,
  );
for (const t of touches) {
  const noms = t.lignes.filter((l) => l.parNom).map((l) => `${l.quoi} → ${l.parNom}`);
  console.log(`    dossier ${t.id} : ${noms.join(", ")}`);
}

if (touches.length === 0) {
  console.log("\n  Rien à faire.\n");
  process.exit(0);
}

if (!process.env.ECRIRE) {
  console.log("\n  Rien n'a été écrit. Relancer avec ECRIRE=1 pour appliquer.\n");
  process.exit(0);
}

for (const t of touches) {
  /*
    ⚠️ Le tableau part **en entier** : Payload remplace la liste, il ne la
    complète pas. Un chemin pointé y resterait une clef littérale que rien ne
    lirait — le défaut du bouton « Contrat vérifié » du 30 août 2026.
  */
  await payload.update({
    collection: "inscriptions",
    id: t.id,
    overrideAccess: true,
    data: { echanges: t.lignes } as never,
  });
}

console.log(`\n  ${touches.length} dossier(s) mis à jour.\n`);
process.exit(0);
