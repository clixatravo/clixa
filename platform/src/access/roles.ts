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

/**
 * Membre du personnel, par opposition à un participant.
 *
 * La distinction n'existait pas tant qu'une seule collection portait
 * l'authentification : « connecté » voulait dire « du back-office ». L'arrivée
 * des comptes participants (BE-18) a rendu ce raccourci faux — un participant
 * est authentifié lui aussi, et passait alors toutes les portes ouvertes aux
 * seuls membres du personnel.
 *
 * Tout ce qui protège le back-office passe donc par ici, et par la collection
 * du jeton — jamais par la simple présence d'un utilisateur.
 */
function estPersonnel(req: { user?: unknown }): boolean {
  const u = req.user as { collection?: string } | undefined;
  return u?.collection === "utilisateurs";
}

function roleDe(req: { user?: unknown }): Role | undefined {
  if (!estPersonnel(req)) return undefined;
  const u = req.user as { role?: Role } | undefined;
  return u?.role;
}

/** Toute personne connectée **au back-office**. Un participant n'en est pas. */
export const connecte: Access = ({ req }) => estPersonnel(req);

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
  // Seul le personnel voit les brouillons. Un participant connecté reste un
  // visiteur du site : lui montrer un article en cours d'écriture serait une
  // fuite, pas une prévisualisation.
  if (estPersonnel(req)) return true;
  return { _status: { equals: "published" } };
};

/** Contenu sans indicateur de publication : visible de tous. */
export const lectureLibre: Access = () => true;

/**
 * Comptes : seule la direction gère les autres. Chacun peut néanmoins lire et
 * modifier sa propre fiche, sinon personne ne pourrait changer son mot de passe.
 */
export const comptesLecture: Access = ({ req }) => {
  /*
    La vérification du personnel vient d'abord, et pas seulement par principe :
    les identifiants sont numériques et propres à chaque table. Sans elle, un
    participant portant l'identifiant 1 aurait obtenu le filtre
    « id égal à 1 » — appliqué, lui, à la table du personnel.
  */
  if (!estPersonnel(req) || !req.user) return false;
  if (roleDe(req) === "direction") return true;
  return { id: { equals: req.user.id } };
};

export const comptesEcriture: Access = ({ req }) => {
  if (!estPersonnel(req) || !req.user) return false;
  if (roleDe(req) === "direction") return true;
  return { id: { equals: req.user.id } };
};

/**
 * Le rôle lui-même n'est modifiable que par la direction — sans quoi n'importe
 * qui pourrait s'attribuer les pleins pouvoirs en modifiant sa propre fiche.
 */
export const champRole: FieldAccess = ({ req }) => roleDe(req) === "direction";

/**
 * Champ que l'API ne rend qu'à l'équipe.
 *
 * ⚠️ `admin.hidden` n'est pas un contrôle d'accès. Il retire le champ du
 * formulaire de /admin, et rien de plus : l'API REST continue de le servir, à
 * n'importe qui. Éprouvé en remplissant les coordonnées du bénéficiaire, puis
 * en tirant `/api/globals/tarifs` sans la moindre session — le RIB sortait.
 *
 * Cacher une case pour qu'on ne la remplisse pas est une bonne intention ;
 * elle ne tient pas devant un script, une reprise en base, ou le jour où
 * quelqu'un retire `hidden` en croyant rouvrir un réglage inoffensif.
 */
export const champPersonnel: FieldAccess = ({ req }) => estPersonnel(req);
