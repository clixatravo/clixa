/**
 * Éprouve ce que la page du dossier annonce au participant, à chaque moment.
 *
 * ── Le défaut que ce script existe pour empêcher ────────────────────────────
 * Dès la signature, la page réclamait « votre premier transfert ». Le
 * participant ne pouvait pas l'effectuer : les coordonnées de règlement lui
 * parviennent après, dans un courriel que l'équipe compose — rien de bancaire
 * ne traversant le site. On lui demandait donc un geste qu'il n'avait aucun
 * moyen de faire, au moment précis où il venait de s'engager par écrit.
 *
 * C'est le même défaut que le compte à rebours des places : le site réclamait
 * une action avant d'en avoir donné les moyens. Il ne se voit ni au type ni à
 * la compilation — la phrase est juste, c'est le moment qui ne l'est pas.
 *
 * `prochaineEtape` est pure : aucune base, aucun réseau.
 */
import { prochaineEtape } from "../src/lib/inscriptions.js";
import type { Dossier } from "../src/lib/inscriptions.js";

let manques = 0;
const dire = (q: string, v: boolean) => {
  console.log(`  ${v ? "✓" : "✗"} ${q}`);
  if (!v) manques += 1;
};

const JOUR = "2026-08-30T12:00:00.000Z";

/** Le strict nécessaire : `prochaineEtape` ne lit que ces champs. */
const dossier = (etat: Partial<Dossier>): Dossier =>
  ({
    reference: "CLX-EPREUVE",
    statut: "demandee",
    echeances: [{ montantCentimes: 42300, statut: "attendu" }],
    ...etat,
  }) as Dossier;

const dit = (etat: Partial<Dossier>) => prochaineEtape(dossier(etat));

// ── 1. Pré-inscription seule : rien ne l'engage encore ─────────────────────
dire("sans contrat demandé, on ne réclame rien", /rien ne vous engage/i.test(dit({})));

// ── 2. Contrat demandé, pas signé ──────────────────────────────────────────
dire(
  "contrat demandé : il reste à le signer",
  /reste à signer/i.test(dit({ contratDemandeLe: JOUR })),
);

/*
  ── 3. Signé, pas encore relu ────────────────────────────────────────────────
  Le cœur de l'épreuve. À ce moment le participant ne peut rien verser : lui
  réclamer un transfert, c'est lui demander l'impossible.
*/
const signe = dit({ contratDemandeLe: JOUR, contratSigneLe: JOUR });
dire("signé : ⚠️ on ne réclame PAS de transfert", !/transfert/i.test(signe));
dire("signé : on dit que c'est nous qu'on attend", /rien à faire de votre côté/i.test(signe));

// ── 4. Vérifié, coordonnées pas encore parties ─────────────────────────────
const verifie = dit({ contratDemandeLe: JOUR, contratSigneLe: JOUR, contratVerifieLe: JOUR });
dire("vérifié : ⚠️ toujours pas de transfert réclamé", !/transfert/i.test(verifie));
dire("vérifié : on le lui annonce", /vérifié/i.test(verifie));

// ── 5. Coordonnées envoyées : là, on peut demander ─────────────────────────
const envoye = dit({
  contratDemandeLe: JOUR,
  contratSigneLe: JOUR,
  contratVerifieLe: JOUR,
  coordonneesEnvoyeesLe: JOUR,
});
dire("coordonnées envoyées : on réclame enfin le versement", /transfert/i.test(envoye));

/*
  ── 6. Un acompte reçu sans contrat signé ───────────────────────────────────
  L'équipe peut avoir tout mené de vive voix. Le dossier ne doit alors pas
  réclamer une signature après coup, ni retomber dans le silence.
*/
const regle = prochaineEtape(
  dossier({
    echeances: [
      { montantCentimes: 42300, statut: "regle" },
      { montantCentimes: 42300, statut: "attendu" },
    ],
  } as Partial<Dossier>),
);
dire("un acompte reçu fait parler de l'échéance suivante", /échéance/i.test(regle));

// ── 7. Une annonce en cours prime sur tout ─────────────────────────────────
const annonce = prochaineEtape(
  dossier({
    contratSigneLe: JOUR,
    echeances: [{ montantCentimes: 42300, statut: "annonce" }],
  } as Partial<Dossier>),
);
dire("un transfert annoncé : rien à faire de son côté", /rien à faire/i.test(annonce));

console.log(manques === 0 ? "\nÉtapes : tout tient." : `\nÉtapes : ${manques} manque(s).`);
process.exit(manques === 0 ? 0 : 1);
