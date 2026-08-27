/**
 * Bornes des champs libres des formulaires publics.
 *
 * ── Pourquoi des bornes ─────────────────────────────────────────────────────
 * Le nom, l'adresse, le numéro et le pays n'étaient vérifiés que sur un point :
 * qu'ils ne soient pas vides. Rien n'empêchait d'en envoyer un mégaoctet — la
 * valeur partait en base, dans le tableau de bord, et dans les deux courriels
 * qu'une inscription déclenche.
 *
 * ── Refuser plutôt que couper ───────────────────────────────────────────────
 * Tronquer un nom trop long donnerait un dossier au nom de quelqu'un d'autre,
 * et le participant ne le saurait jamais. Le formulaire le dit et laisse
 * corriger.
 *
 * Les longueurs sont larges : un nom composé, une particule, un patronyme
 * translittéré tiennent en cent vingt caractères, et le but n'est pas de juger
 * ce qui est un « vrai » nom.
 */

export const LONGUEURS = {
  nom: 120,
  email: 254,
  telephone: 32,
  pays: 60,
  organisation: 160,
  message: 2000,
} as const;

/** Vrai si la valeur tient dans la borne. Une valeur vide est traitée ailleurs. */
export function tientDans(valeur: string, max: number): boolean {
  return valeur.length <= max;
}

/**
 * L'adresse a-t-elle la forme d'une adresse ?
 *
 * ⚠️ Volontairement grossier. La seule vérification qui prouve une adresse est
 * d'y écrire ; toute expression plus fine se met à refuser des adresses
 * valides — un `+` dans la partie locale, un domaine à rallonge, un caractère
 * accentué. On écarte ici ce qui ne peut pas être une adresse, pas ce qui n'y
 * ressemble pas.
 *
 * `254` est la longueur maximale d'une adresse selon la RFC 5321.
 */
export function emailPlausible(valeur: string): boolean {
  if (!tientDans(valeur, LONGUEURS.email)) return false;
  if (/\s/.test(valeur)) return false;

  const morceaux = valeur.split("@");
  if (morceaux.length !== 2) return false;

  const [locale, domaine] = morceaux as [string, string];
  if (locale.length === 0 || domaine.length < 3) return false;

  // Un domaine porte au moins un point, et ne commence ni ne finit par lui.
  return domaine.includes(".") && !domaine.startsWith(".") && !domaine.endsWith(".");
}
