/**
 * Ce que CLIXA veut dire, écrit une fois.
 *
 * ── ⚠️ Pourquoi un fichier pour deux phrases ──────────────────────────────
 * Parce qu'elles étaient déjà à deux endroits, et qu'elles ne disaient pas la
 * même chose. Le certificat porte « Centre de Leadership, Innovation &
 * eXcellence in Africa » depuis toujours ; les courriels portaient
 * « Executive Education · Afrique », qui est juste mais ne dit pas ce que le
 * sigle signifie. Et l'assistant du site ne le savait pas du tout — un
 * visiteur qui demandait « ça veut dire quoi, CLIXA ? » n'obtenait rien.
 *
 * C'est la faute déjà payée sur le numéro d'admissions, sur les moyens de
 * paiement affichés, et sur les intitulés de gestes : deux copies d'un même
 * fait finissent par diverger, et l'on ne s'en aperçoit que chez le client.
 *
 * ── ⚠️ « of » ou « de » — une divergence signalée, pas tranchée ────────────
 * La direction a dicté le 23 septembre 2026 : « CLIXA : Centre **of**
 * Leadership, Innovation **and** eXcellence in Africa ». Le certificat, lui,
 * imprime « Centre **de** Leadership, Innovation **&** eXcellence in Africa ».
 *
 * C'est la forme dictée qui est retenue ici, pour les courriels et
 * l'assistant. **Le certificat n'a pas été touché** : c'est un document qui
 * circule, qu'un employeur ou une banque peut recevoir, et dont le libellé
 * relève de la direction — pas d'un alignement fait au passage. Les deux
 * doivent finir identiques ; c'est à elle de dire laquelle gagne.
 */

/** Le sigle, développé. Ce que les lettres veulent dire. */
export const DEVISE_CLIXA = "Centre of Leadership, Innovation and eXcellence in Africa";

/**
 * La ligne courte du cartouche, sous le nom.
 *
 * ⚠️ Elle n'est **pas** la devise : à neuf pixels, dans un en-tête de
 * courriel, cinquante-cinq caractères se replient sur trois lignes et poussent
 * la pastille de rentrée hors du cartouche. Mesuré à l'écran. La devise vit
 * dans le corps du message, où elle a la place d'être lue.
 */
export const BASELINE_COURTE = "Executive Education · Afrique";
