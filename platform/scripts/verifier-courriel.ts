/**
 * Éprouve l'adresse de réponse de nos courriels.
 *
 * ── Le défaut que ce script existe pour empêcher ────────────────────────────
 * Le site envoie depuis `contact@envoi.clixa.africa`. Ce sous-domaine sert à
 * envoyer et **ne sait pas recevoir** : ni MX, ni A, exprès — sa réputation est
 * tenue à part de celle du domaine principal. Sans `replyTo`, la réponse du
 * participant partait donc vers une adresse indélivrable : elle lui revenait,
 * et de notre côté rien n'arrivait.
 *
 * Un silence des deux bords, sur le geste le plus naturel qu'on puisse faire
 * devant un courriel — et que rien ne signale, jamais.
 *
 * ── Ce qu'on vérifie, et pourquoi ce n'est pas qu'une constante ─────────────
 * Qu'un `replyTo` est bien posé sur chaque message, et surtout que **son
 * domaine sait recevoir** : on interroge ses MX. Vérifier seulement que la
 * variable est remplie laisserait passer une adresse sur un domaine muet, ce
 * qui est précisément le défaut d'origine.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { resolveMx } from "node:dns/promises";
import { courrielRappel, courrielRelance, envoyerConfirmation } from "../src/lib/courriel.js";
import { RESEAUX_CLIXA } from "../src/lib/reseaux.js";

const payload = await getPayload({ config });
const expediteur = payload.sendEmail.bind(payload);

let manques = 0;
const dire = (q: string, v: boolean) => {
  console.log(`  ${v ? "✓" : "✗"} ${q}`);
  if (!v) manques += 1;
};

/*
  Retient les messages présentés à l'expéditeur, sans rien envoyer.

  Une liste plutôt qu'une variable réassignée : TypeScript rétrécit une variable
  remise à `undefined` et ne suit pas l'affectation faite dans la fonction, ce
  qui rendait la lecture suivante impossible à typer.
*/
const envoyes: Record<string, unknown>[] = [];

try {
  payload.sendEmail = (async (m: Record<string, unknown>) => {
    envoyes.push(m);
    return { messageId: "epreuve" };
  }) as typeof payload.sendEmail;

  // ── Un courriel au participant ───────────────────────────────────────────
  await courrielRelance(payload, {
    reference: "CLX-EPREUVE",
    apprenantNom: "Épreuve Réponse",
    apprenantEmail: "reponse@epreuve.invalid",
    programmeTitre: "Parcours d'épreuve",
    montant: 423,
    dateLimite: new Date().toISOString(),
    enRetard: true,
    urlDossier: "https://www.clixa.africa/inscription/CLX-EPREUVE",
  });

  const relance = envoyes[0];
  dire("une relance porte une adresse de réponse", Boolean(relance?.replyTo));

  // ── Et celui qui ouvre un compte, qui passe par un autre chemin ──────────
  await envoyerConfirmation(payload, "confirmation@epreuve.invalid", {
    nom: "Épreuve Réponse",
    token: "jeton-d-epreuve",
  });

  const confirmation = envoyes[1];
  dire("la confirmation d'adresse aussi", Boolean(confirmation?.replyTo));
  dire(
    "les deux chemins répondent au même endroit",
    String(relance?.replyTo) === String(confirmation?.replyTo),
  );

  /*
    ⚠️ Le cœur de l'épreuve. Une adresse de réponse sur un domaine sans MX est
    exactement le défaut qu'on vient de corriger : elle a l'air juste, elle est
    indélivrable. On pose donc la question au DNS.
  */
  const adresse = String(relance?.replyTo ?? "");
  const domaine = adresse.split("@")[1] ?? "";
  dire("elle n'est pas sur le sous-domaine d'envoi", !domaine.startsWith("envoi."));

  let mx: string[] = [];
  try {
    mx = (await resolveMx(domaine)).map((e) => e.exchange);
  } catch {
    mx = [];
  }
  dire(`le domaine de réponse sait recevoir (${domaine} → ${mx.length} MX)`, mx.length > 0);

  /*
    ── Une demande de rappel n'est pas une notification comme les autres ──────
    Elle ne va pas à l'équipe entière mais à l'adresse affichée sur le site :
    c'est un appel à passer, pas un événement à constater. Et elle doit la tenir
    de `lib/reseaux.ts`, pour que l'adresse qu'on montre au visiteur et celle
    qui reçoit sa demande soient la même par construction.
  */
  const avant = envoyes.length;
  await courrielRappel(payload, {
    nom: "Épreuve Rappel",
    email: "rappel@epreuve.invalid",
    whatsapp: "+212600000000",
    pays: "Maroc",
  });

  const rappel = envoyes[avant];
  dire("une demande de rappel part bien", Boolean(rappel));
  dire(
    `elle va à l'adresse affichée sur le site (${RESEAUX_CLIXA.email.adresse})`,
    String(rappel?.to) === RESEAUX_CLIXA.email.adresse,
  );
  dire(
    "elle ne suit pas EMAIL_EQUIPE",
    !process.env.EMAIL_EQUIPE || String(rappel?.to) !== process.env.EMAIL_EQUIPE,
  );
} finally {
  payload.sendEmail = expediteur;
}

console.log(manques === 0 ? "\nCourriel : tout tient." : `\nCourriel : ${manques} manque(s).`);
process.exit(manques === 0 ? 0 : 1);
