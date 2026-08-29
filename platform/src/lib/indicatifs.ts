/**
 * Déduire le pays de l'indicatif téléphonique.
 *
 * ── Pourquoi déduire plutôt que demander ────────────────────────────────────
 * Un champ « Pays » à côté d'un champ « Numéro » laisse écrire « Maroc » sous
 * un numéro ivoirien : deux saisies pour un seul fait, et rien ne les rapproche.
 * L'indicatif porte déjà l'information, et il est obligatoire de toute façon —
 * sans lui, le bouton WhatsApp du back-office refuse de composer.
 *
 * ⚠️ Cette table n'a pas vocation à être complète. Elle couvre l'Afrique
 * francophone, le Maghreb et les pays d'où viennent les inscrits ; ailleurs on
 * rend l'indicatif tel quel plutôt qu'un nom inventé. Un pays inconnu affiché
 * « + 34 » est lisible ; affiché « Maroc » par défaut, il est faux.
 */

/*
  Les indicatifs à trois chiffres sont énumérés avant ceux à deux, et la
  recherche prend le plus long qui corresponde : « 212 » (Maroc) et « 21 »
  n'existent pas tous les deux, mais « 1 » (Amérique du Nord) est le préfixe de
  rien et le suffixe de beaucoup.
*/
const INDICATIFS: Record<string, string> = {
  "212": "Maroc",
  "213": "Algérie",
  "216": "Tunisie",
  "218": "Libye",
  "220": "Gambie",
  "221": "Sénégal",
  "222": "Mauritanie",
  "223": "Mali",
  "224": "Guinée",
  "225": "Côte d'Ivoire",
  "226": "Burkina Faso",
  "227": "Niger",
  "228": "Togo",
  "229": "Bénin",
  "230": "Maurice",
  "235": "Tchad",
  "236": "Centrafrique",
  "237": "Cameroun",
  "238": "Cap-Vert",
  "240": "Guinée équatoriale",
  "241": "Gabon",
  "242": "Congo",
  "243": "République démocratique du Congo",
  "250": "Rwanda",
  "253": "Djibouti",
  "257": "Burundi",
  "261": "Madagascar",
  "269": "Comores",
  "20": "Égypte",
  "27": "Afrique du Sud",
  "32": "Belgique",
  "33": "France",
  "34": "Espagne",
  "39": "Italie",
  "31": "Pays-Bas",
  "41": "Suisse",
  "44": "Royaume-Uni",
  "49": "Allemagne",
  "1": "Amérique du Nord",
};

/**
 * Le pays d'un numéro international, ou l'indicatif à défaut.
 *
 * Rend une chaîne dans tous les cas : le champ est obligatoire en base, et un
 * dossier sans pays vaut moins qu'un dossier portant « + 34 ».
 */
export function paysDeLIndicatif(numero: string): string {
  let chiffres = numero.replace(/\D/g, "");
  if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);

  for (const longueur of [3, 2, 1]) {
    const debut = chiffres.slice(0, longueur);
    const pays = INDICATIFS[debut];
    if (pays) return pays;
  }

  /*
    ⚠️ Sans indicatif reconnu, on ne découpe pas au hasard. Un premier essai
    rendait « Indicatif +346 » pour un numéro espagnol : les trois premiers
    chiffres d'un code à deux, soit un indicatif qui n'existe pas. La longueur
    d'un indicatif ne se devine pas sans la table.

    L'équipe a le numéro entier sous les yeux dans la fiche — c'est elle qui
    appellera, et « À préciser » lui dit la vérité.
  */
  return "À préciser";
}
