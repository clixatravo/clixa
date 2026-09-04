import { LONGUEURS, emailPlausible, tientDans } from "@/lib/saisie";
import { appelant, cadenceOk, tropVite } from "@/lib/cadence";
import { redirect } from "next/navigation";
import { aUnIndicatif, paysDeLIndicatif } from "@/lib/indicatifs";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { courrielRappel } from "@/lib/courriel";

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
  /*
    Une demande de rappel part vers une boîte que l'équipe relève à la main :
    la noyer sous un millier de messages la rend inutilisable.
  */
  if (!cadenceOk("rappel", appelant(request), 10, 60_000)) {
    return tropVite(60);
  }

  const form = await request.formData();
  const texte = (cle: string) => (form.get(cle) ?? "").toString().trim();

  // Robot : on répond comme si tout allait bien, sans rien enregistrer.
  if (texte(LEURRE) !== "") {
    redirect("/contact?envoye=1" as Route);
  }

  const nom = texte("nom");
  const email = texte("email");
  const whatsapp = texte("whatsapp");

  if (!nom || !whatsapp) {
    redirect("/contact?erreur=champs" as Route);
  }

  /*
    Sans indicatif, le numéro ne désigne personne hors de son pays : le bouton
    WhatsApp du back-office refuse de composer, et le conseiller ne peut pas
    rappeler. On refuse ici plutôt que d'enregistrer une demande qu'on ne
    saurait pas honorer.
  */
  if (!aUnIndicatif(whatsapp)) {
    redirect("/contact?erreur=indicatif" as Route);
  }

  // Mêmes bornes qu'à l'inscription : ces valeurs partent dans un courriel que
  // l'équipe relève à la main, et dans une fiche qu'elle ouvre.
  if (
    !tientDans(nom, LONGUEURS.nom) ||
    !tientDans(whatsapp, LONGUEURS.telephone) ||
    !tientDans(texte("message"), LONGUEURS.message) ||
    // L'adresse est facultative ; donnée, elle doit tout de même tenir debout.
    (email !== "" && !emailPlausible(email))
  ) {
    redirect("/contact?erreur=champs" as Route);
  }

  /*
    ── Le pays vient du numéro, plus du formulaire ───────────────────────────
    Le champ « Pays » a été retiré : deux saisies pour un même fait laissaient
    écrire « Maroc » sous un numéro ivoirien, et le conseiller découvrait
    l'écart en composant. L'indicatif est de toute façon obligatoire — sans
    lui, le bouton WhatsApp du back-office refuse de composer.
  */
  /*
    ⚠️ Vérifié après les champs, et non avant — dans les deux routes, au même
    endroit. Quelqu'un qui se trompe de numéro *et* oublie la case doit lire
    d'abord ce qu'il doit corriger dans le formulaire ; la case, elle, se coche
    d'un clic. Placé en tête, le consentement masquait l'erreur d'indicatif.

    ⚠️ Et il se vérifie ici, pas dans la case : `required` n'engage que le
    navigateur, se retire depuis les outils de développement, et n'existe pas
    pour qui poste directement sur cette route. Une preuve de consentement qui
    tient à un attribut HTML ne prouve rien le jour où on la conteste.
  */
  if (texte("consentement") !== "oui") {
    redirect("/contact?erreur=consentement" as Route);
  }

  const pays = paysDeLIndicatif(whatsapp);

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
        ...(email ? { email } : {}),
        whatsapp,
        pays,
        programme,
        // Seuls les trois codes du barème sont acceptés : un champ de
        // formulaire est de la saisie visiteur, pas une valeur de confiance.
        planPaiement: (["P1", "P2", "P3"] as const).find((c) => c === texte("plan")),
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
  /*
    L'équipe est prévenue. Sans cela, une demande dormait dans le back-office
    jusqu'à ce que quelqu'un pense à regarder.
  */
  await courrielRappel(payload, {
    nom,
    email,
    whatsapp,
    pays,
    ...(texte("programme") ? { programme: texte("programme") } : {}),
    ...(texte("plan") ? { plan: texte("plan") } : {}),
  });

  // La notification interne (e-mail, WhatsApp) arrive avec la phase 02, quand
  // les comptes Resend et WhatsApp Business seront ouverts. La demande est déjà
  // en base et visible dans le back-office : rien n'est perdu d'ici là.

  redirect("/contact?envoye=1" as Route);
}
