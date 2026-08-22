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
import {
  payloadClient,
  versProgramme,
  versSession,
  versSpecialisation,
  versTarifs,
  versTemoignage,
  versPartenaire,
} from "@/lib/payload";

const chargerCatalogue = cache(async () => {
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
});

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
export async function prixMinimum(programmeSlug: string): Promise<number | undefined> {
  const prix = (await getSessions(programmeSlug)).map((s) => s.prixCentimes);
  return prix.length ? Math.min(...prix) : undefined;
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
 * Normalise pour la recherche : minuscules et accents retirés.
 * Indispensable en français — sans cela « controle » ne trouve pas
 * « contrôle », et « prepa » ne trouve pas « préparation ».
 *
 * BE-09 remplacera ce filtrage en mémoire par la recherche plein texte de
 * PostgreSQL, le jour où le catalogue dépassera quelques centaines d'entrées.
 */
function normaliser(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export async function filtrerProgrammes(f: FiltresCatalogue): Promise<Programme[]> {
  const { programmes, sessions, specialisations } = await chargerCatalogue();
  const termes = f.q ? normaliser(f.q).split(/\s+/).filter(Boolean) : [];

  const texteIndexe = (p: Programme): string => {
    const spec = specialisations.find((s) => s.slug === p.specialisation)?.nom ?? "";
    // Les villes sont indexées : chercher « dakar » est un réflexe naturel,
    // même si le filtre Ville existe par ailleurs.
    const villes = sessions
      .filter((s) => s.programmeSlug === p.slug)
      .map((s) => s.ville)
      .filter(Boolean) as string[];

    return normaliser(
      [
        p.titre,
        p.accroche,
        spec,
        ...p.competences,
        ...p.debouches,
        ...p.modules.map((m) => m.titre),
        ...villes,
      ].join(" "),
    );
  };

  return programmes.filter((p) => {
    if (f.specialisation && p.specialisation !== f.specialisation) return false;

    if (f.mode || f.ville) {
      const ses = sessions.filter((s) => s.programmeSlug === p.slug);
      const ok = ses.some(
        (s) => (!f.mode || s.mode === f.mode) && (!f.ville || s.ville === f.ville),
      );
      if (!ok) return false;
    }

    if (termes.length > 0) {
      const texte = texteIndexe(p);
      if (!termes.every((t) => texte.includes(t))) return false;
    }

    return true;
  });
}

export async function villesDisponibles(): Promise<string[]> {
  const { sessions } = await chargerCatalogue();
  return [...new Set(sessions.map((s) => s.ville).filter((v): v is string => Boolean(v)))].sort();
}

/**
 * Barème du catalogue — un seul document, partagé par les douze parcours.
 * `cache()` évite de le relire à chaque fiche rendue dans la même requête.
 */
export const getTarifs = cache(async (): Promise<Tarifs> => {
  const payload = await payloadClient();
  return versTarifs(
    await payload.findGlobal({ slug: "tarifs", locale: "fr", depth: 0, overrideAccess: false }),
  );
});

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

/** Ré-export : les pages serveur importent tout depuis un seul endroit. */
export * from "@/lib/format";
