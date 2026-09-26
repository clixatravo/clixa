import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { participantConnecte } from "@/lib/session-apprenant";
import { placesRestantes } from "@/lib/types";
import { MOYENS } from "@/lib/moyens";
import { lienListeAttente } from "@/lib/attente";
import { ChampWhatsapp } from "@/components/ChampWhatsapp";
import { ChampPays } from "@/components/ChampPays";
import { DOMAINES, EXPERIENCES } from "@/lib/profil";
import { PROVENANCES } from "@/lib/provenance";
import { LogoSvg } from "@/components/LogoSvg";
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
  profil:
    "Indiquez votre fonction actuelle, votre domaine et vos années d'expérience. Nous les demandons pour préparer l'appel, pas pour vous départager : le conseiller saura à qui il parle.",
  provenance:
    "Dites-nous comment vous avez connu CLIXA Institute — un seul choix suffit. C'est ce qui nous dit où parler de nos formations.",
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

  /*
    ⚠️ **« Aucune session ouverte » et « toutes complètes » ne sont pas la même
    chose.** La liste était filtrée avant d'être regardée, si bien qu'une
    cohorte pleine se lisait « aucune session n'est ouverte pour ce parcours »,
    suivi de « nous vous préviendrons à l'ouverture de la prochaine ».

    C'est faux, et cela tombe au pire moment : quelqu'un arrive d'une annonce
    qui promet le 3 octobre, et lit que le parcours n'a pas de date. Il en
    conclut que l'annonce ment, ou que la formation n'existe pas — alors qu'il
    s'en est fallu d'une place, et qu'il aurait écrit s'il l'avait su.
  */
  const toutes = await getSessions(formation);
  const sessions = toutes.filter((s) => placesRestantes(s) > 0);
  const toutesCompletes = toutes.length > 0 && sessions.length === 0;

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
              {toutesCompletes ? (
                <>
                  Cette session est complète.{" "}
                  <Link
                    href={lienListeAttente(programme.slug) as Route}
                    className="border-gold border-b"
                  >
                    Écrivez-nous
                  </Link>{" "}
                  : nous vous plaçons sur la liste d&apos;attente, et nous vous prévenons dès
                  qu&apos;une place se libère ou qu&apos;une date s&apos;ouvre.
                </>
              ) : (
                <>
                  Aucune session n&apos;est ouverte pour ce parcours.{" "}
                  <Link href="/contact" className="border-gold border-b">
                    Laissez-nous vos coordonnées
                  </Link>{" "}
                  : nous vous préviendrons à l&apos;ouverture de la prochaine.
                </>
              )}
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
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="whatsapp"
                    className="mono-label text-ivory-dim text-[0.7rem] tracking-wider"
                  >
                    WhatsApp <span className="text-gold">*</span>
                  </label>
                  <ChampWhatsapp classeChamp="border-line bg-ink rounded-clixa text-ivory focus:border-gold min-w-0 border px-3.5 py-3 text-[0.95rem]" />
                  <p className="text-ivory-dim/70 text-[0.78rem] leading-relaxed">
                    {/*
                      ⚠️ **Cette phrase disait « sans le zéro du début ».** C'est
                      juste au Maroc et faux en Côte d'Ivoire, où le zéro fait
                      partie du numéro depuis 2021 — comme au Bénin. On donnait
                      donc une consigne qui rendait le numéro injoignable, dans
                      des pays que le site nomme. La règle est désormais dans
                      `lib/telephone.ts`, par pays ; il n'y a plus rien à
                      demander au visiteur que son numéro tel qu'il le connaît.
                    */}
                    Choisissez votre pays, puis tapez votre numéro comme vous le donnez chez vous.
                  </p>
                </div>
                <ChampPays
                  classeChamp="border-line bg-ink rounded-clixa text-ivory focus:border-gold w-full min-w-0 border px-3.5 py-3 text-[0.95rem]"
                  valeurParDefaut={participant?.pays}
                />

                {/*
                  ── Le poste et l'expérience ────────────────────────────────
                  Deux questions qui ne servent pas à nous : elles servent à ce
                  que la personne qui appelle sache à qui elle parle. Voir
                  `lib/profil.ts`.

                  ⚠️ Elles sont posées **après** les coordonnées, jamais avant.
                  On demande d'abord ce qui identifie, ensuite ce qui qualifie :
                  un formulaire qui ouvre sur « quelle est votre fonction ? » se lit
                  comme un tri à l'entrée.
                */}
                {/*
                  ⚠️ **« Fonction », et non « poste »** (demandé par la
                  direction le 24 septembre 2026 : « a potetr nass mafehmox »).
                  Deux vrais dossiers du 18 septembre portaient « Mécanicien
                  automobile » et « Aide soignant » : la question était bien
                  comprise. D'autres, non — « poste » se lit aussi comme un
                  lieu de travail ou un numéro de poste téléphonique, et le
                  champ revenait parfois vide ou de travers.

                  ⚠️ **Le nom du champ ne bouge pas** (`profession`,
                  `apprenantProfession` en base). Renommer une colonne pour
                  changer un intitulé, c'est une migration et cent vingt-six
                  lignes à réécrire, pour un mot à l'écran.
                */}
                <Champ
                  label="Votre fonction actuelle"
                  name="profession"
                  autoComplete="organization-title"
                  placeholder="Comptable, DAF, chef de projet…"
                />
                {/*
                  ⚠️ **Le domaine vient entre la fonction et l'ancienneté**, et
                  l'ordre porte du sens : ce que vous faites, dans quel domaine,
                  depuis combien de temps. Posé après l'expérience, il se serait
                  lu comme une question de plus ; posé là, il précise celle
                  d'au-dessus.
                */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="domaine" className="mono-label text-ivory-dim text-[0.7rem]">
                    Domaine actuel <span className="text-gold">*</span>
                  </label>
                  <select
                    id="domaine"
                    name="domaine"
                    required
                    defaultValue=""
                    className="border-line bg-ink rounded-clixa text-ivory focus:border-gold w-full min-w-0 border px-3.5 py-3 text-[0.95rem]"
                  >
                    <option value="" disabled>
                      Choisissez…
                    </option>
                    {DOMAINES.map((d) => (
                      <option key={d.valeur} value={d.valeur}>
                        {d.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="experience" className="mono-label text-ivory-dim text-[0.7rem]">
                    Années d&apos;expérience <span className="text-gold">*</span>
                  </label>
                  <select
                    id="experience"
                    name="experience"
                    required
                    defaultValue=""
                    className="border-line bg-ink rounded-clixa text-ivory focus:border-gold w-full min-w-0 border px-3.5 py-3 text-[0.95rem]"
                  >
                    {/*
                      ⚠️ Aucune tranche n'est choisie d'avance. C'est la leçon du
                      sélecteur de pays, qui s'ouvrait sur « Maroc » : un défaut
                      juste pour une partie des visiteurs est un piège pour les
                      autres, et il ne se voit pas — il ressemble à un choix.
                    */}
                    <option value="" disabled>
                      Choisissez…
                    </option>
                    {EXPERIENCES.map((e) => (
                      <option key={e.valeur} value={e.valeur}>
                        {e.libelle}
                      </option>
                    ))}
                  </select>
                </div>

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

                {/*
                  ── Par où l'on nous a connus ───────────────────────────────
                  Demandé par la direction le 26 septembre 2026. Voir
                  `lib/provenance.ts` pour ce que cette question sert à compter.

                  **Des tuiles, pas un menu déroulant** : un `<select>` ne sait
                  pas montrer un logo, et c'est le logo qu'on reconnaît avant
                  d'avoir lu — six choix se parcourent d'un coup d'œil, là où un
                  menu demande de l'ouvrir.

                  ⚠️ **Ce sont de vrais boutons radio**, simplement transparents
                  et étendus sur toute la tuile. Rien en JavaScript : le clavier
                  (flèches, espace), `required` et l'envoi du formulaire sont
                  ceux du navigateur. Et parce que la case couvre la tuile, la
                  bulle « veuillez choisir une option » s'accroche à une tuile
                  visible, pas à un pixel caché dans un coin.

                  ⚠️ **Aucun choix n'est coché d'avance** — la leçon du
                  sélecteur de pays qui s'ouvrait sur « Maroc » : un défaut se
                  lit comme une réponse, et fausserait le seul chiffre que cette
                  question existe pour produire.

                  ⚠️ **Posée en dernier**, après ce qui sert au dossier : elle
                  sert à nous, pas au participant.
                */}
                <fieldset className="flex min-w-0 flex-col gap-2.5 sm:col-span-2">
                  <legend className="mono-label text-ivory-dim mb-2 text-[0.7rem]">
                    Comment nous avez-vous connus&nbsp;?&nbsp;<span className="text-gold">*</span>
                  </legend>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {PROVENANCES.map((p) => (
                      <label
                        key={p.valeur}
                        className="border-line bg-ink rounded-clixa text-ivory has-checked:border-gold has-checked:bg-gold/[0.07] has-focus-visible:ring-gold/60 hover:border-ivory-dim/50 relative flex min-w-0 cursor-pointer flex-col items-center justify-center gap-2 border px-2 py-3.5 text-center text-[0.88rem] transition-colors has-focus-visible:ring-2 sm:flex-row sm:justify-start sm:gap-2.5 sm:py-2.5 sm:pr-8 sm:pl-3 sm:text-left sm:text-[0.9rem]"
                      >
                        <input
                          type="radio"
                          name="provenance"
                          value={p.valeur}
                          required
                          className="peer absolute inset-0 cursor-pointer opacity-0"
                        />
                        {/*
                          La pastille porte la couleur de la marque en fond
                          léger et en trait : sur l'encre du site, un logo
                          LinkedIn à sa couleur exacte tombe sous le seuil de
                          lisibilité ; teinté sur son propre halo, il se
                          reconnaît sans forcer.
                        */}
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-[7px]"
                          style={{ backgroundColor: `${p.couleur}24`, color: p.couleur }}
                        >
                          <LogoSvg logo={p.logo} className="size-[18px]" />
                        </span>
                        {/*
                          ⚠️ **Sous 640 px, le logo passe au-dessus du nom.**
                          Côte à côte sur deux colonnes, la tuile ne laissait
                          qu'une cinquantaine de pixels au texte : « Lin… »,
                          « Ins… » — vu à la capture, pas au type. Empilés, les
                          six noms tiennent en entier.
                        */}
                        <span className="max-w-full min-w-0 truncate font-medium">{p.libelle}</span>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-gold absolute top-2 right-2 size-4 opacity-0 transition-opacity peer-checked:opacity-100 sm:top-1/2 sm:right-3 sm:-translate-y-1/2"
                          aria-hidden="true"
                        >
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </label>
                    ))}
                  </div>
                </fieldset>
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

              {/*
                ⚠️ **Le bouton ne part qu'une fois.** Sur quarante-et-un
                dossiers annulés en production, presque tous portaient une
                autre inscription de la même adresse créée à la **même
                seconde** — un participant en avait sept. Le formulaire est
                natif : pendant l'aller-retour, rien ne bouge à l'écran, et
                l'on reclique. Voir `BoutonEnvoi`.
              */}
              <BoutonEnvoi
                libelle="Envoyer ma pré-inscription"
                pendant="Enregistrement…"
                className="bg-gold text-ink rounded-clixa hover:bg-gold-bright mt-5 w-full px-6 py-3.5 text-[0.92rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              />

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
