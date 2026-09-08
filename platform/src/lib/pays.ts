import { INDICATIFS_OFFERTS } from "@/lib/indicatifs";

/**
 * Le pays du participant : une liste, une porte de sortie, une seule règle.
 *
 * ── ⚠️ D'où vient ce fichier ────────────────────────────────────────────────
 * Le champ « Pays » du formulaire d'inscription était un champ libre, posé
 * juste sous le numéro WhatsApp. Il se remplissait souvent du même geste que
 * celui d'au-dessus : un dossier de production porte `22222628` en pays, pour
 * un numéro en `+22222222628` — un morceau du numéro recopié dans la mauvaise
 * case.
 *
 * La direction a tranché le 7 septembre 2026 : une **liste**, avec « Autre
 * pays » pour ceux qui n'y figurent pas — la même porte de sortie que le
 * sélecteur d'indicatif, et pour la même raison. Une liste fermée renverrait
 * quelqu'un sans qu'il puisse rien y faire ; la liste sera toujours incomplète.
 *
 * ── Pourquoi la règle vit ici, et pas à trois endroits ──────────────────────
 * Elle est lue par le composant (ce qu'on propose), par `api/inscription` (ce
 * qu'on accepte) et par trois collections (ce que /admin refuse). Recopiée
 * trois fois, elle aurait divergé — c'est la leçon de `lib/reseaux.ts` et de
 * `lib/moyens.ts`, où deux listes du même fait ont fini par se contredire.
 */

/**
 * Les pays proposés, drapeau compris.
 *
 * ⚠️ **« Amérique du Nord » n'est pas un pays.** La liste dérive de
 * `INDICATIFS_OFFERTS`, qui répond à une autre question : quel *indicatif*
 * composer. Le `+1` y couvre les États-Unis et le Canada, et le journal
 * explique pourquoi il ne porte aucun drapeau — « en choisir un afficherait le
 * mauvais pays à l'autre ». Ce compromis vaut pour un numéro de téléphone ;
 * il ne vaut rien pour la question « où habitez-vous ». Les deux pays sont
 * donc listés séparément, et l'entrée fourre-tout est écartée.
 */
const ZONE_SANS_PAYS = "Amérique du Nord";

export const PAYS_OFFERTS: { nom: string; drapeau: string }[] = [
  ...INDICATIFS_OFFERTS.filter((i) => i.pays !== ZONE_SANS_PAYS).map((i) => ({
    nom: i.pays,
    drapeau: i.drapeau,
  })),
  { nom: "États-Unis", drapeau: "🇺🇸" },
  { nom: "Canada", drapeau: "🇨🇦" },
  /*
    Ajouts hors table des indicatifs : des pays d'où des inscrits peuvent
    écrire sans que nous ayons eu à lister leur indicatif — la liste des
    indicatifs répond à « que composer », celle-ci à « où habitez-vous ».
  */
  { nom: "Madagascar", drapeau: "🇲🇬" },
  { nom: "Rwanda", drapeau: "🇷🇼" },
  { nom: "Burundi", drapeau: "🇧🇮" },
  { nom: "Comores", drapeau: "🇰🇲" },
  { nom: "Djibouti", drapeau: "🇩🇯" },
  { nom: "Guinée équatoriale", drapeau: "🇬🇶" },
  { nom: "Haïti", drapeau: "🇭🇹" },
  { nom: "Luxembourg", drapeau: "🇱🇺" },
].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

/** Ce qu'il faut de lettres pour qu'un nom de pays en soit un. */
export const MINIMUM_LETTRES = 2;

/**
 * Ce qui reste d'une saisie libre : des lettres, et ce qui les sépare.
 *
 * ⚠️ **`\p{L}`, et non `A-Za-zÀ-ÿ`.** Le premier jet s'arrêtait à Latin-1 —
 * l'intervalle `À-ÿ`. Mesuré : « Türkiye » et « Côte d'Ivoire » passaient,
 * mais « Česko » ressortait **« esko »**, le `Č` (U+010C) tombant hors de
 * l'intervalle. Une réponse juste, silencieusement abîmée. Les lettres de
 * toutes les écritures passent désormais, avec leurs marques diacritiques
 * (`\p{M}`, pour les accents écrits en points de code séparés).
 *
 * ⚠️ **Ce qui ne passe pas reste ce qui compte.** Les chiffres — la faute
 * d'origine —, les chevrons, les guillemets, les caractères de contrôle. Ce
 * dernier point n'est pas décoratif : un seul caractère de contrôle dans un
 * nom rend le classeur des admissions illisible **en bloc**, et il vient d'un
 * formulaire public.
 *
 * ⚠️ **Les balises sont retirées avant le filtre**, pour que
 * `<script>alert(1)</script>` ne laisse pas `scriptalert1script` mais
 * `alert` : le filtre seul suffirait à la sûreté, mais laisserait une chaîne
 * qui ressemble à du code dans une fiche que l'équipe lit.
 */
export function assainirPays(brut: string): string {
  return brut
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{M}\s\-'.]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Un pays plausible : des lettres, et pas seulement une ou deux.
 *
 * ⚠️ Employé par les collections, **pas** par la route publique. Les deux ne
 * font pas le même travail : la route *nettoie* et retombe sur l'indicatif du
 * numéro si rien de lisible ne reste — corriger en silence vaut mieux que
 * refuser quelqu'un dont le navigateur a déjà barré la route. /admin, lui,
 * *refuse* et le dit : une saisie d'équipe qu'on réécrirait en douce serait
 * une valeur que personne n'a choisie.
 */
export function paysPlausible(valeur: unknown): boolean {
  const propre = assainirPays(String(valeur ?? ""));
  return propre.length >= MINIMUM_LETTRES;
}
