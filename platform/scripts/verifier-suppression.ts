/**
 * Supprimer plusieurs dossiers d'une même session, depuis /admin.
 *
 * ── ⚠️ Le défaut, tel que la direction l'a rencontré ─────────────────────────
 * On coche des doublons dans la liste, on clique « Supprimer », on confirme —
 * et la fenêtre se referme sans un mot. Les dossiers sont toujours là. Vu de
 * l'écran, cela ressemble exactement à un « Annuler ».
 *
 * Dessous, la route répondait **400** : « Impossible de supprimer 3 sur 3 »,
 * et l'une des erreurs disait « Le champ suivant n'est pas valide : _locale,
 * _parent_id » — un message qui ne parle ni de session, ni de suppression.
 *
 * La cause : `afterDelete` est appelé **une fois par dossier**, et trois
 * dossiers de la même session font trois écritures concurrentes sur la même
 * ligne de `sessions`. Le recompte est désormais mis en file, par requête et
 * par session (`Inscriptions.ts`).
 *
 * ── ⚠️ Pourquoi ce contrôle passe par la route, et non par l'API locale ──────
 * `payload.delete({ where })` appelé depuis un script **réussissait déjà avant
 * le correctif** : il déroule les dossiers l'un après l'autre. Une garde écrite
 * de cette façon serait restée verte des deux côtés du défaut — le piège que
 * cette base a déjà rencontré sur la demande de rappel et sur le remplissage
 * des sessions.
 *
 * ── ⚠️ Et pourquoi elle n'est pas dans Playwright ────────────────────────────
 * La suppression est réservée à la direction (`delete: reserveA()`), quand le
 * compte des épreuves est en « pédagogie » : la série reçoit un 403, qui est
 * le bon refus. Le contrôle ouvre donc lui-même une session de direction, comme
 * `verifier-portes.ts`.
 *
 *   npx payload run scripts/verifier-suppression.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { ouvrirSession } from "@/lib/session";
import { DELETE } from "../src/app/(payload)/api/[...slug]/route.js";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  La suppression depuis /admin\n");

const payload = await getPayload({ config });
const MARQUE = "@epreuve.invalid";

/* ── Une session de direction, ouverte pour l'occasion ────────────────────── */
const email = `suppression.${Date.now()}${MARQUE}`;
const membre = await payload.create({
  collection: "utilisateurs",
  overrideAccess: true,
  data: {
    email,
    password: `S${Math.random().toString(36).slice(2)}!9`,
    nom: "Épreuve Suppression",
    role: "direction",
  } as never,
});
const cookie = await ouvrirSession(payload, "utilisateurs", membre.id);

const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 3,
  sort: "id",
  depth: 0,
  overrideAccess: true,
  where: { fin: { greater_than: new Date().toISOString() } },
});

const creer = async (sessionId: number | string, n: string) => {
  const d = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: sessionId,
      statut: "demandee",
      apprenantNom: `Épreuve ${n}`,
      apprenantEmail: `${n}.${Math.random().toString(36).slice(2)}${MARQUE}`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      echeances: [{ montant: 423, statut: "attendu" }],
      echanges: [{ quoi: "appel", le: new Date().toISOString() }],
    } as never,
  });
  return d.id as number;
};

/** Appelle la route REST comme le fait la liste de /admin quand on coche des lignes. */
const supprimerEnLot = async (ids: number[]) => {
  const requete = ids.map((id, i) => `where[and][0][id][in][${i}]=${id}`).join("&");
  const reponse = await DELETE(
    new Request(`http://localhost/api/inscriptions?limit=0&locale=fr&${requete}`, {
      method: "DELETE",
      /*
        ⚠️ Sans `origin` **et** `sec-fetch-site`, l'extraction de jeton de
        Payload refuse la requête depuis que `csrf` est réglé : aucun
        navigateur n'omet les deux, mais tout script le fait. Et l'origine doit
        être celle qui est déclarée, sinon le refus est le même.
      */
      headers: {
        cookie: cookie.split(";")[0] ?? "",
        origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "sec-fetch-site": "same-origin",
      },
    }),
    { params: Promise.resolve({ slug: ["inscriptions"] }) } as never,
  );
  const corps = (await reponse.json()) as { docs?: unknown[]; message?: string };
  return { code: reponse.status, supprimes: corps.docs?.length ?? 0, message: corps.message };
};

const restants = async (ids: number[]) =>
  (
    await payload.find({
      collection: "inscriptions",
      where: { id: { in: ids } },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    })
  ).totalDocs;

const aNettoyer: number[] = [];
try {
  /* ── Le cas qui échouait : trois doublons, donc une seule session ───────── */
  const meme = [
    await creer(sessions[0]!.id, "meme1"),
    await creer(sessions[0]!.id, "meme2"),
    await creer(sessions[0]!.id, "meme3"),
  ];
  aNettoyer.push(...meme);

  const r1 = await supprimerEnLot(meme);
  dire(
    "⚠️ trois dossiers d'une même session partent en une fois",
    r1.code === 200 && r1.supprimes === 3,
    `${r1.code} · ${r1.supprimes} supprimé(s)${r1.message ? ` · ${r1.message}` : ""}`,
  );
  dire("et ils sont partis de la base, pas seulement de la réponse", (await restants(meme)) === 0);

  /* ── Le décompte de places suit ─────────────────────────────────────────── */
  const apres = await payload.findByID({
    collection: "sessions",
    id: sessions[0]!.id,
    depth: 0,
    overrideAccess: true,
  });
  const compte = await payload.count({
    collection: "inscriptions",
    where: { session: { equals: sessions[0]!.id } },
    overrideAccess: true,
  });
  dire(
    "le recompte de places n'est pas resté en arrière",
    Number(apres.placesReservees ?? -1) <= compte.totalDocs,
    `${apres.placesReservees} réservée(s) pour ${compte.totalDocs} dossier(s)`,
  );

  /*
    ⚠️ Le témoin. Des dossiers de sessions différentes partaient **déjà** avant
    le correctif : un contrôle qui en prendrait trois au hasard serait resté
    vert avec le défaut. C'est la session partagée qui fait tout.
  */
  if (sessions.length >= 3) {
    const autres = [
      await creer(sessions[0]!.id, "autre1"),
      await creer(sessions[1]!.id, "autre2"),
      await creer(sessions[2]!.id, "autre3"),
    ];
    aNettoyer.push(...autres);
    const r2 = await supprimerEnLot(autres);
    dire(
      "témoin : trois sessions différentes partaient déjà",
      r2.code === 200 && r2.supprimes === 3,
      `${r2.code} · ${r2.supprimes} supprimé(s)`,
    );
  }
} finally {
  for (const id of aNettoyer) {
    await payload.delete({ collection: "inscriptions", id, overrideAccess: true }).catch(() => {});
  }
  await payload.delete({ collection: "utilisateurs", id: membre.id, overrideAccess: true });
  console.log("  · session de direction refermée, dossiers d'épreuve retirés");
}

console.log(
  manques === 0 ? "\n  Ce qu'on coche s'en va, et le dit.\n" : `\n  ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
