import type { Programme, Session } from "@/lib/types";
import { planDesSeances } from "@/lib/format";

/**
 * L'emploi du temps de la cohorte ouverte, composé depuis les sessions.
 *
 * Demandé par la direction le 1er octobre 2026 : l'emploi du temps qu'elle a
 * validé en PDF — qui étudie quel soir, du premier au dernier soir, le
 * calendrier entier — doit se lire sur le site, pour que le visiteur sache
 * avant de s'inscrire s'il pourra suivre.
 *
 * ── Pourquoi rien n'est écrit à la main ─────────────────────────────────────
 * Le PDF est une photographie : le jour où une session bouge dans /admin, il
 * ment. La page, elle, regroupe les sessions **ouvertes** par rythme — mêmes
 * jours, même horaire, mêmes dates — et en déduit chaque soirée par
 * `planDesSeances`, la règle qui donne aussi son calendrier à la fiche d'un
 * parcours. Deux lectures d'un même rythme qui ne diraient pas la même date
 * seraient pires que pas de page du tout.
 *
 * ⚠️ **Une session dont le calendrier ne se déduit pas n'est pas devinée** :
 * elle est rendue à part (`nonDatees`), avec un renvoi vers sa fiche. La faire
 * entrer de force dans un rythme voisin annoncerait des soirées qu'elle n'a
 * pas.
 *
 * Ce fichier ne touche ni la base ni le réseau : `verifier-emploi.ts`
 * l'éprouve sans rien ouvrir.
 */

/** Lundi d'abord : c'est l'ordre dans lequel on lit une semaine de travail. */
export const ORDRE_DES_JOURS = [1, 2, 3, 4, 5, 6, 0];
export const NOMS_DES_JOURS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

/**
 * Une couleur par rythme, dans l'ordre où ils commencent. Les deux premières
 * sont celles de la maison ; les suivantes ne servent que si la direction
 * ouvre plus de deux rythmes à la fois.
 */
export const COULEURS_DES_RYTHMES = ["#e9cd84", "#2fa37d", "#93c5fd", "#c4b5fd"];

export interface FormationDuRythme {
  slug: string;
  titre: string;
  specialisation?: string;
  /** Toutes ses soirées, régulières et en plus. */
  soirees: number;
  /** Les soirées qu'elle ajoute à date fixe (la préparation PMP®). */
  enPlus: string[];
  debut: string;
  fin: string;
}

export interface Rythme {
  /** « Lundi et mercredi ». */
  libelle: string;
  jours: number[];
  /** « 19h00–21h00 », tel que la cadence l'écrit. */
  horaire?: string;
  fuseau?: string;
  /** Les soirées régulières, communes à toutes ses formations. */
  regulieres: string[];
  formations: FormationDuRythme[];
  couleur: string;
}

export interface JourDuCalendrier {
  /** AAAA-MM-JJ */
  jour: string;
  /** Les rythmes qui ont cours ce soir-là, avec le numéro de la soirée. */
  rythmes: { index: number; n: number; total: number }[];
  /** Les soirées en plus de ce soir-là. */
  enPlus: { titre: string; index: number; n: number; total: number }[];
}

export interface EmploiDuTemps {
  rythmes: Rythme[];
  /** Les jours affichés en colonnes, lundi d'abord. */
  colonnes: number[];
  semaines: { lundi: string; jours: JourDuCalendrier[] }[];
  debut: string;
  fin: string;
  /** Les sessions ouvertes dont le calendrier ne se déduit pas. */
  nonDatees: { slug: string; titre: string }[];
}

const jourDe = (iso: string) => iso.slice(0, 10);

function libelleDesJours(jours: number[]): string {
  const noms = ORDRE_DES_JOURS.filter((j) => jours.includes(j)).map((j) => NOMS_DES_JOURS[j]!);
  if (noms.length <= 1) return noms[0] ?? "";
  return `${noms.slice(0, -1).join(", ")} et ${noms.at(-1)!.toLowerCase()}`;
}

/** Le lundi de la semaine d'un instant, à minuit UTC. */
function lundiDe(iso: string): Date {
  const d = new Date(`${jourDe(iso)}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

/**
 * Compose l'emploi du temps des sessions données — l'appelant passe les
 * sessions **ouvertes** (`getAgenda`), jamais les cohortes clôturées.
 *
 * Rend `undefined` quand aucune session ne se date : une page vide se lirait
 * comme une page cassée.
 */
export function composerEmploi(
  sessions: Session[],
  programmes: Programme[],
): EmploiDuTemps | undefined {
  const rangDuProgramme = new Map(programmes.map((p, i) => [p.slug, i]));
  const parSlug = new Map(programmes.map((p) => [p.slug, p]));

  const groupes = new Map<string, Omit<Rythme, "couleur">>();
  const nonDatees: EmploiDuTemps["nonDatees"] = [];

  for (const s of sessions) {
    const programme = parSlug.get(s.programmeSlug);
    if (!programme) continue;
    const plan = planDesSeances(s.debut, s.fin, s.cadence);
    if (!plan) {
      nonDatees.push({ slug: programme.slug, titre: programme.titre });
      continue;
    }
    const horaire = /(\d{1,2}h\d{2})\s*[–-]\s*(\d{1,2}h\d{2})/.exec(s.cadence ?? "");
    const jours = [...plan.jours].sort((a, b) => a - b);
    const cle = [
      jours.join(","),
      horaire?.[0] ?? "",
      s.fuseau ?? "",
      jourDe(plan.regulieres[0]!),
      jourDe(plan.regulieres.at(-1)!),
      plan.regulieres.length,
    ].join("|");

    const groupe = groupes.get(cle) ?? {
      libelle: libelleDesJours(jours),
      jours,
      ...(horaire ? { horaire: `${horaire[1]}–${horaire[2]}` } : {}),
      ...(s.fuseau ? { fuseau: s.fuseau } : {}),
      regulieres: plan.regulieres,
      formations: [],
    };
    groupe.formations.push({
      slug: programme.slug,
      titre: programme.titre,
      ...(programme.specialisation ? { specialisation: programme.specialisation } : {}),
      soirees: plan.regulieres.length + plan.enPlus.length,
      enPlus: plan.enPlus,
      debut: s.debut,
      fin: s.fin,
    });
    groupes.set(cle, groupe);
  }

  if (groupes.size === 0) return undefined;

  const rythmes: Rythme[] = [...groupes.values()]
    .sort(
      (a, b) =>
        a.regulieres[0]!.localeCompare(b.regulieres[0]!) ||
        ORDRE_DES_JOURS.indexOf(a.jours[0]!) - ORDRE_DES_JOURS.indexOf(b.jours[0]!),
    )
    .map((r, i) => ({
      ...r,
      formations: [...r.formations].sort(
        (a, b) => (rangDuProgramme.get(a.slug) ?? 0) - (rangDuProgramme.get(b.slug) ?? 0),
      ),
      couleur: COULEURS_DES_RYTHMES[i % COULEURS_DES_RYTHMES.length]!,
    }));

  // Chaque soirée, indexée par jour.
  const parJour = new Map<string, JourDuCalendrier>();
  const entree = (jour: string) => {
    const e = parJour.get(jour) ?? { jour, rythmes: [], enPlus: [] };
    parJour.set(jour, e);
    return e;
  };
  rythmes.forEach((r, index) => {
    r.regulieres.forEach((d, i) =>
      entree(jourDe(d)).rythmes.push({ index, n: i + 1, total: r.regulieres.length }),
    );
    for (const f of r.formations) {
      f.enPlus.forEach((d, i) =>
        entree(jourDe(d)).enPlus.push({ titre: f.titre, index, n: i + 1, total: f.enPlus.length }),
      );
    }
  });

  const tous = [...parJour.keys()].sort();
  const debut = tous[0]!;
  const fin = tous.at(-1)!;

  /*
    Les colonnes : du lundi au dernier jour qui porte une soirée, et au moins
    jusqu'au vendredi. Un vendredi sans cours reste visible — c'est ce qui dit
    au visiteur qu'il est libre, plutôt que de le laisser se demander.
  */
  const utilises = new Set(tous.map((j) => new Date(`${j}T00:00:00.000Z`).getUTCDay()));
  const dernier = Math.max(4, ...[...utilises].map((j) => ORDRE_DES_JOURS.indexOf(j)));
  const colonnes = ORDRE_DES_JOURS.slice(0, dernier + 1);

  const semaines: EmploiDuTemps["semaines"] = [];
  for (let l = lundiDe(debut); jourDe(l.toISOString()) <= fin; l.setUTCDate(l.getUTCDate() + 7)) {
    const lundi = jourDe(l.toISOString());
    const jours = colonnes.map((j) => {
      const d = new Date(l);
      d.setUTCDate(d.getUTCDate() + ORDRE_DES_JOURS.indexOf(j));
      const jour = jourDe(d.toISOString());
      return parJour.get(jour) ?? { jour, rythmes: [], enPlus: [] };
    });
    semaines.push({ lundi, jours });
  }

  return { rythmes, colonnes, semaines, debut, fin, nonDatees };
}
