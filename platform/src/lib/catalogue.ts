/**
 * Couche d'accès au catalogue.
 *
 * C'est LA couture prévue par le plan : en phase 01 temps 4 (INT-01), le corps de
 * ces fonctions passe des données factices à des requêtes Payload. Les signatures
 * ne changent pas, donc aucun composant n'est touché.
 */

import { programmes, sessions, specialisations } from "@/data/catalogue";
import type { ModeDiffusion, Programme, Session, Specialisation } from "@/lib/types";
import { placesRestantes } from "@/lib/types";

export function getSpecialisations(): Specialisation[] {
  return specialisations;
}

export function getSpecialisation(slug: string): Specialisation | undefined {
  return specialisations.find((s) => s.slug === slug);
}

export function getProgrammes(): Programme[] {
  return programmes;
}

export function getProgramme(slug: string): Programme | undefined {
  return programmes.find((p) => p.slug === slug);
}

export function getProgrammesParSpecialisation(slug: string): Programme[] {
  return programmes.filter((p) => p.specialisation === slug);
}

/** Sessions d'un programme, à venir uniquement, triées par date de début. */
export function getSessions(programmeSlug: string): Session[] {
  return sessions
    .filter((s) => s.programmeSlug === programmeSlug)
    .sort((a, b) => a.debut.localeCompare(b.debut));
}

/** Première session encore ouverte à la réservation. */
export function getProchaineSession(programmeSlug: string): Session | undefined {
  return getSessions(programmeSlug).find((s) => placesRestantes(s) > 0);
}

/** Toutes les sessions à venir, tous programmes confondus. */
export function getAgenda(limite = 6): Session[] {
  return [...sessions].sort((a, b) => a.debut.localeCompare(b.debut)).slice(0, limite);
}

/** Prix d'entrée d'un programme, toutes modalités confondues. */
export function prixMinimum(programmeSlug: string): number | undefined {
  const prix = getSessions(programmeSlug).map((s) => s.prixCentimes);
  return prix.length ? Math.min(...prix) : undefined;
}

export function modalites(programmeSlug: string): ModeDiffusion[] {
  return [...new Set(getSessions(programmeSlug).map((s) => s.mode))];
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
 */
function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Texte indexé d'un programme — remplacé par la recherche Postgres en BE-09. */
function texteIndexe(p: Programme): string {
  const spec = getSpecialisation(p.specialisation)?.nom ?? "";
  // Les villes sont indexées : chercher « dakar » est un réflexe naturel,
  // même si le filtre Ville existe par ailleurs.
  const villes = getSessions(p.slug)
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
}

export function filtrerProgrammes(f: FiltresCatalogue): Programme[] {
  const termes = f.q ? normaliser(f.q).split(/\s+/).filter(Boolean) : [];

  return programmes.filter((p) => {
    if (f.specialisation && p.specialisation !== f.specialisation) return false;

    if (f.mode || f.ville) {
      const ses = getSessions(p.slug);
      const ok = ses.some(
        (s) => (!f.mode || s.mode === f.mode) && (!f.ville || s.ville === f.ville),
      );
      if (!ok) return false;
    }

    // Tous les termes doivent être présents, dans n'importe quel champ.
    if (termes.length > 0) {
      const texte = texteIndexe(p);
      if (!termes.every((t) => texte.includes(t))) return false;
    }

    return true;
  });
}

export function villesDisponibles(): string[] {
  return [...new Set(sessions.map((s) => s.ville).filter((v): v is string => Boolean(v)))].sort();
}

/* ────────────────────────────  FORMATAGE  ──────────────────────────── */

const LOCALE = "fr-FR";

export function formatPrix(centimes: number, devise: Session["devise"] = "EUR"): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: devise,
    maximumFractionDigits: 0,
  }).format(centimes / 100);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatDateCourte(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/** « 09 – 13 nov. 2026 » si même mois, sinon les deux dates complètes. */
export function formatPeriode(debut: string, fin: string): string {
  const d = new Date(debut);
  const f = new Date(fin);
  if (d.getMonth() === f.getMonth() && d.getFullYear() === f.getFullYear()) {
    const jour = new Intl.DateTimeFormat(LOCALE, { day: "2-digit" });
    const suite = new Intl.DateTimeFormat(LOCALE, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `${jour.format(d)} – ${suite.format(f)}`;
  }
  return `${formatDateCourte(debut)} → ${formatDateCourte(fin)}`;
}

/** 90 → « 1 h 30 », 60 → « 1 h 00 ». */
export function formatDuree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

export function dureeModule(lecons: { dureeMinutes: number }[]): number {
  return lecons.reduce((t, l) => t + l.dureeMinutes, 0);
}

export const libelleMode: Record<ModeDiffusion, string> = {
  presentiel: "Présentiel",
  visio: "À distance",
  "en-ligne": "En ligne",
};

export function lieuSession(s: Session): string {
  if (s.mode === "presentiel") return [s.ville, s.pays].filter(Boolean).join(", ");
  if (s.mode === "visio") return "Classe virtuelle";
  return "Accès permanent";
}
