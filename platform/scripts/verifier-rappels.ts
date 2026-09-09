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
import { dernierSuivi } from "@/lib/suivi";
import { ouvrirSession } from "@/lib/session";

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

  /*
    ⚠️ **L'équipe doit voir que le courriel est parti.** Sans cette ligne au
    journal, un collègue appellerait en disant « vous n'avez rien reçu de nous »
    à quelqu'un relancé le matin même — exactement ce que ce journal existe pour
    empêcher.
  */
  const journalA = ((await relire(a.id)).echanges ?? []) as { quoi?: string }[];
  dire(
    "⚠️ le journal du dossier le montre, et la colonne le lit",
    journalA.some((e) => e.quoi === "rappel") &&
      dernierSuivi(journalA as never, new Date()).libelle.startsWith("Rappel par courriel"),
    dernierSuivi(journalA as never, new Date()).libelle,
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
  /* ── ⚠️ Le bouton d'envoi, et la porte qui le garde ─────────────────────── */
  /*
    `apprenants` est une collection authentifiée elle aussi : sans le second
    contrôle, n'importe quel participant connecté ferait partir des courriels au
    nom de la maison. C'est le trou trouvé sur `api/admin/export-admissions`.
  */
  const { POST } = await import("../src/app/(payload)/api/admin/rappel/route.js");
  const COMME_UN_NAVIGATEUR = {
    "content-type": "application/json",
    origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "sec-fetch-site": "same-origin",
  };
  /*
    ⚠️ **Un plantage n'est pas un refus, et il ne doit pas passer pour tel.**
    La porte affaiblie ne renvoyait pas 200 : elle levait, sur la clef étrangère
    de `par_id`. Le `await` rejetait, le script mourait sans rien afficher — donc
    sans rouge. On attrape donc l'exception et on la rend comme un statut
    impossible : le contrôle voit alors la différence entre « refusé » et
    « cassé », qui ne protègent pas la même chose. La clef étrangère n'est pas
    une garde : le jour où l'identifiant d'un participant coïnciderait avec
    celui d'un membre de l'équipe, le courriel partirait.
  */
  const demander = async (id: unknown, cookie?: string) => {
    try {
      return await POST(
        new Request("http://localhost/api/admin/rappel", {
          method: "POST",
          headers: {
            ...COMME_UN_NAVIGATEUR,
            ...(cookie ? { cookie: cookie.split(";")[0]! } : {}),
          },
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

  const c = await poser("C", JOURS_DE_GRACE - premier);

  capturer();
  const anonyme = await demander(c.id);
  dire("⚠️ sans session, la route refuse", anonyme.status === 401, `reçu ${anonyme.status}`);
  dire("et rien n'est parti", recus.length === 0);

  const participant = await payload.create({
    collection: "apprenants",
    overrideAccess: true,
    /*
      ⚠️ Sans ce drapeau, Payload envoie son courriel de confirmation dès que
      `auth.verify` est configuré — et la création échoue si l'envoi échoue.
      Ici l'expéditeur est justement remplacé.
    */
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
    ⚠️ **On prouve d'abord que ce cookie authentifie.** Sans cela, le contrôle
    d'à côté ne mesure rien : un cookie muet reçoit 401 pour la mauvaise raison,
    et la garde resterait verte même si la route ne regardait plus que
    « connecté ». C'est ce qui est arrivé au premier jet — retirer le contrôle
    `collection === "utilisateurs"` ne faisait rien passer au rouge.
  */
  const quiEstCe = await payload.auth({
    /*
      ⚠️ `origin` et `sec-fetch-site` ne sont pas décoratifs : depuis que `csrf`
      est réglé, l'extraction de jeton refuse une requête qui n'a ni l'un ni
      l'autre — ce qu'aucun navigateur ne produit, mais que tout script fait.
      Sans eux, on conclut qu'une session valide n'authentifie pas.
    */
    headers: new Headers({
      ...COMME_UN_NAVIGATEUR,
      cookie: cookieParticipant.split(";")[0]!,
    }),
  });
  dire(
    "⚠️ le cookie du participant authentifie bien — sinon le contrôle suivant est vide",
    quiEstCe.user?.collection === "apprenants",
    quiEstCe.user ? String(quiEstCe.user.collection) : "personne",
  );

  capturer();
  const cotePart = await demander(c.id, cookieParticipant);
  dire(
    "⚠️ un compte participant connecté est refusé aussi",
    cotePart.status === 401,
    `reçu ${cotePart.status}`,
  );
  dire("et rien n'est parti non plus", recus.length === 0);

  const membre = await payload.create({
    collection: "utilisateurs",
    overrideAccess: true,
    data: {
      email: `rappel.${Date.now()}@epreuve.invalid`,
      password: `R${Math.random().toString(36).slice(2)}!8`,
      nom: "Épreuve Rappel",
      role: "direction",
    } as never,
  });
  const cookieEquipe = await ouvrirSession(payload, "utilisateurs", membre.id);

  capturer();
  const equipe = await demander(c.id, cookieEquipe);
  dire("l'équipe, elle, envoie", equipe.status === 200, `reçu ${equipe.status}`);
  dire(
    "un courriel part vraiment",
    pourLui(String(c.apprenantEmail)).length === 1,
    pourLui(String(c.apprenantEmail))[0]?.subject ?? "",
  );
  const journalC = ((await relire(c.id)).echanges ?? []) as { quoi?: string; par?: unknown }[];
  dire(
    "⚠️ et la ligne du journal porte le nom de qui l'a envoyé",
    journalC.some((e) => e.quoi === "rappel" && String(e.par) === String(membre.id)),
  );

  /*
    ⚠️ Un envoi manuel ne rouvre pas un palier que la tâche a consommé, et n'en
    ferme pas les suivants : `envoyerLeRappel` ne garde que le plus petit.
  */
  capturer();
  await passer();
  dire(
    "⚠️ la tâche ne double pas un envoi manuel du même jour",
    pourLui(String(c.apprenantEmail)).length === 0,
    `${pourLui(String(c.apprenantEmail)).length} message(s)`,
  );

  /* Le délai atteint : ce n'est plus ce message-là qui doit partir. */
  const d = await poser("D", JOURS_DE_GRACE + 1);
  capturer();
  const tropTard = await demander(d.id, cookieEquipe);
  dire(
    "⚠️ passé le terme, la route refuse et le dit",
    tropTard.status === 409,
    ((await tropTard.json()) as { erreur?: string }).erreur ?? `reçu ${tropTard.status}`,
  );

  await payload
    .delete({ collection: "utilisateurs", id: membre.id, overrideAccess: true })
    .catch(() => {});
  await payload
    .delete({ collection: "apprenants", id: participant.id, overrideAccess: true })
    .catch(() => {});
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
