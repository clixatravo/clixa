import { appelant, cadenceOk, tropVite } from "@/lib/cadence";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { courrielSignature } from "@/lib/courriel";
import {
  empreinteDesTermes,
  empreinteDuTrace,
  memeNom,
  mentionValable,
  preuve,
  traceValable,
} from "@/lib/signature";

/**
 * Le participant signe son contrat en ligne.
 *
 * ── Ce que cette route accepte comme signature ──────────────────────────────
 * Trois choses : le nom du dossier recopié, la mention « Lu et approuvé » que
 * le contrat exige, et le tracé apposé au doigt ou à la souris.
 *
 * ⚠️ Le tracé n'ajoute pas de force juridique. Ce qui défend une signature
 * électronique simple, c'est ce qu'on garde autour : la date, l'adresse IP, le
 * navigateur et l'empreinte des termes au moment de signer. Sans elle, la
 * première objection serait « le document a changé depuis », et elle serait
 * imparable.
 *
 * Le tracé apporte autre chose, qui compte tout autant en pratique : un contrat
 * portant une signature se lit comme un contrat. Un document qu'on n'ose pas
 * montrer ne sert à rien. Son empreinte est gardée elle aussi, pour qu'il ne
 * puisse pas être remplacé après coup.
 *
 * ── Ce qu'elle ne fait pas ──────────────────────────────────────────────────
 * Elle n'encaisse rien et ne confirme aucune place. Signer engage le
 * participant sur les termes ; c'est le versement, vérifié par l'équipe, qui
 * retient la place sans limite.
 */

const LEURRE = "site_web";

export async function POST(request: Request) {
  if (!cadenceOk("signature", appelant(request), 20, 60_000)) return tropVite(60);

  const form = await request.formData();
  const texte = (cle: string) => (form.get(cle) ?? "").toString().trim();

  const reference = texte("dossier").toUpperCase();
  const retour = `/inscription/${encodeURIComponent(reference)}`;

  if (!/^[A-Z0-9-]{4,24}$/.test(reference)) redirect("/" as Route);
  if (texte(LEURRE) !== "") redirect(retour as Route);

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { reference: { equals: reference } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  });

  const dossier = docs[0];
  if (!dossier) redirect("/" as Route);

  const statut = String(dossier.statut ?? "");
  if (statut === "annulee" || statut === "terminee") redirect(retour as Route);

  /*
    On ne signe pas deux fois. Un second passage garderait la première date —
    autant le dire, plutôt que de laisser croire que la seconde a remplacé la
    première.
  */
  if (dossier.contratSigneLe) redirect(`${retour}?signature=deja` as Route);

  const nomSaisi = texte("nom");
  const mentionSaisie = texte("mention");
  const nomAttendu = String(dossier.apprenantNom ?? "");

  if (!memeNom(nomSaisi, nomAttendu)) redirect(`${retour}?signature=nom` as Route);
  if (!mentionValable(mentionSaisie)) redirect(`${retour}?signature=mention` as Route);

  /*
    Le tracé est exigé : c'est ce que la direction a demandé, et c'est ce qui
    fait qu'un contrat se lit comme un contrat. Il n'ajoute pas de force
    juridique — l'empreinte des termes s'en charge — mais son absence se voit
    sur le document, et un document qu'on n'ose pas montrer ne sert à rien.
  */
  const traceSaisi = texte("trace");
  if (!traceValable(traceSaisi)) redirect(`${retour}?signature=trace` as Route);

  const session = typeof dossier.session === "object" ? dossier.session : undefined;
  const programme =
    session && typeof session.programme === "object" ? session.programme : undefined;

  const echeances = (dossier.echeances ?? []).map((e) => ({
    montant: Number(e.montant ?? 0),
    ...(e.dateLimite ? { dateLimite: String(e.dateLimite) } : {}),
  }));

  const empreinte = empreinteDesTermes({
    reference,
    nom: nomAttendu,
    email: String(dossier.apprenantEmail ?? ""),
    programme: String(programme?.titre ?? ""),
    session: String(session?.reference ?? ""),
    total: echeances.reduce((n, e) => n + e.montant, 0),
    echeances,
    moyen: String(dossier.moyenSouhaite ?? "transfert"),
  });

  const quand = new Date().toISOString();

  await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    overrideAccess: true,
    data: {
      contratSigneLe: quand,
      contratSignataire: nomSaisi,
      contratTrace: traceSaisi,
      contratPreuve: preuve({
        empreinte,
        empreinteTrace: empreinteDuTrace(traceSaisi),
        // `appelant` lit les en-têtes que Vercel pose devant la fonction.
        ip: appelant(request),
        navigateur: (request.headers.get("user-agent") ?? "inconnu").slice(0, 200),
        nom: nomSaisi,
        quand,
      }),
    },
  });

  await courrielSignature(payload, {
    reference,
    dossierId: dossier.id,
    apprenantNom: nomAttendu,
    apprenantEmail: String(dossier.apprenantEmail ?? ""),
    apprenantWhatsapp: String(dossier.apprenantWhatsapp ?? ""),
    programmeTitre: String(programme?.titre ?? ""),
    signeLe: quand,
    empreinte,
    /*
      Sans lui, le message annonçait les trois moyens d'un coup — « notre RIB »
      compris — à quelqu'un qui règle peut-être par carte, puis lui réclamait
      une référence de transfert qu'il n'aura jamais.
    */
    ...(dossier.moyenSouhaite ? { moyenSouhaite: dossier.moyenSouhaite } : {}),
  });

  redirect(`${retour}?signature=ok` as Route);
}
