import { getPayload } from "payload";
import config from "@payload-config";

import type {
  Article as ArticlePayload,
  Programme as ProgrammePayload,
  Session as SessionPayload,
  Specialisation as SpecialisationPayload,
} from "@/payload-types";
import type { Bloc } from "@/data/blog";
import type {
  Module,
  Programme,
  Session,
  Specialisation,
  SpecialisationSlug,
  Tarifs,
  Temoignage,
  Partenaire,
} from "@/lib/types";
import type { Article, CategorieArticle } from "@/lib/blog";

/**
 * INT-01 — Accès à Payload et traduction vers le modèle de domaine.
 *
 * Le CMS et le domaine ne parlent pas tout à fait la même langue :
 *
 *   • un prix se saisit en euros au CMS, se stocke en centimes au domaine ;
 *   • une relation renvoie un objet ou un identifiant, le domaine veut un slug ;
 *   • une liste de textes est un tableau d'objets `{ valeur }` au CMS.
 *
 * Toute la conversion tient ici. Les composants continuent de recevoir
 * exactement les types de src/lib/types.ts, et n'ont donc pas bougé.
 */
export async function payloadClient() {
  return getPayload({ config });
}

/**
 * Les champs traduisibles sont typés optionnels : leur obligation ne vaut qu'en
 * français (voir src/collections/champs.ts). Le repli garantit qu'ils sont
 * remplis à la lecture, mais le type ne peut pas le savoir.
 */
const t = (v: string | null | undefined): string => v ?? "";

/** Un tableau `[{ valeur }]` du CMS devient un `string[]` du domaine. */
function valeurs(liste: { valeur?: string | null }[] | null | undefined): string[] {
  return (liste ?? []).map((x) => x.valeur ?? "").filter(Boolean);
}

/** Une relation Payload peut être un objet complet ou un simple identifiant. */
function slugDe(relation: unknown): string | undefined {
  if (relation && typeof relation === "object" && "slug" in relation) {
    const s = (relation as { slug?: unknown }).slug;
    if (typeof s === "string") return s;
  }
  return undefined;
}

export function versSpecialisation(d: SpecialisationPayload): Specialisation {
  return {
    slug: d.slug as SpecialisationSlug,
    nom: t(d.nom),
    accroche: t(d.accroche),
    description: t(d.description),
    debouches: (d.debouches ?? []).map((x) => ({
      titre: t(x.titre),
      description: t(x.description),
    })),
  };
}

function versModules(d: ProgrammePayload): Module[] {
  return (d.modules ?? []).map((m, i) => ({
    id: m.id ?? `module-${i}`,
    titre: t(m.titre),
    ...(m.objectif ? { objectif: t(m.objectif) } : {}),
    ...(m.livrables ? { livrables: t(m.livrables) } : {}),
    lecons: (m.lecons ?? []).map((l, j) => ({
      id: l.id ?? `lecon-${i}-${j}`,
      titre: t(l.titre),
      dureeMinutes: l.dureeMinutes,
    })),
  }));
}

export function versProgramme(d: ProgrammePayload): Programme {
  return {
    slug: d.slug,
    titre: t(d.titre),
    accroche: t(d.accroche),
    objectifs: t(d.objectifs),
    specialisation: (slugDe(d.specialisation) ?? "sur-mesure") as SpecialisationSlug,
    type: d.type,
    niveau: d.niveau,
    langue: d.langue,
    dureeHeures: d.dureeHeures,
    rythme: t(d.rythme),
    publicVise: valeurs(d.publicVise),
    competences: valeurs(d.competences),
    prerequis: t(d.prerequis),
    debouches: valeurs(d.debouches),
    modules: versModules(d),
    ...(d.certification ? { certification: d.certification } : {}),
    ...(valeurs(d.livrables).length ? { livrables: valeurs(d.livrables) } : {}),
    ...(valeurs(d.outils).length ? { outils: valeurs(d.outils) } : {}),
    ...(d.positionnement ? { positionnement: t(d.positionnement) } : {}),
    ...(valeurs(d.approche).length ? { approche: valeurs(d.approche) } : {}),
    ...(d.mentionsLegales ? { mentionsLegales: t(d.mentionsLegales) } : {}),
  };
}

export function versSession(d: SessionPayload): Session {
  return {
    id: String(d.id),
    programmeSlug: slugDe(d.programme) ?? "",
    mode: d.mode,
    ...(d.ville ? { ville: d.ville } : {}),
    ...(d.pays ? { pays: d.pays } : {}),
    ...(d.lienVisio ? { lienVisio: d.lienVisio } : {}),
    debut: d.debut,
    fin: d.fin,
    ...(d.cadence ? { cadence: d.cadence } : {}),
    capacite: d.capacite,
    placesReservees: d.placesReservees,
    // Le CMS stocke des unités entières ; le domaine raisonne en centimes.
    prixCentimes: Math.round((d.prix ?? 0) * 100),
    devise: d.devise,
    ...(d.fuseau ? { fuseau: d.fuseau } : {}),
  };
}

/** Les blocs du CMS reprennent les quatre formes attendues par le rendu. */
function versBlocs(contenu: ArticlePayload["contenu"]): Bloc[] {
  return (contenu ?? []).flatMap((b): Bloc[] => {
    switch (b.blockType) {
      case "paragraphe":
        return [{ type: "paragraphe", texte: t(b.texte) }];
      case "intertitre":
        return [{ type: "intertitre", texte: t(b.texte) }];
      case "liste":
        return [{ type: "liste", items: valeurs(b.items) }];
      case "citation":
        return [{ type: "citation", texte: t(b.texte), auteur: t(b.auteur) }];
      default:
        return [];
    }
  });
}

export function versArticle(d: ArticlePayload): Article {
  const lie = slugDe(d.programmeLie);
  return {
    slug: d.slug,
    titre: t(d.titre),
    chapo: t(d.chapo),
    categorie: d.categorie as CategorieArticle,
    auteur: d.auteur,
    publieLe: d.publieLe,
    lectureMinutes: d.lectureMinutes,
    ...(lie ? { programmeLie: lie } : {}),
    contenu: versBlocs(d.contenu),
  };
}

export function versTarifs(d: {
  prixComptant?: number | null;
  devise?: Tarifs["devise"] | null;
  plans?:
    | {
        code?: string | null;
        libelle?: string | null;
        total?: number | null;
        echeances?: { montant?: number | null }[] | null;
        conditions?: string | null;
      }[]
    | null;
  moyensPaiement?: { valeur?: string | null }[] | null;
  beneficiaireNom?: string | null;
  beneficiaireVille?: string | null;
  beneficiairePays?: string | null;
  consignesPaiement?: string | null;
}): Tarifs {
  return {
    prixComptantCentimes: Math.round((d.prixComptant ?? 0) * 100),
    devise: d.devise ?? "EUR",
    plans: (d.plans ?? []).map((p) => ({
      code: t(p.code),
      libelle: t(p.libelle),
      totalCentimes: Math.round((p.total ?? 0) * 100),
      echeancesCentimes: (p.echeances ?? []).map((e) => Math.round((e.montant ?? 0) * 100)),
      conditions: t(p.conditions),
    })),
    moyensPaiement: valeurs(d.moyensPaiement),
    ...(d.beneficiaireNom ? { beneficiaireNom: d.beneficiaireNom } : {}),
    ...(d.beneficiaireVille ? { beneficiaireVille: d.beneficiaireVille } : {}),
    ...(d.beneficiairePays ? { beneficiairePays: d.beneficiairePays } : {}),
    ...(d.consignesPaiement ? { consignesPaiement: t(d.consignesPaiement) } : {}),
  };
}

export function versTemoignage(d: {
  id: number | string;
  texte?: string | null;
  auteur?: string | null;
  fonction?: string | null;
  programme?: unknown;
}): Temoignage {
  return {
    id: String(d.id),
    texte: t(d.texte),
    auteur: t(d.auteur),
    fonction: t(d.fonction),
    ...(slugDe(d.programme) ? { programmeSlug: slugDe(d.programme) } : {}),
  };
}

export function versPartenaire(d: {
  id: number | string;
  nom?: string | null;
  nature?: string | null;
  lien?: string | null;
  logo?: unknown;
}): Partenaire {
  const logo = d.logo;
  const media =
    logo && typeof logo === "object" ? (logo as { url?: string; alt?: string }) : undefined;
  return {
    id: String(d.id),
    nom: t(d.nom),
    nature: t(d.nature),
    ...(d.lien ? { lien: d.lien } : {}),
    ...(media?.url ? { logoUrl: media.url } : {}),
    ...(media?.alt ? { logoAlt: media.alt } : {}),
  };
}
