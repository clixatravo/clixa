/**
 * Couche d'accès au catalogue.
 *
 * INT-01 — Ces fonctions lisaient src/data/ ; elles interrogent désormais
 * Payload. Les signatures n'ont pas changé, seul leur corps : les composants
 * n'ont été touchés que pour ajouter `await`.
 *
 * ── Une seule lecture par requête ───────────────────────────────────────────
 * Le catalogue tient en quelques dizaines de documents. Plutôt que d'interroger
 * la base à chaque appel — la page catalogue en ferait des dizaines — on charge
 * l'ensemble une fois, et `cache()` de React garantit que ce chargement n'a lieu
 * qu'une fois par requête, quel que soit le nombre d'appels.
 */
import { cache } from "react";
import { unstable_cache } from "next/cache";

import { ETIQUETTE_CATALOGUE, ETIQUETTE_TARIFS, PEREMPTION } from "@/lib/etiquettes";

import type {
  ModeDiffusion,
  Partenaire,
  Programme,
  Session,
  Specialisation,
  Tarifs,
  Temoignage,
} from "@/lib/types";
import { placesRestantes } from "@/lib/types";
import { aplatir, rechercher, type DocumentIndexe } from "@/lib/recherche";
import {
  payloadClient,
  versProgramme,
  versSession,
  versSpecialisation,
  versTarifs,
  versTemoignage,
  versPartenaire,
} from "@/lib/payload";

/**
 * ── Deux caches, et ils ne font pas le même travail ─────────────────────────
 *
 * `cache()` de React ne vaut que pour une requête : il évite que les douze
 * cartes du catalogue relisent chacune la même chose. `unstable_cache` de Next
 * vaut d'une requête à l'autre — c'est lui qui évite d'aller jusqu'à la base.
 * L'un sans l'autre laisse la moitié du travail.
 *
 * Ce que cela retire : quatre allers-retours vers Francfort à chaque affichage
 * du catalogue, qui se rend à la demande puisque ses filtres vivent dans l'URL.
 *
 * Ce que cela ne retire pas : la recherche. Sa clé serait ce que tape le
 * visiteur — chaque terme inédit laisserait une entrée, et rien n'empêcherait
 * d'en fabriquer autant qu'on veut. Depuis Francfort elle coûte une trentaine
 * de millisecondes ; ce n'est pas ce qu'on cherchait à économiser.
 *
 * Les lectures publiques passent `overrideAccess: false` sans requête : le
 * résultat est celui d'un visiteur anonyme, le même pour tous. C'est la
 * condition pour qu'un cache partagé soit correct — le jour où une lecture
 * dépendrait de qui regarde, elle ne pourrait plus vivre ici.
 */
const chargerCatalogue = cache(
  unstable_cache(
    async () => {
      const payload = await payloadClient();

      // Tri explicite : sans lui, Payload renvoie les documents du plus récent au
      // plus ancien, et l'ordre du catalogue changeait à chaque ajout. « id » suit
      // l'ordre de création, donc l'ordre dans lequel l'équipe a saisi les fiches.
      const [specs, progs, sess] = await Promise.all([
        payload.find({
          collection: "specialisations",
          limit: 200,
          locale: "fr",
          depth: 0,
          sort: "id",
          overrideAccess: false,
        }),
        payload.find({
          collection: "programmes",
          limit: 200,
          locale: "fr",
          depth: 1,
          sort: "id",
          overrideAccess: false,
        }),
        payload.find({
          collection: "sessions",
          limit: 500,
          locale: "fr",
          depth: 1,
          sort: "debut",
          overrideAccess: false,
        }),
      ]);

      return {
        specialisations: specs.docs.map(versSpecialisation),
        programmes: progs.docs.map(versProgramme),
        sessions: sess.docs.map(versSession),
      };
    },
    ["catalogue"],
    { tags: [ETIQUETTE_CATALOGUE], revalidate: PEREMPTION },
  ),
);

/* ────────────────────────────  LECTURES  ──────────────────────────── */

export async function getSpecialisations(): Promise<Specialisation[]> {
  return (await chargerCatalogue()).specialisations;
}

export async function getSpecialisation(slug: string): Promise<Specialisation | undefined> {
  return (await chargerCatalogue()).specialisations.find((s) => s.slug === slug);
}

export async function getProgrammes(): Promise<Programme[]> {
  return (await chargerCatalogue()).programmes;
}

export async function getProgramme(slug: string): Promise<Programme | undefined> {
  return (await chargerCatalogue()).programmes.find((p) => p.slug === slug);
}

export async function getProgrammesParSpecialisation(slug: string): Promise<Programme[]> {
  return (await chargerCatalogue()).programmes.filter((p) => p.specialisation === slug);
}

/** Sessions d'un programme, triées par date de début. */
export async function getSessions(programmeSlug: string): Promise<Session[]> {
  return (await chargerCatalogue()).sessions
    .filter((s) => s.programmeSlug === programmeSlug)
    .sort((a, b) => a.debut.localeCompare(b.debut));
}

/** Première session encore ouverte à la réservation. */
export async function getProchaineSession(programmeSlug: string): Promise<Session | undefined> {
  return (await getSessions(programmeSlug)).find((s) => placesRestantes(s) > 0);
}

/** Toutes les sessions à venir, tous programmes confondus. */
export async function getAgenda(limite = 6): Promise<Session[]> {
  return [...(await chargerCatalogue()).sessions]
    .sort((a, b) => a.debut.localeCompare(b.debut))
    .slice(0, limite);
}

/** Prix d'entrée d'un programme, toutes modalités confondues. */
/**
 * Le prix montré sur les cartes et les images de partage.
 *
 * Le plus élevé du barème, et non le comptant. C'est une décision de la
 * direction : la vitrine annonce ce que coûte un parcours au rythme le plus
 * courant, la fiche détaille les trois et montre l'écart.
 *
 * Il se déduit du barème plutôt que d'être écrit en dur : le jour où les
 * montants changeront, la vitrine suivra sans qu'on y touche.
 *
 * ⚠️ Un visiteur voit donc 470 € sur la carte et « 423 € comptant » sur la
 * fiche. C'est voulu — il découvre moins cher, jamais plus — mais les deux
 * chiffres doivent rester cohérents entre eux : si le barème cesse un jour
 * d'avoir un plan comptant moins cher, cette fonction n'a plus de raison d'être.
 */
export function prixAffiche(tarifs: Tarifs): number {
  const totaux = tarifs.plans.map((p) => p.totalCentimes).filter((n) => n > 0);
  return totaux.length ? Math.max(...totaux) : tarifs.prixComptantCentimes;
}

export async function modalites(programmeSlug: string): Promise<ModeDiffusion[]> {
  return [...new Set((await getSessions(programmeSlug)).map((s) => s.mode))];
}

/* ────────────────────────────  FILTRES  ──────────────────────────── */

export interface FiltresCatalogue {
  specialisation?: string;
  mode?: ModeDiffusion;
  ville?: string;
  q?: string;
}

/**
 * Le texte sur lequel porte la recherche, pour un parcours.
 *
 * Le titre est rendu à part : il pèse plus lourd au classement qu'une simple
 * mention en corps de fiche. Chercher « audit » doit d'abord ramener
 * « Directeur Audit Interne », pas un parcours dont un module cite le mot.
 */
function indexer(
  p: Programme,
  specialisations: Specialisation[],
  sessions: Session[],
): DocumentIndexe {
  const spec = specialisations.find((s) => s.slug === p.specialisation)?.nom ?? "";
  // Les villes sont indexées : chercher « dakar » est un réflexe naturel,
  // même si le filtre Ville existe par ailleurs.
  const villes = sessions
    .filter((s) => s.programmeSlug === p.slug)
    .map((s) => s.ville)
    .filter(Boolean) as string[];

  return {
    slug: p.slug,
    titre: p.titre,
    corps: [
      p.accroche,
      spec,
      ...p.competences,
      ...p.debouches,
      // Le public visé porte les métiers : « chef comptable », « PMO »,
      // « HR business partner ». C'est sous ce nom-là qu'un visiteur se
      // reconnaît, bien avant « Directeur des Ressources Humaines ».
      ...p.publicVise,
      ...(p.positionnement ? [p.positionnement] : []),
      ...p.modules.map((m) => m.titre),
      ...villes,
    ].join(" "),
  };
}

export async function filtrerProgrammes(f: FiltresCatalogue): Promise<Programme[]> {
  const { programmes, sessions, specialisations } = await chargerCatalogue();

  // Les filtres de façade d'abord : ils sont exacts, et ils réduisent ce qu'on
  // soumet à la recherche.
  const retenus = programmes.filter((p) => {
    if (f.specialisation && p.specialisation !== f.specialisation) return false;

    if (f.mode || f.ville) {
      const ses = sessions.filter((s) => s.programmeSlug === p.slug);
      return ses.some((s) => (!f.mode || s.mode === f.mode) && (!f.ville || s.ville === f.ville));
    }

    return true;
  });

  const q = f.q?.trim();
  if (!q) return retenus;

  const documents = retenus.map((p) => indexer(p, specialisations, sessions));
  const parSlug = new Map(retenus.map((p) => [p.slug, p]));

  try {
    const classes = await rechercher(documents, q);
    return classes.map((slug) => parSlug.get(slug)).filter((p): p is Programme => Boolean(p));
  } catch (erreur) {
    /*
      La recherche est un raffinement, pas la page. Une requête qui échoue doit
      dégrader le classement, pas rendre le catalogue inaccessible — on retombe
      sur la comparaison de chaînes, qui trouve moins mais ne trouve jamais faux.

      Journalisé plutôt qu'avalé : sans cette trace, une régression de la
      requête resterait invisible, le catalogue paraissant simplement moins bon.
    */
    console.error("BE-09 — recherche PostgreSQL indisponible, repli en mémoire :", erreur);

    const termes = aplatir(q).split(/\s+/).filter(Boolean);
    return retenus.filter((p) => {
      const d = documents.find((x) => x.slug === p.slug);
      const texte = aplatir(`${d?.titre ?? ""} ${d?.corps ?? ""}`);
      return termes.every((t) => texte.includes(t));
    });
  }
}

export async function villesDisponibles(): Promise<string[]> {
  const { sessions } = await chargerCatalogue();
  return [...new Set(sessions.map((s) => s.ville).filter((v): v is string => Boolean(v)))].sort();
}

/**
 * Barème du catalogue — un seul document, partagé par les douze parcours.
 * `cache()` évite de le relire à chaque fiche rendue dans la même requête.
 */
/**
 * Le barème est lu par chaque carte du catalogue — douze par affichage — et par
 * chaque fiche. Même raison, mêmes deux caches.
 */
export const getTarifs = cache(
  unstable_cache(
    async (): Promise<Tarifs> => {
      const payload = await payloadClient();
      return versTarifs(
        await payload.findGlobal({ slug: "tarifs", locale: "fr", depth: 0, overrideAccess: false }),
      );
    },
    ["tarifs"],
    { tags: [ETIQUETTE_TARIFS], revalidate: PEREMPTION },
  ),
);

/**
 * Témoignages et partenaires.
 *
 * `lecturePubliee` filtre déjà les brouillons pour un visiteur anonyme : ce qui
 * n'est pas publié ne remonte pas. Les pages n'affichent leur section que si la
 * liste est non vide — un bandeau de partenaires vide vaut moins que pas de
 * bandeau.
 */
export const getTemoignages = cache(async (): Promise<Temoignage[]> => {
  const payload = await payloadClient();
  const { docs } = await payload.find({
    collection: "temoignages",
    limit: 50,
    locale: "fr",
    depth: 1,
    sort: "id",
    overrideAccess: false,
  });
  return docs.map(versTemoignage);
});

/** Les témoignages rattachés à un parcours donné. */
export async function getTemoignagesDe(programmeSlug: string): Promise<Temoignage[]> {
  return (await getTemoignages()).filter((t) => t.programmeSlug === programmeSlug);
}

export const getPartenaires = cache(async (): Promise<Partenaire[]> => {
  const payload = await payloadClient();
  const { docs } = await payload.find({
    collection: "partenaires",
    limit: 50,
    locale: "fr",
    depth: 1,
    sort: "ordre",
    overrideAccess: false,
  });
  return docs.map(versPartenaire);
});

/**
 * Quelques métiers à proposer au visiteur, pour amorcer sa recherche.
 *
 * Le catalogue est fait de douze « Directeur X ». Quelqu'un qui n'est pas
 * encore directeur — chef comptable, PMO, HR business partner — ne se
 * reconnaît dans aucun titre et passe son chemin. Or les fiches nomment ces
 * métiers-là : soixante intitulés de public visé dorment en base.
 *
 * On en tire un par spécialisation, le plus court, pour que la ligne reste
 * lisible. Rien n'est écrit ici : le jour où l'équipe change un public visé,
 * la suggestion suit.
 */
export const metiersSuggeres = cache(async (limite = 6): Promise<string[]> => {
  const { programmes } = await chargerCatalogue();

  const parSpecialisation = new Map<string, string>();
  for (const p of programmes) {
    for (const metier of p.publicVise) {
      // Les intitulés longs — « DAF en prise de poste ou en renforcement de
      // pratique » — décrivent une situation, pas un métier : ils ne font pas
      // un bon bouton.
      if (metier.length > 30) continue;
      const actuel = parSpecialisation.get(p.specialisation);
      if (!actuel || metier.length < actuel.length) {
        parSpecialisation.set(p.specialisation, metier);
      }
    }
  }

  return [...new Set(parSpecialisation.values())].slice(0, limite);
});

/** Ré-export : les pages serveur importent tout depuis un seul endroit. */
export * from "@/lib/format";
