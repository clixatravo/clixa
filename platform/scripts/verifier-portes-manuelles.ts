/**
 * Les deux portes que la direction a demandées le 11 septembre 2026 : relancer
 * un paiement à la main, et rendre une place à la main.
 *
 * ── ⚠️ Ce que cette garde protège ───────────────────────────────────────────
 * La tâche de 8 h rendait les places toute seule ; ce geste lui a été retiré
 * pour être confié à l'équipe. Deux choses peuvent alors mal tourner, et elles
 * sont opposées :
 *
 * 1. **La place se rend trop tôt.** Le participant a lu « votre place est tenue
 *    jusqu'au X », puis « le délai est passé, elle n'est pas encore repartie ».
 *    La reprendre avant le battement de deux jours lui retirerait un délai
 *    promis par écrit.
 * 2. **Elle ne se rend jamais.** Plus rien ne libère une place : si la porte
 *    refuse toujours, une session compte indéfiniment des gens qui ne viendront
 *    pas — le défaut que les sept jours avaient corrigé le 28 août 2026.
 *
 * Les deux sont éprouvés ici, l'un contre l'autre.
 *
 * ⚠️ **Une session d'équipe, pas seulement une session.** `apprenants` est
 * authentifiée elle aussi. La garde **prouve d'abord que le cookie participant
 * authentifie** : sans cette prémisse, un cookie muet reçoit 401 pour la
 * mauvaise raison et le contrôle resterait vert même si la route ne regardait
 * plus que « connecté ». C'est ce qui est arrivé au premier jet de
 * `verifier-rappels.ts`.
 *
 *   npx payload run scripts/verifier-portes-manuelles.ts
 *
 * ⚠️ Ne pas le lancer pendant que `next dev` tourne : les deux écrivent sur la
 * même ligne de `sessions`, et Postgres finit par signaler un interblocage.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { JOURS_DE_BATTEMENT, JOURS_DE_GRACE } from "@/lib/places";
import { ouvrirSession } from "@/lib/session";

const payload = await getPayload({ config });
const expediteur = payload.sendEmail.bind(payload);

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  Les portes manuelles\n");

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

let recus: { to?: string; subject?: string }[] = [];
const capturer = () => {
  recus = [];
  /*
    ⚠️ On remplace `payload.sendEmail`, pas `payload.email` : sans adaptateur
    configuré — le cas en développement — Payload ne délègue pas et rend la main
    sans erreur. On croirait éprouver l'envoi en mesurant le néant.
  */
  payload.sendEmail = (async (m: { to?: string; subject?: string }) => {
    recus.push(m);
    return {};
  }) as typeof payload.sendEmail;
};

const aSupprimer: (string | number)[] = [];

const poser = async (nom: string, jours: number, extra: Record<string, unknown> = {}) => {
  const d = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: sessions[0]!.id,
      statut: "demandee",
      apprenantNom: `Épreuve Porte ${nom}`,
      apprenantEmail: `porte.${Math.random().toString(36).slice(2)}@epreuve.invalid`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      echeances: [
        { montant: 423, statut: "attendu", dateLimite: new Date().toISOString().slice(0, 10) },
      ],
      ...extra,
    } as never,
  });
  aSupprimer.push(d.id);
  // Une demi-journée de marge : posé pile sur le seuil, le cas bascule au gré des secondes.
  await payload.db.drizzle.execute(
    `UPDATE inscriptions SET created_at = now() - interval '${jours * 24 + 12} hours' WHERE id = ${d.id}` as never,
  );
  return d;
};

const relire = async (id: string | number) =>
  payload.findByID({ collection: "inscriptions", id, overrideAccess: true, depth: 0 });

const COMME_UN_NAVIGATEUR = {
  "content-type": "application/json",
  origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  "sec-fetch-site": "same-origin",
};

const { POST: POST_PAIEMENT } =
  await import("../src/app/(payload)/api/admin/relance-paiement/route.js");
const { POST: POST_PLACE } =
  await import("../src/app/(payload)/api/admin/rendre-la-place/route.js");

/*
  ⚠️ **Un plantage n'est pas un refus.** Une porte affaiblie peut lever au lieu
  de répondre — sur une clef étrangère, par exemple — et le script mourrait sans
  afficher de rouge. On rend l'exception comme un statut 500, que les contrôles
  distinguent d'un refus. La clef étrangère n'est pas une garde.
*/
const appeler = async (
  route: (r: Request) => Promise<Response>,
  chemin: string,
  id: unknown,
  cookie?: string,
) => {
  try {
    return await route(
      new Request(`http://localhost${chemin}`, {
        method: "POST",
        headers: { ...COMME_UN_NAVIGATEUR, ...(cookie ? { cookie: cookie.split(";")[0]! } : {}) },
        body: JSON.stringify({ id }),
      }),
    );
  } catch (e) {
    return {
      status: 500,
      json: async () => ({ erreur: `a levé : ${(e as Error).message.slice(0, 80)}` }),
    } as Response;
  }
};

const relancer = (id: unknown, cookie?: string) =>
  appeler(POST_PAIEMENT, "/api/admin/relance-paiement", id, cookie);
const rendre = (id: unknown, cookie?: string) =>
  appeler(POST_PLACE, "/api/admin/rendre-la-place", id, cookie);

let membre: { id: number | string } | undefined;
let participant: { id: number | string } | undefined;

try {
  /* ── Qui a le droit ─────────────────────────────────────────────────────── */
  const a = await poser("A", 0);

  capturer();
  dire("⚠️ sans session, la relance paiement refuse", (await relancer(a.id)).status === 401);
  dire("⚠️ sans session, rendre la place refuse", (await rendre(a.id)).status === 401);
  dire("et rien n'est parti", recus.length === 0);

  participant = await payload.create({
    collection: "apprenants",
    overrideAccess: true,
    disableVerificationEmail: true,
    data: {
      email: `part.${Date.now()}@epreuve.invalid`,
      password: `mp-${Math.random().toString(36).slice(2)}`,
      nom: "Épreuve Participant",
      _verified: true,
    } as never,
  });
  const cookieParticipant = await ouvrirSession(payload, "apprenants", participant.id);

  /*
    ⚠️ La prémisse, prouvée avant la conclusion : ce cookie authentifie
    vraiment. Sans elle, le 401 d'à côté pourrait tomber pour la mauvaise raison
    et la garde resterait verte avec la porte grande ouverte.
  */
  const quiEstCe = await payload.auth({
    headers: new Headers({
      ...COMME_UN_NAVIGATEUR,
      cookie: cookieParticipant.split(";")[0]!,
    }),
  });
  dire(
    "⚠️ (prémisse) le cookie participant authentifie bien",
    quiEstCe.user?.collection === "apprenants",
    quiEstCe.user?.collection ?? "aucun",
  );
  dire(
    "⚠️ un participant connecté ne relance pas un paiement",
    (await relancer(a.id, cookieParticipant)).status === 401,
  );
  dire(
    "⚠️ un participant connecté ne rend pas une place",
    (await rendre(a.id, cookieParticipant)).status === 401,
  );

  membre = await payload.create({
    collection: "utilisateurs",
    overrideAccess: true,
    data: {
      email: `equipe.${Date.now()}@epreuve.invalid`,
      password: `mp-${Math.random().toString(36).slice(2)}`,
      nom: "Épreuve Équipe",
      role: "direction",
    } as never,
  });
  const cookieEquipe = await ouvrirSession(payload, "utilisateurs", membre.id);

  /* ── La relance de paiement ─────────────────────────────────────────────── */
  console.log("\n  Relancer un paiement\n");

  /*
    ⚠️ Le contrôle qui compte : on ne réclame rien à qui n'a nulle part où
    l'envoyer. Les coordonnées ne figurent nulle part sur le site — elles partent
    par courriel après la signature. Ce défaut a coûté un vrai prospect le
    5 septembre 2026, une porte plus loin.
  */
  capturer();
  const sansCoordonnees = await relancer(a.id, cookieEquipe);
  dire(
    "⚠️ sans coordonnées envoyées, la route refuse et le dit",
    sansCoordonnees.status === 409,
    ((await sansCoordonnees.json()) as { erreur?: string }).erreur ?? "",
  );
  dire("et aucun courriel n'est parti", recus.length === 0);

  const b = await poser("B", 0, {
    contratSigneLe: new Date().toISOString(),
    coordonneesEnvoyeesLe: new Date().toISOString(),
  });
  capturer();
  const relance = await relancer(b.id, cookieEquipe);
  dire("l'équipe relance", relance.status === 200, `reçu ${relance.status}`);
  dire(
    "un courriel part vraiment",
    recus.filter((m) => m.to === b.apprenantEmail).length === 1,
    recus[0]?.subject ?? "aucun",
  );
  const relu = await relire(b.id);
  const echeances = (relu.echeances ?? []) as { relanceeLe?: string | null }[];
  /*
    ⚠️ La trace fait taire cette échéance pour la tâche du lendemain : sans
    elle, l'équipe relance à la main le soir et la machine relance le matin.
  */
  dire("⚠️ et l'échéance porte la trace de l'envoi", Boolean(echeances[0]?.relanceeLe));
  const journal = (relu.echanges ?? []) as { quoi?: string; par?: unknown }[];
  dire(
    "⚠️ et le journal porte le nom de qui l'a envoyée",
    journal.some((e) => e.quoi === "paiement" && String(e.par) === String(membre!.id)),
  );

  /* ── Rendre la place ────────────────────────────────────────────────────── */
  console.log("\n  Rendre une place\n");

  /*
    ⚠️ Trois refus, et chacun protège un cas distinct. Les écrire séparément
    évite qu'un « 409 » quelconque passe pour la bonne raison.
  */
  const jamaisPrevenu = await poser("Jamais prévenu", JOURS_DE_GRACE + 5);
  const r1 = await rendre(jamaisPrevenu.id, cookieEquipe);
  dire(
    "⚠️ jamais prévenu : on ne lui reprend rien",
    r1.status === 409,
    ((await r1.json()) as { erreur?: string }).erreur ?? "",
  );

  const dansLeBattement = await poser("Dans le battement", JOURS_DE_GRACE + 1, {
    placeRappeleeLe: new Date().toISOString(),
  });
  const r2 = await rendre(dansLeBattement.id, cookieEquipe);
  dire(
    "⚠️ annoncé aujourd'hui : le battement court encore",
    r2.status === 409,
    ((await r2.json()) as { erreur?: string }).erreur ?? "",
  );

  const signe = await poser("Signé", JOURS_DE_GRACE + 5, {
    contratSigneLe: new Date().toISOString(),
  });
  const r3 = await rendre(signe.id, cookieEquipe);
  dire(
    "⚠️ un contrat signé tient sa place sans terme",
    r3.status === 409,
    ((await r3.json()) as { erreur?: string }).erreur ?? "",
  );

  /*
    ⚠️ **Et le cas qui doit passer.** Sans lui, une porte qui refuserait tout
    passerait au vert — et plus aucune place ne reviendrait jamais au catalogue,
    ce qui est l'autre moitié du danger.
  */
  const murr = await poser("Battement écoulé", JOURS_DE_GRACE + 5, {
    placeRappeleeLe: new Date(Date.now() - (JOURS_DE_BATTEMENT + 1) * 86_400_000).toISOString(),
  });
  const avant = Number(
    (
      await payload.findByID({
        collection: "sessions",
        id: sessions[0]!.id,
        depth: 0,
        overrideAccess: true,
      })
    ).placesReservees ?? 0,
  );
  const ok = await rendre(murr.id, cookieEquipe);
  dire("le battement écoulé, l'équipe rend la place", ok.status === 200, `reçu ${ok.status}`);
  dire("⚠️ et le dossier passe en « Annulée »", (await relire(murr.id)).statut === "annulee");
  const apres = Number(
    (
      await payload.findByID({
        collection: "sessions",
        id: sessions[0]!.id,
        depth: 0,
        overrideAccess: true,
      })
    ).placesReservees ?? 0,
  );
  /*
    ⚠️ Le décompte, pas seulement le statut : c'est lui que le site public
    affiche, et le crochet `recompter` est le seul à le tenir. Un statut changé
    sans recompte laisserait la place occupée pour tout le monde sauf pour nous.
  */
  dire(`⚠️ et la session récupère la place (${avant} → ${apres})`, apres === avant - 1);

  const deuxFois = await rendre(murr.id, cookieEquipe);
  dire("⚠️ une seconde fois est refusée", deuxFois.status === 409);
} finally {
  payload.sendEmail = expediteur;
  for (const id of aSupprimer) {
    await payload.delete({ collection: "inscriptions", id, overrideAccess: true }).catch(() => {});
  }
  if (membre) {
    await payload
      .delete({ collection: "utilisateurs", id: membre.id, overrideAccess: true })
      .catch(() => {});
  }
  if (participant) {
    await payload
      .delete({ collection: "apprenants", id: participant.id, overrideAccess: true })
      .catch(() => {});
  }
  console.log(`\n  · ${aSupprimer.length} dossier(s) d'épreuve retirés`);
}

console.log(
  manques === 0
    ? "\n  Les deux portes s'ouvrent quand il faut, et pas avant.\n"
    : `\n  ${manques} contrôle(s) au rouge.\n`,
);
process.exit(manques > 0 ? 1 : 0);
