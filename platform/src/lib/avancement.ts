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

/** Ce que le calcul a besoin de savoir. Rien de plus, rien de Payload. */
export type FaitsDuDossier = {
  statut?: string | null;
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

export type Avancement = { libelle: string; ton: Ton };

export function avancementDuDossier(d: FaitsDuDossier): Avancement {
  if (d.statut === "annulee") return { libelle: "Annulé", ton: "clos" };
  if (d.statut === "terminee") return { libelle: "Terminé — certificat émis", ton: "fait" };

  const echeances = (d.echeances ?? []).filter(Boolean);
  const annoncee = echeances.some((e) => e?.statut === "annonce");

  /*
    ⚠️ **L'annonce passe avant tout le reste.** C'est le seul état où de
    l'argent est peut-être déjà arrivé sans que personne l'ait constaté, et
    c'est celui qui coûte le plus cher à laisser traîner : le participant a
    fait ce qu'on lui demandait et attend qu'on le lui confirme.
  */
  if (annoncee) return { libelle: "Transfert annoncé — à vérifier", ton: "nous" };

  const toutRegle = echeances.length > 0 && echeances.every((e) => e?.statut === "regle");
  if (toutRegle) return { libelle: "Payé intégralement", ton: "fait" };

  const unePayee = echeances.some((e) => e?.statut === "regle");
  if (unePayee) return { libelle: "Acompte reçu — reste à solder", ton: "attente" };

  /*
    ── Rien n'est versé : c'est le contrat qui dit où l'on en est ────────────
    Même découpage que `prochaineEtape`, et dans le même ordre. La différence
    tient au sujet de la phrase : là-bas « rien à faire de votre côté », ici
    « à relire », « envoyer de quoi régler ». Le participant lit une attente,
    l'équipe lit une tâche — et c'est le même moment.
  */
  if (!d.contratDemandeLe) {
    return { libelle: "Pré-inscription — rien ne l'engage encore", ton: "attente" };
  }
  if (!d.contratSigneLe) {
    return { libelle: "Contrat demandé — attend sa signature", ton: "attente" };
  }
  if (!d.contratVerifieLe) {
    return { libelle: "Contrat signé — à relire", ton: "nous" };
  }
  if (!d.coordonneesEnvoyeesLe) {
    return { libelle: "Contrat vérifié — envoyer de quoi régler", ton: "nous" };
  }
  return { libelle: "En attente de son transfert", ton: "attente" };
}
