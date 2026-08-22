import { redirect } from "next/navigation";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { courrielEquipe, courrielParticipant } from "@/lib/courriel";

/**
 * BE-15 — Réception d'une demande de place.
 *
 * Même motif que la demande de rappel : POST puis redirection, sans JavaScript
 * requis. Recharger la page du dossier ne crée pas une seconde inscription.
 *
 * Rien n'est encaissé ici. Les règlements passent par Western Union, Ria ou
 * MoneyGram — la route enregistre un dossier et calcule ses échéances ; le
 * transfert sera rapproché à la main depuis le back-office.
 */

/** Champ leurre : invisible pour un humain, rempli par la plupart des robots. */
const LEURRE = "site_web";

/** Codes du barème. Un formulaire est de la saisie visiteur, pas une valeur sûre. */
const PLANS = ["P1", "P2", "P3"] as const;

/**
 * Répartit les échéances dans le temps.
 *
 * La première est due à la signature ; les suivantes avant une séance donnée,
 * comme l'annonce le barème — « 2e avant la 5e séance ». Les séances étant
 * hebdomadaires, on compte en semaines depuis le début de la session.
 */
const SEMAINES_AVANT_SEANCE = [0, 4, 6];

export async function POST(request: Request) {
  const form = await request.formData();
  const texte = (cle: string) => (form.get(cle) ?? "").toString().trim();

  if (texte(LEURRE) !== "") {
    redirect("/formations" as Route);
  }

  /*
    La session se désigne par le parcours et sa date de début. La référence
    interne est un intitulé de listing — « Directeur QHSE — Classe virtuelle —
    19 sept. 2026 » — qui n'a rien à faire dans une adresse, et l'identifiant
    numérique n'a rien à faire dans du HTML public.
  */
  const formation = texte("formation");
  const debutRef = texte("debut");
  const nom = texte("nom");
  const email = texte("email");
  const whatsapp = texte("whatsapp");
  const pays = texte("pays");
  const plan = PLANS.find((p) => p === texte("plan")) ?? "P1";

  const echec = (cause: string) =>
    redirect(
      `/inscription?formation=${encodeURIComponent(formation)}&debut=${encodeURIComponent(debutRef)}&plan=${plan}&erreur=${cause}` as Route,
    );

  if (!formation) redirect("/formations" as Route);
  if (!nom || !email || !whatsapp || !pays) echec("champs");

  const payload = await getPayload({ config });

  const { docs: programmes } = await payload.find({
    collection: "programmes",
    where: { slug: { equals: formation } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const programme = programmes[0];
  if (!programme) redirect("/formations" as Route);

  const { docs } = await payload.find({
    collection: "sessions",
    where: { programme: { equals: programme!.id } },
    limit: 50,
    depth: 0,
    sort: "debut",
    overrideAccess: true,
  });
  const session = debutRef
    ? docs.find((s) => (s.debut ?? "").slice(0, 10) === debutRef.slice(0, 10))
    : docs[0];
  if (!session) echec("session");

  // La session peut s'être remplie pendant que le formulaire était ouvert.
  const restantes = (session!.capacite ?? 0) - (session!.placesReservees ?? 0);
  if (restantes <= 0) echec("complet");

  const tarifs = await payload.findGlobal({ slug: "tarifs", locale: "fr", overrideAccess: true });
  const barème = (tarifs.plans ?? []).find((p) => p.code === plan);
  const montants = (barème?.echeances ?? []).map((e) => e.montant ?? 0).filter((m) => m > 0);

  /*
    Le montant est figé au moment de l'inscription. Un barème révisé ensuite ne
    doit pas rouvrir un dossier déjà accepté par le participant.
  */
  const debut = session!.debut ? new Date(session!.debut) : new Date();
  const echeances = montants.map((montant, i) => ({
    montant,
    dateLimite: new Date(
      debut.getTime() + (SEMAINES_AVANT_SEANCE[i] ?? 0) * 7 * 86400000,
    ).toISOString(),
    statut: "attendu" as const,
  }));

  let reference: string;
  try {
    const cree = await payload.create({
      collection: "inscriptions",
      overrideAccess: true,
      data: {
        session: session!.id,
        statut: "demandee",
        apprenantNom: nom,
        apprenantEmail: email,
        apprenantWhatsapp: whatsapp,
        apprenantPays: pays,
        payeurType: texte("payeur") === "organisation" ? "organisation" : "particulier",
        ...(texte("organisation") ? { payeurNom: texte("organisation") } : {}),
        planPaiement: plan,
        montantTotal: barème?.total ?? tarifs.prixComptant ?? 0,
        devise: tarifs.devise ?? "EUR",
        echeances,
      },
    });
    reference = String(cree.reference);
  } catch (e) {
    // Le dire plutôt qu'afficher une confirmation à quelqu'un dont la place
    // n'est pas retenue.
    console.error("[inscription] échec de l'enregistrement :", e);
    echec("technique");
    return;
  }

  /*
    Les deux courriels partent après l'enregistrement, jamais avant : on
    n'annonce pas une place qui n'est pas retenue. Ils n'échouent pas non
    plus — voir src/lib/courriel.ts. Le dossier existe, c'est l'essentiel.
  */
  const { docs: progs } = await payload.find({
    collection: "programmes",
    where: { id: { equals: programme!.id } },
    limit: 1,
    locale: "fr",
    depth: 0,
    overrideAccess: true,
  });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://clixa-institute.vercel.app";
  const details = {
    reference,
    apprenantNom: nom,
    apprenantEmail: email,
    apprenantWhatsapp: whatsapp,
    apprenantPays: pays,
    programmeTitre: progs[0]?.titre ?? "Parcours CLIXA",
    sessionLibelle: String(session!.reference ?? ""),
    planLibelle: String(barème?.libelle ?? plan),
    montantTotal: barème?.total ?? 0,
    echeances: echeances.map((e) => ({ montant: e.montant, dateLimite: e.dateLimite })),
    urlDossier: `${site}/inscription/${reference}`,
  };

  await courrielParticipant(payload, details);
  await courrielEquipe(payload, details);

  redirect(`/inscription/${reference}` as Route);
}
