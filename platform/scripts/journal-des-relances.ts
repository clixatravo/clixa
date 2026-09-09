/**
 * Ce que la tâche de 8 h enverra, dossier par dossier, jour par jour.
 *
 * ⚠️ **Il ne fait que lire.** Aucune écriture, aucun envoi : il rejoue les
 * règles de `lib/places.ts` sur les dossiers réels et imprime ce qui partirait.
 *
 * ── Pourquoi ────────────────────────────────────────────────────────────────
 * La tâche quotidienne est le seul endroit du système où quelque chose change
 * sans que personne ait agi — des courriels partent, des places retournent au
 * catalogue. On ne peut donc pas l'éprouver « après coup » : le tort est fait,
 * et il est fait à des gens qui ont laissé leur numéro sur une annonce.
 *
 * Les scripts de vérification fabriquent des dossiers ; celui-ci regarde ceux
 * qui existent. C'est la même différence qu'entre `verifier-horaires.ts` et son
 * unique contrôle sur les vraies sessions — le seul qui aurait attrapé les
 * ressources humaines enregistrées à midi.
 *
 *   cd platform && set -a && . ./.env.prod && set +a \
 *     && npx payload run scripts/journal-des-relances.ts [jours]
 */
import { getPayload } from "payload";
import config from "@payload-config";
import {
  JOURS_DE_GRACE,
  SEUILS_DE_RAPPEL,
  departDeLaTenue,
  finDeLaPlace,
  finDeLaTenue,
} from "@/lib/places";

const payload = await getPayload({ config });

const JOURS = Number(process.argv[2] ?? 10);
const MS = 86_400_000;
const JOUR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const COURT = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });

const { docs } = await payload.find({
  collection: "inscriptions",
  limit: 500,
  depth: 0,
  sort: "createdAt",
  overrideAccess: true,
});

const vivants = docs.filter((d) => d.statut !== "annulee" && d.statut !== "terminee");

console.log(`\n  ${docs.length} dossier(s), dont ${vivants.length} vivant(s)`);
console.log(`  Projection sur ${JOURS} jours, au passage de 8 h UTC\n`);

/**
 * Ce que la tâche ferait de ce dossier, à cette date.
 *
 * ⚠️ Les trois conditions sont celles de la route, dans le même ordre — un
 * dossier déjà annoncé (`placeRappeleeLe`) ne l'est pas deux fois, et sa place
 * ne part qu'au terme du battement.
 */
type Fait = { quoi: string; ligne: string };

const faits: { jour: number; fait: Fait }[] = [];

/*
  ⚠️ **L'annonce s'écrit dans la projection, sinon elle ment.** Le premier jet
  relisait `placeRappeleeLe` tel qu'il est aujourd'hui — c'est-à-dire vide — à
  chacun des douze jours projetés, et concluait donc que plus aucune place ne
  partirait jamais. Il affichait onze « place NON rendue » qui n'étaient qu'un
  défaut de son propre calcul. Une projection qui ne rejoue pas les écritures
  de la tâche ne projette rien.
*/
const annoncee = new Map<string, Date>();
/*
  ⚠️ Et le dernier seuil de rappel déjà servi, repris de la base puis rejoué —
  même raison : sans cela la projection annoncerait trois rappels à quelqu'un
  qui en a déjà reçu deux.
*/
const rappele = new Map<string, number>();
for (const d of vivants) {
  if (typeof d.dernierRappelAvantTerme === "number") {
    rappele.set(String(d.reference), d.dernierRappelAvantTerme);
  }
}
for (const d of vivants) {
  if (d.placeRappeleeLe) annoncee.set(String(d.reference), new Date(d.placeRappeleeLe));
}

for (let j = 0; j <= JOURS; j += 1) {
  const maintenant = new Date(Date.now() + j * MS);
  maintenant.setUTCHours(8, 0, 0, 0);

  for (const d of vivants) {
    const depart = departDeLaTenue(d as never);
    if (!depart) continue;

    const reference = String(d.reference);
    const qui = `${reference} · ${String(d.apprenantNom).slice(0, 22)}`;
    const terme = finDeLaTenue(depart.toISOString());

    /*
      ⚠️ Les rappels d'avant le terme, aux mêmes conditions que la tâche : le
      plus grand seuil encore atteint qu'on n'a pas déjà servi, un seul par
      passage. Une pré-inscription seule, jamais un contrat signé.
    */
    if (!d.contratSigneLe && !annoncee.has(reference) && terme > maintenant) {
      const restants = Math.ceil((terme.getTime() - maintenant.getTime()) / MS);
      const dejaFait = rappele.get(reference);
      const seuil = SEUILS_DE_RAPPEL.find(
        (x) => restants <= x && (dejaFait === undefined || x < dejaFait),
      );
      if (seuil !== undefined) {
        rappele.set(reference, seuil);
        faits.push({
          jour: j,
          fait: {
            quoi: "courriel",
            ligne: `${qui} — « il vous reste ${restants} jour(s) pour confirmer » (terme : ${JOUR.format(terme)})`,
          },
        });
      }
    }

    /* L'annonce part au premier passage qui suit le terme, et une seule fois. */
    if (!annoncee.has(reference) && terme <= maintenant) {
      annoncee.set(reference, maintenant);
      faits.push({
        jour: j,
        fait: {
          quoi: "courriel",
          ligne: `${qui} — « votre place n'est pas encore repartie » (terme : ${JOUR.format(terme)})`,
        },
      });
    }

    /*
      La place ne repart que deux jours après l'annonce — jamais dans le même
      passage, si tardive que soit l'annonce.
    */
    const rendue = finDeLaPlace({ ...d, placeRappeleeLe: annoncee.get(reference) } as never);
    if (rendue && rendue <= maintenant && rendue > new Date(maintenant.getTime() - MS)) {
      faits.push({
        jour: j,
        fait: { quoi: "place", ligne: `${qui} — sa place retourne au catalogue` },
      });
    }
  }
}

for (let j = 0; j <= JOURS; j += 1) {
  const duJour = faits.filter((f) => f.jour === j);
  if (duJour.length === 0) continue;

  const quand = new Date(Date.now() + j * MS);
  console.log(`  ── ${COURT.format(quand)}${j === 0 ? " (aujourd'hui)" : ""} ───────────────`);
  for (const { fait } of duJour) {
    const marque = { courriel: "✉ ", place: "↩ ", bloque: "⚠ " }[fait.quoi] ?? "  ";
    console.log(`     ${marque}${fait.ligne}`);
  }
  console.log("");
}

if (faits.length === 0) console.log("  Rien ne partira dans cette fenêtre.\n");

/*
  ── ⚠️ Les dossiers déjà en retard sur leur annonce ─────────────────────────
  Un dossier dont le terme est passé *avant* la fenêtre n'apparaît nulle part
  ci-dessus : son annonce aurait dû partir un jour qu'on ne projette pas. S'il
  n'a pas de `placeRappeleeLe`, c'est qu'elle n'est jamais partie — et sa place
  est donc tenue indéfiniment, ce que rien d'autre ne dit.
*/
const maintenant = new Date();
const oublies = vivants.filter((d) => {
  const depart = departDeLaTenue(d as never);
  if (!depart) return false;
  return !d.placeRappeleeLe && finDeLaTenue(depart.toISOString()) < maintenant;
});

if (oublies.length > 0) {
  console.log(`  ⚠️ ${oublies.length} dossier(s) au terme dépassé sans annonce partie :`);
  for (const d of oublies) {
    const depart = departDeLaTenue(d as never)!;
    const terme = finDeLaTenue(depart.toISOString());
    const retard = Math.floor((maintenant.getTime() - terme.getTime()) / MS);
    console.log(
      `     ${d.reference} · ${d.apprenantNom} — terme le ${JOUR.format(terme)} (${retard} j)`,
    );
  }
  console.log(
    `\n     Leur place est tenue tant que rien n'est parti : c'est la garde, pas\n` +
      `     un oubli. Le prochain passage de 8 h les prendra.\n`,
  );
}

console.log(`  (grâce : ${JOURS_DE_GRACE} j — lecture seule, rien n'a été écrit)\n`);
process.exit(0);
