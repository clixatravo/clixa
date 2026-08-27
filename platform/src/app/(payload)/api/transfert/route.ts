import { appelant, cadenceOk, tropVite } from "@/lib/cadence";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { courrielTransfert } from "@/lib/courriel";
import type { Inscription } from "@/payload-types";

/**
 * BE-20 — Le participant annonce son transfert.
 *
 * ── Pourquoi cette route existe ─────────────────────────────────────────────
 * L'échéancier prévoyait depuis le début un état « Annoncé par le participant ».
 * Il s'affichait, `prochaineEtape` avait sa phrase pour lui — et rien ne
 * l'écrivait jamais. La fiche de dossier demandait d'envoyer le numéro de
 * transfert « par WhatsApp », sans qu'aucun numéro ne figure nulle part sur le
 * site : le participant arrivait à une porte fermée, et l'équipe devait
 * rapprocher à la main un message sans dossier.
 *
 * Le numéro arrive maintenant attaché à sa référence. C'est tout ce que la
 * route fait.
 *
 * ── Ce qu'elle ne fait pas ──────────────────────────────────────────────────
 * Elle n'encaisse rien. « Annoncé » n'est pas « réglé » : passer l'un dans
 * l'autre demande d'avoir vu l'argent, et reste un geste d'équipe depuis le
 * back-office. Une route publique qui pourrait marquer une échéance réglée
 * offrirait une place à qui connaît une référence.
 *
 * ── Ce qui tient lieu de clef ───────────────────────────────────────────────
 * La référence du dossier, comme pour le consulter — c'est la règle posée
 * ailleurs : « un dossier isolé reste accessible par sa référence, sans
 * compte ». Annoncer n'ouvre donc rien de plus que lire, et la vérification
 * humaine reste entre l'annonce et la place.
 */

const LEURRE = "site_web";

/*
  Les moyens qu'un participant peut annoncer. « Espèces » existe dans le
  modèle mais n'est pas ici : on ne remet pas d'espèces à distance, et l'équipe
  seule peut le constater depuis le back-office.
*/
const MOYENS = {
  "western-union": "Western Union",
  ria: "Ria",
  moneygram: "MoneyGram",
  virement: "Virement bancaire",
} as const;

type Moyen = keyof typeof MOYENS;
const estMoyen = (v: string): v is Moyen => v in MOYENS;

/*
  Le type vient de Payload, pas d'une copie écrite à la main : le jour où une
  échéance gagne un champ, c'est le compilateur qui le dit plutôt qu'une
  divergence silencieuse.
*/
type Echeance = NonNullable<Inscription["echeances"]>[number];

export async function POST(request: Request) {
  /*
    Cette route accepte une référence de dossier et rien d'autre.

    L'énumération n'est plus la menace : depuis que la référence est tirée sur
    quarante bits, il y a mille milliards de combinaisons et le nombre s'en
    charge. La cadence reste pour ce qu'elle sait faire — empêcher qu'on
    martèle la route, et qu'une boucle occupe la base.
  */
  if (!cadenceOk("transfert", appelant(request), 20, 60_000)) {
    return tropVite(60);
  }

  const form = await request.formData();
  const texte = (cle: string) => (form.get(cle) ?? "").toString().trim();

  const reference = texte("dossier").toUpperCase();
  const retour = `/inscription/${encodeURIComponent(reference)}`;

  // Même garde que la lecture : au-delà, c'est du bruit.
  if (!/^[A-Z0-9-]{4,24}$/.test(reference)) redirect("/" as Route);
  if (texte(LEURRE) !== "") redirect(retour as Route);

  const moyen = texte("moyen");
  const numero = texte("numero");
  if (!estMoyen(moyen) || !numero) redirect(`${retour}?annonce=champs` as Route);

  // Un numéro de transfert tient en quelques caractères. Le borner évite qu'un
  // champ libre serve à écrire un roman dans le back-office.
  if (numero.length > 40) redirect(`${retour}?annonce=champs` as Route);

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { reference: { equals: reference } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });

  const dossier = docs[0];
  if (!dossier) redirect("/" as Route);

  const statut = String(dossier.statut ?? "");
  if (statut === "annulee" || statut === "terminee") redirect(retour as Route);

  /*
    On règle dans l'ordre, donc on n'annonce que la première échéance non
    réglée — et seulement si elle attend encore. Chercher la première
    « attendue » ne suffisait pas : l'échéance 1 passée en vérification, la
    suivante restait « attendue » et une seconde annonce la marquait à son tour,
    alors qu'un seul transfert avait été fait.
  */
  const echeances = (dossier.echeances ?? []) as Echeance[];
  const index = echeances.findIndex((e) => (e.statut ?? "attendu") !== "regle");
  const courante = index === -1 ? undefined : echeances[index];
  if (!courante || courante.statut === "annonce") redirect(`${retour}?annonce=rien` as Route);

  const misesAJour: Echeance[] = echeances.map((e, i) =>
    i === index ? { ...e, statut: "annonce" as const, moyen, reference: numero } : e,
  );

  await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    data: { echeances: misesAJour },
    overrideAccess: true,
  });

  const session = typeof dossier.session === "object" ? dossier.session : undefined;
  const programme =
    session && typeof session.programme === "object" ? session.programme : undefined;

  await courrielTransfert(payload, {
    reference,
    apprenantNom: String(dossier.apprenantNom ?? ""),
    apprenantWhatsapp: String(dossier.apprenantWhatsapp ?? ""),
    programmeTitre: String(programme?.titre ?? ""),
    moyen: MOYENS[moyen],
    numero,
    montant: Number(courante.montant ?? 0),
  });

  redirect(`${retour}?annonce=ok` as Route);
}
