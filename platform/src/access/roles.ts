import type { Access, FieldAccess } from "payload";

/**
 * BE-07 — Rôles et permissions.
 *
 * Trois rôles, définis par ce que chacun a réellement besoin de modifier :
 *
 *   direction   accès complet, y compris les comptes
 *   pedagogie   le catalogue : spécialisations, programmes, sessions
 *   redaction   l'éditorial : articles, témoignages, partenaires, pages
 *
 * Chaque rôle **lit** tout — un rédacteur a besoin de citer une formation dans
 * un article — mais n'**écrit** que dans son domaine. Restreindre la lecture
 * n'apporterait rien et compliquerait les relations entre collections.
 */
type Role = "direction" | "pedagogie" | "redaction";

function roleDe(req: { user?: unknown }): Role | undefined {
  const u = req.user as { role?: Role } | undefined;
  return u?.role;
}

/** Toute personne connectée au back-office. */
export const connecte: Access = ({ req }) => Boolean(req.user);

/** Réservé aux rôles listés. La direction passe partout. */
export const reserveA =
  (...roles: Role[]): Access =>
  ({ req }) => {
    const r = roleDe(req);
    return r === "direction" || (r !== undefined && roles.includes(r));
  };

/**
 * Lecture publique du contenu destiné au site.
 *
 * Sans restriction, l'API REST exposerait aussi les brouillons : une page
 * légale non relue, un article en cours d'écriture. Les visiteurs ne voient que
 * les documents publiés ; les personnes connectées voient tout, ce qui permet
 * la prévisualisation.
 *
 * Le filtre porte sur `_status`, le statut natif des versions de Payload —
 * il a remplacé la case « Publié » que nous gérions à la main : deux mécanismes
 * pour la même chose finissaient toujours par diverger.
 */
export const lecturePubliee: Access = ({ req }) => {
  if (req.user) return true;
  return { _status: { equals: "published" } };
};

/** Contenu sans indicateur de publication : visible de tous. */
export const lectureLibre: Access = () => true;

/**
 * Comptes : seule la direction gère les autres. Chacun peut néanmoins lire et
 * modifier sa propre fiche, sinon personne ne pourrait changer son mot de passe.
 */
export const comptesLecture: Access = ({ req }) => {
  if (!req.user) return false;
  if (roleDe(req) === "direction") return true;
  return { id: { equals: req.user.id } };
};

export const comptesEcriture: Access = ({ req }) => {
  if (!req.user) return false;
  if (roleDe(req) === "direction") return true;
  return { id: { equals: req.user.id } };
};

/**
 * Le rôle lui-même n'est modifiable que par la direction — sans quoi n'importe
 * qui pourrait s'attribuer les pleins pouvoirs en modifiant sa propre fiche.
 */
export const champRole: FieldAccess = ({ req }) => roleDe(req) === "direction";
