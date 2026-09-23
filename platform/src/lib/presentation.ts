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
    "slug" | "titre" | "dureeHeures" | "specialisation" | "certification"
  >[];
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

export interface Presentation {
  objet: string;
  accroche: string;
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
    */
    objet: `${combien} parcours de direction, en classe virtuelle — CLIXA Institute`,
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
