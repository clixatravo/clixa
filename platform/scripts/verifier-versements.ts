/**
 * Le suivi des versements dit, pour chaque participant, ce qu'il lui reste.
 *
 *   npx payload run scripts/verifier-versements.ts
 *
 * Aucune base, aucun réseau : `suiviDesVersements` est pure. L'horloge est
 * figée, si bien que le contrôle rend la même chose demain matin.
 *
 * ⚠️ **Chaque règle a son témoin.** Un regroupement qui rendrait tout le monde
 * dans le même groupe, ou personne, passerait sinon au vert sur la moitié des
 * contrôles.
 */
import { intituleDuGroupe, phraseDeLaSuite, suiviDesVersements } from "@/lib/versements";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  Le suivi des versements\n");

const MAINTENANT = new Date("2026-10-20T10:00:00Z");
const envoye = "2026-09-25T12:00:00Z";
const tranche = (statut: string, dateLimite: string, montant = 157) => ({
  statut,
  dateLimite: `${dateLimite}T12:00:00.000Z`,
  montant,
});

const dossiers = [
  // Trois tranches, rien de versé, la première pas encore due.
  {
    id: 1,
    apprenantNom: "Awa Diallo",
    reference: "CLX-AAAAAAAA",
    statut: "demandee",
    coordonneesEnvoyeesLe: envoye,
    echeances: [
      tranche("attendu", "2026-10-25"),
      tranche("attendu", "2026-10-31"),
      tranche("attendu", "2026-11-14"),
    ],
  },
  // Trois tranches, la première réglée, la deuxième annoncée avec sa pièce.
  {
    id: 2,
    apprenantNom: "Brahim Ouali",
    reference: "CLX-BBBBBBBB",
    statut: "confirmee",
    coordonneesEnvoyeesLe: envoye,
    echeances: [
      tranche("regle", "2026-10-03"),
      tranche("annonce", "2026-10-15"),
      tranche("attendu", "2026-11-14"),
    ],
  },
  // Trois tranches, rien de versé, la première en retard.
  {
    id: 3,
    apprenantNom: "Chantal Koffi",
    reference: "CLX-CCCCCCCC",
    statut: "demandee",
    coordonneesEnvoyeesLe: envoye,
    echeances: [
      tranche("attendu", "2026-10-03"),
      tranche("attendu", "2026-10-31"),
      tranche("attendu", "2026-11-14"),
    ],
  },
  // Deux tranches, la première réglée : il en reste une.
  {
    id: 4,
    apprenantNom: "Driss Alami",
    reference: "CLX-DDDDDDDD",
    statut: "confirmee",
    coordonneesEnvoyeesLe: envoye,
    echeances: [tranche("regle", "2026-10-03", 224), tranche("attendu", "2026-11-14", 224)],
  },
  // Soldé.
  {
    id: 5,
    apprenantNom: "Esther Mensah",
    reference: "CLX-EEEEEEEE",
    statut: "payee",
    coordonneesEnvoyeesLe: envoye,
    echeances: [tranche("regle", "2026-10-03", 423)],
  },
  // ⚠️ Témoin : pas de coordonnées, rien de versé — il ne peut pas payer.
  {
    id: 6,
    apprenantNom: "Fatou Ndiaye",
    reference: "CLX-FFFFFFFF",
    statut: "demandee",
    echeances: [tranche("attendu", "2026-10-03", 423)],
  },
  // ⚠️ Témoin : annulé.
  {
    id: 7,
    apprenantNom: "Gilles Traoré",
    reference: "CLX-GGGGGGGG",
    statut: "annulee",
    coordonneesEnvoyeesLe: envoye,
    echeances: [tranche("attendu", "2026-10-03", 423)],
  },
  // ⚠️ Un échéancier vide rendu en `0` par le formulaire : ne lève pas.
  {
    id: 8,
    apprenantNom: "Hind Berrada",
    statut: "demandee",
    coordonneesEnvoyeesLe: envoye,
    echeances: 0,
  },
  // Annoncé sans pièce : il faut le dire autrement.
  {
    id: 9,
    apprenantNom: "Ibrahim Sow",
    reference: "CLX-IIIIIIII",
    statut: "demandee",
    coordonneesEnvoyeesLe: envoye,
    echeances: [tranche("annonce", "2026-10-03", 423)],
  },
];

const recus = [
  { dossier: 2, echeance: 2 },
  { dossier: { id: 2 }, echeance: 1 },
  // Une pièce pour une tranche déjà réglée ne vaut pas pour la suivante.
  { dossier: 4, echeance: 1 },
];

const suivi = suiviDesVersements(dossiers, recus, MAINTENANT);
const noms = (l: { nom: string }[]) => l.map((x) => x.nom.split(" ")[0]).join(", ");
const groupe = (n: number) => suivi.groupes.find((g) => g.restantes === n)?.lignes ?? [];

/* ── 1. Qui y figure ─────────────────────────────────────────────────────── */
dire(
  "six dossiers en phase de règlement, soldé compris",
  suivi.total === 6,
  `${suivi.total} (attendu 6 : sans le témoin sans coordonnées, l'annulé et l'échéancier vide)`,
);
const tous = [...suivi.groupes.flatMap((g) => g.lignes), ...suivi.soldes];
dire("⚠️ sans coordonnées ni versement, il n'y figure pas", !tous.some((l) => l.id === 6));
dire("⚠️ un dossier annulé n'y figure pas", !tous.some((l) => l.id === 7));
dire("⚠️ un échéancier rendu en `0` ne lève pas", !tous.some((l) => l.id === 8));

/* ── 2. Les groupes ──────────────────────────────────────────────────────── */
dire(
  "les groupes vont du plus grand reste au plus petit",
  suivi.groupes.map((g) => g.restantes).join(",") === "3,2,1",
  suivi.groupes.map((g) => g.restantes).join(","),
);
dire("reste 3 : Awa et Chantal", noms(groupe(3)) === "Chantal, Awa", noms(groupe(3)));
dire("reste 2 : Brahim", noms(groupe(2)) === "Brahim");
dire("reste 1 : Driss et Ibrahim", noms(groupe(1)) === "Ibrahim, Driss", noms(groupe(1)));
dire("soldé : Esther", noms(suivi.soldes) === "Esther");

/* ── 3. L'urgence ────────────────────────────────────────────────────────── */
const chantal = groupe(3).find((l) => l.id === 3);
const awa = groupe(3).find((l) => l.id === 1);
dire("une tranche dont la date est passée est en retard", !!chantal?.prochaine?.enRetard);
dire("témoin : une tranche à venir ne l'est pas", awa?.prochaine?.enRetard === false);
dire(
  "⚠️ un versement annoncé n'est jamais « en retard »",
  groupe(1).find((l) => l.id === 9)?.prochaine?.enRetard === false,
);
dire("le retard passe avant l'échéance lointaine dans son groupe", groupe(3)[0]?.id === 3);
dire("et l'annoncé avant tout le reste", groupe(1)[0]?.id === 9);

/* ── 4. Ce qui attend de nous ────────────────────────────────────────────── */
/*
  ⚠️ Le premier jet attendait « Brahim, Ibrahim » et a accusé un code juste :
  la liste suit l'échéance la plus ancienne d'abord, et celle d'Ibrahim
  (3 octobre) précède celle de Brahim (15 octobre). C'est l'ordre voulu.
*/
dire(
  "« à vérifier » : Ibrahim puis Brahim, et eux seuls",
  noms(suivi.aVerifier) === "Ibrahim, Brahim",
  noms(suivi.aVerifier),
);
const brahim = suivi.aVerifier.find((l) => l.id === 2);
dire("Brahim a joint la pièce de sa tranche 2", brahim?.avecJustificatif === true);
dire(
  "⚠️ Ibrahim a annoncé sans pièce — on ne prétend pas le contraire",
  suivi.aVerifier.find((l) => l.id === 9)?.avecJustificatif === false,
);
dire(
  "⚠️ la pièce d'une tranche réglée ne vaut pas pour la suivante",
  groupe(1).find((l) => l.id === 4)?.avecJustificatif === false,
);
dire(
  "la tranche attendue de Brahim est la 2 sur 3",
  brahim?.prochaine?.rang === 2 && brahim.total === 3,
);

/* ── 5. Les phrases ──────────────────────────────────────────────────────── */
dire("« Reste 3 tranches »", intituleDuGroupe(3) === "Reste 3 tranches");
dire(
  "« Reste 1 tranche — dernier versement », au singulier",
  intituleDuGroupe(1) === "Reste 1 tranche — dernier versement",
);
dire("la dernière tranche dit que le dossier sera soldé", /soldé/.test(phraseDeLaSuite(0)));
dire("« il lui restera 1 tranche », au singulier", /restera 1 tranche\./.test(phraseDeLaSuite(1)));
dire("« il lui restera 2 tranches »", /restera 2 tranches\./.test(phraseDeLaSuite(2)));

console.log(
  manques === 0
    ? "\n  Chacun est rangé selon ce qu'il lui reste.\n"
    : `\n  ${manques} contrôle(s) au rouge.\n`,
);
process.exit(manques > 0 ? 1 : 0);
