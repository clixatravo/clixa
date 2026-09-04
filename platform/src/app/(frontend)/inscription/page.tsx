import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { participantConnecte } from "@/lib/session-apprenant";
import { placesRestantes } from "@/lib/types";
import { MOYENS } from "@/lib/moyens";
import {
  formatPeriode,
  formatPrix,
  getProgramme,
  getSessions,
  getTarifs,
  libelleFuseau,
} from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "Pré-inscription",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{
    formation?: string;
    debut?: string;
    plan?: string;
    erreur?: string;
  }>;
}

const MESSAGES: Record<string, string> = {
  champs: "Il manque une information. Tous les champs marqués sont nécessaires pour vous rappeler.",
  session: "Cette session n'existe plus. Choisissez-en une autre ci-dessous.",
  complet: "La dernière place vient d'être prise. Choisissez une autre session, ou écrivez-nous.",
  indicatif:
    "Votre numéro WhatsApp doit commencer par l'indicatif de votre pays — +212 au Maroc, +225 en Côte d'Ivoire, +221 au Sénégal. C'est par ce numéro que nous vous joindrons.",
  consentement:
    "Il manque votre accord pour que nous conservions vos coordonnées. Sans lui, nous ne pouvons pas ouvrir votre dossier.",
  technique: "L'enregistrement a échoué. Réessayez — si cela persiste, écrivez-nous.",
};

/**
 * FE-17 — Demander une place.
 *
 * Aucun compte à créer : un mot de passe à retenir avant même d'avoir payé
 * écarte des inscrits. La référence du dossier suffit à y revenir.
 *
 * Rien n'est encaissé ici non plus. Les règlements passent par Western Union,
 * Ria ou MoneyGram : cette page enregistre une demande, la suivante donne les
 * consignes de transfert.
 */
export default async function Inscription({ searchParams }: Props) {
  const { formation, debut, plan: planDemande, erreur } = await searchParams;

  /*
    Sans formation choisie, la page n'a rien à inscrire — mais un 404 renvoyait
    à un mur quelqu'un qui voulait précisément s'inscrire. Le catalogue est la
    seule suite possible : c'est là qu'on choisit.

    Une formation *nommée mais inconnue* reste un 404, elle : l'adresse
    désigne quelque chose qui n'existe pas, et le dire vaut mieux que de faire
    atterrir ailleurs sans explication.
  */
  if (!formation) redirect("/formations" as Route);
  const programme = await getProgramme(formation);
  if (!programme) notFound();

  const sessions = (await getSessions(formation)).filter((s) => placesRestantes(s) > 0);

  /*
    Quelqu'un qui revient s'inscrire à un second parcours a déjà donné son nom,
    son adresse et son pays. Les lui redemander à chaque fois, c'est lui dire
    qu'on ne l'a pas reconnu.
  */
  const participant = await participantConnecte();
  const tarifs = await getTarifs();
  const plan = tarifs.plans.find((p) => p.code === planDemande) ?? tarifs.plans[0];

  return (
    <>
      <FilAriane
        items={[
          { label: "Toutes les formations", href: "/formations" },
          { label: programme.titre, href: `/formations/${programme.slug}` as Route },
          { label: "Pré-inscription" },
        ]}
      />

      <section className="px-8 py-13">
        <div className="mx-auto max-w-[860px]">
          <span className="mono-label text-gold mb-3 block">Pré-inscription</span>
          <h1 className="mb-3 text-[clamp(1.6rem,3vw,2.3rem)]">{programme.titre}</h1>
          {participant && (
            <p className="border-gold bg-panel text-ivory mb-6 border-l-2 p-4 text-[0.9rem]">
              Bonjour {participant.nom} — vos coordonnées sont déjà remplies. Ce dossier rejoindra
              votre espace.
            </p>
          )}

          {/*
            Le terme est dit ici plutôt que découvert plus tard : « retenue dès
            l'envoi » sans durée laisse croire que la place attend indéfiniment.
            Sept jours, c'est le temps d'un transfert international — assez pour
            ne presser personne, assez court pour qu'une session ne se ferme pas
            sur des dossiers que rien ne suivra.
          */}
          <p className="text-ivory-dim mb-9 max-w-[62ch] text-[0.98rem]">
            Votre place est retenue dès l&apos;envoi de ce formulaire, et tenue sept jours — le
            temps d&apos;un transfert. Le règlement se fait ensuite par transfert : les consignes
            s&apos;affichent à l&apos;étape suivante.
          </p>

          {erreur && (
            <p
              role="alert"
              className="border-gold bg-panel text-ivory mb-8 border-l-2 p-4 text-[0.9rem]"
            >
              {MESSAGES[erreur] ?? MESSAGES.technique}
            </p>
          )}

          {sessions.length === 0 ? (
            <p className="border-line bg-panel border p-6 text-[0.95rem]">
              Aucune session n&apos;est ouverte pour ce parcours.{" "}
              <Link href="/contact" className="border-gold border-b">
                Laissez-nous vos coordonnées
              </Link>{" "}
              : nous vous préviendrons à l&apos;ouverture de la prochaine.
            </p>
          ) : (
            <form
              action="/api/inscription"
              method="POST"
              className="border-line bg-panel border p-6 sm:p-8"
            >
              {/* Leurre : invisible pour un humain, rempli par la plupart des robots. */}
              <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
                <label htmlFor="site_web">Ne pas remplir</label>
                <input id="site_web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <input type="hidden" name="formation" value={programme.slug} />

              {/*
                `min-w-0` sur chaque case, et sur les listes déroulantes.

                Une case de grille — comme un élément flexible — ne descend pas
                sous la largeur de son contenu. Or une liste déroulante prend
                celle de son option la plus longue, et la première tient la
                session entière : « 19 sept. 2026 → 07 nov. 2026 — 8 samedis ».
                Elle réclamait 483 px, imposait cette largeur à toutes ses
                voisines, et le formulaire sortait de l'écran de 164 px sur un
                téléphone — champs coupés, page à faire glisser de côté.

                Le libellé long reste : c'est lui qui permet de choisir sa
                session sans revenir en arrière. C'est la case qui apprend à
                rétrécir.
              */}
              <div className="grid gap-5 sm:grid-cols-2 [&>*]:min-w-0">
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="debut" className="mono-label text-ivory-dim text-[0.7rem]">
                    Session
                  </label>
                  <select
                    id="debut"
                    name="debut"
                    defaultValue={debut ?? sessions[0]?.debut.slice(0, 10)}
                    className="border-line bg-ink rounded-clixa text-ivory focus:border-gold w-full min-w-0 border px-3.5 py-3 text-[0.95rem]"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.debut.slice(0, 10)}>
                        {formatPeriode(s.debut, s.fin)}
                        {s.cadence ? ` — ${s.cadence}` : ""}
                        {s.fuseau ? ` (${libelleFuseau(s.fuseau)})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <Champ
                  label="Nom complet"
                  name="nom"
                  autoComplete="name"
                  valeur={participant?.nom}
                />
                <Champ
                  label="E-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  valeur={participant?.email}
                />
                <Champ
                  label="WhatsApp"
                  name="whatsapp"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+212 6 00 00 00 00"
                  aide="Avec l'indicatif de votre pays — +212 au Maroc, +225 en Côte d'Ivoire, +221 au Sénégal."
                  valeur={participant?.telephone}
                />
                <Champ
                  label="Pays"
                  name="pays"
                  autoComplete="country-name"
                  valeur={participant?.pays}
                />

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="plan" className="mono-label text-ivory-dim text-[0.7rem]">
                    Rythme de paiement
                  </label>
                  <select
                    id="plan"
                    name="plan"
                    defaultValue={plan?.code}
                    className="border-line bg-ink rounded-clixa text-ivory focus:border-gold w-full min-w-0 border px-3.5 py-3 text-[0.95rem]"
                  >
                    {tarifs.plans.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.libelle} — {formatPrix(p.totalCentimes)}
                        {p.echeancesCentimes.length > 1
                          ? ` (${p.echeancesCentimes.map((m) => formatPrix(m)).join(" + ")})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/*
                  ── Ce qu'on lui enverra, pas ce qu'il paiera ici ───────────
                  Aucun règlement ne se fait sur le site : la direction ne veut
                  pas de passerelle, et il n'y en a pas. Ce choix décide
                  seulement de ce que l'équipe lui adresse par courriel — un
                  lien bancaire, un RIB, ou des coordonnées de transfert.

                  Le dire au moment de l'inscription évite l'aller-retour qui
                  coûtait le plus de temps : sans lui, l'équipe envoyait des
                  coordonnées de transfert à quelqu'un qui voulait payer par
                  carte, et attendait sa réponse pour le découvrir.
                */}
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="moyen" className="mono-label text-ivory-dim text-[0.7rem]">
                    Comment souhaitez-vous régler
                  </label>
                  <select
                    id="moyen"
                    name="moyen"
                    defaultValue="transfert"
                    className="border-line bg-ink rounded-clixa text-ivory focus:border-gold w-full min-w-0 border px-3.5 py-3 text-[0.95rem]"
                  >
                    {MOYENS.map((m) => (
                      <option key={m.valeur} value={m.valeur}>
                        {m.libelle}
                      </option>
                    ))}
                  </select>
                  <p className="text-ivory-dim/70 text-[0.78rem] leading-relaxed">
                    Rien ne se paie sur ce site. Nous vous envoyons par courriel de quoi régler — un
                    lien bancaire, un RIB ou les coordonnées de transfert, selon votre choix.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="payeur" className="mono-label text-ivory-dim text-[0.7rem]">
                    Qui règle
                  </label>
                  <select
                    id="payeur"
                    name="payeur"
                    className="border-line bg-ink rounded-clixa text-ivory focus:border-gold w-full min-w-0 border px-3.5 py-3 text-[0.95rem]"
                  >
                    <option value="particulier">Moi-même</option>
                    <option value="organisation">Mon employeur ou une organisation</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="organisation" className="mono-label text-ivory-dim text-[0.7rem]">
                    Nom de l&apos;organisation{" "}
                    <span className="normal-case">(si elle règle pour vous)</span>
                  </label>
                  <input
                    id="organisation"
                    name="organisation"
                    type="text"
                    className="border-line bg-ink rounded-clixa text-ivory focus:border-gold w-full min-w-0 border px-3.5 py-3 text-[0.95rem]"
                  />
                </div>
              </div>

              {/*
                ⚠️ Jamais cochée d'avance. Une case pré-cochée n'est pas un
                consentement, c'est un consentement présumé — et la route le
                revérifie de toute façon : `required` n'engage que le
                navigateur, et ne veut rien dire pour qui poste directement.
              */}
              <label className="text-ivory-dim mt-7 flex cursor-pointer items-start gap-3 text-[0.86rem] leading-relaxed">
                <input
                  type="checkbox"
                  name="consentement"
                  value="oui"
                  required
                  className="accent-gold mt-1 h-4 w-4 shrink-0 cursor-pointer"
                />
                <span>
                  J&apos;accepte que CLIXA Institute conserve les informations ci-dessus pour
                  traiter mon dossier et me recontacter. Elles ne sont transmises à personne.
                </span>
              </label>

              <button
                type="submit"
                className="bg-gold text-ink rounded-clixa hover:bg-gold-bright mt-5 w-full px-6 py-3.5 text-[0.92rem] font-semibold transition-colors sm:w-auto"
              >
                Envoyer ma pré-inscription
              </button>

              <p className="text-ivory-dim mt-4 text-[0.76rem]">
                Aucun paiement n&apos;est demandé à cette étape.
              </p>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

function Champ({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  aide,
  valeur,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  aide?: string;
  valeur?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="mono-label text-ivory-dim text-[0.7rem]">
        {label} <span className="text-gold">*</span>
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-describedby={aide ? `${name}-aide` : undefined}
        defaultValue={valeur}
        className="border-line bg-ink rounded-clixa text-ivory focus:border-gold w-full min-w-0 border px-3.5 py-3 text-[0.95rem]"
      />
      {aide && (
        <span id={`${name}-aide`} className="text-ivory-dim text-[0.72rem]">
          {aide}
        </span>
      )}
    </div>
  );
}
