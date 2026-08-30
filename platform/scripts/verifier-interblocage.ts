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
import { malgreUnInterblocage } from "../src/lib/interblocage.js";

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

console.log(
  manques === 0 ? "\nInterblocage : tout tient." : `\nInterblocage : ${manques} manque(s).`,
);
process.exit(manques === 0 ? 0 : 1);
