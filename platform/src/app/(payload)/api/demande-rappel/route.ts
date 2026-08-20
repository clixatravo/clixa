import { redirect } from "next/navigation";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";

/**
 * BE-12 — Réception du formulaire de rappel.
 *
 * Route en POST plutôt qu'action serveur : le formulaire fonctionne alors sans
 * JavaScript, ce qui compte sur les connexions où le script met du temps à
 * s'exécuter — celles-là mêmes où l'on ne peut pas se permettre de perdre un
 * prospect.
 *
 * Suit le motif POST → redirection : recharger la page de confirmation ne
 * renvoie pas une seconde demande.
 */

/** Champ leurre : invisible pour un humain, rempli par la plupart des robots. */
const LEURRE = "site_web";

export async function POST(request: Request) {
  const form = await request.formData();
  const texte = (cle: string) => (form.get(cle) ?? "").toString().trim();

  // Robot : on répond comme si tout allait bien, sans rien enregistrer.
  if (texte(LEURRE) !== "") {
    redirect("/contact?envoye=1" as Route);
  }

  const nom = texte("nom");
  const email = texte("email");
  const whatsapp = texte("whatsapp");
  const pays = texte("pays");

  if (!nom || !email || !whatsapp || !pays) {
    redirect("/contact?erreur=champs" as Route);
  }

  const payload = await getPayload({ config });

  /**
   * Le formulaire envoie le slug — la seule référence stable entre le site et
   * la base. On le résout ici plutôt que d'exposer des identifiants internes
   * dans le HTML public.
   */
  const slug = texte("programme");
  let programme: number | undefined;
  if (slug) {
    const { docs } = await payload.find({
      collection: "programmes",
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const trouve = docs[0];
    if (trouve && typeof trouve.id === "number") programme = trouve.id;
  }

  try {
    await payload.create({
      collection: "demandes-rappel",
      overrideAccess: true,
      data: {
        nom,
        email,
        whatsapp,
        pays,
        programme,
        message: texte("message") || undefined,
        origine: texte("origine") || "/contact",
        statut: "nouvelle",
      },
    });
  } catch (e) {
    // La demande n'a pas pu être enregistrée : on le dit, plutôt que d'afficher
    // une confirmation mensongère à quelqu'un dont personne ne rappellera.
    console.error("[demande-rappel] échec de l'enregistrement :", e);
    redirect("/contact?erreur=technique" as Route);
  }

  // La notification interne (e-mail, WhatsApp) arrive avec la phase 02, quand
  // les comptes Resend et WhatsApp Business seront ouverts. La demande est déjà
  // en base et visible dans le back-office : rien n'est perdu d'ici là.

  redirect("/contact?envoye=1" as Route);
}
