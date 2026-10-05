import { LONGUEURS, tientDans } from "@/lib/saisie";

/**
 * Les témoignages déposés par d'anciens participants : ce que la page demande,
 * et ce que la route accepte.
 *
 * Demandé par la direction le 30 septembre 2026 : un formulaire pour les
 * anciens clients — leur fonction, leur cohorte, la formation suivie, leur
 * témoignage, **sans photo**. Les témoignages se saisissaient jusque-là à la
 * main dans /admin, et aucun n'a jamais été publié : il fallait d'abord les
 * recueillir.
 *
 * ── Ce qui n'est pas négociable ─────────────────────────────────────────────
 * - **Rien ne paraît sans relecture.** Un dépôt crée un **brouillon** ; c'est
 *   l'équipe qui le publie depuis /admin. Un formulaire public qui publierait
 *   directement mettrait sur la page qui décide d'un achat ce que n'importe
 *   qui y écrit — y compris un concurrent, ou un faux participant.
 * - **L'accord de publication est explicite**, et daté : le nom et la fonction
 *   d'une personne paraissent sur le site. Une case cochée par défaut ne
 *   vaudrait pas accord.
 *
 * Ce fichier ne touche ni la base ni le réseau : `verifier-temoignages.ts`
 * l'éprouve sans rien ouvrir.
 */

/**
 * Les cohortes déjà réunies, dictées par la direction le 30 septembre 2026.
 *
 * ⚠️ **Une liste fermée, tenue à la main.** Les cohortes passées ne sont pas
 * encore en base (`scripts/cohortes-passees.ts` attend leurs dates) : on ne
 * peut donc pas les lire dans `sessions`. Quand une cohorte se termine, on
 * l'ajoute ici **et** on pousse le schéma — le champ est une énumération.
 *
 * ⚠️ **Une valeur ne se retire jamais**, même si l'on se trompe de libellé :
 * des témoignages la portent, et un témoignage portant une valeur retirée
 * deviendrait invalide à sa première écriture — publication comprise. On
 * corrige le libellé, pas la valeur.
 */
export const COHORTES = [
  { valeur: "2025-10", libelle: "Octobre 2025" },
  { valeur: "2026-02", libelle: "Février 2026" },
  { valeur: "2026-04", libelle: "Avril 2026" },
  { valeur: "2026-06", libelle: "Juin 2026" },
  { valeur: "2026-10", libelle: "Octobre 2026" },
] as const;

export type Cohorte = (typeof COHORTES)[number]["valeur"];

export const OPTIONS_COHORTE = COHORTES.map((c) => ({ label: c.libelle, value: c.valeur }));

/** La cohorte correspondante, ou `undefined` : on ne range pas au hasard. */
export function cohorteValide(valeur: string): Cohorte | undefined {
  return COHORTES.find((c) => c.valeur === valeur)?.valeur;
}

/** « Cohorte d'octobre 2025 », tel que la carte l'écrit. Rien pour une valeur inconnue. */
export function libelleCohorte(valeur?: string | null): string | undefined {
  const c = COHORTES.find((x) => x.valeur === valeur);
  if (!c) return undefined;
  const mois = c.libelle.toLowerCase();
  return /^[aeiouy]/.test(mois) ? `Cohorte d'${mois}` : `Cohorte de ${mois}`;
}

/**
 * Les bornes du témoignage.
 *
 * Trente caractères au moins : « Très bien » ne dit rien qu'un visiteur puisse
 * croire, et la relecture coûterait plus qu'elle ne rapporte. Mille au plus :
 * la carte en montre quatre lignes, et l'équipe peut couper — elle ne peut pas
 * allonger.
 */
export const TEXTE_MIN = 30;
export const TEXTE_MAX = 1000;

/** Les champs tels que la route les lit. */
export interface SaisieTemoignage {
  nom: string;
  fonction: string;
  cohorte: string;
  formation: string;
  texte: string;
  consentement: string;
}

/** Ce que la page sait dire quand un envoi est refusé. */
export type ErreurTemoignage =
  "champs" | "cohorte" | "formation" | "court" | "long" | "consentement";

export type ResultatTemoignage =
  { ok: true; cohorte: Cohorte } | { ok: false; erreur: ErreurTemoignage };

/**
 * Ce qu'un témoignage doit porter pour être enregistré.
 *
 * La formation est seulement exigée ici : savoir si elle existe demande la
 * base, et c'est la route qui la cherche parmi les parcours publiés.
 */
export function validerTemoignage(s: SaisieTemoignage): ResultatTemoignage {
  if (!s.nom || !s.fonction || !s.cohorte || !s.formation || !s.texte) {
    return { ok: false, erreur: "champs" };
  }
  if (!tientDans(s.nom, LONGUEURS.nom) || !tientDans(s.fonction, LONGUEURS.organisation)) {
    return { ok: false, erreur: "long" };
  }
  const cohorte = cohorteValide(s.cohorte);
  if (!cohorte) return { ok: false, erreur: "cohorte" };
  if (s.texte.length < TEXTE_MIN) return { ok: false, erreur: "court" };
  if (s.texte.length > TEXTE_MAX) return { ok: false, erreur: "long" };
  if (s.consentement !== "oui") return { ok: false, erreur: "consentement" };
  return { ok: true, cohorte };
}

/** Une phrase par refus : « une erreur est survenue » ferait renvoyer la même chose. */
export const MESSAGES_TEMOIGNAGE: Record<ErreurTemoignage | "technique", string> = {
  champs: "Merci de remplir tous les champs : nom, fonction, cohorte, formation et témoignage.",
  cohorte: "Choisissez la cohorte que vous avez suivie dans la liste.",
  formation: "Choisissez la formation que vous avez suivie dans la liste.",
  court: `Votre témoignage est un peu court : quelques phrases suffisent (${TEXTE_MIN} caractères au moins).`,
  long: `Un champ dépasse la longueur permise. Le témoignage tient en ${TEXTE_MAX} caractères au plus.`,
  consentement:
    "Pour que votre témoignage paraisse sur le site, nous avons besoin de votre accord : cochez la case.",
  technique: "Votre témoignage n'a pas pu être enregistré. Réessayez dans un instant.",
};

/* ── Le rangement par cohorte, dans /admin ───────────────────────────────── */

/**
 * Ce que le bandeau « Par cohorte » compte, au-dessus de la liste de /admin.
 *
 * Demandé par la direction le 5 octobre 2026 : les témoignages se relisent et
 * se publient cohorte par cohorte, et l'écran doit le montrer. La liste de
 * Payload ne sait que trier une colonne ; elle ne dit pas « octobre 2025 : deux
 * à relire, aucun publié ».
 *
 * - **Toutes les cohortes paraissent, même vides**, de la plus récente à la
 *   plus ancienne. Une cohorte à zéro dit où il reste à recueillir — c'est
 *   l'information, pas un trou.
 * - ⚠️ **« À relire », c'est un brouillon.** Un témoignage déposé depuis le site
 *   naît brouillon, et rien ne paraît avant qu'on le publie. Le compter parmi
 *   les publiés ferait croire qu'il est en ligne.
 * - ⚠️ **Une valeur hors liste va dans « Sans cohorte »**, jamais dans une
 *   cohorte voisine : ranger au hasard, c'est attribuer un témoignage à des
 *   gens qui ne l'ont pas écrit.
 */
export interface CompteDeCohorte {
  aRelire: number;
  publies: number;
}

export interface LigneDeCohorteAdmin extends CompteDeCohorte {
  valeur: Cohorte;
  libelle: string;
}

export interface RepartitionDesTemoignages {
  cohortes: LigneDeCohorteAdmin[];
  sansCohorte: CompteDeCohorte;
  aRelire: number;
  total: number;
}

export function repartitionParCohorte(
  docs: { cohorte?: string | null; _status?: string | null }[],
): RepartitionDesTemoignages {
  const parValeur = new Map<string, CompteDeCohorte>();
  const sansCohorte: CompteDeCohorte = { aRelire: 0, publies: 0 };
  let aRelire = 0;

  for (const d of docs) {
    const brouillon = d._status !== "published";
    if (brouillon) aRelire += 1;
    const valeur = cohorteValide(d.cohorte ?? "");
    const compte = valeur
      ? (parValeur.get(valeur) ?? parValeur.set(valeur, { aRelire: 0, publies: 0 }).get(valeur)!)
      : sansCohorte;
    if (brouillon) compte.aRelire += 1;
    else compte.publies += 1;
  }

  const cohortes = [...COHORTES].reverse().map((c) => ({
    valeur: c.valeur,
    libelle: c.libelle,
    ...(parValeur.get(c.valeur) ?? { aRelire: 0, publies: 0 }),
  }));

  return { cohortes, sansCohorte, aRelire, total: docs.length };
}

/** Ce que l'on filtre depuis le bandeau. */
export type FiltreDesTemoignages =
  | { genre: "tous" }
  | { genre: "a-relire" }
  | { genre: "cohorte"; cohorte: Cohorte }
  | { genre: "sans-cohorte" };

/**
 * L'adresse de la liste de /admin, filtrée.
 *
 * ⚠️ **Un filtre d'URL faux ne casse rien** : Payload rend la liste entière,
 * sans erreur. Les noms de champs (`cohorte`, `_status`) sont donc écrits ici
 * une fois, et `filtreDeLAdresse` les relit avec les mêmes.
 */
export function lienDesTemoignages(f: FiltreDesTemoignages): string {
  const base = "/admin/collections/temoignages";
  switch (f.genre) {
    case "a-relire":
      return `${base}?where[_status][equals]=draft`;
    case "cohorte":
      return `${base}?where[cohorte][equals]=${encodeURIComponent(f.cohorte)}`;
    case "sans-cohorte":
      return `${base}?where[cohorte][exists]=false`;
    default:
      return base;
  }
}

/**
 * Le filtre que porte l'adresse, pour marquer la carte active.
 *
 * Next rend les paramètres tels quels (`where[cohorte][equals]`), Payload les
 * rend parfois déjà imbriqués : les deux formes sont lues.
 */
export function filtreDeLAdresse(
  params: Record<string, unknown> | undefined,
): FiltreDesTemoignages {
  const p = params ?? {};
  const where = (p.where ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const lire = (champ: string, op: string): unknown =>
    p[`where[${champ}][${op}]`] ?? where[champ]?.[op];

  const cohorte = cohorteValide(String(lire("cohorte", "equals") ?? ""));
  if (cohorte) return { genre: "cohorte", cohorte };
  if (String(lire("cohorte", "exists") ?? "") === "false") return { genre: "sans-cohorte" };
  if (String(lire("_status", "equals") ?? "") === "draft") return { genre: "a-relire" };
  return { genre: "tous" };
}
