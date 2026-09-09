/**
 * Les rappels qui partent **avant** le terme — à quatre, trois puis deux jours.
 *
 * ── ⚠️ Le défaut que cette garde protège ────────────────────────────────────
 * Le seul message partait au terme : le participant apprenait que son délai
 * était écoulé, jamais qu'il courait. Demandé par la direction le 9 septembre
 * 2026, le jour où la cohorte portée par l'annonce était complète à 30/30 — une
 * place perdue ne se retrouvait pas.
 *
 * ⚠️ **Le contrôle qui compte est celui du second passage.** La tâche tourne
 * tous les matins : sans la trace `dernierRappelAvantTerme`, elle renverrait le
 * même message chaque jour. Trois rappels deviendraient sept en cinq jours, la
 * personne signalerait l'expéditeur, et c'est la réputation de
 * `envoi.clixa.africa` qui tombe — donc tout le tunnel, pas seulement ce
 * message.
 *
 *   npx payload run scripts/verifier-rappels.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { JOURS_DE_GRACE, SEUILS_DE_RAPPEL } from "@/lib/places";

const payload = await getPayload({ config });
const expediteur = payload.sendEmail.bind(payload);

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  Les rappels avant le terme\n");

process.env.CRON_SECRET ??= "secret-d-epreuve";
const SECRET = process.env.CRON_SECRET;
const { GET } = await import("../src/app/(payload)/api/relances/route.js");

/*
  ⚠️ On remplace `payload.sendEmail`, pas `payload.email` : sans adaptateur
  configuré — le cas en développement — Payload ne délègue pas et rend la main
  sans erreur. On croirait éprouver l'envoi en mesurant le néant.
*/
let recus: { to?: string; subject?: string; text?: string }[] = [];
const capturer = () => {
  recus = [];
  payload.sendEmail = (async (m: { to?: string; subject?: string; text?: string }) => {
    recus.push(m);
    return {};
  }) as typeof payload.sendEmail;
};

const passer = () =>
  GET(
    new Request("http://localhost:3000/api/relances", {
      headers: { authorization: `Bearer ${SECRET}` },
    }),
  );

const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 1,
  depth: 0,
  overrideAccess: true,
  where: { fin: { greater_than: new Date().toISOString() } },
});

if (!sessions[0]) {
  console.log("  · Aucune session à venir : rien à éprouver.\n");
  process.exit(0);
}

const aSupprimer: (string | number)[] = [];

/** Un dossier de pré-inscription, vieilli en base au jour voulu. */
const poser = async (nom: string, jours: number, extra: Record<string, unknown> = {}) => {
  const d = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: sessions[0]!.id,
      statut: "demandee",
      apprenantNom: `Épreuve Rappel ${nom}`,
      apprenantEmail: `rappel.${Math.random().toString(36).slice(2)}@epreuve.invalid`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      echeances: [{ montant: 423, statut: "attendu" }],
      ...extra,
    } as never,
  });
  aSupprimer.push(d.id);
  /*
    ⚠️ Une demi-journée de marge : posé pile sur le seuil, le dossier bascule
    d'un côté ou de l'autre selon les secondes écoulées. Un contrôle qui échoue
    une fois sur deux ne dit plus rien.
  */
  await payload.db.drizzle.execute(
    `UPDATE inscriptions SET created_at = now() - interval '${jours * 24 + 12} hours' WHERE id = ${d.id}` as never,
  );
  return d;
};

const relire = async (id: string | number) =>
  payload.findByID({ collection: "inscriptions", id, overrideAccess: true, depth: 0 });

const pourLui = (email: string) => recus.filter((m) => m.to === email);

try {
  /* ── Un dossier entré dans la fenêtre est prévenu ───────────────────────── */
  const premier = SEUILS_DE_RAPPEL[0]; // 4
  const a = await poser("A", JOURS_DE_GRACE - premier);

  capturer();
  await passer();

  const recuA = pourLui(String(a.apprenantEmail));
  dire(
    `⚠️ à ${premier} jours du terme, un rappel part`,
    recuA.length === 1,
    recuA[0]?.subject ?? `${recuA.length} message(s)`,
  );
  dire(
    "et il annonce les jours qui restent vraiment",
    /reste 4 jours/.test(recuA[0]?.subject ?? ""),
    recuA[0]?.subject ?? "",
  );
  /*
    ⚠️ Une pré-inscription n'a **jamais reçu de coordonnées de règlement** :
    lui réclamer un paiement lui demanderait un geste qu'elle ne peut pas faire.
    C'est le défaut que `prochaineEtape` corrige sur la page du dossier.
  */
  dire(
    "⚠️ il ne réclame aucun règlement — elle ne peut pas payer",
    !/payer maintenant|votre paiement|réglez|virement|western/i.test(recuA[0]?.text ?? ""),
  );
  dire(
    "et il mène au seul geste possible : demander son contrat",
    /demandez votre contrat/i.test(recuA[0]?.text ?? ""),
  );
  dire(
    "⚠️ il ne dit pas que le dossier sera supprimé — c'est la place qui repart",
    !/supprim/i.test(recuA[0]?.text ?? "") && /retourne au catalogue/i.test(recuA[0]?.text ?? ""),
  );
  dire(
    "la trace est posée après l'envoi",
    Number((await relire(a.id)).dernierRappelAvantTerme) === premier,
  );

  /* ── ⚠️ Et le lendemain, rien ne repart ─────────────────────────────────── */
  capturer();
  await passer();
  dire(
    "⚠️ un second passage le même jour n'en renvoie pas un second",
    pourLui(String(a.apprenantEmail)).length === 0,
    `${pourLui(String(a.apprenantEmail)).length} message(s)`,
  );

  /* ── Le seuil suivant repart, une fois franchi ──────────────────────────── */
  await payload.db.drizzle.execute(
    `UPDATE inscriptions SET created_at = now() - interval '${(JOURS_DE_GRACE - 2) * 24 + 12} hours' WHERE id = ${a.id}` as never,
  );
  capturer();
  await passer();
  const suivant = pourLui(String(a.apprenantEmail));
  dire(
    "au seuil suivant, un nouveau rappel part",
    suivant.length === 1 && /reste 2 jours/.test(suivant[0]?.subject ?? ""),
    suivant[0]?.subject ?? `${suivant.length} message(s)`,
  );
  /*
    ⚠️ Il a sauté le seuil 3 — le passage de ce jour-là n'a pas eu lieu. On ne
    rattrape pas : un seul message, au seuil courant. Trois messages d'un coup
    seraient exactement ce que la trace existe pour empêcher.
  */
  dire(
    "⚠️ un seuil sauté ne se rattrape pas — un seul message, pas deux",
    suivant.length === 1,
    `${suivant.length} message(s)`,
  );

  /* ── ⚠️ Un envoi manqué ne laisse pas de trace ──────────────────────────── */
  const b = await poser("B", JOURS_DE_GRACE - premier);
  payload.sendEmail = (async () => {
    throw new Error("quota épuisé");
  }) as typeof payload.sendEmail;
  await passer();
  dire(
    "⚠️ un envoi manqué ne pose aucune trace — repris demain",
    (await relire(b.id)).dernierRappelAvantTerme == null,
  );

  capturer();
  await passer();
  dire("et le passage suivant le reprend bien", pourLui(String(b.apprenantEmail)).length === 1);

  /* ── Les témoins : ceux qu'aucun rappel ne doit toucher ─────────────────── */
  const frais = await poser("frais", 1);
  const signe = await poser("signé", JOURS_DE_GRACE - premier, {
    contratDemandeLe: new Date().toISOString(),
    contratSigneLe: new Date().toISOString(),
    contratSignataire: "Épreuve Rappel signé",
  });

  capturer();
  await passer();
  dire(
    "un dossier tout neuf n'est pas rappelé",
    pourLui(String(frais.apprenantEmail)).length === 0,
  );
  /*
    ⚠️ Un contrat signé n'attend pas le même geste, et sa place ne court pas le
    même délai : lui écrire « demandez votre contrat » serait absurde.
  */
  dire(
    "⚠️ ni un contrat déjà signé",
    pourLui(String(signe.apprenantEmail)).length === 0,
    `${pourLui(String(signe.apprenantEmail)).length} message(s)`,
  );
} finally {
  payload.sendEmail = expediteur;
  for (const id of aSupprimer) {
    await payload.delete({ collection: "inscriptions", id, overrideAccess: true }).catch(() => {});
  }
  console.log(`\n  · ${aSupprimer.length} dossier(s) d'épreuve retirés`);
}

console.log(
  manques === 0
    ? "\n  On prévient pendant qu'il reste du temps, et une seule fois par seuil.\n"
    : `\n  ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
