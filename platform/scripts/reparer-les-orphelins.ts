import { getPayload } from "payload";
import config from "@payload-config";

/*
  Rendre son dossier à qui n'en a plus aucun de vivant.

  ## Ce qui s'est passé, mesuré le 24 septembre 2026

  Le formulaire de pré-inscription n'avait aucune garde contre le double
  envoi : un clic de trop créait deux dossiers à quelques centaines de
  millisecondes d'écart. La réconciliation d'`api/inscription` fait alors ce
  qu'elle doit — le plus petit identifiant gagne, les autres s'annulent — et
  elle ne s'annule **jamais** sans avoir lu en base un dossier commité, non
  annulé, d'identifiant plus petit.

  Puis les doublons ont été supprimés depuis /admin. Sur les 41 dossiers
  annulés, **31 n'ont plus de gagnant** : c'est le vivant qui est parti, et
  l'annulé qui est resté. La liste se range du plus récent au plus ancien
  (`defaultSort: "-createdAt"`), si bien que le doublon annulé s'affiche
  **au-dessus** du vrai dossier — cocher « celui du dessous » supprime le bon.

  Onze adresses n'ont plus **aucun** dossier vivant. Ces personnes ont reçu
  une confirmation, elles se croient inscrites, et elles ne le sont pas.

  ## Ce que ce script fait

  Pour chaque adresse dont tous les dossiers sont annulés, il rend au plus
  ancien (le plus petit identifiant, celui qui avait gagné) le statut
  « demandée ». Il ne crée rien, ne supprime rien, n'écrit sur aucune autre
  adresse.

  ⚠️ **Il rend aussi la place**, par le crochet `recompter` : c'est voulu.
  Ces personnes occupaient une place jusqu'à ce qu'on la leur retire sans le
  savoir.

  ⚠️ **Une adresse qui n'a plus une seule ligne est hors de portée.** On ne
  peut pas restaurer ce qui n'existe plus ; le script la nomme, et c'est à
  l'équipe de reprendre contact.

  ⚠️ **Aucun courriel ne part.** Vérifié avant d'écrire : `Inscriptions.ts`
  ne notifie que sur `contratVerifieLe`, `coordonneesEnvoyeesLe`, le
  certificat et les échéances réglées — jamais sur un retour à « demandée ».
  Onze messages partis d'un script seraient la pire façon d'apprendre le
  contraire.

  Sans ECRIRE=1, il montre et s'arrête. C'est de la donnée client réelle.

    cd platform && set -a && . ./.env.prod && set +a \
      && npx payload run scripts/reparer-les-orphelins.ts
*/

const ECRIRE = process.env.ECRIRE === "1";
const payload = await getPayload({ config });

type Ligne = { id: number; reference: string; email: string; statut: string; cree: string };

const { docs } = await payload.find({
  collection: "inscriptions",
  where: { apprenantEmail: { exists: true } },
  sort: "id",
  limit: 2000,
  depth: 0,
  overrideAccess: true,
});

const parAdresse = new Map<string, Ligne[]>();
for (const d of docs) {
  const email = String(d.apprenantEmail ?? "").trim().toLowerCase();
  if (!email) continue;
  const liste = parAdresse.get(email) ?? [];
  liste.push({
    id: Number(d.id),
    reference: String(d.reference ?? ""),
    email,
    statut: String(d.statut ?? ""),
    cree: String(d.createdAt ?? ""),
  });
  parAdresse.set(email, liste);
}

const orphelins: Ligne[] = [];
for (const [, liste] of parAdresse) {
  if (liste.some((l) => l.statut !== "annulee")) continue;
  // Le plus petit identifiant est celui qui avait gagné la réconciliation.
  orphelins.push(liste.reduce((a, b) => (a.id < b.id ? a : b)));
}
orphelins.sort((a, b) => a.id - b.id);

console.log(`${parAdresse.size} adresses, ${docs.length} dossiers.`);
console.log(`${orphelins.length} adresse(s) sans aucun dossier vivant :\n`);
for (const o of orphelins) {
  const total = parAdresse.get(o.email)!.length;
  console.log(
    `  ${o.reference}  #${o.id}  ${o.email}  ` +
      `(${total} dossier${total > 1 ? "s" : ""}, tous annulés)`,
  );
}

if (!orphelins.length) {
  console.log("\nRien à réparer.");
} else if (!ECRIRE) {
  console.log("\nRien écrit. Relancer avec ECRIRE=1 pour rendre ces dossiers.");
} else {
  console.log("");
  let faits = 0;
  for (const o of orphelins) {
    await payload.update({
      collection: "inscriptions",
      id: o.id,
      overrideAccess: true,
      data: { statut: "demandee" },
    });
    faits++;
    console.log(`  rendu · ${o.reference} · ${o.email}`);
  }

  // Relu, pas supposé : une écriture acceptée n'est pas une écriture juste.
  const { docs: apres } = await payload.find({
    collection: "inscriptions",
    where: { id: { in: orphelins.map((o) => o.id) } },
    sort: "id",
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });
  const restes = apres.filter((d) => String(d.statut) === "annulee");
  console.log(`\n${faits} dossier(s) rendus · ${restes.length} encore annulé(s) après relecture.`);
}
