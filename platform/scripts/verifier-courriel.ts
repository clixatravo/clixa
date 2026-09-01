/**
 * Éprouve l'adresse de réponse de nos courriels.
 *
 * ── Le défaut que ce script existe pour empêcher ────────────────────────────
 * Le site envoie depuis `contact@envoi.clixa.africa`. Ce sous-domaine sert à
 * envoyer et **ne sait pas recevoir** : ni MX, ni A, exprès — sa réputation est
 * tenue à part de celle du domaine principal. Sans `replyTo`, la réponse du
 * participant partait donc vers une adresse indélivrable : elle lui revenait,
 * et de notre côté rien n'arrivait.
 *
 * Un silence des deux bords, sur le geste le plus naturel qu'on puisse faire
 * devant un courriel — et que rien ne signale, jamais.
 *
 * ── Ce qu'on vérifie, et pourquoi ce n'est pas qu'une constante ─────────────
 * Qu'un `replyTo` est bien posé sur chaque message, et surtout que **son
 * domaine sait recevoir** : on interroge ses MX. Vérifier seulement que la
 * variable est remplie laisserait passer une adresse sur un domaine muet, ce
 * qui est précisément le défaut d'origine.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { resolveMx, resolveTxt } from "node:dns/promises";
import {
  courrielRappel,
  courrielRelance,
  courrielSignature,
  envoyerConfirmation,
} from "../src/lib/courriel.js";
import { RESEAUX_CLIXA } from "../src/lib/reseaux.js";

const payload = await getPayload({ config });
const expediteur = payload.sendEmail.bind(payload);

let manques = 0;
const dire = (q: string, v: boolean) => {
  console.log(`  ${v ? "✓" : "✗"} ${q}`);
  if (!v) manques += 1;
};

/*
  Retient les messages présentés à l'expéditeur, sans rien envoyer.

  Une liste plutôt qu'une variable réassignée : TypeScript rétrécit une variable
  remise à `undefined` et ne suit pas l'affectation faite dans la fonction, ce
  qui rendait la lecture suivante impossible à typer.
*/
const envoyes: Record<string, unknown>[] = [];
const aSupprimer: (string | number)[] = [];

/* Ce que le journal a retenu, pour vérifier qu'un envoi réussi laisse une trace. */
const journal: { message: string; donnees: Record<string, unknown> }[] = [];
const infoOrigine = payload.logger.info.bind(payload.logger);

try {
  payload.sendEmail = (async (m: Record<string, unknown>) => {
    envoyes.push(m);
    // L'expéditeur rend un identifiant : c'est le fil qui mène au tableau de
    // bord de Resend, et le journal doit le porter.
    return { id: "id-d-epreuve" };
  }) as typeof payload.sendEmail;

  payload.logger.info = ((donnees: unknown, message?: unknown) => {
    if (typeof donnees === "object" && donnees !== null && typeof message === "string") {
      journal.push({ message, donnees: donnees as Record<string, unknown> });
    }
    return payload.logger;
  }) as typeof payload.logger.info;

  // ── Un courriel au participant ───────────────────────────────────────────
  await courrielRelance(payload, {
    reference: "CLX-EPREUVE",
    apprenantNom: "Épreuve Réponse",
    apprenantEmail: "reponse@epreuve.invalid",
    programmeTitre: "Parcours d'épreuve",
    montant: 423,
    dateLimite: new Date().toISOString(),
    enRetard: true,
    urlDossier: "https://www.clixa.africa/inscription/CLX-EPREUVE",
  });

  const relance = envoyes[0];
  dire("une relance porte une adresse de réponse", Boolean(relance?.replyTo));

  // ── Et celui qui ouvre un compte, qui passe par un autre chemin ──────────
  await envoyerConfirmation(payload, "confirmation@epreuve.invalid", {
    nom: "Épreuve Réponse",
    token: "jeton-d-epreuve",
  });

  const confirmation = envoyes[1];
  dire("la confirmation d'adresse aussi", Boolean(confirmation?.replyTo));
  dire(
    "les deux chemins répondent au même endroit",
    String(relance?.replyTo) === String(confirmation?.replyTo),
  );

  /*
    ⚠️ Le cœur de l'épreuve. Une adresse de réponse sur un domaine sans MX est
    exactement le défaut qu'on vient de corriger : elle a l'air juste, elle est
    indélivrable. On pose donc la question au DNS.
  */
  const adresse = String(relance?.replyTo ?? "");
  const domaine = adresse.split("@")[1] ?? "";
  dire("elle n'est pas sur le sous-domaine d'envoi", !domaine.startsWith("envoi."));

  let mx: string[] = [];
  try {
    mx = (await resolveMx(domaine)).map((e) => e.exchange);
  } catch {
    mx = [];
  }
  dire(`le domaine de réponse sait recevoir (${domaine} → ${mx.length} MX)`, mx.length > 0);

  /*
    ── Ce qui authentifie nos courriels, et qui vit hors du dépôt ─────────────
    SPF et DKIM disent au serveur d'en face que ce message vient bien de nous.
    Ils sont posés chez Namecheap, pas ici : rien dans le code ne les protège,
    et un enregistrement effacé par mégarde ne casse ni compilation ni épreuve.
    Il fait seulement tomber nos messages dans les indésirables — ce qui, pour
    un tunnel d'inscription, revient à ne plus rien envoyer.

    ⚠️ Resend pose SPF et MX de retour sur `send.<domaine>`, pas sur le domaine
    d'envoi lui-même : c'est l'adresse de rebond qui est vérifiée. Chercher au
    mauvais endroit conclurait à tort que SPF manque.
  */
  console.log("\n▸ Ce qui authentifie nos courriels\n");

  const txt = async (nom: string) => {
    try {
      return (await resolveTxt(nom)).map((e) => e.join(""));
    } catch {
      return [];
    }
  };

  const expediteurAdresse = String(relance?.from ?? process.env.EMAIL_EXPEDITEUR ?? "");
  const domaineEnvoi = expediteurAdresse.split("@")[1] ?? "envoi.clixa.africa";

  const spf = await txt(`send.${domaineEnvoi}`);
  dire(
    `SPF sur send.${domaineEnvoi}`,
    spf.some((v) => v.startsWith("v=spf1")),
  );
  const dkim = await txt(`resend._domainkey.${domaineEnvoi}`);
  dire(
    `DKIM sur ${domaineEnvoi}`,
    dkim.some((v) => v.includes("p=")),
  );

  /*
    ⚠️ DMARC manque sur les deux domaines, et ce n'est pas un détail technique.

    Tout ce tunnel repose sur une promesse : le participant doit pouvoir
    distinguer notre courriel d'un hameçonnage. On lui a donné pour cela une
    date affichée sur son dossier — c'est-à-dire à peu près rien. Sans DMARC,
    n'importe qui envoie un message signé `@clixa.africa` réclamant un
    virement, et le serveur d'en face n'a aucune règle pour le refuser.

    Ce n'est pas un manque du code : cela se pose chez Namecheap, et la
    politique (`none`, `quarantine`, `reject`) est une décision. On le signale
    plutôt que de le faire échouer — mais on le signale à chaque passage, avec
    l'enregistrement à poser, pour que l'oubli ne soit pas silencieux.
  */
  for (const d of [domaineEnvoi, RESEAUX_CLIXA.email.adresse.split("@")[1] ?? ""]) {
    if (!d) continue;
    const dmarc = await txt(`_dmarc.${d}`);
    if (dmarc.some((v) => v.startsWith("v=DMARC1"))) {
      dire(`DMARC sur ${d}`, true);
    } else {
      console.log(
        `  ⚠ aucun DMARC sur ${d} — notre adresse peut être usurpée.\n` +
          `      À poser chez Namecheap : _dmarc.${d}  TXT  ` +
          `"v=DMARC1; p=none; rua=mailto:${RESEAUX_CLIXA.email.adresse}"\n` +
          `      Commencer par p=none pour observer, puis durcir en quarantine.`,
      );
    }
  }

  /*
    ── Une demande de rappel n'est pas une notification comme les autres ──────
    Elle ne va pas à l'équipe entière mais à l'adresse affichée sur le site :
    c'est un appel à passer, pas un événement à constater. Et elle doit la tenir
    de `lib/reseaux.ts`, pour que l'adresse qu'on montre au visiteur et celle
    qui reçoit sa demande soient la même par construction.
  */
  const avant = envoyes.length;
  await courrielRappel(payload, {
    nom: "Épreuve Rappel",
    email: "rappel@epreuve.invalid",
    whatsapp: "+212600000000",
    pays: "Maroc",
  });

  const rappel = envoyes[avant];
  dire("une demande de rappel part bien", Boolean(rappel));
  dire(
    `elle va à l'adresse affichée sur le site (${RESEAUX_CLIXA.email.adresse})`,
    String(rappel?.to) === RESEAUX_CLIXA.email.adresse,
  );
  /*
    ⚠️ Cette distinction ne se mesure que si les deux adresses diffèrent. Elles
    ont été identiques jusqu'au 30 août 2026, et le seront encore sur toute
    machine dont le `.env` n'a pas suivi. Une épreuve qui ne peut rien conclure
    doit le dire — la passer au vert apprendrait le contraire de la vérité.
  */
  const equipe = process.env.EMAIL_EQUIPE;
  if (equipe && equipe !== RESEAUX_CLIXA.email.adresse) {
    dire("elle ne suit pas EMAIL_EQUIPE", String(rappel?.to) !== equipe);
  } else {
    console.log("  · EMAIL_EQUIPE vaut ici l'adresse publique : la distinction ne se mesure pas");
  }

  /*
    ── « Contrat vérifié » ne se dit qu'une fois ─────────────────────────────
    Le courriel part du crochet `afterChange`, pour qu'une date saisie à la main
    dans /admin fasse la même chose qu'un clic sur le bouton. Le risque de ce
    choix est net : sans la comparaison « vide avant, rempli maintenant »,
    **chaque** enregistrement du dossier renverrait l'annonce — une échéance
    corrigée, une note ajoutée, et le participant reçoit deux fois la même
    nouvelle.
  */
  const { docs: sessions } = await payload.find({
    collection: "sessions",
    limit: 1,
    depth: 0,
    overrideAccess: true,
    where: { fin: { greater_than: new Date().toISOString() } },
  });

  const dossier = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: sessions[0]!.id,
      statut: "demandee",
      apprenantNom: "Épreuve Vérifié",
      apprenantEmail: "verifie@epreuve.invalid",
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      echeances: [{ montant: 423, statut: "attendu" }],
      contratSigneLe: new Date().toISOString(),
      contratSignataire: "Épreuve Vérifié",
    } as never,
  });
  aSupprimer.push(dossier.id);

  const avantVerif = envoyes.length;
  await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    overrideAccess: true,
    data: { contratVerifieLe: new Date().toISOString() },
  });

  const annonces = envoyes.slice(avantVerif);
  dire("poser la date de vérification envoie une annonce", annonces.length === 1);
  dire(
    "elle part au participant, pas à l'équipe",
    String(annonces[0]?.to) === "verifie@epreuve.invalid",
  );

  // Un second enregistrement, sans toucher à la date : rien ne doit repartir.
  const avantSecond = envoyes.length;
  await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    overrideAccess: true,
    data: { apprenantPays: "Sénégal" },
  });
  dire("⚠️ un second enregistrement ne la renvoie pas", envoyes.length === avantSecond);

  /*
    ── Le troisième temps : les instructions de paiement ─────────────────────
    Même mécanique, même piège. Ce message ne porte aucune coordonnée — il date
    l'envoi et dit d'aller comparer cette date sur le dossier, ce qui est la
    garde contre l'hameçonnage.
  */
  const avantInstr = envoyes.length;
  await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    overrideAccess: true,
    data: { coordonneesEnvoyeesLe: new Date().toISOString() },
  });

  const instr = envoyes.slice(avantInstr);
  dire("poser la date d'envoi annonce les instructions", instr.length === 1);
  dire("elle part au participant", String(instr[0]?.to) === "verifie@epreuve.invalid");
  dire(
    "et elle ne porte aucune coordonnée de règlement",
    !/IBAN|RIB\s*:|BIC|\bcompte\s+n/i.test(String(instr[0]?.text ?? "")),
  );

  const avantTroisieme = envoyes.length;
  await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    overrideAccess: true,
    data: { apprenantPays: "Côte d'Ivoire" },
  });
  dire("⚠️ elle non plus ne se renvoie pas", envoyes.length === avantTroisieme);
  /*
    ── Chaque moyen reçoit ses mots, et pas ceux des autres ──────────────────
    Le message « Contrat signé » énumérait les trois moyens d'un coup, suivis de
    « selon ce que vous avez choisi » : il annonçait donc « notre RIB » à qui
    règle par carte, puis lui réclamait « la référence du transfert » qu'il
    n'aura jamais. Rien ne casse — le message se lit, et personne ne signale
    qu'on lui a parlé d'un guichet où il n'ira pas.
  */
  for (const [moyen, attendu, absent] of [
    ["carte", /lien de paiement/i, /RIB|guichet/i],
    ["virement", /RIB/i, /guichet|lien de paiement/i],
    ["transfert", /Western Union|bénéficiaire/i, /RIB|lien de paiement/i],
  ] as const) {
    const avantMoyen = envoyes.length;
    await courrielSignature(payload, {
      reference: "CLX-EPREUVE",
      dossierId: 1,
      apprenantNom: "Épreuve Moyen",
      apprenantEmail: "moyen@epreuve.invalid",
      apprenantWhatsapp: "+212600000000",
      programmeTitre: "Parcours d'épreuve",
      signeLe: new Date().toISOString(),
      empreinte: "0".repeat(64),
      moyenSouhaite: moyen,
    });

    // Le premier des deux messages est celui du participant.
    const texte = String(envoyes[avantMoyen]?.text ?? "");
    dire(`« ${moyen} » : on lui nomme ce qu'il recevra`, attendu.test(texte));
    dire(`« ${moyen} » : ⚠️ et jamais ce qu'il ne recevra pas`, !absent.test(texte));
  }

  /*
    ── Un envoi réussi doit se voir dans le journal ──────────────────────────
    Seul l'échec en laissait une trace. Le jour où quelqu'un dit « je n'ai rien
    reçu », les deux réponses qui comptent — *parti et perdu en route* ou
    *jamais tenté* — étaient indiscernables, et l'on cherchait un bogue là où il
    n'y avait peut-être qu'un dossier « indésirables ».
  */
  const traces = journal.filter((l) => l.message === "[courriel] envoyé");
  dire("un envoi réussi laisse une trace", traces.length >= 1);
  dire(
    "elle porte le destinataire et l'identifiant de l'expéditeur",
    Boolean(traces[0]?.donnees.to) && Boolean(traces[0]?.donnees.id),
  );
  dire(
    "⚠️ elle ne porte pas le corps du message",
    traces.every((l) => !("text" in l.donnees) && !("html" in l.donnees)),
  );
} finally {
  payload.logger.info = infoOrigine;
  payload.sendEmail = expediteur;
  for (const id of aSupprimer) {
    await payload.delete({ collection: "inscriptions", id, overrideAccess: true });
  }
  if (aSupprimer.length > 0) console.log("  · dossier d'épreuve supprimé");
}

console.log(manques === 0 ? "\nCourriel : tout tient." : `\nCourriel : ${manques} manque(s).`);
process.exit(manques === 0 ? 0 : 1);
