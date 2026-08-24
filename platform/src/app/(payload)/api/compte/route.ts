import { redirect } from "next/navigation";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { fermerSession, ouvrirSession } from "@/lib/session-apprenant";

/**
 * BE-19 — Création, connexion et sortie d'un compte participant.
 *
 * Une seule route pour les trois : le formulaire dit lequel par un champ caché.
 * POST puis redirection, sans JavaScript requis, comme le reste du site.
 *
 * ── Ce que la route ne fait jamais ──────────────────────────────────────────
 * Elle ne dit pas si une adresse est connue. « Identifiants incorrects » vaut
 * pour un mot de passe faux comme pour un compte absent : autrement, n'importe
 * qui pourrait savoir qui s'est inscrit chez CLIXA en essayant des adresses.
 */

const LEURRE = "site_web";

export async function POST(request: Request) {
  const form = await request.formData();
  const texte = (cle: string) => (form.get(cle) ?? "").toString().trim();
  const action = texte("action");

  if (action === "sortie") {
    await fermerSession();
    redirect("/" as Route);
  }

  if (texte(LEURRE) !== "") redirect("/compte/connexion" as Route);

  const email = texte("email").toLowerCase();
  const motDePasse = (form.get("motDePasse") ?? "").toString();
  const retour = action === "creation" ? "/compte/creer" : "/compte/connexion";

  if (!email || !motDePasse) redirect(`${retour}?erreur=champs` as Route);

  const payload = await getPayload({ config });

  if (action === "creation") {
    const nom = texte("nom");
    if (!nom) redirect("/compte/creer?erreur=champs" as Route);
    if (motDePasse.length < 8) redirect("/compte/creer?erreur=court" as Route);

    try {
      const compte = await payload.create({
        collection: "apprenants",
        overrideAccess: true,
        data: {
          email,
          password: motDePasse,
          nom,
          ...(texte("telephone") ? { telephone: texte("telephone") } : {}),
          ...(texte("pays") ? { pays: texte("pays") } : {}),
        },
      });

      /*
        Les dossiers déjà déposés avec cette adresse rejoignent le compte. Sans
        cela, quelqu'un qui s'inscrit puis crée un compte trouverait une page
        vide et croirait son inscription perdue.
      */
      const { docs } = await payload.find({
        collection: "inscriptions",
        where: { apprenantEmail: { equals: email } },
        limit: 100,
        depth: 0,
        overrideAccess: true,
      });
      for (const d of docs) {
        await payload.update({
          collection: "inscriptions",
          id: d.id,
          overrideAccess: true,
          data: { apprenant: compte.id },
        });
      }
    } catch (e) {
      // Adresse déjà prise, mot de passe refusé, base indisponible : on ne
      // distingue pas, pour ne rien apprendre à qui essaie des adresses.
      payload.logger.error({ err: e }, "[compte] création impossible");
      redirect("/compte/creer?erreur=impossible" as Route);
    }
  }

  let jeton: string | undefined;
  let expiration: number | undefined;
  try {
    const r = await payload.login({
      collection: "apprenants",
      data: { email, password: motDePasse },
    });
    jeton = r.token;
    expiration = r.exp;
  } catch {
    redirect(`${retour}?erreur=identifiants` as Route);
  }

  if (!jeton) redirect(`${retour}?erreur=identifiants` as Route);

  await ouvrirSession(jeton, expiration);
  redirect("/compte" as Route);
}
