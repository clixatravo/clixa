/**
 * Noter dans le journal un geste fait depuis la liste.
 *
 * ── ⚠️ Le trou que cette porte ferme ────────────────────────────────────────
 * Les quatre boutons de la fiche notent qui a relancé. Le bouton **WhatsApp**
 * de la liste, lui, était un simple lien : il ouvrait la conversation et
 * n'écrivait rien. Or c'est le chemin qu'on prend réellement pour joindre
 * quelqu'un — le directeur écrivait au client, l'administration lisait « jamais
 * relancé », et écrivait par-dessus. Exactement la plainte du 12 septembre 2026,
 * par la porte qu'on avait oubliée.
 *
 * ⚠️ **La fiche note en enregistrant le document ; la liste ne le peut pas.**
 * Une cellule n'a pas de formulaire à soumettre, et un clic qui doit d'abord
 * enregistrer un document avant d'ouvrir WhatsApp ferait attendre pour rien.
 * D'où cette route : elle écrit pendant que la conversation s'ouvre.
 *
 * ⚠️ **Une session d'équipe, pas seulement une session.** Sans le second
 * contrôle, un participant connecté écrirait dans le journal d'un dossier — le
 * trou d'`export-admissions`, refermé de la même façon.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { libelleDuCompte } from "@/lib/equipe";
import { NextResponse } from "next/server";

/**
 * Deux clics rapprochés sur le même bouton ne font qu'une ligne.
 *
 * ⚠️ On rouvre WhatsApp pour relire ce qu'on a écrit, pour corriger un numéro,
 * parce que l'onglet s'est fermé. Trois lignes identiques à la minute rendraient
 * la colonne illisible et fausseraient le compte d'échanges — que l'équipe lit
 * pour décider s'il faut insister. Dix minutes : la même fenêtre que la garde
 * des demandes de rappel en double, et pour la même raison.
 */
const FENETRE_MINUTES = 10;

/** Ce que la liste peut noter. Rien d'autre : les gestes de la fiche ont leurs portes. */
const GESTES = new Set(["whatsapp"]);

interface Ligne {
  quoi?: string | null;
  le?: string | null;
  par?: unknown;
  parNom?: string | null;
}

export async function POST(requete: Request): Promise<Response> {
  const payload = await getPayload({ config });

  const { user } = await payload.auth({ headers: requete.headers });
  if (!user || user.collection !== "utilisateurs") {
    return NextResponse.json({ erreur: "Réservé à l'équipe." }, { status: 401 });
  }

  let corps: { id?: unknown; quoi?: unknown };
  try {
    corps = (await requete.json()) as { id?: unknown; quoi?: unknown };
  } catch {
    return NextResponse.json({ erreur: "Requête illisible." }, { status: 400 });
  }

  const quoi = String(corps.quoi ?? "");
  if (!GESTES.has(quoi)) {
    return NextResponse.json({ erreur: "Geste inconnu." }, { status: 400 });
  }
  if (corps.id === undefined || corps.id === null) {
    return NextResponse.json({ erreur: "Dossier manquant." }, { status: 400 });
  }

  const dossier = await payload
    .findByID({ collection: "inscriptions", id: String(corps.id), depth: 0, overrideAccess: true })
    .catch(() => null);
  if (!dossier) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }

  const journal = (dossier.echanges ?? []) as Ligne[];
  const limite = Date.now() - FENETRE_MINUTES * 60_000;

  /*
    ⚠️ La fenêtre vaut **par personne**. Si le directeur ouvre WhatsApp et que
    l'administration l'ouvre trois minutes plus tard, ce sont deux gestes bien
    réels — et c'est précisément ce que la colonne existe pour montrer.
  */
  const dejaFait = journal.some((l) => {
    if (l.quoi !== quoi || !l.le) return false;
    const id = l.par && typeof l.par === "object" ? (l.par as { id?: unknown }).id : l.par;
    if (String(id ?? "") !== String(user.id)) return false;
    const quand = new Date(String(l.le)).getTime();
    return Number.isFinite(quand) && quand > limite;
  });

  if (dejaFait) {
    // Pas une erreur : le bouton a fait son travail la première fois.
    return NextResponse.json({ note: false, raison: "déjà noté récemment" });
  }

  /*
    ⚠️ Le tableau part **en entier** : Payload remplace la liste, il ne la
    complète pas. Un chemin pointé y resterait une clef littérale que rien ne
    lirait — le défaut du bouton « Contrat vérifié » du 30 août 2026.
  */
  await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    overrideAccess: true,
    data: {
      echanges: [
        ...journal,
        {
          quoi,
          le: new Date().toISOString(),
          par: user.id,
          // Recopié : la relation n'est lisible que par la direction.
          parNom: libelleDuCompte(user as never),
        },
      ],
    } as never,
  });

  return NextResponse.json({ note: true });
}
