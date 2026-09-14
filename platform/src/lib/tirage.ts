import { randomBytes } from "crypto";

/**
 * Les tirages qui servent de clef : la référence d'un dossier, le code de
 * vérification d'un certificat.
 *
 * ⚠️ **Un seul alphabet pour les deux**, et c'est pour cela qu'il vit ici. Il a
 * quitté `collections/Inscriptions.ts` le 14 septembre 2026, quand le code du
 * certificat en a eu besoin : deux copies d'une même table de symboles
 * finissent par diverger, et c'est la plus lisible des deux — celle qu'on dicte
 * au téléphone — qui en ferait les frais.
 */

/*
  L'alphabet exclut I, O, 0 et 1.

  Une référence se dicte au téléphone et se recopie d'un courriel : les quatre
  caractères qu'on confond à l'oral ou à l'œil coûtent plus qu'ils ne
  rapportent. Trente-deux symboles suffisent largement.
*/
export const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LONGUEUR = 8;

/**
 * Tirer une référence de dossier.
 *
 * ⚠️ `randomBytes`, pas `Math.random()`.
 *
 * La référence n'est pas un simple identifiant : c'est la seule clef qui
 * protège la fiche d'un dossier — nom, adresse, téléphone, échéancier — et
 * l'annonce d'un transfert. `Math.random()` est un générateur rapide, non
 * cryptographique : son état interne se reconstitue à partir de quelques
 * sorties, et qui a ouvert deux ou trois dossiers peut alors prédire ceux
 * qu'on délivrera ensuite.
 *
 * Huit symboles sur trente-deux valent quarante bits — mille milliards de
 * combinaisons, là où cinq caractères en base 36 en donnaient soixante
 * millions. Les références déjà émises restent valables : elles sont
 * enregistrées, pas recalculées.
 */
export function tirage(longueur = LONGUEUR): string {
  const octets = randomBytes(longueur);
  let sortie = "";
  for (let i = 0; i < longueur; i += 1) {
    // Le modulo est sans biais : 256 est un multiple de 32.
    sortie += ALPHABET[octets[i]! % ALPHABET.length];
  }
  return sortie;
}
