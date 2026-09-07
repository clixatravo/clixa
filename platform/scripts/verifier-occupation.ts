/**
 * Ce que la liste des sessions dit du remplissage.
 *
 * ── ⚠️ Le défaut ────────────────────────────────────────────────────────────
 * La liste ne portait que « Places au total » : la capacité, 30 sur les douze
 * sessions, et 30 quoi qu'il arrive. La direction l'a lue le 7 septembre 2026
 * et en a conclu que les places ne descendaient pas — quand le parcours porté
 * par l'annonce Facebook en avait 22 de prises sur 30.
 *
 * Rien n'était cassé. Le décompte était exact, et le site public affichait bien
 * « 8 places » sur la fiche : c'est l'écran de l'équipe qui ne montrait que
 * l'invariant. Un chiffre juste au mauvais endroit se lit comme un chiffre faux.
 *
 * ⚠️ **Le script regarde aussi les vraies sessions**, pas seulement celles
 * qu'il imagine — c'est le seul de ses contrôles qui aurait attrapé la cohorte
 * réelle, comme l'unique contrôle de `verifier-horaires.ts` sur les sessions en
 * base a attrapé les ressources humaines enregistrées à midi.
 *
 *   npx payload run scripts/verifier-occupation.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { occupationDeLaSession, SEUIL_TENSION } from "@/lib/occupation";
import { occupeUnePlace } from "@/lib/places";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  Le remplissage d'une session\n");

/* ── Le calcul, sur ses cas limites ───────────────────────────────────────── */

const cohorte = occupationDeLaSession({ capacite: 30, placesReservees: 22 });
dire(
  "⚠️ la cohorte de l'annonce se lit « 22 / 30 »",
  cohorte.compte === "22 / 30" && cohorte.restantes === 8,
  `${cohorte.compte} · ${cohorte.libelle}`,
);
dire("et son ton reste ordinaire à huit places", cohorte.ton === "ouvert");

const pleine = occupationDeLaSession({ capacite: 30, placesReservees: 30 });
dire(
  "une session pleine le dit, et ne rend pas un négatif",
  pleine.libelle === "Complet" && pleine.restantes === 0,
);

/*
  ⚠️ Un dépassement n'est pas impossible : le crochet recompte, mais une reprise
  en base ou une capacité abaissée à la main peut laisser plus de dossiers que
  de places. « -3 restantes » se lirait comme un défaut d'affichage ; « Complet »
  est ce qui est vrai.
*/
const debordee = occupationDeLaSession({ capacite: 30, placesReservees: 34 });
dire(
  "⚠️ un dépassement se lit « Complet », jamais « -4 restantes »",
  debordee.restantes === 0 && debordee.libelle === "Complet",
  debordee.libelle,
);

const tendue = occupationDeLaSession({ capacite: 30, placesReservees: 30 - SEUIL_TENSION });
dire("le seuil de tension est atteint pile au seuil", tendue.ton === "tension");
dire(
  "une place de plus et le ton redevient ordinaire",
  occupationDeLaSession({ capacite: 30, placesReservees: 30 - SEUIL_TENSION - 1 }).ton === "ouvert",
);

const vide = occupationDeLaSession({ capacite: 30, placesReservees: 0 });
dire("une session sans inscription le dit en toutes lettres", vide.ton === "vide");

/*
  ⚠️ **Une capacité nulle n'est pas une session complète.** Elle n'existe pas
  commercialement — l'épreuve du tunnel l'a déjà appris à ses dépens : remplir
  les places éprouve quelque chose, mettre la capacité à zéro n'éprouve rien.
  Dire « Complet » ici enverrait l'équipe ouvrir une cohorte de remplacement.
*/
dire(
  "⚠️ une capacité nulle se tait, elle n'annonce pas « Complet »",
  occupationDeLaSession({ capacite: 0, placesReservees: 0 }).ton === "inconnu",
);
dire(
  "et une capacité absente aussi",
  occupationDeLaSession({ capacite: null, placesReservees: 3 }).ton === "inconnu",
);

/*
  ⚠️ **Postgres rend `numeric` en texte par une porte et en nombre par une
  autre** — le journal le documente pour `places_reservees`. Une cellule qui
  concatènerait au lieu d'additionner afficherait « 30 - 22 » ou « 322 ».
*/
const texte = occupationDeLaSession({
  capacite: "30" as unknown as number,
  placesReservees: "22" as unknown as number,
});
dire(
  "⚠️ des valeurs rendues en texte comptent pareil",
  texte.compte === "22 / 30" && texte.restantes === 8,
  `${texte.compte} · ${texte.restantes} restantes`,
);

/* ── Et les vraies sessions ───────────────────────────────────────────────── */

const payload = await getPayload({ config });

const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 100,
  depth: 0,
  sort: "id",
  overrideAccess: true,
  where: { fin: { greater_than: new Date().toISOString() } },
});

if (sessions.length === 0) {
  console.log("\n  Aucune session à venir : rien à confronter.\n");
} else {
  /*
    ⚠️ **Ce que la colonne affiche doit être ce que la base compte.** Les deux
    peuvent diverger sans bruit : `placesReservees` est une colonne écrite par
    un crochet, et rien ne la recalcule quand le temps passe. Si elle dérive, la
    liste de l'équipe et la fiche du visiteur annoncent deux nombres différents
    pour la même cohorte — et c'est le visiteur qui a raison, puisque le sien se
    calcule.
  */
  let ecarts = 0;
  let details = "";
  for (const s of sessions) {
    const { totalDocs } = await payload.count({
      collection: "inscriptions",
      overrideAccess: true,
      where: { and: [{ session: { equals: s.id } }, occupeUnePlace()] },
    });
    const affiche = occupationDeLaSession(s as never);
    const attendu = occupationDeLaSession({ capacite: s.capacite, placesReservees: totalDocs });
    if (affiche.compte !== attendu.compte) {
      ecarts += 1;
      details += `${s.reference} : liste ${affiche.compte}, base ${attendu.compte} · `;
    }
  }
  dire(
    `⚠️ les ${sessions.length} sessions affichent ce que la base compte`,
    ecarts === 0,
    details || "aucun écart",
  );

  /*
    ⚠️ **Ce qui suit s'imprime, il ne se contrôle pas.** Un premier jet exigeait
    « au moins une session montre un remplissage » : rouge sur `dev`, que le
    ménage des épreuves vide à chaque série, vert sur la production. Un contrôle
    qui dépend de la base qu'on vise mesure les données, pas le code — c'est le
    revers de la leçon de `verifier-veille.ts`, dont le premier jet se félicitait
    de trois « 0 dossier » sur une branche vide.

    ⚠️ Et le contrôle ci-dessus tombe dans le même piège à moitié : sur une base
    vide, « liste 0 / 30, base 0 / 30 » est vrai partout et ne prouve rien. Il ne
    vaut que lancé contre la production, ce que la ligne d'en-tête rappelle.
  */
  const occupees = sessions
    .map((s) => ({ s, o: occupationDeLaSession(s as never) }))
    .filter(({ o }) => o.restantes < Number(s_capacite(o)))
    .filter(({ o }) => o.ton !== "vide" && o.ton !== "inconnu");

  console.log(
    occupees.length > 0
      ? `\n  Remplissage réel : ${occupees.map(({ s, o }) => `${String(s.reference).slice(0, 28)} ${o.compte}`).join(" · ")}`
      : "\n  (aucune session n'a d'inscription sur cette base)",
  );
}

/** La capacité relue depuis le compte affiché — « 22 / 30 » rend 30. */
function s_capacite(o: { compte: string }): number {
  return Number(o.compte.split(" / ")[1] ?? Number.NaN);
}

console.log(manques === 0 ? "\n  La liste montre ce qui bouge.\n" : `\n  ${manques} manque(s).\n`);
process.exit(manques === 0 ? 0 : 1);
