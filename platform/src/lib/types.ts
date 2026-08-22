/**
 * Modèle de domaine CLIXA — miroir du schéma validé en phase 00 (MOD-01 → MOD-07).
 *
 * Ce fichier matérialise le contrat d'extensibilité. Les types du bloc CATALOGUE et
 * COMMERCE sont utilisés en V1. Le bloc APPRENTISSAGE est déclaré mais non construit :
 * il existe pour que l'ajout du LMS soit un ajout, jamais une réécriture.
 *
 * Règle : ne jamais fusionner Programme / Session / Inscription (décision n° 1),
 * ni supprimer l'arbre Module → Leçon (décision n° 3).
 */

/* ────────────────────────────  CATALOGUE  ──────────────────────────── */

export type SpecialisationSlug =
  "finance-comptabilite" | "management-projet" | "digital-data" | "sur-mesure";

export interface Specialisation {
  slug: SpecialisationSlug;
  nom: string;
  accroche: string;
  description: string;
  /** Métiers visés — alimente la page spécialisation. */
  debouches: { titre: string; description: string }[];
}

/** Nature commerciale du programme, telle qu'affichée en étiquette. */
export type TypeProgramme = "certification" | "parcours-executif" | "metier" | "sur-mesure";

export type Niveau = "debutant" | "intermediaire" | "avance";

/**
 * Une leçon. Décision A (e-learning non visé cette année) : on se limite au
 * minimum structurant — titre et durée. Les champs optionnels ci-dessous existent
 * dans le schéma et restent vides ; ils seront remplis le jour du LMS.
 */
export interface Lecon {
  id: string;
  titre: string;
  dureeMinutes: number;

  /** Non renseigné en V1. Réservé au LMS. */
  objectif?: string;
  /** Non renseigné en V1. Réservé au LMS (vidéo, support, quiz). */
  contenuId?: string;
}

export interface Module {
  id: string;
  titre: string;
  /**
   * Ce que la séance vise. Les fiches réelles en portent un pour chacune des
   * huit séances — le taire reviendrait à jeter la moitié du plan de cours.
   */
  objectif?: string;
  /** Ce que la séance produit : « diagnostic finance ; plan d'action 90 jours ». */
  livrables?: string;
  lecons: Lecon[];
}

export interface Programme {
  slug: string;
  titre: string;
  accroche: string;
  objectifs: string;
  specialisation: SpecialisationSlug;
  type: TypeProgramme;
  niveau: Niveau;
  langue: string;
  dureeHeures: number;
  rythme: string;
  publicVise: string[];
  competences: string[];
  prerequis: string;
  debouches: string[];
  /** Arbre du plan de cours — structuré dès la V1 même s'il n'est qu'affiché. */
  modules: Module[];
  /** Certification délivrée par un tiers, le cas échéant. */
  certification?: string;
  /**
   * Ce que le participant emporte : support, replays, corrigés, grilles.
   * Optionnel — tous les parcours n'en promettent pas.
   */
  livrables?: string[];
  /** Templates et ressources fournis en plus du cours (« bonus inclus »). */
  outils?: string[];
  /** Posture visée, en deux mots : « Posture DAF », « Pilotage, contrôle, cash ». */
  positionnement?: string;
  /** Comment le parcours est mené — live, cas fil rouge, ateliers. */
  approche?: string[];
  /**
   * Mention imposée par un tiers. La fiche PMP doit rappeler que PMP® est une
   * marque du PMI et que les frais d'examen ne sont pas compris : l'omettre
   * n'est pas une négligence de mise en page, c'est un manquement.
   */
  mentionsLegales?: string;
}

/* ────────────────────────────  SESSIONS  ──────────────────────────── */

/**
 * Décision n° 5 : la modalité est une donnée, pas un gabarit.
 * Ajouter le e-learning revient à ajouter "en-ligne" ici et un écran —
 * pas une seconde plateforme.
 */
export type ModeDiffusion = "presentiel" | "visio" | "en-ligne";

export interface Session {
  id: string;
  programmeSlug: string;
  mode: ModeDiffusion;
  /** Lieu physique si mode === "presentiel". */
  ville?: string;
  pays?: string;
  /** Lien Google Meet, généré automatiquement si mode === "visio" (phase 02). */
  lienVisio?: string;
  debut: string; // ISO 8601
  fin: string; // ISO 8601
  /** Libellé lisible du rythme, ex. « 8 semaines · mardi soir ». */
  cadence?: string;
  capacite: number;
  placesReservees: number;
  prixCentimes: number;
  devise: "EUR" | "MAD" | "XOF";
  /**
   * Fuseau dans lequel les horaires sont annoncés. Les parcours réels affichent
   * « 13h00–17h00 UTC » : sans cette précision, un participant à Abidjan et un
   * autre à Casablanca ne lisent pas la même heure.
   */
  fuseau?: string;
}

export function placesRestantes(s: Session): number {
  return Math.max(0, s.capacite - s.placesReservees);
}

export function estComplete(s: Session): boolean {
  return placesRestantes(s) === 0;
}

/* ────────────────────────────  COMMERCE  ──────────────────────────── */
/* Types déclarés en V1, utilisés à partir de la phase 02.                */

/** Décision n° 4 : un compte existe dès la première réservation. */
export interface Utilisateur {
  id: string;
  email: string;
  nomComplet: string;
  telephone?: string;
  pays?: string;
}

/**
 * Décision n° 7 : le payeur est distinct de l'apprenant, même quand c'est la
 * même personne. C'est la seule condition pour que l'offre entreprise soit un
 * ajout et non une reconstruction du tunnel de paiement.
 */
export interface Payeur {
  id: string;
  type: "particulier" | "organisation";
  nom: string;
  email: string;
  /** Renseigné si type === "organisation". Rattache au bloc Entreprise (V3). */
  organisationId?: string;
}

/**
 * Décision n° 2 : l'inscription est le pivot du système, pas une ligne de
 * commande. La V1 y accroche le paiement et la convocation ; le LMS y
 * accrochera la progression, les notes et le certificat.
 */
export type StatutInscription = "demandee" | "confirmee" | "payee" | "terminee" | "annulee";

export interface Inscription {
  id: string;
  sessionId: string;
  apprenantId: string;
  payeurId: string;
  statut: StatutInscription;
  creeeLe: string;
}

/** Décision n° 6 : plusieurs paiements par inscription — acompte, solde, échéances. */
export interface Paiement {
  id: string;
  inscriptionId: string;
  montantCentimes: number;
  devise: Session["devise"];
  moyen: "carte" | "mobile-money" | "virement";
  statut: "en-attente" | "regle" | "echoue" | "rembourse";
  regleLe?: string;
}

/**
 * Barème du catalogue.
 *
 * Les douze parcours partagent le même tarif : c'est un réglage, pas une donnée
 * de session. Payer en plusieurs fois coûte plus cher, et l'écart est affiché.
 */
export interface PlanPaiement {
  code: string;
  libelle: string;
  totalCentimes: number;
  echeancesCentimes: number[];
  conditions: string;
}

export interface Tarifs {
  prixComptantCentimes: number;
  devise: Session["devise"];
  plans: PlanPaiement[];
  moyensPaiement: string[];
}
