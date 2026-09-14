import { ALPHABET, tirage } from "@/lib/tirage";

/**
 * Le code qui permet à un tiers de vérifier un certificat.
 *
 * ── Pourquoi un code à part ─────────────────────────────────────────────────
 * Un certificat circule : le participant l'envoie à un employeur, à une banque,
 * le dépose dans un dossier de candidature. Quiconque le reçoit doit pouvoir
 * vérifier qu'il est authentique — c'est tout l'intérêt d'un certificat.
 *
 * ⚠️ **Le document portait la clef du dossier, et c'est ce que ce code
 * remplace.** Jusqu'au 14 septembre 2026, la « référence certificat » imprimée
 * était `CLIXA-` suivi de la référence du dossier sans son préfixe : il suffisait
 * de remettre `CLX-` devant pour ouvrir la fiche du participant — nom,
 * téléphone, échéancier — et y annoncer un transfert. Le titre du PDF et le nom
 * du fichier portaient même cette référence **en clair**. Un participant qui
 * joignait son certificat à une candidature joignait la clef de son dossier.
 *
 * Le code est donc **tiré indépendamment**, au moment où le certificat est émis :
 * il ne dit rien du dossier, et le dossier ne se retrouve pas à partir de lui.
 * Aucun certificat n'avait encore été émis en production quand la faute a été
 * trouvée — soixante et onze dossiers, tous « demandée ».
 *
 * ── Sa forme ────────────────────────────────────────────────────────────────
 * `CLIXA-XXXX-XXXX` : huit symboles, quarante bits, le même alphabet que la
 * référence du dossier — sans I, O, 0 ni 1, parce qu'un code se dicte. La forme
 * groupée le distingue à l'œil de `CLX-XXXXXXXX` : le jour où quelqu'un les
 * confondrait au téléphone, c'est la clef du dossier qu'il dicterait.
 */

const PREFIXE = "CLIXA";
const FORME = new RegExp(`^${PREFIXE}-[${ALPHABET}]{4}-[${ALPHABET}]{4}$`);

/** Un code neuf, pour un certificat qu'on émet. */
export function nouveauCodeCertificat(): string {
  const brut = tirage(8);
  return `${PREFIXE}-${brut.slice(0, 4)}-${brut.slice(4)}`;
}

/**
 * Ce qu'un visiteur a tapé, ramené à la forme canonique — ou `undefined`.
 *
 * On pardonne ce qui se tape naturellement autrement : les minuscules, les
 * espaces, les tirets oubliés, le préfixe omis. On ne pardonne pas un symbole
 * hors de l'alphabet : il n'apparaît sur aucun certificat, et le « corriger »
 * reviendrait à deviner lequel la personne voulait dire.
 */
export function normaliserCodeCertificat(saisie: unknown): string | undefined {
  if (typeof saisie !== "string") return undefined;
  const nu = saisie
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(new RegExp(`^${PREFIXE}`), "");
  if (nu.length !== 8) return undefined;
  const code = `${PREFIXE}-${nu.slice(0, 4)}-${nu.slice(4)}`;
  return FORME.test(code) ? code : undefined;
}
