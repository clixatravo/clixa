import { appelant, cadenceOk, tropVite } from "@/lib/cadence";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { courrielRappel } from "@/lib/courriel";

/**
 * Demander à être rappelé — depuis son dossier, et de nulle part ailleurs.
 *
 * ── ⚠️ Ce que cette route était, et pourquoi elle a changé ──────────────────
 * Elle recevait le formulaire public de `/contact` : un nom, un numéro, et un
 * conseiller rappelait. Décision de la direction le 18 septembre 2026 — « khass
 * l wahed darori i diir inscription 3ad tla9 lih dommand de rappel ».
 *
 * **Mesuré avant de la refermer**, sur la production du même jour :
 *
 * - **36 demandes en treize jours**, et **les 36 encore au statut
 *   « nouvelle »** — pas une n'avait été traitée. Ce n'était pas une file
 *   d'attente, c'était un tiroir ;
 * - **4 sur 36** ont fini par s'inscrire. Les 32 autres ont coûté un courriel à
 *   l'équipe et un appel à passer, pour une conversation qui n'allait nulle
 *   part.
 *
 * C'est le raisonnement qui avait déjà vidé la fenêtre de rappel de son
 * formulaire le 6 septembre 2026 — « on offre de parler, on ne le réclame
 * pas » — poussé jusqu'au bout : **le geste le plus facile à obtenir n'est pas
 * celui qu'on cherche.** Une pré-inscription n'engage à rien et donne à
 * l'équipe un dossier, un parcours, une formule et désormais un poste. Un
 * numéro seul ne donne rien.
 *
 * ── Ce qu'elle fait maintenant ──────────────────────────────────────────────
 * Elle prend **une référence de dossier**, et rien d'autre. Le nom, le numéro,
 * l'adresse et le parcours viennent du dossier lui-même.
 *
 * ⚠️ **Plus un seul champ de saisie ne traverse cette route.** Ce n'est pas un
 * raccourci : c'était la moitié de son code — bornes, indicatif, adresse
 * plausible, pays déduit du numéro, consentement. Ces contrôles existaient
 * parce qu'un inconnu tapait ; ici la donnée a déjà été vérifiée à
 * l'inscription, et la recopier depuis un formulaire serait rouvrir la porte
 * qu'on vient de fermer — quelqu'un pourrait poster une référence avec **son**
 * numéro à lui.
 */
export async function POST(request: Request) {
  /*
    Le frein reste, et garde autre chose qu'avant. Il ne protège plus une boîte
    aux lettres d'un afflux d'inconnus — il empêche une boucle de fabriquer mille
    demandes sur un dossier dont on connaît la référence.
  */
  if (!cadenceOk("rappel", appelant(request), 10, 60_000)) {
    return tropVite(60);
  }

  const form = await request.formData();
  const reference = (form.get("reference") ?? "").toString().trim().toUpperCase();

  if (!reference) redirect("/" as Route);

  const dossier = `/inscription/${encodeURIComponent(reference)}` as Route;

  const payload = await getPayload({ config });

  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { reference: { equals: reference } },
    limit: 1,
    /*
      ⚠️ **Deux niveaux, pas un.** À `depth: 1` la session est résolue mais son
      parcours reste un identifiant : le courriel de l'équipe serait parti sans
      nom de formation, en silence, et le conseiller aurait appelé sans savoir
      de quoi on va lui parler.
    */
    depth: 2,
    overrideAccess: true,
  });
  const doc = docs[0];

  /*
    ⚠️ **Une référence inconnue répond comme une page inconnue**, pas comme un
    refus. Distinguer les deux apprendrait à qui essaie des références
    lesquelles existent — c'est la règle que `/verifier` applique déjà aux codes
    de certificat, et la référence ouvre bien davantage : nom, adresse,
    téléphone, échéancier.
  */
  if (!doc) redirect(dossier);

  /*
    ── ⚠️ Une demande en attente suffit ───────────────────────────────────────
    L'ancienne route écartait les doublons sur une fenêtre de dix minutes, faute
    de mieux : elle ne savait pas *qui* redemandait. Ici on le sait, et la bonne
    question n'est plus « à quand remonte la dernière ? » mais « quelqu'un
    doit-il déjà rappeler cette personne ? ». Tant que la demande est
    « nouvelle », un second exemplaire n'ajouterait qu'un appel qui n'existe
    pas — exactement ce que le bandeau du tableau de bord compte pour dire quoi
    faire aujourd'hui.

    ⚠️ **Et on le lui dit**, contrairement à l'ancienne route qui répondait
    « c'est enregistré » sans rien apprendre. Elle parlait à un inconnu ; celui-ci
    ouvre son propre dossier avec sa propre référence, et « nous avons déjà votre
    demande » lui évite de se demander si elle est passée.
  */
  const { docs: enAttente } = await payload.find({
    collection: "demandes-rappel",
    where: { and: [{ dossier: { equals: doc.id } }, { statut: { equals: "nouvelle" } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (enAttente.length > 0) redirect(`${dossier}?rappel=deja` as Route);

  const programme =
    typeof doc.session === "object" && doc.session !== null
      ? (doc.session as { programme?: unknown }).programme
      : undefined;
  const programmeId =
    typeof programme === "object" && programme !== null
      ? (programme as { id?: unknown }).id
      : programme;
  const titreProgramme =
    typeof programme === "object" && programme !== null
      ? String((programme as { titre?: unknown }).titre ?? "")
      : "";

  try {
    await payload.create({
      collection: "demandes-rappel",
      overrideAccess: true,
      data: {
        dossier: doc.id,
        nom: String(doc.apprenantNom ?? ""),
        ...(doc.apprenantEmail ? { email: String(doc.apprenantEmail) } : {}),
        whatsapp: String(doc.apprenantWhatsapp ?? ""),
        pays: String(doc.apprenantPays ?? ""),
        ...(typeof programmeId === "number" ? { programme: programmeId } : {}),
        /*
          Le rythme choisi au formulaire, pour que le conseiller ne découvre pas
          au téléphone que payer en trois fois coûte plus cher.
        */
        planPaiement: (["P1", "P2", "P3"] as const).find((c) => c === doc.planPaiement),
        message: `Demandé depuis son dossier ${reference}.`,
        origine: `/inscription/${reference}`,
        statut: "nouvelle",
      },
    });
  } catch (e) {
    /*
      On le dit, plutôt que d'afficher une confirmation à quelqu'un que personne
      ne rappellera.
    */
    console.error("[demande-rappel] échec de l'enregistrement :", e);
    redirect(`${dossier}?rappel=technique` as Route);
  }

  /*
    L'équipe est prévenue. Sans cela, la demande dormirait dans le back-office
    jusqu'à ce que quelqu'un pense à regarder — et c'est précisément le sort
    qu'ont connu les trente-six demandes de la version publique.
  */
  await courrielRappel(payload, {
    nom: String(doc.apprenantNom ?? ""),
    email: String(doc.apprenantEmail ?? ""),
    whatsapp: String(doc.apprenantWhatsapp ?? ""),
    pays: String(doc.apprenantPays ?? ""),
    /*
      ⚠️ Le parcours part avec la demande, parce que c'est ce qui décide du ton
      de l'appel. Il ne se déduit plus d'un champ de formulaire mais du dossier
      lui-même : il ne peut donc plus être vide ni faux.
    */
    ...(titreProgramme ? { programme: titreProgramme } : {}),
    ...(doc.planPaiement ? { plan: String(doc.planPaiement) } : {}),
  });

  redirect(`${dossier}?rappel=ok` as Route);
}
