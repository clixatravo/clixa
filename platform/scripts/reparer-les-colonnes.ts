/**
 * Rendre aux comptes d'équipe les colonnes qu'ils ne voient plus.
 *
 *   npx payload run scripts/reparer-les-colonnes.ts            # montre, n'écrit rien
 *   ECRIRE=1 npx payload run scripts/reparer-les-colonnes.ts   # écrit
 *
 * ── Le défaut, et pourquoi il ne se voit nulle part ─────────────────────────
 * Signalé par la direction le 21 septembre 2026 : « f compte dyal
 * l'administration ma kaynax les colonnes li zedna ». Elles paraissaient chez
 * elle et pas chez l'autre — ce qui ressemble à un déploiement raté, et n'en
 * est pas un.
 *
 * Payload garde les réglages de liste **par compte**, dans
 * `payload_preferences`. Dès qu'on ouvre le menu « Colonnes » et qu'on touche à
 * quoi que ce soit, il enregistre la liste **telle qu'elle était ce jour-là** —
 * et `defaultColumns`, écrit dans la collection, cesse de s'appliquer à ce
 * compte. Toute colonne ajoutée ensuite lui est invisible.
 *
 * **Mesuré en production** : sur quatre comptes d'équipe, un seul portait une
 * liste figée — `administration@clixa.africa`, trente-sept colonnes gelées. Il
 * lui manquait les trois du profil, **et `suiviPar`** : la colonne « qui mène
 * ce dossier », demandée par la direction le 12 septembre, n'a jamais paru sur
 * le compte à qui la question se pose le plus.
 *
 * ── ⚠️ Ce que le script ne fait pas ─────────────────────────────────────────
 * **Il ne remet pas à zéro.** Effacer la préférence rendrait les colonnes et
 * emporterait le tri choisi et le nombre de lignes par page — un réglage que
 * quelqu'un a posé exprès. On ajoute ce qui manque, à sa place, et l'on ne
 * touche à rien d'autre : ni l'ordre voulu, ni les colonnes volontairement
 * décochées.
 *
 * ⚠️ **La liste de référence est lue dans la collection**, jamais recopiée ici.
 * Une seconde table des colonnes attendues finirait par diverger de celle que
 * /admin applique — et c'est précisément une divergence entre deux comptes qui
 * a produit ce défaut.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { sql } from "drizzle-orm";

const ECRIRE = process.env.ECRIRE === "1";
const payload = await getPayload({ config });

interface Colonne {
  accessor: string;
  active?: boolean;
}

/* La source unique : ce que la collection déclare, à cet instant. */
const attendues =
  (payload.collections.inscriptions.config.admin?.defaultColumns as string[] | undefined) ?? [];

console.log(`\nColonnes déclarées par la collection (${attendues.length}) :`);
console.log(`   ${attendues.join(" · ")}\n`);

const { docs } = await payload.find({
  collection: "payload-preferences",
  where: { key: { equals: "collection-inscriptions" } },
  limit: 100,
  depth: 0,
  overrideAccess: true,
});

let aReparer = 0;

for (const pref of docs) {
  const valeur = (pref as { value?: unknown }).value as
    | { columns?: Colonne[]; [k: string]: unknown }
    | undefined;
  /*
    ⚠️ **`user` doit repartir avec la mise à jour.** Il est obligatoire sur cette
    collection, et une écriture partielle ne le conserve pas : Payload refuse en
    400 « Le champ suivant n'est pas valide : User » — sur un champ qu'on ne
    touche pas. On le relit donc et on le renvoie tel quel.
  */
  const lien = (pref as { user?: { relationTo?: string; value?: unknown } }).user;
  const compte = lien?.value;

  /* Sans `columns`, rien n'est figé : ce compte suit déjà la collection. */
  if (!valeur?.columns || !Array.isArray(valeur.columns)) {
    console.log(`  #${pref.id}  compte ${String(compte)} — rien de figé, il suit la collection`);
    continue;
  }

  const presentes = new Set(valeur.columns.map((c) => c.accessor));
  const manquantes = attendues.filter((a) => !presentes.has(a));

  if (manquantes.length === 0) {
    console.log(`  #${pref.id}  compte ${String(compte)} — figé, mais rien ne manque`);
    continue;
  }

  aReparer += 1;
  console.log(
    `  #${pref.id}  compte ${String(compte)} — ${valeur.columns.length} colonne(s) figée(s), ` +
      `il manque : ${manquantes.join(" · ")}`,
  );

  if (!ECRIRE) continue;

  /*
    ⚠️ **Chaque manquante se pose derrière son voisin de gauche**, celui qui la
    précède dans `defaultColumns` et que la liste figée porte déjà. Les mettre
    toutes à la fin les enverrait après « créé le » et les dernières colonnes
    décochées : présentes, et hors de l'écran — c'est-à-dire inutiles, le défaut
    même qu'on répare.
  */
  const colonnes = [...valeur.columns];
  for (const m of manquantes) {
    const rang = attendues.indexOf(m);
    let ou = 0;
    for (let i = rang - 1; i >= 0; i -= 1) {
      const voisin = colonnes.findIndex((c) => c.accessor === attendues[i]);
      if (voisin !== -1) {
        ou = voisin + 1;
        break;
      }
    }
    colonnes.splice(ou, 0, { accessor: m, active: true });
  }

  /*
    ── ⚠️ Pourquoi `payload.update` ne convient pas ici ──────────────────────
    `payload-preferences` est une collection interne dont `user` est une
    relation polymorphe **obligatoire**. Une mise à jour partielle la perd, et
    Payload refuse en 400 — « Le champ suivant n'est pas valide : User » — sur
    un champ qu'on ne touche pas. La renvoyer telle qu'elle se lit
    (`{ relationTo, value }`) ne suffit pas davantage : le refus est identique.

    On écrit donc la seule colonne concernée, `value`, qui est un `jsonb`. C'est
    le réglage d'écran de Payload, pas une donnée métier : aucun crochet ne s'y
    attache, et rien d'autre de la ligne ne bouge — ni la clef, ni le compte,
    ni les dates.

    ⚠️ **Et la relecture passe par l'API**, pas par SQL : c'est elle qui sert
    /admin. Une écriture que la base accepte et que Payload ne saurait pas
    relire ne réparerait rien.
  */
  await payload.db.drizzle.execute(
    sql`UPDATE payload_preferences SET value = ${JSON.stringify({ ...valeur, columns: colonnes })}::jsonb WHERE id = ${pref.id}`,
  );

  console.log(
    `      → ${colonnes.filter((c) => c.active).length} colonne(s) visible(s), tri et pagination inchangés`,
  );
}

console.log(
  aReparer === 0
    ? "\nRien à réparer : aucun compte ne manque de colonne.\n"
    : ECRIRE
      ? `\n✓ ${aReparer} compte(s) réparé(s).\n`
      : `\n${aReparer} compte(s) à réparer. Relancer avec ECRIRE=1.\n`,
);
