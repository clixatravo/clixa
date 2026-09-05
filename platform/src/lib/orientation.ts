import { ouvertMaintenant, type Reglages } from "@/lib/creneaux";

/**
 * Ce que le robot d'orientation fait du message qu'il vient de recevoir.
 *
 * ── Pourquoi une fonction pure, séparée de WhatsApp ─────────────────────────
 * C'est ici qu'on décide de parler, de se taire, de promettre un horaire ou
 * de réveiller quelqu'un. Le webhook de Meta n'est qu'une porte d'entrée : il
 * traduit une requête HTTP en `Etat`, appelle ceci, et exécute le geste rendu.
 *
 * Séparés, ces choix s'éprouvent sans numéro, sans jeton et sans réseau —
 * comme `prochaineEtape` pour la page du dossier, et pour la même raison :
 * ce qui se décide au mauvais moment ne se voit ni au type ni à la
 * compilation.
 *
 * ── ⚠️ Ce que le robot n'a pas le droit de faire ────────────────────────────
 * Inventer. Un prix, une date, une place, un engagement. Toutes les fautes
 * trouvées sur ce site tiennent dans une seule phrase — le site promettait ce
 * que la maison ne délivre pas — et un robot qui parle est la façon la plus
 * rapide de la répéter à grande échelle. D'où `PASSER_LA_MAIN` quand il ne
 * sait pas : ne pas savoir est une réponse, deviner n'en est pas une.
 */

/** Ce que le système sait de la conversation au moment de décider. */
export type Etat = {
  /** `robot` : il répond. `humain` : quelqu'un a pris la main. `close` : terminée. */
  conduite: "robot" | "humain" | "close";
  /** Le dernier message reçu du prospect. */
  message: string;
  /** Un rendez-vous est-il déjà convenu avec lui ? */
  rendezVousPris?: boolean;
  /** Le robot a-t-il déjà proposé des créneaux dans cet échange ? */
  creneauxProposes?: boolean;
};

export type Geste =
  /** Ne rien envoyer : un humain parle, ou la conversation est close. */
  | { faire: "se-taire"; pourquoi: string }
  /** Réveiller l'équipe : quelqu'un est disponible, et le prospect veut parler. */
  | { faire: "passer-la-main"; pourquoi: string }
  /** Proposer les prochains créneaux libres. */
  | { faire: "proposer-des-creneaux"; pourquoi: string }
  /** Répondre à la question posée, à partir du catalogue. */
  | { faire: "repondre"; pourquoi: string };

/**
 * Les mots par lesquels quelqu'un demande un humain.
 *
 * ⚠️ Volontairement larges, et en trois langues : les prospects écrivent en
 * français, en darija translittérée et en anglais, souvent dans la même
 * phrase. Se tromper dans ce sens ne coûte qu'un aiguillage de trop vers
 * l'équipe ; se tromper dans l'autre laisse quelqu'un parler à une machine
 * alors qu'il demandait un être humain.
 */
const APPELS_A_L_HUMAIN =
  /\b(humain|conseiller|quelqu'?un|une personne|responsable|parler|appel(?:er|ez)?|t[eé]l[eé]phone|whatsapp call|agent|human|call me|bnadem|wa[hḥ]ed|hadra|3ayet|3ayt)\b/i;

/**
 * Les mots par lesquels quelqu'un demande un rendez-vous.
 *
 * Séparés des précédents parce que la réponse diffère : « appelez-moi
 * maintenant » n'est pas « quand êtes-vous libre ».
 */
const DEMANDES_DE_RENDEZ_VOUS =
  /\b(rendez[- ]?vous|rdv|cr[eé]neau|dispo(?:nible|nibilit[eé]s?)?|quand|horaire|mawe?3?id|we9t|appointment|schedule|book)\b/i;

/**
 * Le geste à poser, et la raison — qui sert au journal et à l'épreuve.
 *
 * L'ordre des questions n'est pas indifférent :
 *
 * 1. **Se taire** passe avant tout. Une conversation reprise par un humain ne
 *    doit plus jamais recevoir un mot du robot : deux voix sur le même fil,
 *    c'est ce qui fait qu'on n'y comprend rien et qu'on raccroche.
 * 2. **Passer la main** passe avant de proposer un horaire. Quelqu'un qui
 *    demande à parler *maintenant*, à une heure où quelqu'un est là, ne doit
 *    pas s'entendre proposer mardi.
 * 3. **Un rendez-vous déjà pris** empêche d'en proposer un second. Sans cela,
 *    chaque message contenant « quand » relancerait la liste des créneaux à
 *    quelqu'un qui a déjà noté l'heure.
 */
export function prochainGeste(etat: Etat, reglages: Reglages, maintenant: Date): Geste {
  if (etat.conduite === "humain") {
    return { faire: "se-taire", pourquoi: "un conseiller a pris la main" };
  }
  if (etat.conduite === "close") {
    return { faire: "se-taire", pourquoi: "la conversation est close" };
  }

  const texte = etat.message ?? "";
  const veutUnHumain = APPELS_A_L_HUMAIN.test(texte);
  const quelquUnEstLa = ouvertMaintenant(reglages, maintenant);

  if (veutUnHumain && quelquUnEstLa) {
    return { faire: "passer-la-main", pourquoi: "il demande à parler, et quelqu'un est là" };
  }

  /*
    ⚠️ Il demande un humain, et il n'y en a pas. On ne se tait pas — un silence
    à ce moment-là est ce qui fait écrire « bonjour ? » trois fois avant de
    partir. On propose un horaire : c'est la seule chose vraie qu'on puisse
    dire, et c'est exactement ce que la fenêtre de rappel fait déjà sur le site.
  */
  if (veutUnHumain && !etat.rendezVousPris) {
    return {
      faire: "proposer-des-creneaux",
      pourquoi: "il demande à parler, personne n'est là, on convient d'une heure",
    };
  }

  if (DEMANDES_DE_RENDEZ_VOUS.test(texte)) {
    if (etat.rendezVousPris) {
      return {
        faire: "repondre",
        pourquoi: "un rendez-vous est déjà convenu, on ne le refait pas",
      };
    }
    return { faire: "proposer-des-creneaux", pourquoi: "il demande un rendez-vous" };
  }

  return { faire: "repondre", pourquoi: "une question à laquelle le catalogue répond" };
}
