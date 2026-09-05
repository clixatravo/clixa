/**
 * Quand le robot parle, quand il se tait, et quand il réveille quelqu'un.
 *
 * `prochainGeste` est pure : ni WhatsApp, ni base, ni réseau. On lui donne un
 * état de conversation, les heures d'ouverture et une horloge, et l'on regarde
 * ce qu'elle décide.
 *
 * ⚠️ **C'est le seul endroit qui décide de parler à un client.** Une erreur ici
 * ne casse rien de visible : elle fait répondre une machine à quelqu'un qui
 * demandait un humain, ou parler par-dessus un conseiller. Les deux se
 * paient en prospects perdus, et aucun ne remonte jamais sous forme d'erreur.
 *
 *   npx payload run scripts/verifier-orientation.ts
 */
import { prochainGeste, type Etat } from "@/lib/orientation";
import type { Reglages } from "@/lib/creneaux";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

/** Lundi 10h00 UTC : dans les heures. */
const PENDANT = new Date("2026-10-05T10:00:00.000Z");
/** Lundi 23h00 UTC : hors des heures. */
const APRES = new Date("2026-10-05T23:00:00.000Z");

const OUVERT: Reglages = {
  actif: true,
  dureeMinutes: 20,
  delaiMinimumHeures: 2,
  semaine: [{ jour: "1", debut: "09:00", fin: "12:00" }],
};

const etat = (message: string, reste: Partial<Etat> = {}): Etat => ({
  conduite: "robot",
  message,
  ...reste,
});

console.log("\n  Ce que le robot décide\n");

// ── 1. Le silence, avant tout ───────────────────────────────────────────────
/*
  ⚠️ Deux voix sur le même fil, c'est ce qui fait qu'on n'y comprend rien et
  qu'on raccroche. Une conversation reprise par un conseiller ne doit plus
  jamais recevoir un mot du robot — même si le message contient un mot-clef
  qui l'aurait déclenché.
*/
dire(
  "⚠️ un conseiller a pris la main : le robot se tait",
  prochainGeste(etat("quand êtes-vous disponible ?", { conduite: "humain" }), OUVERT, PENDANT)
    .faire === "se-taire",
);
dire(
  "une conversation close reste close",
  prochainGeste(etat("bonjour", { conduite: "close" }), OUVERT, PENDANT).faire === "se-taire",
);

// ── 2. Passer la main ───────────────────────────────────────────────────────
dire(
  "il veut parler à quelqu'un, et quelqu'un est là",
  prochainGeste(etat("je peux parler à un conseiller ?"), OUVERT, PENDANT).faire ===
    "passer-la-main",
);
dire(
  "en darija aussi",
  prochainGeste(etat("bghit ndwi m3a chi bnadem"), OUVERT, PENDANT).faire === "passer-la-main",
);

/*
  ⚠️ Le même message, hors des heures. On ne se tait pas : un silence à ce
  moment-là fait écrire « bonjour ? » trois fois avant de partir. On propose
  une heure, la seule chose vraie qu'on puisse dire.
*/
dire(
  "⚠️ hors des heures, on ne se tait pas : on convient d'une heure",
  prochainGeste(etat("je peux parler à un conseiller ?"), OUVERT, APRES).faire ===
    "proposer-des-creneaux",
);

/*
  ⚠️ Et si les rendez-vous ne sont pas ouverts, personne n'est « là » non plus.
  Un seul interrupteur commande les deux : sans lui, le robot promettrait de
  passer un conseiller que rien ne déclare disponible.
*/
dire(
  "⚠️ l'interrupteur ferme aussi le passage à l'humain",
  prochainGeste(etat("je veux parler à quelqu'un"), { ...OUVERT, actif: false }, PENDANT).faire !==
    "passer-la-main",
);

// ── 3. Les rendez-vous ──────────────────────────────────────────────────────
dire(
  "il demande un rendez-vous : on propose des créneaux",
  prochainGeste(etat("c'est quoi vos disponibilités ?"), OUVERT, PENDANT).faire ===
    "proposer-des-creneaux",
);
dire(
  "« rdv » compte aussi",
  prochainGeste(etat("on peut fixer un rdv ?"), OUVERT, PENDANT).faire === "proposer-des-creneaux",
);

/*
  ⚠️ Sans cette garde, chaque message contenant « quand » relancerait la liste
  des créneaux à quelqu'un qui a déjà noté son heure — et lui ferait croire
  que son rendez-vous n'a pas été enregistré.
*/
dire(
  "⚠️ un rendez-vous déjà pris n'en fait pas proposer un second",
  prochainGeste(
    etat("et quand ça commence exactement ?", { rendezVousPris: true }),
    OUVERT,
    PENDANT,
  ).faire === "repondre",
);

// ── 4. Le cas ordinaire ─────────────────────────────────────────────────────
dire(
  "une question sur le programme appelle une réponse",
  prochainGeste(etat("le parcours DAF dure combien d'heures ?"), OUVERT, PENDANT).faire ===
    "repondre",
);
dire(
  "un simple bonjour aussi",
  prochainGeste(etat("bonjour"), OUVERT, PENDANT).faire === "repondre",
);

/*
  ⚠️ Un jour de fermeture n'est pas une heure d'ouverture, même à 10h un lundi.
  Les deux lectures — créneaux et disponibilité immédiate — partagent la même
  déclaration, pour qu'elles ne puissent pas se contredire.
*/
dire(
  "⚠️ un jour fermé, personne n'est là non plus",
  prochainGeste(
    etat("je peux parler à quelqu'un ?"),
    { ...OUVERT, fermetures: [{ jour: "2026-10-05T12:00:00.000Z" }] },
    PENDANT,
  ).faire !== "passer-la-main",
);

console.log(
  manques === 0
    ? "\n  Le robot parle quand il faut, et se tait quand il faut.\n"
    : `\n  ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
