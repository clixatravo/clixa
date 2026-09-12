/**
 * Éprouve le rattrapage d'un interblocage Postgres.
 *
 * ── Le défaut que ce script existe pour empêcher ────────────────────────────
 * Deux personnes s'inscrivent au même instant à la même session. Chaque
 * transaction insère d'abord une ligne dans `inscriptions`, ce qui pose un
 * verrou **partagé** sur la ligne de `sessions` — la clef étrangère l'exige.
 * Puis le crochet `recompter` met à jour le décompte sur cette même ligne, ce
 * qui demande un verrou **exclusif**. Chacune attend que l'autre lâche le
 * partagé, et Postgres en tue une :
 *
 *     deadlock detected · while locking tuple in relation "sessions"
 *
 * Le participant voyait « erreur technique » sur une inscription parfaitement
 * valide. Observé en série d'épreuves le 30 août 2026.
 *
 * ── Deux épreuves, et la seconde est celle qui compte ───────────────────────
 * La première vérifie la mécanique de rattrapage sur une erreur fabriquée. La
 * seconde provoque **un vrai interblocage** dans Postgres, avec deux
 * transactions qui se croisent — parce qu'une garde qui n'a jamais vu la panne
 * qu'elle prétend arrêter ne prouve rien.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import pg from "pg";
import { readFileSync } from "node:fs";
import {
  TEMPS_D_ATTENTE,
  TENTATIVES,
  ecrireSurLaSession,
  malgreUnInterblocage,
} from "../src/lib/interblocage.js";

let manques = 0;
const dire = (q: string, v: boolean) => {
  console.log(`  ${v ? "✓" : "✗"} ${q}`);
  if (!v) manques += 1;
};

const payload = await getPayload({ config });

// ── 1. La mécanique : on rejoue l'interblocage, et rien d'autre ────────────
{
  let appels = 0;
  const resultat = await malgreUnInterblocage(async () => {
    appels += 1;
    if (appels < 2) throw Object.assign(new Error("deadlock detected"), { code: "40P01" });
    return "abouti";
  });
  dire("un interblocage est rejoué, et la seconde tentative aboutit", resultat === "abouti");

  /* Payload enveloppe l'erreur du pilote : le code vit dans `cause`. */
  let sousAppels = 0;
  await malgreUnInterblocage(async () => {
    sousAppels += 1;
    if (sousAppels < 2) throw Object.assign(new Error("enveloppé"), { cause: { code: "40P01" } });
    return "abouti";
  });
  dire("y compris quand le code est enveloppé dans `cause`", sousAppels === 2);

  let autres = 0;
  const refus = await malgreUnInterblocage(async () => {
    autres += 1;
    throw Object.assign(new Error("contrainte violée"), { code: "23505" });
  }).catch((e) => (e as Error).message);
  dire("⚠️ une autre erreur n'est PAS rejouée", autres === 1 && refus === "contrainte violée");
}

/*
  ── 2. Un vrai interblocage, provoqué dans Postgres ───────────────────────
  Deux transactions verrouillent deux lignes dans l'ordre inverse. C'est la
  forme la plus courte d'un interblocage réel — et elle rend le même code 40P01
  que celui qui tuait les inscriptions.
*/
const chaine = readFileSync(".env.local", "utf8")
  .split("\n")
  .find((l) => l.startsWith("DATABASE_URL"))
  ?.split("=")
  .slice(1)
  .join("=")
  .trim()
  .replace(/^["']|["']$/g, "");

if (!chaine) {
  console.log("  · DATABASE_URL introuvable : l'interblocage réel n'est pas éprouvé.");
} else {
  const { docs: sessions } = await payload.find({
    collection: "sessions",
    limit: 2,
    depth: 0,
    overrideAccess: true,
    sort: "id",
  });

  if (sessions.length < 2) {
    console.log("  · moins de deux sessions : l'interblocage réel n'est pas éprouvé.");
  } else {
    const [a, b] = [sessions[0]!.id, sessions[1]!.id];
    const clientA = new pg.Client({ connectionString: chaine });
    const clientB = new pg.Client({ connectionString: chaine });
    await clientA.connect();
    await clientB.connect();

    const bloquer = async (c: pg.Client, id: unknown) =>
      c.query(`SELECT id FROM sessions WHERE id = $1 FOR UPDATE`, [id]);

    let attrape: unknown;
    try {
      await clientA.query("BEGIN");
      await clientB.query("BEGIN");

      // Chacune prend d'abord « sa » ligne.
      await bloquer(clientA, a);
      await bloquer(clientB, b);

      // Puis chacune veut celle de l'autre : le cycle est fermé.
      const croiseA = bloquer(clientA, b);
      const croiseB = bloquer(clientB, a);

      const issues = await Promise.allSettled([croiseA, croiseB]);
      attrape = issues.find((i) => i.status === "rejected") as PromiseRejectedResult | undefined;
    } finally {
      await clientA.query("ROLLBACK").catch(() => {});
      await clientB.query("ROLLBACK").catch(() => {});
      await clientA.end();
      await clientB.end();
    }

    const raison = (attrape as PromiseRejectedResult | undefined)?.reason as
      { code?: string } | undefined;
    dire(
      `Postgres a bien signalé un interblocage (${raison?.code ?? "aucun"})`,
      raison?.code === "40P01",
    );
    dire(
      "⚠️ et c'est exactement le code que le rattrapage guette",
      raison !== undefined && (await estRejoue(raison)),
    );
  }
}

/** Le rattrapage reconnaît-il cette erreur venue du vrai Postgres ? */
async function estRejoue(erreur: unknown): Promise<boolean> {
  let appels = 0;
  await malgreUnInterblocage(async () => {
    appels += 1;
    if (appels < 2) throw erreur;
    return "abouti";
  }).catch(() => undefined);
  return appels === 2;
}

// ── 3. ⚠️ Le budget : six inscriptions au même instant ────────────────────
/*
  ── Ce que ce contrôle ajoute ───────────────────────────────────────────────
  Les deux épreuves ci-dessus prouvent que le rattrapage **existe** et qu'il
  reconnaît le vrai code de Postgres. Aucune ne dit s'il **suffit**. Le journal
  notait le contraire depuis le 7 septembre 2026 : « six requêtes concurrentes
  révèlent que le budget peut saturer », c'est-à-dire qu'un visiteur reçoit une
  vraie erreur technique sur une inscription parfaitement valide. C'était laissé
  ouvert comme un défaut de capacité distinct.

  ⚠️ **On mesure sur le vrai chemin d'écriture**, pas sur une erreur fabriquée :
  six `payload.create` lancés ensemble sur la **même** session, donc six
  transactions qui se disputent la même ligne de `sessions`. C'est exactement ce
  qui se passe quand une annonce circule.
*/
{
  const { docs: sessions } = await payload.find({
    collection: "sessions",
    limit: 1,
    depth: 0,
    overrideAccess: true,
    where: { fin: { greater_than: new Date().toISOString() } },
  });

  if (!sessions[0]) {
    console.log("\n  · Aucune session à venir : le budget n'est pas éprouvé.");
  } else {
    /*
      Six, parce que c'est le nombre qui a révélé le défaut le 7 septembre 2026.
      `CONCURRENTS=20` permet de pousser plus loin à la main — éprouvé à douze
      et à vingt le 12 septembre, sans une seule perte.
    */
    const CONCURRENTS = Number(process.env.CONCURRENTS ?? 6);
    const nes: (string | number)[] = [];

    /*
      ⚠️ **La porte que prend le tunnel**, pas seulement le rattrapage. Mesuré
      avec `malgreUnInterblocage` seul : cinq inscriptions perdues sur six, en
      `40P01`. C'est ce contrôle qui l'a montré, et c'est lui qui garde le
      correctif.
    */
    const inscrire = (n: number) =>
      ecrireSurLaSession(sessions[0]!.id, () =>
        payload.create({
          collection: "inscriptions",
          overrideAccess: true,
          data: {
            session: sessions[0]!.id,
            statut: "demandee",
            apprenantNom: `Épreuve Budget ${n}`,
            apprenantEmail: `budget.${Date.now()}.${n}@epreuve.invalid`,
            apprenantWhatsapp: "+212600000000",
            apprenantPays: "Maroc",
            planPaiement: "P1",
            echeances: [{ montant: 423, statut: "attendu" }],
          } as never,
        }),
      );

    const issues = await Promise.allSettled(
      Array.from({ length: CONCURRENTS }, (_, i) => inscrire(i)),
    );
    for (const r of issues) if (r.status === "fulfilled") nes.push(r.value.id);

    const perdues = issues.filter((r) => r.status === "rejected");
    dire(
      `⚠️ ${CONCURRENTS} inscriptions au même instant aboutissent toutes` +
        (perdues.length > 0
          ? ` — ${perdues.length} perdue(s) · ${diagnostic(
              (perdues[0] as PromiseRejectedResult).reason,
            )}`
          : ""),
      perdues.length === 0,
    );

    for (const id of nes) {
      await payload
        .delete({ collection: "inscriptions", id, overrideAccess: true })
        .catch(() => {});
    }
  }
}

/**
 * De quoi meurt une écriture perdue — le code de Postgres, pas la requête.
 *
 * ⚠️ Le message de drizzle reprend le SQL entier : sur `sessions`, il fait plus
 * de mille caractères et **ne dit pas** pourquoi la requête a échoué. Le code
 * vit dans `cause`, et c'est le seul renseignement qui distingue un
 * interblocage (`40P01`, qu'on rejoue) d'une contrainte violée (qu'on ne
 * rejouerait pas). Sans lui, on lit « Failed query: insert into sessions » et
 * l'on conclut n'importe quoi.
 */
function diagnostic(e: unknown): string {
  const err = e as { code?: unknown; cause?: { code?: unknown; message?: unknown } } | null;
  const code = err?.code ?? err?.cause?.code ?? "aucun";
  const message = String(err?.cause?.message ?? "").slice(0, 100);
  return `code ${String(code)}${message ? ` · ${message}` : ""}`;
}

// ── 4. L'attente part de zéro, et son plafond double ──────────────────────
/*
  ⚠️ **C'est la forme de l'attente qui a changé, plus que leur nombre.**
  L'ancienne valait `essai * 120 + hasard(120)` : à la deuxième tentative,
  toutes les transactions repartaient entre 240 et 360 ms — dans la même fenêtre
  de 120 ms. Elles se retrouvaient donc, et se tuaient de nouveau. Tirer
  uniformément dans `[0, plafond]` les étale, et la fenêtre s'élargit à chaque
  essai. Un contrôle sur la borne basse suffit à garder ce choix : le jour où
  quelqu'un remet un plancher, il passe au rouge.
*/
{
  const tirages = Array.from({ length: 400 }, () => TEMPS_D_ATTENTE(1));
  dire("⚠️ la première attente peut être nulle — elle ne groupe pas", Math.min(...tirages) < 12);
  dire("et elle reste sous son plafond", Math.max(...tirages) < 120);

  const large = Array.from({ length: 400 }, () => TEMPS_D_ATTENTE(4));
  dire("le plafond double à chaque essai", Math.max(...large) > 480);
  dire("cinq tentatives, pas trois", TENTATIVES === 5);
}

console.log(
  manques === 0 ? "\nInterblocage : tout tient." : `\nInterblocage : ${manques} manque(s).`,
);
process.exit(manques === 0 ? 0 : 1);
