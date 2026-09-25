/**
 * Où en est chaque participant dans ses versements, vu de l'équipe.
 *
 * ── Ce que le tableau de bord ne disait pas ─────────────────────────────────
 * Demandé par la direction le 25 septembre 2026 : « kola chatr rah khass l
 * clien i seft l justif dyalo o hna teb9a tal3a lina […] beli hado mazal lhom
 * joj achtor, hado mazal lihom chatr ». Le bandeau comptait les transferts
 * annoncés et les échéances dépassées ; il ne disait pas, pour chaque personne,
 * combien de versements il lui reste — c'est-à-dire qui relancer ce mois-ci et
 * qui a fini.
 *
 * ── Pourquoi un calcul à part ────────────────────────────────────────────────
 * Comme `lib/supervision.ts` et `lib/profil.ts` : un regroupement écrit dans le
 * composant ne s'éprouverait qu'en ouvrant un navigateur et en se connectant.
 * `verifier-versements.ts` l'éprouve sans base ni réseau.
 *
 * ⚠️ **Seuls les dossiers qui ont reçu de quoi régler y figurent.** Avant
 * `coordonneesEnvoyeesLe`, le participant n'a nulle part où envoyer l'argent :
 * l'écrire « reste 3 tranches » le rangerait parmi ceux qu'on relance pour
 * payer, le défaut qui a coûté un vrai prospect le 5 septembre 2026. Un
 * versement déjà reçu fait entrer le dossier quoi qu'il en soit.
 *
 * ⚠️ **L'horloge est passée, jamais lue** — c'est ce qui rend le contrôle
 * identique demain matin, comme `lib/delai.ts`.
 */

export interface EcheanceSuivie {
  montant?: number | null;
  statut?: string | null;
  dateLimite?: string | null;
  moyen?: string | null;
}

export interface DossierSuivi {
  id: number | string;
  apprenantNom?: string | null;
  reference?: string | null;
  statut?: string | null;
  coordonneesEnvoyeesLe?: string | null;
  /** Tel que Payload le rend : un tableau, parfois `0` ou `null` quand il est vide. */
  echeances?: unknown;
}

/** Une pièce jointe, réduite à ce qui la rattache. */
export interface RecuSuivi {
  dossier?: number | string | { id?: number | string } | null;
  echeance?: number | null;
}

export interface LigneVersement {
  id: number | string;
  nom: string;
  reference: string;
  /** Nombre total de tranches du rythme choisi. */
  total: number;
  reglees: number;
  restantes: number;
  /** La première tranche non réglée — celle qu'on attend. */
  prochaine?: {
    rang: number;
    montant: number;
    dateLimite?: string;
    enRetard: boolean;
    moyen?: string;
  };
  /** Le participant a annoncé son versement : il attend qu'on le vérifie. */
  annonce: boolean;
  /** Et il a joint une pièce pour cette tranche (ou une pièce sans tranche). */
  avecJustificatif: boolean;
}

export interface GroupeDeVersements {
  /** Nombre de tranches qu'il reste à régler. */
  restantes: number;
  lignes: LigneVersement[];
}

export interface SuiviDesVersements {
  /** Dossiers en phase de règlement, soldés compris. */
  total: number;
  /** Les versements annoncés, à vérifier maintenant — le travail du jour. */
  aVerifier: LigneVersement[];
  /** Par nombre de tranches restantes, du plus grand au plus petit. */
  groupes: GroupeDeVersements[];
  soldes: LigneVersement[];
}

/** Un tableau vide peut arriver en `0` : `?? []` ne rattrape que `null`. */
const lignesDe = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Le jour de calendrier à Agadir, en `AAAA-MM-JJ` — celui de l'équipe. */
function jourIso(maintenant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(maintenant);
}

function idDuDossier(r: RecuSuivi): string | undefined {
  const d = r.dossier;
  if (d === null || d === undefined) return undefined;
  if (typeof d === "object") return d.id === undefined ? undefined : String(d.id);
  return String(d);
}

export function suiviDesVersements(
  dossiers: DossierSuivi[],
  recus: RecuSuivi[],
  maintenant: Date,
): SuiviDesVersements {
  const aujourdhui = jourIso(maintenant);

  /* Les pièces, rangées par dossier puis par tranche. `0` : sans tranche. */
  const pieces = new Map<string, Set<number>>();
  for (const r of recus) {
    const id = idDuDossier(r);
    if (!id) continue;
    const rangs = pieces.get(id) ?? new Set<number>();
    rangs.add(Number(r.echeance) || 0);
    pieces.set(id, rangs);
  }

  const lignes: LigneVersement[] = [];
  for (const d of dossiers) {
    if (d.statut === "annulee") continue;
    const echeances = lignesDe<EcheanceSuivie>(d.echeances);
    if (echeances.length === 0) continue;

    const reglees = echeances.filter((e) => e?.statut === "regle").length;
    if (!d.coordonneesEnvoyeesLe && reglees === 0) continue;

    const rangDue = echeances.findIndex((e) => e?.statut !== "regle");
    const due = rangDue >= 0 ? echeances[rangDue] : undefined;
    const rang = rangDue + 1;
    const dateLimite = due?.dateLimite ? String(due.dateLimite) : undefined;
    const rangsJoints = pieces.get(String(d.id));

    lignes.push({
      id: d.id,
      nom: (d.apprenantNom ?? "").trim() || "Sans nom",
      reference: String(d.reference ?? ""),
      total: echeances.length,
      reglees,
      restantes: echeances.length - reglees,
      prochaine: due
        ? {
            rang,
            montant: Number(due.montant ?? 0),
            dateLimite,
            /*
              ⚠️ **Un versement annoncé n'est pas en retard de notre fait.** Le
              participant a fait son geste ; c'est la vérification qui attend.
              Le marquer en retard le ferait relancer pour une somme déjà partie.
            */
            enRetard:
              due.statut !== "annonce" && !!dateLimite && dateLimite.slice(0, 10) < aujourdhui,
            moyen: due.moyen ?? undefined,
          }
        : undefined,
      annonce: due?.statut === "annonce",
      avecJustificatif: !!due && !!rangsJoints && (rangsJoints.has(rang) || rangsJoints.has(0)),
    });
  }

  /*
    L'ordre dans un groupe suit l'urgence : ce qui attend de nous, puis ce qui
    est en retard, puis l'échéance la plus proche. Le nom départage, sans quoi
    deux dossiers au même jour changeraient de place d'une visite à l'autre.
  */
  const parUrgence = (a: LigneVersement, b: LigneVersement) =>
    Number(b.annonce) - Number(a.annonce) ||
    Number(!!b.prochaine?.enRetard) - Number(!!a.prochaine?.enRetard) ||
    (a.prochaine?.dateLimite ?? "9999").localeCompare(b.prochaine?.dateLimite ?? "9999") ||
    a.nom.localeCompare(b.nom, "fr");

  const enCours = lignes.filter((l) => l.restantes > 0).sort(parUrgence);
  const valeurs = [...new Set(enCours.map((l) => l.restantes))].sort((a, b) => b - a);

  return {
    total: lignes.length,
    aVerifier: enCours.filter((l) => l.annonce),
    groupes: valeurs.map((restantes) => ({
      restantes,
      lignes: enCours.filter((l) => l.restantes === restantes),
    })),
    soldes: lignes
      .filter((l) => l.restantes === 0)
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
  };
}

/** « Reste 1 tranche — dernier versement », « Reste 3 tranches ». */
export function intituleDuGroupe(restantes: number): string {
  if (restantes === 1) return "Reste 1 tranche — dernier versement";
  return `Reste ${restantes} tranches`;
}

/**
 * Ce que le courriel de l'équipe dit de la suite, une fois ce versement vérifié.
 * `restantesApres` compte les tranches non réglées **hors** celle qu'on annonce.
 */
export function phraseDeLaSuite(restantesApres: number): string {
  if (restantesApres <= 0)
    return "C'est son dernier versement : une fois vérifié, le dossier est soldé.";
  if (restantesApres === 1) return "Après vérification, il lui restera 1 tranche.";
  return `Après vérification, il lui restera ${restantesApres} tranches.`;
}
