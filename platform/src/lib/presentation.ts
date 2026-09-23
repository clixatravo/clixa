import { formatPrix } from "@/lib/format";
import type { Programme, Specialisation, Tarifs } from "@/lib/types";

/**
 * Le message de présentation : ce que l'institut propose, à qui ne le sait pas
 * encore.
 *
 * Demandé par la direction le 23 septembre 2026 : « un msg fiih un présentation
 * dyal les formations dyalna o les certif li kan9admo […] hna n thakmo fiih
 * lemn mabrina nsseftoh » — un message de prospection, professionnel, dont
 * l'équipe choisit les destinataires.
 *
 * ── ⚠️ Pourquoi une fonction, et pas un texte écrit une fois ────────────────
 * C'est le message qui vieillirait le plus vite de tous. Il porte les douze
 * parcours, leurs durées, les trois formules du barème et la date de la
 * prochaine cohorte : cinq choses que /admin peut changer n'importe quel matin.
 * Écrit à la main, il annoncerait un prix que la fiche dément — **sur le
 * message même qui sert à faire venir quelqu'un sur cette fiche**.
 *
 * Chaque chiffre vient donc de la source qui fait foi, exactement comme
 * `lib/faq.ts` : le catalogue pour les parcours, `getTarifs` pour le barème,
 * les sessions publiées pour la rentrée. Le texte ne porte que ce qui ne se
 * compte pas.
 *
 * ── ⚠️ Ce qu'il ne dit pas, et pourquoi ─────────────────────────────────────
 * Un message commercial est précisément celui où la tentation d'en promettre
 * un peu plus est la plus forte, et celui où cela se paie le plus cher : il
 * s'adresse à des gens qui ne nous connaissent pas, et qui vérifieront. Il ne
 * porte donc :
 *
 * - **aucun taux de réussite** — rien ne le mesure ;
 * - **aucun replay** — un seul parcours les mentionne, et rien ne les produit ;
 * - **aucun campus hors d'Agadir** — Abidjan et Dakar sont « prochainement »
 *   depuis la décision du 6 septembre 2026, et ces deux villes ont déjà figuré
 *   quatre fois sur le site sans qu'une seule séance s'y donne ;
 * - **aucune rareté inventée** — ni « plus que N places », ni compte à rebours.
 *   La cohorte qui porte la campagne est justement celle qu'on tient ouverte ;
 * - **aucune certification que nous délivrerions nous-mêmes.** Sur les douze
 *   parcours, **un seul** porte une certification tierce — le PMP®, passé
 *   auprès du PMI. Nous y préparons. Les onze autres mènent au certificat
 *   professionnel CLIXA, qui est autre chose et que le message nomme pour ce
 *   qu'il est.
 *
 * `verifier-presentation.ts` garde chacun de ces refus.
 */

/** Ce qu'il faut pour composer le message. Rien qui vienne d'une horloge. */
export interface FaitsDePresentation {
  specialisations: readonly Pick<Specialisation, "slug" | "nom">[];
  programmes: readonly Pick<
    Programme,
    | "slug"
    | "titre"
    | "dureeHeures"
    | "specialisation"
    | "certification"
    | "accroche"
    | "modules"
    | "publicVise"
    | "competences"
    | "livrables"
    | "objectifs"
    | "debouches"
  >[];
  /**
   * La cadence de la session du parcours mis en avant — « 8 samedis ·
   * 9h00–13h00 ».
   *
   * ⚠️ **Elle fait foi, et elle ne se devine pas.** Un gabarit reçu le
   * 23 septembre 2026 annonçait « 8 séances interactives du soir » : les
   * séances du DAF sont le **samedi matin**, de 9h00 à 13h00 UTC. Quelqu'un
   * qui s'inscrit sur cette phrase découvre l'horaire réel à la première
   * séance — et ce n'est pas un détail, c'est ce qui décide s'il peut suivre.
   */
  cadenceEnAvant?: string;
  /**
   * Le parcours mis en avant, par son slug.
   *
   * ⚠️ **Un réglage, pas une constante.** La direction a demandé le 23 septembre
   * 2026 de « rakez 3la DAF bl khossos » — et c'est le bon choix aujourd'hui :
   * c'est le parcours que porte l'annonce Facebook, celui dont la cohorte est
   * tenue ouverte, et le seul dont on possède un spécimen de certificat.
   * Ce ne sera pas le bon choix tous les mois. Écrit en dur, il faudrait
   * toucher au code pour mettre l'audit en avant en novembre.
   *
   * Un slug inconnu ne met rien en avant et ne casse rien : le message se rend
   * comme avant, en liste. Il ne se **tait** pas et n'invente pas non plus un
   * autre parcours — les deux se remarqueraient trop tard.
   */
  misEnAvant?: string;
  tarifs: Tarifs;
  /** Le début de la prochaine cohorte, si une session est publiée. */
  prochaineRentree?: Date;
  /** La fin, pour dire combien de temps cela dure. */
  finDeCohorte?: Date;
  site: string;
}

export interface FamilleDeParcours {
  nom: string;
  parcours: { titre: string; heures: number; slug: string; certification?: string }[];
}

/** Le parcours mis en avant, détaillé — le reste du catalogue ne l'est pas. */
export interface ParcoursEnAvant {
  slug: string;
  titre: string;
  accroche: string;
  heures: number;
  /** Les intitulés des séances, dans l'ordre du plan de cours. */
  seances: string[];
  /** À qui il s'adresse — quatre au plus, la liste entière ferait un pavé. */
  pourQui: string[];
  /** Ce qu'on emporte : supports, trames, tableaux de bord. */
  livrables: string[];
  /** Les trois compétences de tête — l'argument, pas l'inventaire. */
  competences: string[];
  /** « 8 samedis · 9h00–13h00 », telle que la session la porte. */
  cadence?: string;
  /**
   * Les objectifs, découpés en phrases — trois au plus.
   *
   * ⚠️ **C'est la seule prose du catalogue écrite dans le registre d'un
   * argumentaire**, et c'est pour cela qu'elle sert ici plutôt qu'une
   * rédaction parallèle : « Piloter le cash et le BFR avec une logique de
   * trésorerie à 13 semaines », « Produire un reporting CODIR clair,
   * synthétique et orienté décision ». Une seconde version écrite à la main
   * vieillirait le jour où la fiche change — et ce message existe pour amener
   * quelqu'un sur cette fiche.
   */
  objectifs: string[];
  /**
   * Ce que le participant sait faire après.
   *
   * ⚠️ **Quatre au plus, et en bloc — pas en cartes.** Un premier jet en
   * prenait deux et les posait dans deux cartes côte à côte : la seconde
   * s'intitulait « Et aussi », ce qui n'est pas un titre, et les deux textes
   * se retrouvaient coupés dans des cadres étroits. Le catalogue en porte six,
   * tous écrits dans le bon registre — ils valent mieux qu'un cadre.
   */
  debouches: string[];
}

export interface Presentation {
  objet: string;
  accroche: string;
  /** Absent si aucun parcours n'est mis en avant, ou si le slug est inconnu. */
  enAvant?: ParcoursEnAvant;
  familles: FamilleDeParcours[];
  /** Combien de parcours en tout — écrit, jamais compté de tête. */
  combien: number;
  deroule: string[];
  certificat: string[];
  formules: { libelle: string; total: string; detail: string }[];
  rentree?: string;
}

const JOUR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

/**
 * Découper un paragraphe d'objectifs en phrases.
 *
 * ⚠️ On coupe sur « . » **suivi d'une majuscule**, pas sur le point seul : le
 * catalogue porte « PMBOK v8 », « 4h. » et des nombres à décimale, et un
 * découpage naïf rendait des fragments commençant au milieu d'une phrase.
 */
function decouperEnPhrases(texte: string): string[] {
  return texte
    .split(/\.\s+(?=[A-ZÀ-Þ])/)
    .map((p) => p.trim().replace(/\.$/, ""))
    .filter((p) => p.length > 12);
}

/**
 * Composer la présentation.
 *
 * ⚠️ **Les parcours sont groupés par spécialisation, et l'ordre vient du
 * catalogue.** Douze titres à la file se lisent comme une liste de courses ;
 * groupés, ils disent à qui le message s'adresse — quelqu'un cherche « la
 * finance », pas « le parcours numéro sept ».
 *
 * ⚠️ **Une famille vide ne s'affiche pas.** Le catalogue en compte cinq
 * aujourd'hui, toutes pourvues ; le jour où l'on en ajoute une avant d'y ranger
 * un parcours, un intitulé suivi de rien se lirait comme une page à moitié
 * chargée — la leçon de la rubrique de filtre sans choix.
 */
export function composerLaPresentation(f: FaitsDePresentation): Presentation {
  const familles: FamilleDeParcours[] = [];

  for (const s of f.specialisations) {
    const parcours = f.programmes
      .filter((p) => p.specialisation === s.slug)
      .map((p) => ({
        titre: p.titre,
        heures: p.dureeHeures,
        slug: p.slug,
        ...(p.certification ? { certification: p.certification } : {}),
      }));
    if (parcours.length > 0) familles.push({ nom: s.nom, parcours });
  }

  /*
    ⚠️ **Un parcours sans famille connue n'est pas perdu.** Il serait
    silencieusement absent du message — c'est-à-dire absent de l'offre, pour
    qui la découvre. Il rejoint une famille d'attente plutôt que de disparaître.
  */
  const connus = new Set(familles.flatMap((x) => x.parcours.map((p) => p.slug)));
  const orphelins = f.programmes.filter((p) => !connus.has(p.slug));
  if (orphelins.length > 0) {
    familles.push({
      nom: "Autres parcours",
      parcours: orphelins.map((p) => ({
        titre: p.titre,
        heures: p.dureeHeures,
        slug: p.slug,
        ...(p.certification ? { certification: p.certification } : {}),
      })),
    });
  }

  const combien = f.programmes.length;

  /*
    ── Le parcours mis en avant ───────────────────────────────────────────────
    ⚠️ **Quatre publics au plus, et six séances au plus.** Le DAF en porte cinq
    et huit ; tout déplier ferait, à lui seul, la longueur du reste du message —
    et ce message a déjà douze parcours à présenter. Ce qui est coupé est dit
    comme tel (« et N autres »), jamais laissé croire que la liste est entière :
    c'est la règle des places à rendre au tableau de bord.
  */
  const vedette = f.misEnAvant ? f.programmes.find((x) => x.slug === f.misEnAvant) : undefined;

  const enAvant: ParcoursEnAvant | undefined = vedette
    ? {
        slug: vedette.slug,
        titre: vedette.titre,
        accroche: vedette.accroche ?? "",
        heures: vedette.dureeHeures,
        seances: (vedette.modules ?? []).map((m) => m.titre).filter(Boolean),
        pourQui: (vedette.publicVise ?? []).slice(0, 4),
        livrables: vedette.livrables ?? [],
        /*
          ⚠️ **Trois compétences, et les trois premières du catalogue.** Le DAF
          en porte dix : les dérouler ferait un inventaire, et un message de
          prospection se parcourt en dix secondes. On ne les choisit pas à la
          main non plus — ce serait une seconde rédaction à tenir à jour, et
          c'est exactement ce que ce fichier existe pour éviter.
        */
        competences: (vedette.competences ?? []).slice(0, 3),
        /*
          ⚠️ **Le découpage se fait sur le point suivi d'une majuscule**, et non
          sur le seul point : « 13 semaines. Construire » se coupe, « PMBOK v8 »
          ou « 4h. » ne se coupent pas. Un découpage naïf rendait des fragments
          d'une ligne et demie qui commençaient au milieu d'une phrase.

          ⚠️ Et l'on garde **trois au plus** : le dessin en prévoit trois, et
          le DAF en porte cinq. Ce qui est coupé ne se voit pas — il n'y a rien
          à dire de « et deux autres objectifs » dans un argumentaire.
        */
        objectifs: decouperEnPhrases(vedette.objectifs ?? "").slice(0, 3),
        debouches: (vedette.debouches ?? []).slice(0, 4),
        ...(f.cadenceEnAvant ? { cadence: f.cadenceEnAvant } : {}),
      }
    : undefined;

  const deroule = [
    "Huit séances de quatre heures, le samedi, en direct avec un formateur.",
    "Entièrement en ligne : vous suivez d'où vous êtes, sans déplacement.",
    "Des cas concrets et des outils que vous repartez avec, pas un cours magistral.",
    "Des promotions volontairement réduites, pour que chacun puisse intervenir.",
  ];

  /*
    ── ⚠️ Le certificat, dit pour ce qu'il est ────────────────────────────────
    C'est la seule propriété de l'offre qu'un tiers peut contrôler lui-même, et
    c'est elle qui vaut quelque chose à qui reçoit le document — un employeur,
    une banque, un recruteur. Le site a mis quinze jours à le dire après l'avoir
    construit : les quatre endroits qui décrivaient le certificat promettaient
    « nominatif et référencé », ce qui ne porte pas la propriété.
  */
  const certificat = [
    "Un certificat professionnel nominatif, qui détaille les modules suivis.",
    "Il porte un code de vérification : votre employeur, une banque ou un recruteur le saisit sur notre site et voit immédiatement si le document est authentique, à quel nom il a été émis et pour quel parcours.",
    `La page de vérification est publique — ${f.site.replace(/^https?:\/\//, "")}/verifier`,
  ];

  const aPMP = f.programmes.some((p) => p.certification);
  if (aPMP) {
    /*
      ⚠️ **Préparer n'est pas délivrer**, et un candidat choisit sa préparation
      là-dessus. Le trailer officiel a dû retirer « avec formateurs certifiés
      PMP » et « pour réussir dès le 1er passage » le 13 septembre 2026 pour la
      même raison.
    */
    certificat.push(
      "Pour la préparation PMP®, l'examen se passe auprès du PMI, l'organisme certificateur. Nous vous y préparons, nous ne le délivrons pas.",
    );
  }

  /*
    ⚠️ Les montants sont **déjà en centimes** dans le domaine (`totalCentimes`,
    `echeancesCentimes`). Les multiplier par cent — le réflexe, puisque le
    global du CMS les porte en euros — annoncerait 42 300 € sur le message qui
    sert à faire venir quelqu'un.
  */
  const formules = (f.tarifs.plans ?? []).map((p) => {
    const montants = p.echeancesCentimes.map((c) => formatPrix(c, f.tarifs.devise));
    return {
      libelle: p.libelle,
      total: formatPrix(p.totalCentimes, f.tarifs.devise),
      detail: montants.length > 1 ? montants.join(" + ") : "en une fois",
    };
  });

  const rentree = f.prochaineRentree
    ? f.finDeCohorte
      ? `${JOUR.format(f.prochaineRentree)} — jusqu'au ${JOUR.format(f.finDeCohorte)}`
      : JOUR.format(f.prochaineRentree)
    : undefined;

  return {
    /*
      ⚠️ L'objet nomme ce qu'on propose, jamais « Découvrez CLIXA ». Le second
      ne dit rien à qui ne nous connaît pas — et c'est précisément à ceux-là que
      ce message s'adresse.

      ⚠️ **Et il nomme le parcours mis en avant quand il y en a un.** Un objet
      qui annonce « 12 parcours » ouvre sur un message dont les deux premiers
      tiers parlent du seul DAF : c'est l'objet qui décide si l'on ouvre, et il
      ne peut pas promettre autre chose que ce qu'on va lire.
    */
    objet: enAvant
      ? `${enAvant.titre} — ${enAvant.heures} h en classe virtuelle | CLIXA Institute`
      : `${combien} parcours de direction, en classe virtuelle — CLIXA Institute`,
    ...(enAvant ? { enAvant } : {}),
    accroche:
      "Des parcours courts pour cadres et responsables qui visent un poste de direction — en direct, en ligne, avec un certificat vérifiable à la clé.",
    familles,
    combien,
    deroule,
    certificat,
    formules,
    ...(rentree ? { rentree } : {}),
  };
}
