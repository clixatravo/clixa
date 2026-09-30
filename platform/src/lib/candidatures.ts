import { LONGUEURS, emailPlausible, tientDans } from "@/lib/saisie";
import { aUnIndicatif } from "@/lib/indicatifs";

/**
 * Les candidatures de formateurs : ce que la page demande, et ce que la route
 * accepte.
 *
 * Demandé par la direction le 30 septembre 2026 : « Vous êtes formateur ?
 * N'hésitez pas à nous rejoindre. » Les candidatures se recevaient jusque-là
 * par WhatsApp, sans trace ni suite ; elles arrivent maintenant dans /admin,
 * une par ligne, avec leur CV.
 *
 * ── Pourquoi ce fichier ne touche ni la base ni le réseau ───────────────────
 * La page et la route lisent les mêmes listes et la même validation. Une règle
 * écrite deux fois finit par diverger : le formulaire proposerait une spécialité
 * que la route refuse, et la personne resterait devant un refus qu'elle ne
 * comprend pas. `verifier-candidatures.ts` éprouve ce fichier sans base.
 */

/**
 * Les domaines qu'un formateur peut animer, calqués sur le catalogue et sur les
 * séminaires d'entreprise.
 *
 * ⚠️ Une liste fermée, avec « Autre » : c'est ce qui permet à l'équipe de
 * filtrer les candidatures par domaine le jour où une cohorte manque d'un
 * formateur. « Autre » ne se retire pas — une liste fermée renverrait sans
 * recours quelqu'un dont le domaine n'y figure pas, pour une lacune qui est la
 * nôtre. Le message libre dit alors lequel.
 */
export const SPECIALITES = [
  { valeur: "finance", libelle: "Finance et comptabilité" },
  { valeur: "audit", libelle: "Audit interne" },
  { valeur: "controle-gestion", libelle: "Contrôle de gestion" },
  { valeur: "rh", libelle: "Ressources humaines" },
  { valeur: "commercial", libelle: "Commercial et vente" },
  { valeur: "marketing", libelle: "Marketing" },
  { valeur: "production", libelle: "Production et industrie" },
  { valeur: "maintenance", libelle: "Maintenance" },
  { valeur: "qhse", libelle: "QHSE" },
  { valeur: "projet", libelle: "Gestion de projet et PMP" },
  { valeur: "leadership", libelle: "Leadership et management" },
  { valeur: "digital", libelle: "Transformation digitale et IA" },
  { valeur: "achats", libelle: "Achats et supply chain" },
  { valeur: "autre", libelle: "Autre domaine" },
] as const;

export type Specialite = (typeof SPECIALITES)[number]["valeur"];

export const OPTIONS_SPECIALITE = SPECIALITES.map((s) => ({ label: s.libelle, value: s.valeur }));

/** La spécialité correspondante, ou `undefined` : on ne range pas au hasard. */
export function specialiteValide(valeur: string): Specialite | undefined {
  return SPECIALITES.find((s) => s.valeur === valeur)?.valeur;
}

export function libelleSpecialite(valeur?: string | null): string {
  if (!valeur) return "—";
  return SPECIALITES.find((s) => s.valeur === valeur)?.libelle ?? String(valeur);
}

/**
 * L'expérience comme formateur, en tranches.
 *
 * ⚠️ Pas les tranches de `lib/profil.ts` : celles-là mesurent l'ancienneté
 * dans un métier, celles-ci l'expérience devant un groupe. Un DAF de vingt ans
 * qui n'a jamais animé une séance n'est pas un formateur de vingt ans, et c'est
 * précisément ce que l'équipe a besoin de savoir avant de l'appeler.
 */
export const EXPERIENCES_FORMATION = [
  { valeur: "debutant", libelle: "Je n'ai pas encore animé de formation" },
  { valeur: "moins-2", libelle: "Moins de 2 ans" },
  { valeur: "2-5", libelle: "2 à 5 ans" },
  { valeur: "5-10", libelle: "5 à 10 ans" },
  { valeur: "plus-10", libelle: "Plus de 10 ans" },
] as const;

export type ExperienceFormation = (typeof EXPERIENCES_FORMATION)[number]["valeur"];

export const OPTIONS_EXPERIENCE_FORMATION = EXPERIENCES_FORMATION.map((e) => ({
  label: e.libelle,
  value: e.valeur,
}));

export function experienceFormationValide(valeur: string): ExperienceFormation | undefined {
  return EXPERIENCES_FORMATION.find((e) => e.valeur === valeur)?.valeur;
}

export function libelleExperienceFormation(valeur?: string | null): string {
  if (!valeur) return "—";
  return EXPERIENCES_FORMATION.find((e) => e.valeur === valeur)?.libelle ?? String(valeur);
}

/** Ce que l'équipe fait d'une candidature. */
export const STATUTS_CANDIDATURE = [
  { label: "Nouvelle", value: "nouvelle" },
  { label: "Contactée", value: "contactee" },
  { label: "Retenue", value: "retenue" },
  { label: "Non retenue", value: "non-retenue" },
] as const;

/**
 * Le CV : un PDF ou un document Word, rien d'autre.
 *
 * ⚠️ Pas d'image. Un CV photographié au téléphone se lit mal, et c'est aussi
 * le format par lequel arrive un fichier qui n'est pas un CV. Pas de SVG non
 * plus, pour la raison notée dans `lib/recus.ts` : c'est du XML, qui exécute du
 * script.
 */
export const TYPES_CV = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const estTypeCv = (t: string): boolean => (TYPES_CV as readonly string[]).includes(t);

/**
 * 4 Mo. Vercel refuse un corps de requête au-delà de 4,5 Mo, et le CV voyage
 * avec les autres champs du formulaire : on borne avant, pour qu'un gros
 * fichier soit refusé par nous, avec une phrase, et non par la plateforme, avec
 * une page d'erreur.
 */
export const TAILLE_MAX_CV = 4 * 1024 * 1024;

/**
 * Un lien LinkedIn plausible, ou `undefined`.
 *
 * ⚠️ On ne garde que ce qui mène chez LinkedIn, et l'hôte se compare à
 * l'égalité, jamais par `includes()` : `linkedin.com.attaquant.test` *contient*
 * linkedin.com sans en être. Ce lien est ouvert par l'équipe depuis /admin ; il
 * ne doit pas pouvoir mener ailleurs. Même règle que `lib/video.ts`.
 *
 * Le préfixe `https://` est ajouté quand il manque — on colle volontiers
 * « linkedin.com/in/… » sans lui — mais seulement dans ce cas : une adresse
 * qui porte un autre schéma est refusée, pas réécrite.
 */
export function lienLinkedin(brut: string): string | undefined {
  const saisi = brut.trim();
  if (!saisi) return undefined;
  if (saisi.length > 300) return undefined;

  const avecSchema = /^[a-z][a-z0-9+.-]*:/i.test(saisi) ? saisi : `https://${saisi}`;
  let url: URL;
  try {
    url = new URL(avecSchema);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;

  const hote = url.hostname.toLowerCase();
  if (hote !== "linkedin.com" && !hote.endsWith(".linkedin.com")) return undefined;
  if (url.username || url.password) return undefined;

  return `https://${hote}${url.pathname}`;
}

/** Les champs tels que la route les lit. */
export interface SaisieCandidature {
  nom: string;
  email: string;
  whatsapp: string;
  pays: string;
  specialite: string;
  experience: string;
  linkedin: string;
  message: string;
  consentement: string;
  /** Vrai si un fichier non vide accompagne l'envoi. */
  aUnCv: boolean;
}

/** Ce que la page sait dire quand un envoi est refusé. */
export type ErreurCandidature =
  | "champs"
  | "email"
  | "indicatif"
  | "specialite"
  | "experience"
  | "linkedin"
  | "cv-ou-linkedin"
  | "consentement"
  | "long";

export type ResultatCandidature =
  | {
      ok: true;
      specialite: Specialite;
      experience: ExperienceFormation;
      linkedin: string | undefined;
    }
  | { ok: false; erreur: ErreurCandidature };

/**
 * Ce qu'une candidature doit porter pour être enregistrée.
 *
 * ⚠️ **Le CV ou le lien LinkedIn, au moins l'un des deux** (décision de la
 * direction le 30 septembre 2026 : « khalihom bjoj »). Exiger le fichier
 * écarterait celui qui écrit depuis son téléphone, le CV resté sur
 * l'ordinateur ; exiger LinkedIn écarterait celui qui n'y est pas. Mais une
 * candidature sans aucun des deux ne dit rien de ce que la personne a fait, et
 * l'équipe devrait l'appeler pour le lui demander.
 *
 * ⚠️ Un lien LinkedIn **mal formé** est refusé et dit comme tel, même quand un
 * CV l'accompagne : l'ignorer en silence ferait croire qu'il est arrivé.
 */
export function validerCandidature(s: SaisieCandidature): ResultatCandidature {
  if (!s.nom || !s.email || !s.whatsapp || !s.pays) return { ok: false, erreur: "champs" };

  if (
    !tientDans(s.nom, LONGUEURS.nom) ||
    !tientDans(s.whatsapp, LONGUEURS.telephone) ||
    !tientDans(s.pays, LONGUEURS.pays) ||
    !tientDans(s.message, LONGUEURS.message)
  ) {
    return { ok: false, erreur: "long" };
  }

  if (!emailPlausible(s.email)) return { ok: false, erreur: "email" };
  if (!aUnIndicatif(s.whatsapp)) return { ok: false, erreur: "indicatif" };

  const specialite = specialiteValide(s.specialite);
  if (!specialite) return { ok: false, erreur: "specialite" };

  const experience = experienceFormationValide(s.experience);
  if (!experience) return { ok: false, erreur: "experience" };

  const linkedin = lienLinkedin(s.linkedin);
  if (s.linkedin.trim() && !linkedin) return { ok: false, erreur: "linkedin" };

  if (!linkedin && !s.aUnCv) return { ok: false, erreur: "cv-ou-linkedin" };

  if (s.consentement !== "oui") return { ok: false, erreur: "consentement" };

  return { ok: true, specialite, experience, linkedin };
}

/** Les phrases de la page, une par refus. Elles disent quoi corriger. */
export const MESSAGES_CANDIDATURE: Record<
  ErreurCandidature | "format" | "lourd" | "stockage" | "technique",
  string
> = {
  champs:
    "Il manque une information : nom, e-mail, WhatsApp et pays sont nécessaires pour vous répondre.",
  email:
    "Cette adresse e-mail ne semble pas complète. Vérifiez-la : c'est par elle que nous vous répondrons.",
  indicatif:
    "Votre numéro WhatsApp doit commencer par l'indicatif de votre pays : choisissez votre pays dans la liste, puis tapez votre numéro.",
  specialite: "Choisissez le domaine dans lequel vous formez.",
  experience: "Indiquez votre expérience comme formateur.",
  linkedin:
    "Ce lien ne mène pas à un profil LinkedIn. Copiez l'adresse de votre profil, qui commence par linkedin.com/in/…",
  "cv-ou-linkedin":
    "Joignez votre CV ou indiquez votre profil LinkedIn : l'un des deux suffit, et nous permet de connaître votre parcours.",
  consentement:
    "Il manque votre accord pour que nous conservions votre candidature. Sans lui, nous ne pouvons pas l'enregistrer.",
  long: "Un des champs est trop long. Raccourcissez votre message, ou écrivez-nous directement.",
  format: "Le CV doit être un fichier PDF ou Word.",
  lourd:
    "Le CV dépasse 4 Mo. Envoyez une version plus légère, ou indiquez plutôt votre profil LinkedIn.",
  stockage:
    "Votre CV n'a pas pu être déposé. Réessayez dans un instant, ou indiquez votre profil LinkedIn à la place.",
  technique: "L'envoi a échoué. Réessayez — si cela persiste, écrivez-nous.",
};
