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
    echeances: (d.echeances ?? []).map((e) => ({
      montantCentimes: Math.round((e.montant ?? 0) * 100),
      ...(e.dateLimite ? { dateLimite: e.dateLimite } : {}),
      statut: (e.statut ?? "attendu") as EcheanceDossier["statut"],
    })),
  };
});
