/**
 * Ce que l'attestation promet, et quand elle le promet.
 *
 * ── ⚠️ Pourquoi ce document mérite une garde à lui ──────────────────────────
 * Il circule hors de nos murs. Le participant l'imprime pour son employeur,
 * pour une banque, parfois pour un dossier de visa — et il porte les mots
 * « fait foi ». Une phrase qui bascule au mauvais moment ne casse ni type ni
 * compilation : elle promet simplement une admission qui n'est pas acquise, à
 * quelqu'un qui la présentera à un guichet.
 *
 * Jusqu'au 7 septembre 2026, deux épreuves seulement le touchaient — l'une pour
 * l'échappement du HTML, l'autre pour la cadence. **Aucune ne lisait ce qu'il
 * dit.** Il s'intitulait « Attestation Officielle d'Admission » sur un dossier
 * qui n'avait rien versé, et personne n'aurait vu la différence.
 *
 * ── ⚠️ Et le courriel du versement, qui part avec ──────────────────────────
 * Le même geste d'équipe encaisse et prévient. Un message qui ne partirait pas
 * laisserait quelqu'un qui vient de faire un transfert international sans la
 * seule confirmation qu'il attend ; un message qui partirait deux fois lui
 * ferait croire à un second débit.
 *
 *   npx payload run scripts/verifier-attestation.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { GET } from "../src/app/(payload)/api/attestation/[reference]/route.js";

const payload = await getPayload({ config });

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

/*
  ⚠️ On intercepte l'expéditeur plutôt que de compter sur l'absence
  d'adaptateur : sans adaptateur, Payload journalise et rend la main sans
  erreur, si bien qu'on mesurerait le chemin nominal en croyant mesurer les
  envois. Même piège que `verifier-relances.ts`.
*/
const sujets: string[] = [];
payload.sendEmail = (async (m: { subject?: string }) => {
  sujets.push(String(m.subject ?? ""));
  return {};
}) as never;

const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 1,
  sort: "id",
  overrideAccess: true,
  where: { fin: { greater_than: new Date().toISOString() } },
});
const session = sessions[0];
if (!session) {
  console.log("\n  Aucune session à venir : rien à éprouver.\n");
  process.exit(0);
}

console.log("\n  L'attestation d'admission\n");

let id: number | string | undefined;

try {
  const d = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: session.id,
      statut: "demandee",
      apprenantNom: "Épreuve Attestation",
      apprenantEmail: `attestation.${Date.now()}@epreuve.invalid`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P3",
      /*
        ⚠️ Trois échéances, exprès. C'est le seul plan où le **deuxième**
        versement ne déplace pas le statut du dossier — et c'est le cas qui
        se serait encaissé en silence si le crochet lisait le statut au lieu
        de compter les échéances réglées.
      */
      echeances: [
        { montant: 170, statut: "attendu" },
        { montant: 150, statut: "attendu" },
        { montant: 150, statut: "attendu" },
      ],
    } as never,
  });
  id = d.id;

  /*
    ⚠️ **Les blancs sont ramenés à un seul espace avant toute comparaison**, et
    ce n'est pas de la commodité. Deux pièges ont fait échouer le premier jet de
    ce script sur un document parfaitement juste :

    - le gabarit **coupe ses lignes** — « qu'après l'accomplissement de\n
      l'ensemble » — et une phrase cherchée d'un bloc n'y est jamais ;
    - `Intl.NumberFormat("fr-FR")` sépare le montant du symbole par une
      **espace insécable étroite** (U+202F), pas par l'espace qu'on tape.
      « 170,00 € » écrit à la main ne correspond donc à rien.

    Les deux échouent en accusant le code, ce qui est la pire façon de perdre
    une heure. Le second est en plus le format que le participant lit.
  */
  const platir = (t: string) => t.replace(/[\s\u00a0\u202f]+/g, " ");

  const lire = async (): Promise<string> => {
    const r = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ reference: String(d.reference) }),
    });
    return r.text();
  };

  /** Marque la première échéance non réglée, comme le bouton de /admin. */
  const encaisser = async () => {
    sujets.length = 0;
    const relu = await payload.findByID({
      collection: "inscriptions",
      id: d.id,
      overrideAccess: true,
    });
    const echeances = (relu.echeances ?? []) as { statut?: string | null }[];
    const rang = echeances.findIndex((e) => e?.statut !== "regle");
    await payload.update({
      collection: "inscriptions",
      id: d.id,
      overrideAccess: true,
      data: {
        echeances: echeances.map((e, i) =>
          i === rang ? { ...e, statut: "regle", regleLe: new Date().toISOString() } : e,
        ),
      } as never,
    });
  };

  // ── 1. Tant que rien n'est réglé ──────────────────────────────────────────
  const avant = await lire();

  dire(
    "⚠️ le titre annonce une admission provisoire",
    avant.includes("Attestation d'Admission Provisoire") &&
      !avant.includes("Attestation Officielle"),
  );
  /*
    ⚠️ La phrase est dictée par la direction, mot pour mot. La reproduire ici
    est le seul moyen qu'une réécriture bien intentionnée ne la vide pas de sa
    portée juridique sans que rien ne le signale.
  */
  dire(
    "⚠️ la réserve dictée par la direction y figure",
    platir(avant).includes(
      "ne vaut admission officielle qu'après l'accomplissement de l'ensemble des formalités",
    ),
  );
  dire("elle est encadrée, pas noyée dans le texte", avant.includes('class="reserve"'));
  dire(
    "⚠️ il ne promet pas de faire foi",
    !avant.includes("fait foi pour l'ensemble des démarches"),
  );
  dire("le statut se lit en français, pas en mot de la base", !avant.includes(">demandee<"));
  dire("aucun règlement n'est annoncé", avant.includes("Aucun règlement enregistré"));

  /*
    ── ⚠️ Le siège est à Agadir ──────────────────────────────────────────────
    Le document portait « CLIXA Institute Casablanca Campus » et « Campus
    Casablanca & Hubs Régionaux Panafricains ». Le contrat, signé par la même
    personne, désigne Agadir ; les mentions légales aussi. Deux documents de la
    même maison ne pouvaient pas se contredire là-dessus — et celui-ci est
    précisément celui qu'on présente à un tiers.
  */
  dire("⚠️ le siège annoncé est Agadir, jamais Casablanca", !avant.includes("Casablanca"));
  dire(
    "et le pied porte l'identité légale, comme le contrat",
    avant.includes("RC 67759") && avant.includes("003917718000017") && avant.includes("Agadir"),
  );

  // ── 2. Le premier versement ───────────────────────────────────────────────
  await encaisser();
  dire(
    "⚠️ un versement reçu prévient le participant",
    sujets.filter((s) => /Versement reçu/.test(s)).length === 1,
    sujets.join(" | ") || "aucun courriel",
  );

  const apres = await lire();
  dire("⚠️ l'attestation devient officielle", apres.includes("Attestation Officielle d'Admission"));
  dire("et la réserve disparaît", !apres.includes("ne vaut admission officielle"));
  dire("elle fait alors foi, et le dit", apres.includes("fait foi pour l'ensemble des démarches"));
  dire("le montant reçu est en euros, pas un nombre nu", platir(apres).includes("170,00 € reçus"));

  // ── 3. Ce qui ne doit rien envoyer ────────────────────────────────────────
  /*
    ⚠️ « Vide avant, rempli maintenant », la garde de tous les autres messages :
    sans elle, chaque enregistrement du dossier — une note ajoutée, une date
    corrigée — renverrait la confirmation, et l'équipe cesserait de la lire.
  */
  sujets.length = 0;
  await payload.update({
    collection: "inscriptions",
    id: d.id,
    overrideAccess: true,
    data: { apprenantPays: "Maroc" } as never,
  });
  dire(
    "⚠️ un enregistrement sans versement n'envoie rien",
    sujets.length === 0,
    sujets.join(" | "),
  );

  // ── 4. Le deuxième versement, celui que le statut ne voit pas ─────────────
  /*
    ⚠️ Le statut est passé « confirmée » au premier versement et n'ira à
    « payée » qu'au dernier. Le deuxième ne le déplace donc pas : un crochet qui
    lirait le statut se tairait ici, et le participant aurait viré 150 € sans
    un mot en retour.
  */
  const statutAvant = (
    await payload.findByID({ collection: "inscriptions", id: d.id, overrideAccess: true })
  ).statut;
  await encaisser();
  const statutApres = (
    await payload.findByID({ collection: "inscriptions", id: d.id, overrideAccess: true })
  ).statut;
  dire(
    "⚠️ le deuxième versement ne déplace pas le statut du dossier",
    statutAvant === statutApres,
    `${statutAvant} → ${statutApres}`,
  );
  dire(
    "⚠️ et il prévient quand même le participant",
    sujets.filter((s) => /Versement reçu/.test(s)).length === 1,
    sujets.join(" | ") || "aucun courriel",
  );

  // ── 5. Le solde ───────────────────────────────────────────────────────────
  await encaisser();
  dire(
    "⚠️ le dernier versement le dit autrement",
    sujets.filter((s) => /Formation réglée/.test(s)).length === 1,
    sujets.join(" | ") || "aucun courriel",
  );

  const solde = await lire();
  dire("l'attestation reste officielle", solde.includes("Attestation Officielle d'Admission"));
  dire(
    "et le dossier est réglé intégralement",
    (await payload.findByID({ collection: "inscriptions", id: d.id, overrideAccess: true }))
      .statut === "payee",
  );
} finally {
  if (id !== undefined) {
    await payload.delete({ collection: "inscriptions", id, overrideAccess: true });
    console.log("\n  · dossier d'épreuve supprimé");
  }
}

console.log(
  manques === 0
    ? "\n  L'attestation ne promet que ce qui est acquis.\n"
    : `\n  ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
