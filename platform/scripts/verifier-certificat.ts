/**
 * Éprouve le certificat professionnel — le document, pas seulement le champ.
 *
 * ── Ce qui doit rester vrai ──────────────────────────────────────────────────
 * 1. La date « Fait le » se pose une fois, au premier passage à « Terminée »,
 *    et ne bouge plus ensuite — sans quoi deux téléchargements du même
 *    certificat porteraient deux dates différentes.
 * 2. Le participant en est prévenu par courriel, une seule fois — la même
 *    garde « vide avant, rempli maintenant » que le contrat vérifié et les
 *    instructions de paiement.
 * 3. Le PDF ne se rend qu'une fois le dossier réellement terminé : ni avant,
 *    ni pour un dossier qui n'existe pas.
 *
 * On ne lit pas le code pour le croire : on crée un dossier, on le fait
 * passer par les mêmes états qu'un vrai, et on ouvre le PDF qui en sort.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { GET as TELECHARGER_CERTIFICAT } from "../src/app/(frontend)/inscription/[reference]/certificat/route.js";

const payload = await getPayload({ config });

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const envoyes: Record<string, unknown>[] = [];
const expediteur = payload.sendEmail.bind(payload);
const aSupprimer: (string | number)[] = [];

const appeler = async (reference: string) =>
  TELECHARGER_CERTIFICAT(new Request(`http://localhost/inscription/${reference}/certificat`), {
    params: Promise.resolve({ reference }),
  });

try {
  payload.sendEmail = (async (m: Record<string, unknown>) => {
    envoyes.push(m);
    return { id: "id-d-epreuve" };
  }) as typeof payload.sendEmail;

  const { docs: sessions } = await payload.find({
    collection: "sessions",
    limit: 1,
    depth: 2,
    overrideAccess: true,
    where: { fin: { exists: true } },
  });
  const session = sessions[0];
  if (!session) throw new Error("Aucune session en base pour l'épreuve.");

  const dossier = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: session.id,
      statut: "payee",
      apprenantNom: "Épreuve Certificat",
      apprenantEmail: `certificat.${Date.now()}@epreuve.invalid`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      echeances: [{ montant: 423, statut: "regle" }],
    } as never,
  });
  aSupprimer.push(dossier.id);

  console.log("\n▸ Avant « Terminée »\n");

  const avantTerminee = await appeler(String(dossier.reference));
  dire(
    "aucun certificat n'existe avant que le dossier soit terminé",
    avantTerminee.status === 404,
    `reçu ${avantTerminee.status}`,
  );

  console.log("\n▸ Le passage à « Terminée »\n");

  const avantEnvois = envoyes.length;
  const termine = await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    overrideAccess: true,
    data: { statut: "terminee" } as never,
  });
  const emiseUne = (termine as { certificatEmisLe?: string }).certificatEmisLe;
  dire("la date « Fait le » est posée au premier passage", Boolean(emiseUne));
  dire(
    "le participant est prévenu par courriel",
    envoyes.length === avantEnvois + 1,
    `${envoyes.length - avantEnvois} envoi(s)`,
  );
  dire(
    "le courriel porte le bon sujet",
    /certificat est disponible/i.test(String(envoyes[avantEnvois]?.subject ?? "")),
  );

  /*
    ⚠️ Le cœur de l'épreuve. Un second enregistrement du dossier déjà terminé
    ne doit ni redater le certificat, ni renvoyer un second courriel — sinon
    un dossier corrigé après coup (une note ajoutée, une échéance retouchée)
    ferait croire au participant qu'un nouveau certificat vient d'être émis.
  */
  const avantSecondEnvoi = envoyes.length;
  const reenregistre = await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    overrideAccess: true,
    data: { notes: "note ajoutée après coup" } as never,
  });
  const emiseDeux = (reenregistre as { certificatEmisLe?: string }).certificatEmisLe;
  dire("⚠️ la date ne bouge pas à un second enregistrement", emiseUne === emiseDeux);
  dire("⚠️ et le courriel ne repart pas une seconde fois", envoyes.length === avantSecondEnvoi);

  console.log("\n▸ Le document rendu\n");

  const reponse = await appeler(String(dossier.reference));
  dire("le certificat se rend — 200", reponse.status === 200, `reçu ${reponse.status}`);
  dire(
    "c'est bien un PDF",
    (reponse.headers.get("content-type") ?? "").includes("application/pdf"),
  );
  dire(
    "il ne se garde pas dans un cache partagé",
    (reponse.headers.get("cache-control") ?? "").includes("no-store"),
  );
  dire(
    "le nom du fichier porte la référence du dossier",
    (reponse.headers.get("content-disposition") ?? "").includes(String(dossier.reference)),
  );

  const octets = (await reponse.arrayBuffer()).byteLength;
  dire("le PDF n'est pas un document vide", octets > 3000, `${octets} octets`);

  console.log("\n▸ Ce qui reste fermé\n");

  const inconnu = await appeler("CLX-INEXISTANT");
  dire("un dossier inconnu répond 404", inconnu.status === 404, `reçu ${inconnu.status}`);

  const dossierEnCours = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: session.id,
      statut: "demandee",
      apprenantNom: "Épreuve En Cours",
      apprenantEmail: `certificat.encours.${Date.now()}@epreuve.invalid`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      echeances: [{ montant: 423, statut: "attendu" }],
    } as never,
  });
  aSupprimer.push(dossierEnCours.id);

  const enCours = await appeler(String(dossierEnCours.reference));
  dire(
    "un dossier encore en cours n'a pas de certificat",
    enCours.status === 404,
    `reçu ${enCours.status}`,
  );
} finally {
  payload.sendEmail = expediteur;
  for (const id of aSupprimer) {
    await payload.delete({ collection: "inscriptions", id, overrideAccess: true });
  }
  if (aSupprimer.length > 0) console.log("\n  · dossiers d'épreuve supprimés");
}

console.log(
  manques === 0 ? "\nCertificat : tout tient.\n" : `\nCertificat : ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
