/**
 * Resend prévient, le site écrit — et personne d'autre ne peut écrire à sa place.
 *
 *   npx payload run scripts/verifier-webhook-resend.ts
 *
 * La route est appelée pour de vrai (`POST` importé), avec des appels signés
 * comme Resend les signe, et d'autres qui ne le sont pas. Ce qu'on regarde est
 * la ligne en base, pas seulement le statut HTTP : une route qui répondrait 200
 * sans rien écrire passerait sinon au vert.
 *
 * Les adresses sont en `@epreuve.invalid` et retirées en fin de passage.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { POST } from "@/app/(payload)/api/webhooks/resend/route";
import { signerCommeResend } from "@/lib/signature-resend";
import { noterLEnvoi } from "@/lib/courriels-envoyes";

const payload = await getPayload({ config });
let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const SECRET = `whsec_${Buffer.from("clef-d-epreuve-du-webhook-resend").toString("base64")}`;
const marque = Date.now().toString(36);
const adresse = `suivi.${marque}@epreuve.invalid`;
const idResend = `epreuve-${marque}`;
let numero = 0;

async function appeler(
  evenement: unknown,
  { signer = true, cle = SECRET, appel }: { signer?: boolean; cle?: string; appel?: string } = {},
) {
  const corps = JSON.stringify(evenement);
  const id = appel ?? `msg_${marque}_${(numero += 1)}`;
  const t = String(Math.floor(Date.now() / 1000));
  const entetes = new Headers({ "content-type": "application/json" });
  if (signer) {
    entetes.set("svix-id", id);
    entetes.set("svix-timestamp", t);
    entetes.set("svix-signature", signerCommeResend(cle, id, t, corps));
  }
  const r = await POST(
    new Request("http://localhost/api/webhooks/resend", {
      method: "POST",
      headers: entetes,
      body: corps,
    }),
  );
  return { statut: r.status, corps: (await r.json()) as { effet?: string }, appel: id };
}

const lire = async (id: string) =>
  (
    await payload.find({
      collection: "courriels",
      where: { resendId: { equals: id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0] as
    { statut?: string; detail?: string; evenements?: unknown[]; destinataire?: string } | undefined;

const evt = (type: string, id = idResend, extra: Record<string, unknown> = {}) => ({
  type,
  created_at: new Date().toISOString(),
  data: { email_id: id, to: [adresse], subject: "Épreuve du suivi", ...extra },
});

try {
  console.log("\n▸ La porte\n");

  const sansCle = process.env.RESEND_WEBHOOK_SECRET;
  delete process.env.RESEND_WEBHOOK_SECRET;
  const ferme = await appeler(evt("email.delivered"));
  dire("⚠️ sans clef configurée, la route ne s'ouvre pas", ferme.statut === 503, `${ferme.statut}`);
  process.env.RESEND_WEBHOOK_SECRET = SECRET;

  const nonSigne = await appeler(evt("email.delivered"), { signer: false });
  dire("un appel non signé est refusé", nonSigne.statut === 401, `${nonSigne.statut}`);
  const faux = await appeler(evt("email.delivered"), {
    cle: `whsec_${Buffer.from("une-clef-que-personne-n-a-donnee").toString("base64")}`,
  });
  dire("⚠️ un appel signé d'une autre clef est refusé", faux.statut === 401, `${faux.statut}`);
  dire("et aucun des deux n'a rien écrit", (await lire(idResend)) === undefined);

  console.log("\n▸ L'envoi, puis ce que Resend en dit\n");

  await noterLEnvoi(payload, { to: adresse, subject: "Épreuve du suivi", id: idResend });
  dire("l'envoi est noté « parti »", (await lire(idResend))?.statut === "envoye");

  const remis = await appeler(evt("email.delivered"));
  dire(
    "témoin : un appel signé passe",
    remis.statut === 200,
    `${remis.statut} · ${remis.corps.effet}`,
  );
  dire("et le courriel passe à « remis »", (await lire(idResend))?.statut === "delivre");

  const rejoue = await appeler(evt("email.delivered"), { appel: remis.appel });
  const apres = await lire(idResend);
  dire(
    "⚠️ un appel rejoué ne compte qu'une fois",
    rejoue.corps.effet === "deja-vu" && (apres?.evenements?.length ?? 0) === 1,
    `${rejoue.corps.effet} · ${apres?.evenements?.length} événement(s)`,
  );

  await appeler(evt("email.delivery_delayed"));
  dire(
    "⚠️ un « retardé » arrivé après le « remis » ne le recouvre pas",
    (await lire(idResend))?.statut === "delivre",
  );

  await appeler(evt("email.bounced", idResend, { bounce: { message: "Mailbox does not exist" } }));
  const rejete = await lire(idResend);
  dire(
    "un rejet s'écrit, avec sa raison",
    rejete?.statut === "rejete" && rejete?.detail === "Mailbox does not exist",
    `${rejete?.statut} · ${rejete?.detail}`,
  );

  console.log("\n▸ Deux appels au même instant\n");

  /*
    ⚠️ Le cas réel : Resend envoie « parti » et « remis » presque ensemble. Sans
    verrou, le dernier à écrire gagne, et « parti » peut recouvrir « remis » —
    pour toujours. Répété dix fois, parce qu'une course ne se montre pas à
    chaque tirage.
  */
  let perdus = 0;
  let evenementsPerdus = 0;
  for (let i = 0; i < 10; i += 1) {
    const id = `${idResend}-course-${i}`;
    await noterLEnvoi(payload, { to: adresse, subject: "Épreuve du suivi", id });
    await Promise.all([
      appeler(evt("email.sent", id)),
      appeler(evt("email.delivered", id)),
      appeler(evt("email.sent", id)),
    ]);
    const l = await lire(id);
    if (l?.statut !== "delivre") perdus += 1;
    if ((l?.evenements?.length ?? 0) !== 3) evenementsPerdus += 1;
  }
  dire(
    "⚠️ « remis » n'est jamais recouvert par un « parti » simultané",
    perdus === 0,
    `${perdus} sur 10`,
  );
  dire(
    "et aucun des trois événements ne se perd",
    evenementsPerdus === 0,
    `${evenementsPerdus} sur 10`,
  );

  console.log("\n▸ Ce qui n'a pas été noté au départ\n");

  const inconnu = `${idResend}-inconnu`;
  const cree = await appeler(evt("email.bounced", inconnu));
  const ligne = await lire(inconnu);
  dire(
    "un courriel parti avant le suivi est créé par son premier événement",
    cree.corps.effet === "cree" && ligne?.statut === "rejete" && ligne?.destinataire === adresse,
    `${cree.corps.effet} · ${ligne?.statut}`,
  );

  await noterLEnvoi(payload, { to: adresse, subject: "Épreuve du suivi", id: inconnu });
  dire(
    "⚠️ l'envoi noté après l'appel ne ramène pas l'état à « parti »",
    (await lire(inconnu))?.statut === "rejete",
  );

  const apiAvant = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  const avant = (
    await payload.count({
      collection: "courriels",
      where: { destinataire: { equals: adresse } },
      overrideAccess: true,
    })
  ).totalDocs;
  await noterLEnvoi(payload, { to: adresse, subject: "Épreuve du suivi", erreur: "simulée" });
  await noterLEnvoi(payload, { to: adresse, subject: "Épreuve du suivi" });
  const apresDev = (
    await payload.count({
      collection: "courriels",
      where: { destinataire: { equals: adresse } },
      overrideAccess: true,
    })
  ).totalDocs;
  dire(
    "sans expéditeur réel (développement), rien n'est noté",
    apresDev === avant,
    `${avant} → ${apresDev}`,
  );
  if (apiAvant) process.env.RESEND_API_KEY = apiAvant;

  const ignore = await appeler({ type: "domain.updated", data: {} });
  dire(
    "un événement qui ne concerne pas un courriel répond 200, sans rien écrire",
    ignore.statut === 200 && ignore.corps.effet === "ignore",
  );

  console.log("\n▸ Personne d'autre n'écrit\n");
  const acces = payload.collections.courriels.config.access;
  dire(
    "la collection ne se crée ni ne se modifie par l'API",
    acces.create?.({ req: {} } as never) === false &&
      acces.update?.({ req: {} } as never) === false,
  );
  dire("⚠️ un anonyme ne la lit pas", acces.read?.({ req: {} } as never) === false);
  if (sansCle) process.env.RESEND_WEBHOOK_SECRET = sansCle;
} finally {
  await payload.delete({
    collection: "courriels",
    where: { destinataire: { like: "@epreuve.invalid" } },
    overrideAccess: true,
  });
}

console.log(manques === 0 ? "\n  Tout tient.\n" : `\n  ${manques} contrôle(s) au rouge.\n`);
process.exit(manques === 0 ? 0 : 1);
