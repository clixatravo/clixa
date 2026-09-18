/**
 * Le chemin d'une cohorte pleine vers la liste d'attente.
 *
 * ── ⚠️ Le défaut que ce module existe pour fermer ───────────────────────────
 * Trois endroits proposent de rejoindre la liste d'attente quand une cohorte
 * est complète : le héros de la fiche, sa colonne latérale, et la page
 * d'inscription — celle-ci promettant même « nous vous **plaçons** sur la liste
 * d'attente ». Les trois menaient à `/contact` **nu**.
 *
 * Le visiteur remplissait alors un formulaire de rappel ordinaire, et sa
 * demande arrivait dans la liste de l'équipe sans rien qui dise **quel
 * parcours**, ni qu'il s'agissait d'une liste d'attente. La promesse « nous
 * vous prévenons dès qu'une place se libère » ne pouvait être tenue par
 * personne : il n'y avait pas de liste, seulement quatorze demandes de rappel
 * qui se ressemblaient toutes.
 *
 * ⚠️ **Tout le tuyau existait déjà.** `api/demande-rappel` résout un slug de
 * programme et le range en relation ; le lien des rythmes de paiement passe
 * `?programme=` depuis toujours. Ce qui manquait, c'est que `/contact` lise ce
 * paramètre — son propre commentaire le disait : « `programme` et `plan`
 * restent acceptés dans l'adresse, mais ils ne préremplissent plus rien ».
 * L'information arrivait à la porte et personne ne l'ouvrait.
 *
 * ⚠️ **Le formulaire garde ses trois champs.** La direction les a ramenés de
 * sept à trois — « c'est un rappel qu'on demande, pas un dossier » — et ce
 * n'est pas remis en cause : le parcours voyage en champ caché, comme
 * `origine`, sans rien demander de plus au visiteur.
 *
 * ── Pourquoi une fonction et non trois chaînes ──────────────────────────────
 * Une façon de faire recopiée trois fois est trois façons de tomber le jour où
 * elle change — la leçon de `referenceDeLAdresse` et de `remplirWhatsapp`. Ici
 * le risque est précis : on corrige un lien, on oublie les deux autres, et deux
 * visiteurs sur trois restent anonymes sans que rien ne passe au rouge.
 */

/** Marque, dans l'adresse, qu'on vient d'une cohorte pleine. */
export const PARAM_ATTENTE = "attente";

/**
 * L'adresse du formulaire, portant le parcours dont la cohorte est pleine.
 *
 * ⚠️ Le slug est échappé : il vient du catalogue, mais un slug est du texte
 * saisi dans /admin, et une esperluette y suffirait à couper le paramètre
 * suivant — la demande arriverait alors sans son parcours, c'est-à-dire dans
 * l'état qu'on vient de corriger.
 */
export function lienListeAttente(slug: string): string {
  return `/contact?programme=${encodeURIComponent(slug)}&${PARAM_ATTENTE}=1`;
}

/*
  ⚠️ **`origineListeAttente` a été retirée le 18 septembre 2026**, avec le
  formulaire public de rappel qu'elle servait : elle composait le champ caché
  « Page d'origine » de `/contact`. Plus personne ne l'appelait.

  Ce qu'elle disait reste vrai — « je voulais m'inscrire et je n'ai pas pu » est
  un tout autre message que « je me renseigne » — mais cela se dit maintenant
  dans le message WhatsApp que la page compose, qui nomme le parcours. Une
  fonction que rien n'appelle finit par être recâblée par quelqu'un qui la croit
  vivante ; c'est le raisonnement qui a fait partir les consignes
  `ATTENDU[...].equipe` deux jours plus tôt.
*/
