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

/**
 * Ce que l'équipe lira dans la colonne « Page d'origine ».
 *
 * ⚠️ Il ne suffit pas d'enregistrer le parcours : une demande de rappel
 * ordinaire sur ce même parcours a un tout autre sens. Celle-ci dit « je
 * voulais m'inscrire et je n'ai pas pu » — c'est la seule qu'un appel peut
 * encore convertir, et elle se noierait parmi les autres sans être nommée.
 */
export function origineListeAttente(slug: string): string {
  return `/formations/${slug} · liste d'attente (cohorte complète)`;
}
