/**
 * Mise en forme — prix, dates, durées, libellés.
 *
 * Séparé de la couche d'accès pour une raison précise : `PlanDeCours` est un
 * composant client et n'a besoin que de `formatDuree`. Tant que ces fonctions
 * vivaient dans catalogue.ts, l'import entraînait Payload — et tout son code
 * serveur — dans le paquet envoyé au navigateur. Le build échouait.
 *
 * Ce fichier ne dépend que des types : il peut être importé de partout.
 */
import type { ModeDiffusion, Session } from "@/lib/types";

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

/**
 * Nom lisible d'un fuseau. Les fiches annoncent « 13h00–17h00 UTC » : la valeur
 * brute d'un identifiant IANA (« Africa/Casablanca ») ne se montre pas telle
 * quelle à un visiteur.
 */
const FUSEAUX: Record<string, string> = {
  UTC: "UTC",
  GMT: "GMT",
  "Africa/Casablanca": "heure du Maroc",
  "Africa/Abidjan": "heure d'Abidjan",
  "Africa/Dakar": "heure de Dakar",
};

export function libelleFuseau(fuseau: string): string {
  return FUSEAUX[fuseau] ?? fuseau;
}
