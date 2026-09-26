/**
 * Les étiquettes du cache de données.
 *
 * Elles vivent à part parce que deux mondes s'en servent : `lib/catalogue.ts`
 * les pose sur ses lectures, `collections/revalider.ts` les lève quand le
 * contenu change. Les déclarer dans l'un des deux ferait remonter tout le
 * module dans l'autre — la configuration Payload embarquerait la couche
 * d'accès, ou l'inverse.
 *
 * Une chaîne mal orthographiée ne lève rien et ne dit rien : le cache reste
 * simplement périmé. D'où ces constantes plutôt que des littéraux.
 */
export const ETIQUETTE_CATALOGUE = "catalogue";
export const ETIQUETTE_TARIFS = "tarifs";
export const ETIQUETTE_PAGES = "pages";
/**
 * Ce que la vitrine montre d'elle-même : témoignages et séances filmées.
 *
 * ⚠️ **Une étiquette à part du catalogue**, parce que ce n'est pas la même
 * main qui écrit. Le catalogue bouge quand un parcours change ; ces deux
 * collections bougent quand la rédaction publie une vidéo ou un retour, et
 * lever le catalogue entier pour cela ferait relire douze fiches sans raison.
 */
export const ETIQUETTE_VITRINE = "vitrine";

/**
 * Les extraits qu'on partage par lien.
 *
 * ⚠️ **Séparée de la vitrine, bien que ce soient des vidéos elles aussi.** La
 * vitrine bouge quand la rédaction publie sur `/temoignages` ; un extrait bouge
 * quand on prépare un lien à envoyer. Mêler les deux ferait relire l'accueil et
 * la vitrine à chaque retouche d'un titre que personne d'autre ne voit.
 */
export const ETIQUETTE_EXTRAITS = "extraits";

/**
 * Plafond de fraîcheur, en secondes.
 *
 * Les étiquettes suffisent quand l'écriture passe par /admin : le crochet lève
 * l'étiquette, la page suivante relit la base. Mais un script lancé par
 * `payload run` tourne hors du contexte de Next, où lever une étiquette est
 * impossible — c'est déjà vrai de `revalidatePath`, et documenté.
 *
 * Sans plafond, une écriture faite par script laisserait le cache périmé
 * jusqu'au prochain passage par /admin. Une heure est le délai au bout duquel
 * le site se remet d'aplomb tout seul, sans rien attendre de personne.
 */
export const PEREMPTION = 60;
