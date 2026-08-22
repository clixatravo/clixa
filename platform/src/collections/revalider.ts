import { revalidatePath } from "next/cache";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from "payload";

/**
 * INT-02 — Rafraîchir les pages quand le contenu change.
 *
 * Les fiches formation et le catalogue sont pré-générés au build. Sans ces
 * crochets, une session ajoutée depuis /admin n'apparaissait qu'au
 * déploiement suivant : l'équipe enregistrait, regardait le site, et n'y voyait
 * rien. La plateforme promet le contraire.
 *
 * ── Pourquoi un try/catch ───────────────────────────────────────────────────
 * `revalidatePath` a besoin du contexte de requête de Next. Les crochets
 * tournent aussi sous `payload run`, hors de Next : l'appel y échoue. Ce n'est
 * pas un incident — un script agit sur la base, pas sur un serveur en train de
 * servir des pages. On le signale sans faire échouer l'écriture : refuser
 * d'enregistrer une session parce qu'on n'a pas pu vider un cache serait pire
 * que le cache périmé.
 */
function rafraichir(chemins: string[], quoi: string): void {
  for (const chemin of chemins) {
    try {
      revalidatePath(chemin);
    } catch {
      // Hors contexte Next (script en ligne de commande) : rien à rafraîchir.
      return;
    }
  }
  console.log(`[revalidation] ${quoi} → ${chemins.join(", ")}`);
}

/** Rend le slug d'une relation, qu'elle soit peuplée ou réduite à un identifiant. */
function slugDe(relation: unknown): string | undefined {
  if (relation && typeof relation === "object" && "slug" in relation) {
    const s = (relation as { slug?: unknown }).slug;
    if (typeof s === "string") return s;
  }
  return undefined;
}

/* ── Le catalogue ─────────────────────────────────────────────────────── */

/**
 * Une formation touche sa fiche, le catalogue, l'accueil — qui montre l'agenda —
 * et le plan du site, dont la liste d'adresses change avec elle.
 */
export const revaliderProgramme: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  const chemins = new Set(["/", "/formations", "/sitemap.xml"]);
  for (const d of [doc, previousDoc]) {
    if (d?.slug) chemins.add(`/formations/${d.slug}`);
    const spec = slugDe(d?.specialisation);
    if (spec) chemins.add(`/specialisations/${spec}`);
  }
  rafraichir([...chemins], `formation « ${doc?.titre ?? "?"} »`);
  return doc;
};

export const revaliderProgrammeSupprime: CollectionAfterDeleteHook = ({ doc }) => {
  const chemins = ["/", "/formations", "/sitemap.xml"];
  if (doc?.slug) chemins.push(`/formations/${doc.slug}`);
  rafraichir(chemins, `formation retirée « ${doc?.titre ?? "?"} »`);
  return doc;
};

/**
 * Une session change les dates et le décompte de places montrés sur la fiche du
 * parcours, dans le catalogue et dans l'agenda de l'accueil.
 */
export const revaliderSession: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  const chemins = new Set(["/", "/formations"]);
  for (const d of [doc, previousDoc]) {
    const slug = slugDe(d?.programme);
    if (slug) chemins.add(`/formations/${slug}`);
  }
  rafraichir([...chemins], "session");
  return doc;
};

export const revaliderSessionSupprimee: CollectionAfterDeleteHook = ({ doc }) => {
  const chemins = new Set(["/", "/formations"]);
  const slug = slugDe(doc?.programme);
  if (slug) chemins.add(`/formations/${slug}`);
  rafraichir([...chemins], "session retirée");
  return doc;
};

/** Une spécialisation apparaît dans les filtres, donc partout dans le catalogue. */
export const revaliderSpecialisation: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  const chemins = new Set(["/", "/formations", "/sitemap.xml"]);
  for (const d of [doc, previousDoc]) {
    if (d?.slug) chemins.add(`/specialisations/${d.slug}`);
  }
  rafraichir([...chemins], `spécialisation « ${doc?.nom ?? "?"} »`);
  return doc;
};

/* ── L'éditorial ──────────────────────────────────────────────────────── */

export const revaliderArticle: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  const chemins = new Set(["/", "/blog", "/sitemap.xml"]);
  for (const d of [doc, previousDoc]) {
    if (d?.slug) chemins.add(`/blog/${d.slug}`);
  }
  rafraichir([...chemins], `article « ${doc?.titre ?? "?"} »`);
  return doc;
};

/* ── Le barème ────────────────────────────────────────────────────────── */

/**
 * Le tarif est le même pour tout le catalogue : le changer touche les douze
 * fiches, le catalogue et le formulaire, qui répète les montants dans sa liste.
 */
export const revaliderTarifs: GlobalAfterChangeHook = async ({ doc, req }) => {
  const chemins = new Set(["/", "/formations", "/contact"]);
  const { docs } = await req.payload.find({
    collection: "programmes",
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  for (const p of docs) if (p.slug) chemins.add(`/formations/${p.slug}`);
  rafraichir([...chemins], "barème");
  return doc;
};
