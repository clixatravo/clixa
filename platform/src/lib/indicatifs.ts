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
export const INDICATIFS: Record<string, string> = {
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
 * Le numéro porte-t-il un indicatif international ?
 *
 * ── Pourquoi c'est obligatoire, et pas seulement conseillé ──────────────────
 * Sans indicatif, le numéro ne désigne personne hors de son pays. Le bouton
 * WhatsApp du back-office refuse alors de composer, et l'équipe se retrouve à
 * deviner : « 0689324243 » est marocain pour qui le lit, et injoignable pour
 * qui appelle. Un dossier est arrivé ainsi.
 *
 * ⚠️ On exige la forme, pas l'appartenance à la table. Refuser un pays qu'on
 * n'a pas listé écarterait un inscrit pour une lacune qui est la nôtre : il
 * suffit que l'indicatif soit là et que le numéro ait une longueur plausible.
 */
export function aUnIndicatif(numero: string): boolean {
  const brut = numero.trim();
  // Le « + » ou le « 00 » qui l'annonce, et rien d'autre avant.
  if (!/^(\+|00)/.test(brut)) return false;

  let chiffres = brut.replace(/\D/g, "");
  if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);

  /*
    E.164 borne le numéro à quinze chiffres, indicatif compris. En dessous de
    huit, il n'y a pas la place pour un indicatif et un abonné.
  */
  return chiffres.length >= 8 && chiffres.length <= 15;
}

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

/**
 * Les indicatifs offerts au visiteur, pays d'abord.
 *
 * ── ⚠️ Pourquoi un choix, et non un champ à remplir ─────────────────────────
 * Le formulaire demandait le numéro « avec l'indicatif », et la garde refuse
 * sans lui — à raison : « 0689324243 » est marocain pour qui le lit et
 * injoignable pour qui appelle.
 *
 * Mais `inputMode="tel"` ouvre, sur beaucoup de téléphones Android, un pavé
 * numérique où le **`+` n'existe que sous une pression longue du zéro**. On
 * exigeait donc un caractère que le clavier ne propose pas. Un prospect venu
 * d'une annonce s'en est plaint le 5 septembre 2026 : « je voulais mettre mon
 * numéro, ça ne marche pas ».
 *
 * On ne relâche pas la règle : on rend la faute impossible. Le visiteur
 * choisit son pays et tape le numéro qu'il connaît par cœur ; c'est nous qui
 * composons la forme internationale.
 *
 * ⚠️ Le Maroc en tête, puis l'Afrique de l'Ouest — c'est d'où viennent les
 * inscrits. Un ordre alphabétique mettrait l'Allemagne avant la Côte d'Ivoire.
 */
/**
 * Le code ISO de chaque pays, pour en tirer un drapeau.
 *
 * ⚠️ **Le drapeau se calcule, il ne se stocke pas.** Un emoji de drapeau est
 * la paire de lettres du pays écrite en « indicateurs régionaux » : `MA`
 * devient 🇲🇦. Ranger les emojis eux-mêmes ferait une seconde table à tenir
 * juste, alors que celle-ci se déduit.
 *
 * ⚠️ **« 1 » n'a pas de drapeau, et c'est voulu.** L'indicatif +1 couvre les
 * États-Unis et le Canada : en choisir un afficherait le mauvais pays à
 * l'autre. Mieux vaut pas de drapeau qu'un drapeau faux.
 */
const ISO: Record<string, string> = {
  "212": "MA",
  "213": "DZ",
  "216": "TN",
  "218": "LY",
  "220": "GM",
  "221": "SN",
  "222": "MR",
  "223": "ML",
  "224": "GN",
  "225": "CI",
  "226": "BF",
  "227": "NE",
  "228": "TG",
  "229": "BJ",
  "230": "MU",
  "235": "TD",
  "236": "CF",
  "237": "CM",
  "238": "CV",
  "240": "GQ",
  "241": "GA",
  "242": "CG",
  "243": "CD",
  "250": "RW",
  "253": "DJ",
  "257": "BI",
  "261": "MG",
  "269": "KM",
  "20": "EG",
  "27": "ZA",
  "32": "BE",
  "33": "FR",
  "34": "ES",
  "39": "IT",
  "31": "NL",
  "41": "CH",
  "44": "GB",
  "49": "DE",
};

/**
 * Le drapeau d'un indicatif, ou une chaîne vide.
 *
 * ⚠️ Sur Windows, les navigateurs n'ont pas de police de drapeaux : la paire
 * de lettres s'affiche à la place (« MA » dans deux carrés). Ce n'est pas
 * cassé — c'est encore lisible, et le code et le nom du pays sont écrits juste
 * à côté. Sur les téléphones, d'où vient l'essentiel du trafic, le drapeau
 * s'affiche.
 */
export function drapeau(code: string): string {
  const iso = ISO[code];
  if (!iso) return "";
  return String.fromCodePoint(...[...iso].map((l) => 0x1f1e6 + l.charCodeAt(0) - 65));
}

export const INDICATIFS_OFFERTS: { code: string; pays: string; drapeau: string }[] = [
  "212",
  "225",
  "221",
  "224",
  "227",
  "223",
  "226",
  "228",
  "229",
  "222",
  "237",
  "241",
  "242",
  "243",
  "235",
  "236",
  "220",
  "245",
  "213",
  "216",
  "218",
  "230",
  "33",
  "32",
  "41",
  "34",
  "39",
  "31",
  "44",
  "49",
  "1",
]
  .filter((code) => INDICATIFS[code])
  .map((code) => ({ code, pays: INDICATIFS[code]!, drapeau: drapeau(code) }));
