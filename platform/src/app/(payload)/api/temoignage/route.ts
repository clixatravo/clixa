import { appelant, cadenceOk, tropVite } from "@/lib/cadence";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { COHORTES, validerTemoignage } from "@/lib/temoignages";
import { courrielTemoignageRecu } from "@/lib/courriel";

/**
 * Recevoir un témoignage d'ancien participant.
 *
 * ── Dans cet ordre ──────────────────────────────────────────────────────────
 * 1. La cadence et le leurre : une boucle ou un robot s'arrêtent là.
 * 2. Les champs, par `validerTemoignage` — la règle que la page affiche.
 * 3. La formation, cherchée parmi les parcours **publiés** : un slug inventé
 *    ne rattache rien.
 * 4. Le brouillon, puis le courriel à l'équipe. Le brouillon d'abord : un
 *    service de courriel indisponible ne doit jamais faire perdre un
 *    témoignage.
 *
 * ⚠️ **Toujours en brouillon.** La collection est en lecture publique pour ce
 * qui est publié ; un dépôt publié d'office paraîtrait sur l'accueil et sur la
 * fiche du parcours sans que personne l'ait lu. `draft: true` et
 * `_status: "draft"` vont ensemble — l'un sans l'autre, Payload écrit une
 * version publiée.
 *
 * ── Un doublon ne crée pas de second brouillon ──────────────────────────────
 * Le formulaire est natif : rien ne bouge pendant l'aller-retour, et l'on
 * reclique. Le même nom avec le même texte, encore en brouillon et de moins de
 * dix minutes, suffit : on répond « reçu » — c'est vrai — sans seconde ligne
 * ni second courriel.
 */

const LEURRE = "site_web";
const PAGE = "/laisser-un-temoignage";

export async function POST(request: Request) {
  if (!cadenceOk("temoignage", appelant(request), 10, 60_000)) return tropVite(60);

  const form = await request.formData();
  const texte = (cle: string) => (form.get(cle) ?? "").toString().trim();
  const echec = (erreur: string): never => redirect(`${PAGE}?erreur=${erreur}#formulaire` as Route);

  if (texte(LEURRE) !== "") redirect(`${PAGE}?envoye=1` as Route);

  const saisie = {
    nom: texte("nom"),
    fonction: texte("fonction"),
    cohorte: texte("cohorte"),
    formation: texte("formation"),
    texte: texte("texte").replace(/\r\n/g, "\n"),
    consentement: texte("consentement"),
  };

  const verdict = validerTemoignage(saisie);
  if (!verdict.ok) echec(verdict.erreur);
  if (!verdict.ok) return; // pour le typage : `echec` a déjà redirigé

  const payload = await getPayload({ config });

  const { docs: programmes } = await payload.find({
    collection: "programmes",
    where: {
      and: [{ slug: { equals: saisie.formation } }, { _status: { equals: "published" } }],
    },
    limit: 1,
    depth: 0,
    locale: "fr",
    overrideAccess: true,
  });
  const programme = programmes[0];
  if (!programme) echec("formation");
  if (!programme) return;

  const dixMinutes = new Date(Date.now() - 10 * 60_000).toISOString();
  const { totalDocs: dejaLa } = await payload.count({
    collection: "temoignages",
    where: {
      and: [
        { auteur: { equals: saisie.nom } },
        { texte: { equals: saisie.texte } },
        { createdAt: { greater_than: dixMinutes } },
      ],
    },
    locale: "fr",
    overrideAccess: true,
  });
  if (dejaLa > 0) redirect(`${PAGE}?envoye=1` as Route);

  let id: number | string;
  try {
    const cree = await payload.create({
      collection: "temoignages",
      draft: true,
      locale: "fr",
      overrideAccess: true,
      data: {
        _status: "draft",
        auteur: saisie.nom,
        fonction: saisie.fonction,
        texte: saisie.texte,
        programme: programme.id,
        cohorte: verdict.cohorte,
        consentementLe: new Date().toISOString(),
      },
    });
    id = cree.id;
  } catch (e) {
    payload.logger.error({ err: e }, "[témoignage] enregistrement impossible");
    echec("technique");
    return;
  }

  await courrielTemoignageRecu(payload, {
    id,
    nom: saisie.nom,
    fonction: saisie.fonction,
    cohorte: COHORTES.find((c) => c.valeur === verdict.cohorte)?.libelle ?? verdict.cohorte,
    formation: String(programme.titre ?? saisie.formation),
    texte: saisie.texte,
  });

  redirect(`${PAGE}?envoye=1` as Route);
}
