import { formatPrix } from "@/lib/format";

/**
 * Ce qu'on annonce à dix jours du démarrage, et à qui.
 *
 * ── Pourquoi une règle, et non un message unique ────────────────────────────
 * Demandé par la direction le 23 septembre 2026 : prévenir les inscrits que la
 * session démarre, dire à ceux qui doivent payer de payer, et à ceux qui n'ont
 * pas signé de signer. Un seul message pour tout le monde aurait été plus
 * simple à écrire — et faux pour la plupart des destinataires.
 *
 * **Mesuré sur la production avant d'écrire une ligne**, le 23 septembre 2026,
 * sur 116 dossiers vivants :
 *
 * |  n  | où en est le dossier                              |
 * |-----|---------------------------------------------------|
 * |  44 | pré-inscription seule, contrat jamais demandé     |
 * |  58 | contrat demandé, pas signé                        |
 * |   4 | **signé — coordonnées pas encore envoyées**       |
 * |  10 | coordonnées envoyées, rien versé                  |
 *
 * ⚠️ **« Payez » ne vaut que pour dix d'entre eux.** Les cent six autres n'ont
 * aucun moyen de régler : les coordonnées de paiement ne figurent nulle part
 * sur le site — elles partent par courriel, après la signature. Leur réclamer
 * un versement, c'est leur demander un geste qu'ils ne peuvent pas faire.
 * C'est le défaut qui a coûté un vrai prospect le 5 septembre 2026, et que
 * `prochaineEtape` puis le formulaire d'annonce de transfert ont corrigé
 * chacun de leur côté. Il se refermerait ici, sur un envoi à cent seize
 * personnes d'un coup, si la règle n'était pas écrite.
 *
 * ⚠️ **Et quatre d'entre eux attendent *nous*.** Ils ont signé ; c'est à
 * l'équipe d'envoyer de quoi régler. Leur écrire « il faut payer » leur ferait
 * porter notre retard — la règle du contrat signé qui tient sa place sans
 * terme, dans l'autre sens.
 *
 * ── Ce que cette fonction ne fait pas ───────────────────────────────────────
 * Elle ne relit pas la base et ne décide pas d'envoyer : elle dit seulement ce
 * qui est vrai pour un dossier. Le tri des destinataires et la trace d'envoi
 * vivent dans la route, et l'écriture du courriel dans `lib/courriel.ts`.
 */

/** Ce qui distingue un dossier d'un autre, ce jour-là. Rien de plus. */
export interface FaitsDuDemarrage {
  statut: string;
  contratDemandeLe?: string | null;
  contratSigneLe?: string | null;
  contratVerifieLe?: string | null;
  coordonneesEnvoyeesLe?: string | null;
  echeances: ReadonlyArray<{
    montantCentimes: number;
    dateLimite?: string | null;
    statut: "attendu" | "annonce" | "regle";
  }>;
}

export type ClefDemarrage =
  | "a-demander" // pré-inscription seule
  | "a-signer" // contrat demandé, pas signé
  | "chez-nous" // signé, coordonnées pas parties — la balle est de notre côté
  | "a-regler" // coordonnées parties, rien versé
  | "en-verification" // un transfert annoncé, on le vérifie
  | "echeance-suivante" // un versement reçu, il en reste
  | "en-regle"; // tout est réglé

export interface AnnonceDemarrage {
  clef: ClefDemarrage;
  /** Où en est le dossier, dit au participant. Une phrase, jamais deux. */
  situation: string;
  /** Ce qu'on lui demande de faire. `null` quand la balle est chez nous. */
  geste: string | null;
  /** L'intitulé du bouton. Il nomme le geste, jamais « cliquez ici ». */
  bouton: string;
  /**
   * Vrai seulement si le participant **peut** régler aujourd'hui.
   *
   * ⚠️ C'est la garde centrale de ce fichier. Un message qui parle d'argent à
   * quelqu'un qui n'a reçu aucune coordonnée le met en faute pour un manque
   * qui est le nôtre.
   */
  peutRegler: boolean;
}

/**
 * Où en est ce dossier, à la veille du démarrage.
 *
 * ⚠️ L'ordre des branches est celui de `prochaineEtape`, et ce n'est pas une
 * coïncidence : les deux répondent à la même question, l'une sur la page du
 * dossier et l'autre dans un courriel. Elles ne sont pas fusionnées parce que
 * les phrases diffèrent — la page dit « votre place est retenue », le courriel
 * doit dire « le parcours commence samedi ». Mais **les conditions sont les
 * mêmes**, et le jour où l'une bouge, l'autre doit bouger. `verifier-demarrage.ts`
 * confronte les deux sur les sept cas.
 */
export function annonceDuDemarrage(d: FaitsDuDemarrage): AnnonceDemarrage {
  const enVerification = d.echeances.find((e) => e.statut === "annonce");
  if (enVerification) {
    return {
      clef: "en-verification",
      situation: `Nous vérifions votre transfert de ${formatPrix(enVerification.montantCentimes)}.`,
      geste: null,
      bouton: "Suivre mon dossier",
      peutRegler: false,
    };
  }

  const rienDeRegle = d.echeances.every((e) => e.statut !== "regle");

  if (rienDeRegle && !d.contratSigneLe) {
    if (!d.contratDemandeLe) {
      return {
        clef: "a-demander",
        situation: "Votre place est retenue, et rien ne vous engage encore.",
        geste:
          "Pour la confirmer, demandez votre contrat de formation depuis votre dossier. Vous n'avez rien à régler à ce stade.",
        bouton: "Demander mon contrat",
        peutRegler: false,
      };
    }
    return {
      clef: "a-signer",
      situation: "Votre contrat de formation vous attend, il n'est pas encore signé.",
      geste:
        "Signez-le en ligne depuis votre dossier — quelques secondes, au doigt ou à la souris. Les instructions de règlement vous parviennent ensuite.",
      bouton: "Signer mon contrat",
      peutRegler: false,
    };
  }

  /*
    ⚠️ Entre la signature et l'envoi des coordonnées, **rien ne lui est
    demandé** — et le message doit le dire, sans quoi il lira « il faut payer »
    dans un courriel qui annonce le démarrage, et cherchera où.
  */
  if (rienDeRegle && d.contratSigneLe && !d.coordonneesEnvoyeesLe) {
    return {
      clef: "chez-nous",
      situation: d.contratVerifieLe
        ? "Votre contrat est signé et vérifié."
        : "Votre contrat est signé, nous le relisons.",
      geste: null,
      bouton: "Suivre mon dossier",
      peutRegler: false,
    };
  }

  const due = d.echeances.find((e) => e.statut !== "regle");
  if (due) {
    const montant = formatPrix(due.montantCentimes);
    const premiere = d.echeances[0] === due;
    const quand = due.dateLimite ? ` avant le ${JOUR.format(new Date(due.dateLimite))}` : "";
    return premiere
      ? {
          clef: "a-regler",
          situation: `Votre contrat est signé et les instructions de règlement vous ont été envoyées.`,
          geste: `Il reste à effectuer votre premier versement de ${montant}${quand}, puis à nous l'annoncer depuis votre dossier.`,
          bouton: "Annoncer mon versement",
          peutRegler: true,
        }
      : {
          clef: "echeance-suivante",
          situation: "Votre premier versement nous est bien parvenu.",
          geste: `Prochaine échéance : ${montant}${quand}.`,
          bouton: "Suivre mon dossier",
          peutRegler: true,
        };
  }

  return {
    clef: "en-regle",
    situation: "Votre inscription est complète et votre règlement est soldé.",
    geste: null,
    bouton: "Voir mon dossier",
    peutRegler: false,
  };
}

const JOUR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

/**
 * Faut-il écrire à ce dossier ?
 *
 * ⚠️ **Un dossier annulé ne reçoit rien.** Sa place est repartie au catalogue ;
 * lui annoncer un démarrage serait lui proposer une séance qu'il n'aura pas.
 * Un dossier terminé non plus — il n'y a pas de cohorte à venir pour lui.
 */
export function aQuiOnEcrit(statut: string): boolean {
  return statut !== "annulee" && statut !== "terminee";
}
