/**
 * Ce que le tableau de supervision dit de chaque formation.
 *
 * ── ⚠️ Six défauts, aucun tombé au rouge ────────────────────────────────────
 * Le calcul vivait dans `Veille.tsx`, au milieu d'un composant serveur : il ne
 * pouvait s'éprouver qu'en ouvrant un navigateur et en se connectant. Les six
 * défauts corrigés le 12 septembre 2026 ont été trouvés **en relisant** — pas
 * un n'aurait cassé quoi que ce soit, et c'est là tout le problème : cet écran
 * est celui depuis lequel la direction décide d'ouvrir une seconde cohorte.
 *
 * Chacun a son contrôle ci-dessous. Le calcul est pur : ni base, ni réseau, ni
 * navigateur — même raison que `verifier-occupation.ts` et
 * `verifier-avancement.ts`.
 *
 *   npx payload run scripts/verifier-supervision.ts
 */
import { resumerLaFormation } from "@/lib/supervision";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  Le tableau de supervision\n");

const cohorte = { id: 1, capacite: 30, placesReservees: 22 };
const dossiers = (etats: string[]) => etats.map((statut) => ({ statut }));

/* ── 1. Le cas ordinaire ─────────────────────────────────────────────────── */

const ordinaire = resumerLaFormation(
  cohorte,
  dossiers(["demandee", "demandee", "confirmee", "payee"]),
);
dire("22 sur 30 font 73 %", ordinaire.pct === 73, `${ordinaire.pct}%`);
dire("les pré-inscriptions se comptent", ordinaire.preInscriptionsCount === 2);
dire("les versements aussi", ordinaire.confirmeesCount === 2);
dire("et le total est celui des dossiers vivants", ordinaire.totalInscriptionsCount === 4);

/* ── 2. ⚠️ Un dossier annulé n'est pas un client ─────────────────────────── */
/*
  C'est le dossier dont la place vient de repartir au catalogue — et depuis le
  11 septembre 2026, l'annulation est le **seul** moyen de la rendre : ils vont
  s'accumuler. Les compter ferait grossir le nombre de clients à mesure qu'on
  en perd.
*/
const avecAnnules = resumerLaFormation(
  cohorte,
  dossiers(["demandee", "annulee", "annulee", "confirmee"]),
);
dire("⚠️ les dossiers annulés ne comptent pas", avecAnnules.totalInscriptionsCount === 2);
dire("ni parmi les pré-inscriptions", avecAnnules.preInscriptionsCount === 1);

/* ── 3. ⚠️ Le dénominateur ne s'invente pas ──────────────────────────────── */
/*
  Il valait `capacite ?? 30`. C'est le défaut corrigé le 7 septembre 2026 sur
  les jauges du tableau de bord, où il s'écrivait `?? 20` : une session sans
  capacité affichait un pourcentage calculé sur des places qui n'existent
  nulle part.
*/
const sansCapacite = resumerLaFormation({ id: 2, placesReservees: 5 }, dossiers(["demandee"]));
dire("⚠️ sans capacité, aucun pourcentage", sansCapacite.pct === null, String(sansCapacite.pct));
dire(
  "et le ton le dit",
  sansCapacite.remplissageTon === "inconnu",
  sansCapacite.remplissageLibelle,
);
dire(
  "⚠️ et la capacité ne vaut pas trente d'office",
  Number.isNaN(sansCapacite.capacite),
  String(sansCapacite.capacite),
);

/* ── 4. ⚠️ Une cohorte tenue ouverte n'a pas de pourcentage ──────────────── */
/*
  Son plafond suit les inscriptions : à 26 dossiers elle affiche 26/46, à 40
  elle affichera 40/60. La jauge stagne autour de 57 % quoi qu'il arrive, et une
  barre à moitié pleine se lit « il reste de la place » — indéfiniment, sur
  l'écran qui sert justement à décider d'ouvrir une seconde cohorte.
*/
const ouverte = resumerLaFormation(
  { id: 3, capacite: 46, placesReservees: 26, placesLibresTenues: 20 },
  dossiers(["demandee", "confirmee"]),
);
dire("⚠️ cohorte ouverte : pas de pourcentage", ouverte.pct === null, String(ouverte.pct));
dire("et l'écran le sait", ouverte.cohorteOuverte);
/*
  ⚠️ Le témoin. Sans lui, un calcul qui rendrait `null` **tout le temps**
  passerait au vert sur les deux contrôles du dessus — et plus aucune jauge ne
  s'afficherait nulle part.
*/
const memeCohorteFermee = resumerLaFormation(
  { id: 3, capacite: 46, placesReservees: 26 },
  dossiers(["demandee"]),
);
dire(
  "⚠️ (témoin) la même sans le réglage garde son pourcentage",
  memeCohorteFermee.pct === 57,
  `${memeCohorteFermee.pct}%`,
);

/*
  ⚠️ Et le nombre de clients, lui, ne disparaît pas avec le pourcentage : c'est
  le seul chiffre qui dise encore quelque chose sur une cohorte ouverte.
*/
dire("⚠️ mais les clients se comptent toujours", ouverte.totalInscriptionsCount === 2);

/* ── 5. ⚠️ Le remplissage vient d'une seule source ───────────────────────── */
/*
  `occupationDeLaSession` est la porte par laquelle la colonne « Remplissage »
  de la liste des sessions lit le même état. Deux lectures se consultent à deux
  clics l'une de l'autre et finiraient par ne plus dire la même chose.
*/
const pleine = resumerLaFormation({ id: 4, capacite: 30, placesReservees: 30 }, []);
dire(
  "une cohorte pleine se dit complète",
  pleine.remplissageTon === "complet",
  pleine.remplissageLibelle,
);
dire("et son pourcentage est cent", pleine.pct === 100, `${pleine.pct}%`);

const tendue = resumerLaFormation({ id: 5, capacite: 30, placesReservees: 26 }, []);
dire(
  "quatre places restantes tendent la cohorte",
  tendue.remplissageTon === "tension",
  tendue.remplissageLibelle,
);

/* ── 6. ⚠️ Ce que Postgres rend en texte ─────────────────────────────────── */
/*
  `places_reservees` est de type `numeric` : le pilote `pg` le rend en texte,
  Payload en nombre. Une concaténation au lieu d'une soustraction passerait
  inaperçue — le journal le documente déjà pour `occupationDeLaSession`.
*/
const enTexte = resumerLaFormation(
  { id: 6, capacite: "30" as unknown as number, placesReservees: "22" as unknown as number },
  [],
);
dire("⚠️ un nombre rendu en texte se calcule quand même", enTexte.pct === 73, `${enTexte.pct}%`);

/* ── 7. Une formation sans session ───────────────────────────────────────── */
const sansSession = resumerLaFormation(undefined, []);
dire(
  "sans session, rien n'est annoncé",
  sansSession.pct === null && sansSession.remplissageTon === "inconnu",
);
dire("et le libellé invite à en ouvrir une", sansSession.remplissageLibelle === "À planifier");

console.log(
  manques === 0
    ? "\n  Le tableau ne dit que ce qu'il sait.\n"
    : `\n  ${manques} contrôle(s) au rouge.\n`,
);
process.exit(manques > 0 ? 1 : 0);
