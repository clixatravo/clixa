import { createHash } from "node:crypto";

/**
 * Ce qui fait qu'une signature électronique tient, ou ne tient pas.
 *
 * ── Ce qu'on signe, et ce qu'on prouve ──────────────────────────────────────
 * La case cochée ne prouve rien : on la coche pour n'importe qui. Ce qui se
 * défend, c'est le faisceau — la date, l'adresse d'où l'on a signé, le
 * navigateur, et surtout **l'empreinte du contrat au moment de la signature**.
 *
 * ⚠️ Sans cette empreinte, la première objection est imparable : « le document
 * a changé depuis ». Avec elle, on recompose le contrat à partir du dossier et
 * l'on montre que l'empreinte tombe juste — ou qu'elle ne tombe pas, auquel cas
 * la contestation est fondée et il vaut mieux le savoir.
 *
 * ⚠️ C'est une signature électronique *simple* : recevable, mais contestable.
 * Une signature qualifiée, qui bénéficie d'une présomption de fiabilité,
 * demanderait un tiers de confiance et un abonnement. Pour des montants de
 * quelques centaines d'euros, ce qui suit est proportionné ; pour un contrat
 * qui engagerait bien davantage, il faudrait le tiers.
 */

export interface TermesSignes {
  reference: string;
  nom: string;
  email: string;
  programme: string;
  session: string;
  total: number;
  echeances: { montant: number; dateLimite?: string }[];
  moyen: string;
}

/** Les diacritiques combinantes, à retirer avant de comparer deux saisies. */
const DIACRITIQUES = /[̀-ͯ]/g;

const reduire = (v: string) =>
  v
    .normalize("NFD")
    .replace(DIACRITIQUES, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** L'empreinte des termes contractuels, stable d'un rendu à l'autre. */
export function empreinteDesTermes(t: TermesSignes): string {
  /*
    Les parties sont énumérées à la main, dans un ordre fixe. `JSON.stringify`
    suivrait l'ordre d'insertion de l'objet : une refonte qui déplacerait un
    champ changerait l'empreinte de tous les contrats déjà signés, et les
    ferait tous paraître falsifiés.
  */
  const canonique = [
    t.reference,
    t.nom,
    t.email,
    t.programme,
    t.session,
    String(t.total),
    t.echeances.map((e) => `${e.montant}@${e.dateLimite ?? ""}`).join("|"),
    t.moyen,
  ].join("");

  return createHash("sha256").update(canonique, "utf8").digest("hex");
}

/** La mention que le contrat exige, comparée sans trébucher sur la casse. */
export function mentionValable(saisie: string): boolean {
  return reduire(saisie) === "lu et approuve";
}

/**
 * Le nom saisi doit être celui du dossier.
 *
 * Indulgent sur la casse, les accents et les espaces — quelqu'un qui tape son
 * propre nom en minuscules ne signe pas moins — mais pas sur les mots :
 * « Aurélie AMBENGAT » ne devient pas « A. Ambengat ».
 */
export function memeNom(saisi: string, attendu: string): boolean {
  return reduire(saisi) === reduire(attendu);
}

/**
 * Le tracé est-il une image PNG plausible, et pas trop lourde ?
 *
 * ⚠️ On ne fait pas confiance à ce que dit le formulaire. Le champ est caché,
 * donc rempli par un script chez nous — mais rien n'empêche d'en poster un
 * autre. Un préfixe vérifié et une taille bornée suffisent : le PNG n'est
 * jamais exécuté, seulement redessiné dans le PDF.
 */
export function traceValable(donnees: string): boolean {
  if (!donnees.startsWith("data:image/png;base64,")) return false;
  // Quelques centaines d'octets pour un trait, 300 Ko de marge pour un écran
  // dense et une signature bavarde. Au-delà, ce n'est plus une signature.
  return donnees.length > 200 && donnees.length <= 300_000;
}

/** Ce qu'on garde de la requête, pour le jour où il faudra le produire. */
export function preuve(args: {
  empreinte: string;
  ip: string;
  navigateur: string;
  nom: string;
  quand: string;
  /** L'empreinte du tracé, quand il y en a un. */
  empreinteTrace?: string;
}): string {
  return [
    `Signé le : ${args.quand}`,
    `Signataire : ${args.nom}`,
    "Mention recopiée : « Lu et approuvé »",
    `Adresse IP : ${args.ip}`,
    `Navigateur : ${args.navigateur}`,
    `Empreinte des termes (SHA-256) : ${args.empreinte}`,
    ...(args.empreinteTrace
      ? [`Empreinte du tracé (SHA-256) : ${args.empreinteTrace}`]
      : ["Tracé : aucun"]),
  ].join("\n");
}

/** L'empreinte du tracé, pour qu'il ne puisse pas être remplacé après coup. */
export function empreinteDuTrace(donnees: string): string {
  return createHash("sha256").update(donnees, "utf8").digest("hex");
}
