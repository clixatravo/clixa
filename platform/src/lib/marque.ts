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
 * ── Une forme, tranchée par la direction le 25 septembre 2026 ─────────────
 * Trois formes circulaient : « Center of … & … » sur le site, « Centre of …
 * and … » dans les courriels et l'assistant (dictée le 23 septembre), et
 * « Centre de … & … » sur le certificat. La direction a retenu **celle du
 * certificat** — le document qui circule le plus loin, et qu'on ne retouche
 * pas au passage. Tout le reste la lit ici, certificat compris.
 *
 * ⚠️ **Le X majuscule n'est pas une coquetterie** : CLIXA se lit dans la
 * phrase — **C**entre de **L**eadership, **I**nnovation & e**X**cellence in
 * **A**frica. Écrite « Excellence », elle n'explique plus le nom.
 *
 * ⚠️ L'esperluette se sert échappée dans le HTML des courriels
 * (`echapper(DEVISE_CLIXA)`), jamais brute.
 */

/** Le sigle, développé. Ce que les lettres veulent dire. */
export const DEVISE_CLIXA = "Centre de Leadership, Innovation & eXcellence in Africa";

/**
 * La ligne courte du cartouche, sous le nom.
 *
 * ⚠️ Elle n'est **pas** la devise : à neuf pixels, dans un en-tête de
 * courriel, cinquante-cinq caractères se replient sur trois lignes et poussent
 * la pastille de rentrée hors du cartouche. Mesuré à l'écran. La devise vit
 * dans le corps du message, où elle a la place d'être lue.
 */
export const BASELINE_COURTE = "Executive Education · Afrique";
