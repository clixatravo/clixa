import type { Route } from "next";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";

/**
 * BE-10 — Prévisualisation des brouillons.
 *
 * Le back-office ouvre cette route ; elle vérifie que la personne est bien
 * connectée à Payload, active le mode brouillon de Next.js, puis renvoie vers
 * la page publique — qui affichera alors la version non publiée.
 *
 * Le contrôle d'identité n'est pas une formalité : sans lui, l'URL suffirait à
 * lire n'importe quel brouillon, y compris une page légale non relue.
 *
 * ⚠️ Et il ne suffit pas de demander « une session » : `apprenants` en est une.
 * La route se contentait de cela, si bien qu'un compte participant — ouvert
 * depuis /compte, ou par Google — lisait tous les brouillons : les quatre pages
 * légales non relues, les témoignages dépubliés, les articles en préparation.
 * Même faute que l'export des admissions, trouvée le même jour en relisant
 * toutes les portes ensemble.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const chemin = params.get("chemin");

  if (!chemin?.startsWith("/")) {
    return new Response("Paramètre « chemin » manquant ou invalide.", { status: 400 });
  }

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });

  if (!user || user.collection !== "utilisateurs") {
    return new Response("Prévisualisation réservée à l'équipe CLIXA.", { status: 401 });
  }

  (await draftMode()).enable();
  // typedRoutes ne peut pas vérifier un chemin construit à l'exécution.
  redirect(chemin as Route);
}
