/**
 * Qui a fait le geste — nommé, et lisible par toute l'équipe.
 *
 * ── ⚠️ Pourquoi un nom recopié à côté de la relation ────────────────────────
 * `echanges.par` est une **relation** vers `utilisateurs`, et le champ portait
 * cette note : « une relation, pas un nom recopié — deux écritures du même fait
 * divergent, et le jour où quelqu'un change de nom, un instantané de texte
 * désignerait une personne qui n'existe plus sous ce nom-là ». Le raisonnement
 * était juste, et il lui manquait un fait.
 *
 * ⚠️ **`comptesLecture` ne laisse lire que son propre compte.** Seule la
 * direction voit la liste du personnel ; pour tout autre membre, la relation ne
 * se résout pas — l'écran affichait donc « un collègue » à l'administration,
 * c'est-à-dire précisément à qui la question se pose. La direction l'a signalé
 * le 12 septembre 2026 : « fach wahed mna idwi m3a dak clien, tla3 relance par
 * Mounir » — sans quoi le directeur parle à quelqu'un, l'administration ne le
 * sait pas, et reprend la conversation sur un autre WhatsApp.
 *
 * On garde donc **les deux** : la relation reste la référence — c'est elle qui
 * survit à un renommage et qui permettrait un filtre — et le nom est un
 * instantané, figé au moment du geste. C'est la forme habituelle d'un journal :
 * il enregistre ce qui s'est passé, y compris qui, tel qu'on le connaissait
 * alors. Un compte supprimé laisse la ligne entière lisible.
 *
 * ⚠️ **Les deux ne se contredisent pas parce qu'aucune ne corrige l'autre** :
 * `par` répond à « quel compte », `parNom` à « comment on l'appelait ». Elles
 * divergeraient si l'écran lisait tantôt l'une tantôt l'autre pour la même
 * question — d'où `nomDeLAuteur`, seul endroit qui tranche.
 */

/** Ce qu'un compte d'équipe porte de nommable. */
export interface CompteNommable {
  nom?: string | null;
  email?: string | null;
  role?: string | null;
}

const ROLES: Record<string, string> = {
  direction: "Direction",
  pedagogie: "Pédagogie",
  redaction: "Rédaction",
};

/**
 * Comment nommer un compte, au moment où il agit.
 *
 * ⚠️ **Le repli descend, il n'invente pas.** Un compte sans nom porte au moins
 * un rôle, et à défaut une adresse — dont on ne garde que ce qui précède
 * l'arobase : « mounir », pas « mounir@clixa.africa ». Une adresse entière dans
 * une colonne de liste la fait déborder, et le domaine n'apprend rien.
 */
export function libelleDuCompte(compte: CompteNommable | null | undefined): string {
  if (!compte) return "";
  const nom = typeof compte.nom === "string" ? compte.nom.trim() : "";
  if (nom) return nom;

  const role = typeof compte.role === "string" ? ROLES[compte.role] : undefined;
  if (role) return role;

  const email = typeof compte.email === "string" ? compte.email.trim() : "";
  return email ? (email.split("@")[0] ?? email) : "";
}

/** Une ligne de journal, telle qu'elle arrive de la base ou du formulaire. */
export interface LigneSignee {
  parNom?: string | null;
  par?:
    number | string | { id?: number | string; nom?: string | null; email?: string | null } | null;
}

/**
 * Qui a fait ce geste — la phrase que l'écran affiche.
 *
 * Rend `""` quand il n'y a personne à nommer : c'est la tâche de 8 h, et
 * l'appelant écrit alors « automatique ». Le distinguer compte — un courriel
 * parti tout seul et un collègue qui a décroché n'appellent pas la même suite.
 */
export function nomDeLAuteur(ligne: LigneSignee | null | undefined): string {
  if (!ligne) return "";

  const fige = typeof ligne.parNom === "string" ? ligne.parNom.trim() : "";
  if (fige) return fige;

  /*
    Pas d'instantané : la ligne est antérieure au 12 septembre 2026, ou elle
    vient d'une écriture qui ne l'a pas posé. Si la relation a pu être résolue —
    ce qui n'arrive que pour la direction — on s'en sert ; sinon on ne sait pas.
  */
  const par = ligne.par;
  if (par && typeof par === "object") return libelleDuCompte(par);
  return "";
}
