import { appelant, cadenceOk, tropVite } from "@/lib/cadence";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { envoyerConfirmation } from "@/lib/courriel";
import { emailPlausible } from "@/lib/saisie";

/**
 * Renvoyer le lien de confirmation.
 *
 * ── Pourquoi cette route est nécessaire, et pas confortable ─────────────────
 * Le compte se crée même si le courriel ne part pas : c'est ce qui empêche un
 * expéditeur en panne de fermer l'inscription. Mais sans moyen de redemander le
 * lien, la personne se retrouve enfermée dehors — son adresse est prise, donc
 * elle ne peut pas recommencer, et son compte ne s'ouvre pas.
 *
 * ── Ce qu'elle ne dit à personne ────────────────────────────────────────────
 * Elle répond la même chose que l'adresse existe ou non, qu'elle soit déjà
 * confirmée ou non. Distinguer apprendrait à qui essaie quelles adresses ont un
 * compte — exactement ce que la page de connexion refuse de dire.
 *
 * ⚠️ Le jeton n'est pas régénéré. Celui de la base reste valable, et en changer
 * invaliderait le premier message si les deux finissaient par arriver.
 */

const LEURRE = "site_web";

export async function POST(request: Request) {
  /*
    Plus serré qu'ailleurs : cette route envoie un courriel à chaque appel
    honoré. Dix par minute laissent quelqu'un réessayer sans permettre d'en
    faire une machine à expédier.
  */
  if (!cadenceOk("confirmation", appelant(request), 10, 60_000)) return tropVite(60);

  const form = await request.formData();
  const texte = (cle: string) => (form.get(cle) ?? "").toString().trim();

  const retour = "/compte/creer?renvoye=1";
  if (texte(LEURRE) !== "") redirect(retour as Route);

  const email = texte("email").toLowerCase();
  if (!emailPlausible(email)) redirect("/compte/creer?erreur=champs" as Route);

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "apprenants",
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    showHiddenFields: true,
    overrideAccess: true,
  });

  const compte = docs[0] as
    | { id: number | string; nom?: string; _verified?: boolean; _verificationToken?: string }
    | undefined;

  /*
    Un compte déjà confirmé n'a pas de lien à recevoir, et une adresse inconnue
    n'a pas de compte. Dans les deux cas on ne fait rien — et on répond comme si
    on avait fait quelque chose.
  */
  if (compte && !compte._verified && compte._verificationToken) {
    await envoyerConfirmation(payload, email, {
      nom: compte.nom ?? "",
      token: compte._verificationToken,
    });
  }

  redirect(retour as Route);
}
