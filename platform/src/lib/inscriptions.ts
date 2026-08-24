import { cache } from "react";
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
  /** Début de la session, pour dire quand le parcours commence. */
  sessionDebut?: string;
  echeances: EcheanceDossier[];
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

  return {
    reference: String(d.reference),
    statut: String(d.statut),
    programmeTitre: programme?.titre ?? "Parcours",
    sessionLibelle: session?.reference ?? "Session",
    ...(session?.debut ? { sessionDebut: session.debut } : {}),
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
      ...(session?.debut ? { sessionDebut: session.debut } : {}),
      echeances: (d.echeances ?? []).map((e) => ({
        montantCentimes: Math.round((e.montant ?? 0) * 100),
        ...(e.dateLimite ? { dateLimite: e.dateLimite } : {}),
        statut: (e.statut ?? "attendu") as EcheanceDossier["statut"],
      })),
    };
  });
});

const EUROS = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
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
    return `Nous vérifions votre transfert de ${EUROS.format(enVerification.montantCentimes / 100)}. Rien à faire de votre côté.`;
  }

  const due = d.echeances.find((e) => e.statut !== "regle");
  if (due) {
    const montant = EUROS.format(due.montantCentimes / 100);
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
