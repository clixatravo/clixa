/**
 * Où en est un dossier, et de quel côté est la balle.
 *
 * ── ⚠️ Le défaut que ceci corrige ───────────────────────────────────────────
 * La colonne « Statut » de la liste des inscriptions annonçait **« Demandée —
 * en attente de paiement » sur les douze dossiers de production**, le
 * 6 septembre 2026. Elle ne mentait pas : `statut` ne bouge qu'au premier
 * versement reçu, et personne n'avait encore versé.
 *
 * Mais ces douze dossiers étaient dans **cinq états différents** :
 *
 *   un transfert annoncé, qui attendait d'être vérifié ;
 *   deux contrats signés, vérifiés, coordonnées envoyées — qui attendaient
 *     leur argent ;
 *   deux contrats demandés et jamais signés — qui attendaient un appel ;
 *   sept pré-inscriptions, qui n'engageaient personne.
 *
 * Le seul écran où l'équipe regarde ses dossiers les donnait tous pour
 * identiques. Un prospect qui vient de s'engager par écrit y avait exactement
 * la même tête que quelqu'un arrivé dix minutes plus tôt d'une annonce.
 *
 * ── ⚠️ Pourquoi ne pas faire avancer `statut` lui-même ──────────────────────
 * Parce qu'il ne veut pas dire cela. `statut` commande le décompte des places
 * (`lib/places.ts`), la tâche quotidienne des relances et le bandeau du
 * tableau de bord — tous lisent `demandee | confirmee | payee | terminee |
 * annulee`, et une place n'est tenue sans limite que pour les trois du milieu.
 * Y glisser « contrat signé » ferait rendre au catalogue la place de quelqu'un
 * qui vient de signer, ou l'inverse. On ajoute une lecture, on ne déforme pas
 * la donnée qui porte l'argent.
 *
 * ── ⚠️ Pur, et sans le moindre import ───────────────────────────────────────
 * La cellule qui l'affiche est un composant client. Tant que ce calcul vivrait
 * dans `lib/inscriptions.ts`, l'importer entraînerait Payload dans le paquet
 * navigateur et le build échouerait — c'est exactement la raison d'être de
 * `lib/format.ts`, séparé de `catalogue.ts` pour le même motif.
 *
 * ── L'ordre des questions est celui de `prochaineEtape` ─────────────────────
 * Les deux disent le même parcours, vu des deux côtés : celui-ci dit ce que
 * l'équipe doit faire, l'autre ce que le participant doit faire. Les faire
 * diverger donnerait à l'équipe et au participant deux versions du même
 * dossier — et c'est le participant qui aurait raison, puisque c'est sa page
 * qu'il lit.
 */

import { departDeLaTenue, finDeLaTenue } from "@/lib/places";

/**
 * Ce que le calcul a besoin de savoir. Rien de plus, rien de Payload.
 *
 * ⚠️ `lib/places.ts` n'importe que des **types** de Payload, effacés à la
 * compilation : l'importer ici n'entraîne rien dans le paquet navigateur. La
 * règle de la tenue ne se recopie donc pas — c'est elle qui décide déjà du
 * décompte des places et de ce que lit le participant, et une troisième
 * formulation divergerait en silence.
 */
export type FaitsDuDossier = {
  statut?: string | null;
  /** Le dépôt du dossier — c'est de là que court la tenue d'une pré-inscription. */
  createdAt?: string | null;
  contratDemandeLe?: string | null;
  contratSigneLe?: string | null;
  contratVerifieLe?: string | null;
  coordonneesEnvoyeesLe?: string | null;
  echeances?: { statut?: string | null }[] | null;
};

/**
 * De quel côté est la balle.
 *
 * ⚠️ **`nous` n'est pas une couleur, c'est une file de travail.** C'est le seul
 * ton qui appelle un geste aujourd'hui, et c'est pour lui que la colonne
 * existe. Le bandeau du tableau de bord compte les mêmes dossiers ; les deux
 * doivent dire la même chose.
 */
export type Ton = "nous" | "attente" | "fait" | "clos";

/**
 * La clef stable de l'état, pour compter sans lire une phrase.
 *
 * ⚠️ **Le bandeau du tableau de bord compte là-dessus, pas sur le libellé.**
 * Comparer des phrases ferait dépendre un compteur d'une virgule : le jour où
 * l'on réécrit « Contrat signé — à relire », la vignette tomberait à zéro sans
 * que rien ne passe au rouge, et l'équipe conclurait qu'il n'y a rien à faire.
 */
export type Clef =
  | "annonce"
  | "a-relire"
  | "a-envoyer"
  | "attente-transfert"
  | "acompte"
  | "paye"
  | "contrat-a-signer"
  | "preinscription"
  | "place-expiree"
  | "termine"
  | "annule";

export type Avancement = { clef: Clef; libelle: string; ton: Ton };

export function avancementDuDossier(d: FaitsDuDossier, maintenant: Date): Avancement {
  if (d.statut === "annulee") return { clef: "annule", libelle: "Annulé", ton: "clos" };
  if (d.statut === "terminee")
    return { clef: "termine", libelle: "Terminé — certificat émis", ton: "fait" };

  const echeances = (d.echeances ?? []).filter(Boolean);
  const annoncee = echeances.some((e) => e?.statut === "annonce");

  /*
    ⚠️ **L'annonce passe avant tout le reste.** C'est le seul état où de
    l'argent est peut-être déjà arrivé sans que personne l'ait constaté, et
    c'est celui qui coûte le plus cher à laisser traîner : le participant a
    fait ce qu'on lui demandait et attend qu'on le lui confirme.
  */
  if (annoncee) return { clef: "annonce", libelle: "Transfert annoncé — à vérifier", ton: "nous" };

  const toutRegle = echeances.length > 0 && echeances.every((e) => e?.statut === "regle");
  if (toutRegle) return { clef: "paye", libelle: "Payé intégralement", ton: "fait" };

  const unePayee = echeances.some((e) => e?.statut === "regle");
  if (unePayee)
    return { clef: "acompte", libelle: "Acompte reçu — reste à solder", ton: "attente" };

  /*
    ── Rien n'est versé : c'est le contrat qui dit où l'on en est ────────────
    Même découpage que `prochaineEtape`, et dans le même ordre. La différence
    tient au sujet de la phrase : là-bas « rien à faire de votre côté », ici
    « à relire », « envoyer de quoi régler ». Le participant lit une attente,
    l'équipe lit une tâche — et c'est le même moment.
  */
  if (!d.contratDemandeLe) {
    /*
      ── ⚠️ Une place tenue et une place repartie ne se disent pas pareil ─────
      Sept jours après le dépôt, sans contrat demandé, la place retourne au
      catalogue — la tâche quotidienne s'en charge. La page du participant le
      lui dit en toutes lettres : « le délai de sept jours est passé et votre
      place est repartie au catalogue ». La colonne de l'équipe, elle,
      affichait encore « rien ne l'engage encore ».

      Deux versions du même dossier, et c'est la sienne qui était juste. Sur
      les quatorze dossiers du 6 septembre 2026, **neuf** étaient dans cet
      état : au 13 septembre, la liste de l'équipe en aurait montré neuf
      identiques dont plus aucun ne réservait quoi que ce soit.

      ⚠️ **Le ton reste `attente`, pas `nous`.** L'or est une file de travail
      du jour ; y verser neuf dossiers dormants la viderait de son sens. La
      personne peut toujours revenir — c'est elle qu'on attend, comme avant.
    */
    const depart = departDeLaTenue(d);
    if (depart && finDeLaTenue(depart).getTime() <= maintenant.getTime()) {
      return {
        clef: "place-expiree",
        libelle: "Pré-inscription expirée — sa place est repartie",
        ton: "attente",
      };
    }
    return {
      clef: "preinscription",
      libelle: "Pré-inscription — rien ne l'engage encore",
      ton: "attente",
    };
  }
  if (!d.contratSigneLe) {
    return {
      clef: "contrat-a-signer",
      libelle: "Contrat demandé — attend sa signature",
      ton: "attente",
    };
  }
  if (!d.contratVerifieLe) {
    return { clef: "a-relire", libelle: "Contrat signé — à relire", ton: "nous" };
  }
  if (!d.coordonneesEnvoyeesLe) {
    return { clef: "a-envoyer", libelle: "Contrat vérifié — envoyer de quoi régler", ton: "nous" };
  }
  return { clef: "attente-transfert", libelle: "En attente de son transfert", ton: "attente" };
}
