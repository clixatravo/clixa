/**
 * Ce que Resend dit de chaque courriel, lu depuis /admin.
 *
 * Demandé par la direction le 26 septembre 2026, le jour où la présentation est
 * partie à soixante-huit prospects : « 9ad liya l blan dyal resend l dakhel f
 * site bach nb9aw metb3iin n3arfo nass li wssalhom email ». Pour savoir qui
 * l'avait reçue, il avait fallu retrouver le compte Resend, s'y connecter et
 * exporter un tableur — et le journal de Vercel, qui ne garde que les dernières
 * minutes, avait d'abord fait croire à un seul envoi au lieu de quatre.
 *
 * Ce fichier est **pur**, et il n'importe rien de Node : la colonne « État » de
 * /admin le lit dans le navigateur. La signature des appels vit dans
 * `lib/signature-resend.ts`, l'écriture en base dans `lib/courriels-envoyes.ts`.
 */
/**
 * Les états d'un courriel, du moins avancé au plus définitif.
 *
 * ⚠️ **Le rang décide, pas l'ordre d'arrivée.** Resend envoie un appel par
 * événement, et rien ne garantit qu'ils arrivent dans l'ordre : un « retardé »
 * peut se présenter après le « remis » qui l'a suivi. Écrire le dernier arrivé
 * ferait lire « retardé » sur un message déjà dans la boîte. Un état ne cède
 * donc qu'à un état de rang égal ou supérieur.
 *
 * ⚠️ **« Remis » ne veut pas dire « lu », ni « dans la boîte principale ».** Il
 * veut dire que le serveur d'en face a accepté le message. Un dossier
 * « indésirables » compte comme remis — aucun outil ne voit au-delà.
 */
export const STATUTS_COURRIEL = [
  { valeur: "envoye", libelle: "Parti — en attente de nouvelles", rang: 1 },
  { valeur: "differe", libelle: "Retardé — Resend réessaie", rang: 2 },
  { valeur: "delivre", libelle: "Remis", rang: 3 },
  { valeur: "rejete", libelle: "Rejeté — adresse invalide ou refusée", rang: 4 },
  { valeur: "bloque", libelle: "Bloqué — adresse déjà rejetée auparavant", rang: 4 },
  { valeur: "echec", libelle: "Non parti — erreur d'envoi", rang: 4 },
  /*
    Le plus haut rang : un signalement pèse sur la réputation de
    `envoi.clixa.africa`, donc sur tout le tunnel. Il ne doit jamais être
    recouvert par un « remis » arrivé en retard.
  */
  { valeur: "plainte", libelle: "Signalé comme indésirable", rang: 5 },
] as const;

export type StatutCourriel = (typeof STATUTS_COURRIEL)[number]["valeur"];

export const OPTIONS_STATUT_COURRIEL = STATUTS_COURRIEL.map((s) => ({
  label: s.libelle,
  value: s.valeur,
}));

/**
 * Les événements de Resend qui changent l'état.
 *
 * ⚠️ `email.opened` et `email.clicked` n'y sont pas : ils ne disent rien de la
 * remise, et ne partent que si le suivi d'ouverture est activé — ce qui n'est
 * pas le cas. S'ils arrivent un jour, ils sont notés au journal du courriel
 * sans toucher à l'état.
 */
const EVENEMENTS: Record<string, StatutCourriel> = {
  "email.sent": "envoye",
  "email.delivery_delayed": "differe",
  "email.delivered": "delivre",
  "email.bounced": "rejete",
  "email.suppressed": "bloque",
  "email.failed": "echec",
  "email.complained": "plainte",
};

/** L'état qu'annonce un événement de Resend, ou `undefined` s'il n'en change aucun. */
export function statutDeLEvenement(type: string): StatutCourriel | undefined {
  return EVENEMENTS[type];
}

function rang(statut: string | null | undefined): number {
  return STATUTS_COURRIEL.find((s) => s.valeur === statut)?.rang ?? 0;
}

/** L'état après un événement : il ne recule jamais. */
export function statutApres(
  actuel: string | null | undefined,
  nouveau: StatutCourriel | undefined,
): StatutCourriel | undefined {
  if (!nouveau) return (actuel as StatutCourriel | null | undefined) ?? undefined;
  return rang(nouveau) >= rang(actuel) ? nouveau : (actuel as StatutCourriel);
}

export function libelleStatutCourriel(valeur?: string | null): string {
  if (!valeur) return "—";
  return STATUTS_COURRIEL.find((s) => s.valeur === valeur)?.libelle ?? String(valeur);
}

/** L'adresse nue, en minuscules — `Nom <a@b.c>` compris. */
export function adresseNue(to: string): string {
  const m = to.match(/<([^>]+)>/);
  return (m ? m[1]! : to).trim().toLowerCase();
}

/**
 * Ce qu'est un courriel — pour que les envois décidés un matin ne se mêlent
 * pas au flux du tunnel.
 *
 * Demandé par la direction le 26 septembre 2026 : savoir, **séparément**, qui a
 * reçu la présentation et qui a reçu l'annonce de démarrage (« kola wehdin
 * dirhom bohdhom bach i b9aw far9iin »). Les deux partent d'un bouton, à des
 * dizaines de personnes d'un coup ; le reste — confirmation, contrat,
 * certificat — suit un geste d'une seule personne.
 *
 * ⚠️ **La nature est posée au départ, jamais devinée depuis l'objet.** L'objet
 * de la présentation change avec le parcours mis en avant ; un filtre sur le
 * texte perdrait les envois du mois suivant sans que rien ne le dise.
 */
export const NATURES_COURRIEL = [
  { valeur: "presentation", libelle: "Présentation de l'institut" },
  { valeur: "demarrage", libelle: "Annonce de démarrage" },
  { valeur: "dossier", libelle: "Suivi de dossier" },
] as const;

export type NatureCourriel = (typeof NATURES_COURRIEL)[number]["valeur"];

export const OPTIONS_NATURE_COURRIEL = NATURES_COURRIEL.map((n) => ({
  label: n.libelle,
  value: n.valeur,
}));

/**
 * Les états, rangés en trois questions — celles que pose l'équipe devant un
 * envoi : qui l'a eu, qui attend encore, qui ne l'aura jamais.
 *
 * ⚠️ Chaque état est dans **un seul** groupe, et tous y sont. Un état oublié
 * sortirait des trois compteurs sans que le total le montre ; la garde vérifie
 * la partition.
 */
export const GROUPES_ETAT = {
  remis: ["delivre"],
  enCours: ["envoye", "differe"],
  perdus: ["rejete", "bloque", "echec", "plainte"],
} as const satisfies Record<string, readonly StatutCourriel[]>;

export type GroupeEtat = keyof typeof GROUPES_ETAT;

export interface SuiviDUneNature {
  remis: number;
  enCours: number;
  perdus: number;
}

/**
 * L'adresse de la liste « Courriels envoyés », filtrée sur une nature et, au
 * besoin, sur un groupe d'états.
 *
 * ⚠️ **Un filtre d'URL faux ne casse rien** : Payload rend la liste entière,
 * sans erreur. `verifier-webhook-resend.ts` tire donc ce filtre pour de vrai,
 * contre des lignes qu'il fabrique, avec un témoin qu'il ne doit pas ramasser.
 */
export function lienDesCourriels(nature: NatureCourriel, groupe?: GroupeEtat): string {
  const parties = [`where[nature][equals]=${nature}`];
  if (groupe) {
    GROUPES_ETAT[groupe].forEach((s, i) => parties.push(`where[statut][in][${i}]=${s}`));
  }
  return `/admin/collections/courriels?${parties.join("&")}`;
}
