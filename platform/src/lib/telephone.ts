/**
 * Composer un numéro international à partir d'un indicatif et de ce qu'on tape.
 *
 * ── ⚠️ Les deux numéros injoignables trouvés en production ───────────────────
 * Le 6 septembre 2026, sur quatorze demandes de rappel réelles — toutes venues
 * de la campagne — **deux numéros ne joignaient personne**, et le site les
 * avait acceptés sans broncher :
 *
 *   `+221221770790537`  quinze chiffres. La personne a tapé son numéro
 *                       complet, `221770790537`, dans la case du numéro local ;
 *                       le sélecteur y a ajouté `+221` une seconde fois.
 *
 *   `+21298534397`      la personne est au Togo (`+228`). Elle a tapé son
 *                       numéro et n'a pas touché au sélecteur, resté sur son
 *                       défaut. Le même numéro figure deux lignes plus haut,
 *                       correctement, en `+22898534397` : c'est le second
 *                       essai de la même personne.
 *
 * Les deux fautes sont les nôtres. On demande deux informations pour n'en
 * former qu'une, sans jamais montrer le résultat ni rattraper l'évident.
 *
 * ── ⚠️ Pourquoi une fonction pure, à part du champ ──────────────────────────
 * Un composant ne s'éprouve qu'en ouvrant un navigateur ; cette règle-ci se
 * déroule sur vingt cas en une seconde, et ce sont les cas qui comptent. Même
 * raison que `prochaineEtape` et `avancementDuDossier`.
 *
 * ⚠️ **On rattrape ce qui est certain, jamais ce qui est probable.** Un numéro
 * corrigé de travers vaut moins qu'un numéro refusé : la personne saurait au
 * moins qu'il faut recommencer. Les trois règles ci-dessous ne se déclenchent
 * que sur des formes qu'aucun numéro local ne peut prendre.
 */

import { zeroAretirer } from "@/lib/indicatifs";

/** Le nombre minimal de chiffres qui reste plausible pour un numéro local. */
const LOCAL_MINIMUM = 6;

/**
 * En dessous, « 00 » n'annonce pas un numéro international.
 *
 * ⚠️ Sans ce plancher, « 000 » tapé dans la case du numéro se lisait comme un
 * préfixe international et rendait « +0 » — une chaîne qui a la forme d'un
 * numéro, que le champ caché emportait, et qui ne joint personne.
 */
const INTERNATIONAL_MINIMUM = 8;

export type Composition = {
  /** La forme internationale à envoyer, ou `""` si l'on n'a pas de quoi. */
  complet: string;
  /** La même, espacée, pour la relire à l'écran. */
  lisible: string;
  /** Ce qu'on a rattrapé, s'il y a lieu — pour le dire au visiteur. */
  rattrape?: "indicatif-en-double" | "numero-international";
};

/**
 * @param indicatif l'indicatif choisi dans la liste, chiffres seuls (« 221 »).
 * @param saisi ce que le visiteur a tapé dans la case du numéro.
 */
export function composerNumero(indicatif: string, saisi: string): Composition {
  const code = String(indicatif ?? "").replace(/\D/g, "");
  const brut = String(saisi ?? "").trim();
  if (!code || !brut) return { complet: "", lisible: "" };

  let rattrape: Composition["rattrape"];
  let chiffres = brut.replace(/\D/g, "");

  /*
    ── 1. Il a écrit son numéro international, indicatif compris ─────────────
    Un `+` ou un `00` en tête ne laisse aucune place au doute : la personne
    donne le numéro entier, et le sélecteur n'a rien à y ajouter. C'est le seul
    cas où l'on ignore délibérément le choix de la liste — parce que la saisie
    est plus explicite que lui.
  */
  const annonceInternational =
    brut.startsWith("+") ||
    (chiffres.startsWith("00") && chiffres.length - 2 >= INTERNATIONAL_MINIMUM);
  if (annonceInternational) {
    const entier = chiffres.replace(/^00/, "");
    if (entier.length >= INTERNATIONAL_MINIMUM) {
      return {
        complet: `+${entier}`,
        lisible: espacer(entier),
        rattrape: "numero-international",
      };
    }
    /*
      Un « + » suivi de trop peu de chiffres n'est pas un numéro international :
      c'est une saisie en cours. On la traite comme un numéro local, et la garde
      du serveur refusera si elle reste trop courte.
    */
  }

  /*
    ── 2. L'indicatif a été tapé deux fois ──────────────────────────────────
    C'est le cas de `+221221770790537`. On ne le retire que s'il reste ensuite
    de quoi faire un numéro : sans ce plancher, un abonné dont le numéro local
    commencerait vraiment par son propre indicatif verrait le sien amputé.

    ⚠️ Aucun plan de numérotation de la liste ne fait commencer un numéro local
    par l'indicatif de son pays — les mobiles y commencent par 6, 7, 8 ou 9.
    C'est ce qui rend ce rattrapage sûr, et c'est aussi ce qui le limite : il
    n'a de sens que tant que cela reste vrai.
  */
  if (chiffres.startsWith(code) && chiffres.length - code.length >= LOCAL_MINIMUM) {
    chiffres = chiffres.slice(code.length);
    rattrape = "indicatif-en-double";
  }

  /*
    ── 3. ⚠️ Le zéro de tête, mais seulement là où il ne compte pas ──────────
    « 06 12 34 56 78 » est la façon dont un Marocain connaît son propre numéro,
    et « +212 06… » n'appelle personne. Mais **en Côte d'Ivoire le zéro fait
    partie du numéro** : depuis 2021 ils font dix chiffres, et « +225 07 12 34
    56 78 » est la forme juste. Le retirer rendait `+225712345678`, qui ne joint
    personne — dans un pays que le site nomme et où l'annonce tourne.

    La règle est donc par pays (`zeroAretirer`), et son défaut est de garder :
    un chiffre retiré à tort rend un numéro faux et silencieux, un chiffre gardé
    en trop se voit au premier appel.
  */
  if (zeroAretirer(code)) chiffres = chiffres.replace(/^0+/, "");
  if (!chiffres) return { complet: "", lisible: "" };

  return {
    complet: `+${code}${chiffres}`,
    lisible: `+${code} ${espacer(chiffres)}`,
    ...(rattrape ? { rattrape } : {}),
  };
}

/**
 * Espacer par groupes de deux, en partant de la droite.
 *
 * ⚠️ **Seulement pour relire, jamais pour envoyer.** Le champ caché porte la
 * forme continue ; celle-ci ne sert qu'à ce que le visiteur reconnaisse son
 * propre numéro d'un coup d'œil — c'est tout l'objet de le lui montrer.
 */
function espacer(chiffres: string): string {
  const reste = chiffres.length % 2;
  const paires = chiffres.slice(reste).match(/.{2}/g) ?? [];
  return [chiffres.slice(0, reste), ...paires].filter(Boolean).join(" ");
}
