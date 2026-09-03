import { cache } from "react";
import { formatPrix } from "@/lib/format";
import { payloadClient } from "@/lib/payload";

/**
 * Lecture d'un dossier d'inscription.
 *
 * `overrideAccess: true` est ici volontaire, contre la règle qui vaut ailleurs.
 * La collection est fermée au public — c'est ce qu'on veut pour son API — mais
 * la page du dossier doit pouvoir se rendre pour quelqu'un qui n'est pas
 * connecté. La référence tient lieu de clé : elle ne se devine pas, et la page
 * n'expose que ce que son détenteur a lui-même saisi.
 *
 * Ce que la page ne montre pas est aussi important : ni les notes internes, ni
 * les coordonnées du payeur, ni rien d'autre que ce qui sert à payer.
 */
export interface EcheanceDossier {
  montantCentimes: number;
  dateLimite?: string;
  statut: "attendu" | "annonce" | "regle";
}

export interface Dossier {
  reference: string;
  statut: string;
  programmeTitre: string;
  sessionLibelle: string;
  /**
   * La session sans le nom du parcours : « Classe virtuelle — 19 sept. 2026 ».
   *
   * La référence d'une session s'écrit « Parcours — Mode — Date ». Elle se
   * suffit dans un courriel, où rien ne l'introduit ; sous un titre qui nomme
   * déjà le parcours, elle le répétait mot pour mot.
   */
  sessionDetail: string;
  /** Début de la session, pour dire quand le parcours commence. */
  sessionDebut?: string;
  /**
   * Quand le dossier a été déposé — c'est de là que court la tenue de la place.
   *
   * ⚠️ Sans cette date, la page ne peut pas dire jusqu'à quand la place est
   * tenue, et « place retenue » devient une promesse sans terme. Voir
   * `finDeLaTenue` dans `lib/places.ts`.
   */
  depuis?: string;
  /** Ce que le participant a demandé à recevoir pour régler. */
  moyenSouhaite?: "carte" | "virement" | "transfert";
  /** Le jour où l'équipe le lui a envoyé — affiché au participant, exprès. */
  coordonneesEnvoyeesLe?: string;
  /** Le jour où il a demandé son contrat — le passage de « je regarde » à « je m'engage ». */
  contratDemandeLe?: string;
  /** Le jour où il a signé, et sous quel nom. Le contrat le porte ensuite. */
  contratSigneLe?: string;
  /**
   * Le jour où l'équipe a relu son contrat et l'a accepté.
   *
   * ⚠️ Il ne sert pas qu'à informer : entre la signature et l'envoi des
   * coordonnées, le participant **ne peut rien verser**. C'est ce champ qui
   * empêche la page de lui réclamer un transfert qu'il n'a aucun moyen de
   * faire. Voir `prochaineEtape`.
   */
  contratVerifieLe?: string;
  contratSignataire?: string;
  /** Le tracé apposé au doigt ou à la souris, en PNG encodé. */
  contratTrace?: string;
  /**
   * Le nombre de justificatifs reçus pour ce dossier.
   *
   * ⚠️ Un compte, pas les fichiers. Le participant n'a pas à relire ce qu'il a
   * déposé — il l'a chez lui — mais il doit savoir que c'est arrivé, sans quoi
   * il redépose ou il téléphone.
   */
  recusRecus?: number;
  /*
    ── L'identité, portée seulement par `getDossier` ─────────────────────────
    Le contrat de formation doit nommer le Client : sans nom, sans adresse et
    sans téléphone, l'Annexe 1 ne vaut rien. Ces champs restent facultatifs
    parce que la liste des dossiers d'un compte ne les charge pas — elle n'en a
    pas l'usage, et un objet plus large voyagerait pour rien.

    ⚠️ Les afficher n'est pas parce qu'on les a. La page du dossier ne montre
    toujours que la référence : ces valeurs ne servent qu'au PDF, que le
    participant ouvre lui-même.
  */
  apprenantNom?: string;
  apprenantEmail?: string;
  apprenantWhatsapp?: string;
  apprenantPays?: string;
  echeances: EcheanceDossier[];
  /*
    ── Ce que le certificat ajoute, et rien d'autre ──────────────────────────
    Fin de session et durée du parcours ne servaient à personne avant lui : la
    page du dossier ne les affiche pas, seul le PDF en a besoin pour dire
    « du … au …, pour une durée totale de … heures ».
  */
  sessionFin?: string;
  programmeDureeHeures?: number;
  /** Le titre de chaque module, dans l'ordre du plan de cours. */
  programmeModules?: string[];
  /**
   * Le jour où le dossier est passé « terminée » pour la première fois — posé
   * une fois par `beforeChange`, jamais recalculé. C'est la date « Fait le »
   * du certificat : si elle changeait à chaque régénération du PDF, deux
   * exemplaires du même certificat porteraient deux dates différentes.
   */
  certificatEmisLe?: string;
}

/**
 * Retire du libellé de session le nom du parcours, quand il l'ouvre.
 *
 * Comparaison prudente : si la référence ne commence pas par ce titre — parce
 * qu'elle a été saisie à la main, ou que le parcours a été renommé depuis — on
 * rend le libellé entier plutôt qu'un fragment tronqué au mauvais endroit.
 */
function sansLeParcours(reference?: string | null, titre?: string | null): string {
  const libelle = reference ?? "Session";
  if (!titre) return libelle;
  const prefixe = `${titre} — `;
  return libelle.startsWith(prefixe) ? libelle.slice(prefixe.length) : libelle;
}

export const getDossier = cache(async (reference: string): Promise<Dossier | undefined> => {
  // Une référence tient en quelques caractères : au-delà, c'est du bruit.
  if (!/^[A-Z0-9-]{4,24}$/i.test(reference)) return undefined;

  const payload = await payloadClient();
  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { reference: { equals: reference.toUpperCase() } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  });

  const d = docs[0];
  if (!d) return undefined;

  const session = typeof d.session === "object" && d.session !== null ? d.session : undefined;
  const programme =
    session && typeof session.programme === "object" && session.programme !== null
      ? session.programme
      : undefined;

  /*
    Combien de justificatifs sont arrivés. On compte plutôt que de charger : la
    page n'affiche pas les fichiers, et le participant n'a aucune raison de
    relire depuis le site ce qu'il vient d'y déposer. Il a besoin de savoir
    que c'est arrivé, rien de plus.
  */
  const { totalDocs: recusRecus } = await payload.count({
    collection: "recus",
    where: { dossier: { equals: d.id } },
    overrideAccess: true,
  });

  return {
    reference: String(d.reference),
    statut: String(d.statut),
    programmeTitre: programme?.titre ?? "Parcours",
    sessionLibelle: session?.reference ?? "Session",
    sessionDetail: sansLeParcours(session?.reference, programme?.titre),
    ...(session?.debut ? { sessionDebut: session.debut } : {}),
    ...(session?.fin ? { sessionFin: session.fin } : {}),
    ...(programme?.dureeHeures ? { programmeDureeHeures: programme.dureeHeures } : {}),
    ...(programme?.modules && programme.modules.length > 0
      ? {
          programmeModules: programme.modules
            .map((m) => m.titre)
            .filter((t): t is string => Boolean(t)),
        }
      : {}),
    ...(d.certificatEmisLe ? { certificatEmisLe: String(d.certificatEmisLe) } : {}),
    ...(d.createdAt ? { depuis: String(d.createdAt) } : {}),
    ...(d.moyenSouhaite ? { moyenSouhaite: d.moyenSouhaite } : {}),
    ...(d.coordonneesEnvoyeesLe ? { coordonneesEnvoyeesLe: String(d.coordonneesEnvoyeesLe) } : {}),
    ...(d.contratDemandeLe ? { contratDemandeLe: String(d.contratDemandeLe) } : {}),
    ...(d.contratSigneLe ? { contratSigneLe: String(d.contratSigneLe) } : {}),
    ...(d.contratVerifieLe ? { contratVerifieLe: String(d.contratVerifieLe) } : {}),
    ...(d.contratSignataire ? { contratSignataire: String(d.contratSignataire) } : {}),
    ...(d.contratTrace ? { contratTrace: String(d.contratTrace) } : {}),
    ...(recusRecus > 0 ? { recusRecus } : {}),
    ...(d.apprenantNom ? { apprenantNom: String(d.apprenantNom) } : {}),
    ...(d.apprenantEmail ? { apprenantEmail: String(d.apprenantEmail) } : {}),
    ...(d.apprenantWhatsapp ? { apprenantWhatsapp: String(d.apprenantWhatsapp) } : {}),
    ...(d.apprenantPays ? { apprenantPays: String(d.apprenantPays) } : {}),
    echeances: (d.echeances ?? []).map((e) => ({
      montantCentimes: Math.round((e.montant ?? 0) * 100),
      ...(e.dateLimite ? { dateLimite: e.dateLimite } : {}),
      statut: (e.statut ?? "attendu") as EcheanceDossier["statut"],
    })),
  };
});

/**
 * Les dossiers rattachés à un compte.
 *
 * Le rattachement se fait à la création du compte, par l'adresse. Un dossier
 * déposé avec une autre adresse reste accessible par sa référence : c'est le
 * prix d'un tunnel qui n'exige pas de compte, et la page le dit.
 */
export const dossiersDuCompte = cache(async (apprenantId: number | string): Promise<Dossier[]> => {
  const payload = await payloadClient();
  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { apprenant: { equals: apprenantId } },
    limit: 50,
    depth: 2,
    sort: "-createdAt",
    overrideAccess: true,
  });

  return docs.map((d) => {
    const session = typeof d.session === "object" && d.session !== null ? d.session : undefined;
    const programme =
      session && typeof session.programme === "object" && session.programme !== null
        ? session.programme
        : undefined;

    return {
      reference: String(d.reference),
      statut: String(d.statut),
      programmeTitre: programme?.titre ?? "Parcours",
      sessionLibelle: session?.reference ?? "Session",
      sessionDetail: sansLeParcours(session?.reference, programme?.titre),
      ...(session?.debut ? { sessionDebut: session.debut } : {}),
      ...(d.createdAt ? { depuis: String(d.createdAt) } : {}),
      ...(d.moyenSouhaite ? { moyenSouhaite: d.moyenSouhaite } : {}),
      ...(d.contratDemandeLe ? { contratDemandeLe: String(d.contratDemandeLe) } : {}),
      ...(d.contratSigneLe ? { contratSigneLe: String(d.contratSigneLe) } : {}),
      ...(d.contratVerifieLe ? { contratVerifieLe: String(d.contratVerifieLe) } : {}),
      ...(d.coordonneesEnvoyeesLe
        ? { coordonneesEnvoyeesLe: String(d.coordonneesEnvoyeesLe) }
        : {}),
      echeances: (d.echeances ?? []).map((e) => ({
        montantCentimes: Math.round((e.montant ?? 0) * 100),
        ...(e.dateLimite ? { dateLimite: e.dateLimite } : {}),
        statut: (e.statut ?? "attendu") as EcheanceDossier["statut"],
      })),
    };
  });
});

/*
  L'argent s'écrit avec le formateur du reste du site. Celui d'ici avait les
  siens, et le défaut de l'euro est à deux décimales : la même somme paraissait
  « 423,00 € » dans la phrase et « 423 € » dans la pastille juste en dessous.
  Des centimes qui valent toujours zéro n'apprennent rien, et deux écritures
  d'un même montant sur une même carte font douter des deux.
*/
const JOUR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

/**
 * Ce que le dossier attend de son titulaire, en une phrase.
 *
 * Le statut seul ne le dit pas : « En attente de paiement » ne précise ni le
 * montant, ni la date, ni qui doit bouger. Quelqu'un qui vient de virer son
 * acompte et lit encore « en attente » croit que rien n'est arrivé.
 *
 * La phrase se déduit donc des échéances, pas du statut : c'est là qu'est
 * l'information, et c'est elle qui bouge.
 */
export function prochaineEtape(d: Dossier): string {
  if (d.statut === "annulee") return "Ce dossier est annulé.";
  if (d.statut === "terminee") return "Parcours suivi. Merci de votre confiance.";

  const enVerification = d.echeances.find((e) => e.statut === "annonce");
  if (enVerification) {
    return `Nous vérifions votre transfert de ${formatPrix(enVerification.montantCentimes)}. Rien à faire de votre côté.`;
  }

  /*
    ── Le contrat passe avant l'argent ───────────────────────────────────────
    Le tunnel a deux temps depuis le 29 août, et cette phrase disait encore
    « nous attendons votre premier transfert » à quelqu'un qui n'a même pas
    demandé son contrat. Elle réclamait un versement avant l'engagement — soit
    l'inverse de ce que le site promet trois lignes plus haut.

    On ne le dit que tant que rien n'est réglé : un dossier dont l'acompte est
    arrivé sans contrat signé existe (l'équipe peut avoir tout mené de vive
    voix), et lui réclamer une signature après coup serait absurde.
  */
  const rienDeRegle = d.echeances.every((e) => e.statut !== "regle");
  if (rienDeRegle && !d.contratSigneLe) {
    if (!d.contratDemandeLe) {
      return "Votre place est retenue. Demandez votre contrat quand vous serez décidé — rien ne vous engage encore.";
    }
    return "Il reste à signer votre contrat. Les instructions de règlement vous parviennent ensuite.";
  }

  /*
    ── Entre la signature et les coordonnées, la balle est chez nous ─────────
    La phrase suivante réclamait « votre premier transfert » dès la signature.
    Le participant ne pouvait pas l'effectuer : les coordonnées de règlement lui
    parviennent après, dans un courriel que l'équipe compose — rien de bancaire
    ne traversant le site. On lui demandait donc un geste qu'il n'avait aucun
    moyen de faire, au moment précis où il venait de s'engager par écrit.

    C'est le même défaut que le compte à rebours des places, corrigé le même
    jour : le site réclamait une action avant d'en avoir donné les moyens.
  */
  if (rienDeRegle && d.contratSigneLe && !d.coordonneesEnvoyeesLe) {
    return d.contratVerifieLe
      ? "Votre contrat est vérifié. Nous vous envoyons de quoi régler votre première échéance — rien à faire de votre côté pour l'instant."
      : "Nous relisons votre contrat. Rien à faire de votre côté : de quoi régler vous parvient ensuite.";
  }

  const due = d.echeances.find((e) => e.statut !== "regle");
  if (due) {
    const montant = formatPrix(due.montantCentimes);
    const premiere = d.echeances[0] === due;
    const quand = due.dateLimite ? ` avant le ${JOUR.format(new Date(due.dateLimite))}` : "";
    return premiere
      ? `Nous attendons votre premier transfert de ${montant}${quand}.`
      : `Prochaine échéance : ${montant}${quand}.`;
  }

  // Tout est réglé : il ne reste que la date.
  return d.sessionDebut
    ? `Tout est réglé. Rendez-vous le ${JOUR.format(new Date(d.sessionDebut))}.`
    : "Tout est réglé.";
}
