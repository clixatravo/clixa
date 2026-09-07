import type { Metadata } from "next";
import { FilAriane } from "@/components/FilAriane";
import { ReseauxSociaux } from "@/components/ReseauxSociaux";
import { RESEAUX_CLIXA } from "@/lib/reseaux";
import { SignalerLead } from "@/components/SignalerLead";
import { ChampWhatsapp } from "@/components/ChampWhatsapp";

export const metadata: Metadata = {
  title: "Être rappelé",
  description:
    "Laissez-nous vos coordonnées : un conseiller CLIXA vous rappelle pour vous présenter le programme et les modalités de financement.",
};

import { origineListeAttente } from "@/lib/attente";

interface Props {
  searchParams: Promise<{
    envoye?: string;
    erreur?: string;
    programme?: string;
    plan?: string;
    /** Posé par le lien d'une cohorte complète — voir `lib/attente.ts`. */
    attente?: string;
  }>;
}

/**
 * FE-11 / BE-12 — Formulaire de demande de rappel.
 *
 * Le formulaire poste vers /api/demande-rappel : il fonctionne sans
 * JavaScript, et la demande est enregistrée en base avant tout le reste.
 *
 * ── Trois champs, décidés par la direction ──────────────────────────────────
 * Il en demandait sept : pays, formation visée, rythme de paiement, message.
 * C'est un rappel qu'on demande, pas un dossier — et chaque champ de plus est
 * une occasion de refermer l'onglet. Le conseiller pose ces questions de vive
 * voix, ce qui est son métier et va plus vite.
 *
 * Le catalogue et le barème ne sont donc plus lus ici : la page ne se rend
 * plus que sur ce qu'elle contient, et ne dépend plus de la base.
 *
 * ⚠️ `plan` reste accepté dans l'adresse — les anciens liens « Être rappelé »
 * le portaient — mais il ne préremplit rien. Le retirer du type ferait échouer
 * le build sur ces liens.
 *
 * ── ⚠️ `programme`, lui, arrivait à la porte et personne ne l'ouvrait ────────
 * Trois endroits proposent de rejoindre la liste d'attente quand une cohorte
 * est complète — le héros de la fiche, sa colonne latérale, et la page
 * d'inscription, qui promet même « nous vous **plaçons** sur la liste
 * d'attente ». Les trois menaient à `/contact` nu, et cette page ignorait le
 * paramètre de toute façon.
 *
 * La demande arrivait donc dans la liste de l'équipe sans rien qui dise **quel
 * parcours**, ni qu'il s'agissait d'une liste d'attente : une demande de rappel
 * ordinaire parmi quatorze autres. La promesse « nous vous prévenons dès qu'une
 * place se libère » ne pouvait être tenue par personne — il n'y avait pas de
 * liste.
 *
 * ⚠️ **Le formulaire garde ses trois champs**, décision de la direction. Le
 * parcours voyage en champ caché, comme `origine` : rien de plus n'est demandé
 * au visiteur, et l'équipe sait enfin qui rappeler pour quoi.
 */
export default async function Contact({ searchParams }: Props) {
  const { envoye, erreur, programme, attente } = await searchParams;

  /*
    ⚠️ **Le parcours seul ne suffit pas à reconnaître une liste d'attente.** Une
    demande de rappel ordinaire sur ce même parcours a un tout autre sens : « je
    me renseigne » n'est pas « je voulais m'inscrire et je n'ai pas pu ». Seule
    la seconde peut encore se convertir par un appel, et c'est le paramètre
    `attente` qui les distingue.
  */
  /*
    ⚠️ **`attente` seul, sans le parcours.** La redirection après envoi ne rend
    qu'`?envoye=1&attente=1` : le slug n'y figure pas, et c'est voulu — rien du
    visiteur n'est réinjecté dans une adresse. Exiger le parcours ici rendrait
    donc la page de confirmation muette au moment précis où elle doit parler,
    puisqu'il vient de disparaître. Le parcours ne sert qu'au champ caché, avant
    l'envoi.
  */
  const surListeDAttente = attente === "1";

  return (
    <>
      <FilAriane
        items={[
          { href: "/", label: "Accueil" },
          { label: surListeDAttente ? "Liste d'attente" : "Être rappelé" },
        ]}
      />

      <section className="relative overflow-hidden px-8 py-16 lg:py-20">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[680px]">
          {/*
            ⚠️ **Qui vient de cliquer « Rejoindre la liste d'attente » doit
            arriver sur ce qu'il a demandé.** Il atterrissait sur « Parlons de
            votre projet de formation », sans un mot de la cohorte pleine ni de
            la liste : rien ne confirmait qu'il avait rejoint quoi que ce soit,
            et rien ne disait que le formulaire servait à cela.
          */}
          <div className="eyebrow mono-label mb-5">
            {surListeDAttente ? "Cohorte complète" : "Un conseiller vous rappelle"}
          </div>
          <h1 className="mb-4 text-[clamp(2.1rem,4.4vw,3.2rem)] font-bold">
            {/*
              ⚠️ **Un verbe qui a déjà eu lieu ne se conjugue plus au futur.**
              Après l'envoi, le titre annonçait encore « Rejoindre la liste
              d'attente » au-dessus de « votre demande est bien enregistrée » :
              un geste à faire posé sur un geste fait. Même défaut que le
              courriel qui annonçait « votre place est tenue jusqu'au » une fois
              le délai écoulé — la phrase est juste, c'est le moment qui ne
              l'est pas.
            */}
            {surListeDAttente && envoye ? (
              <>
                Vous êtes sur la <span className="gold-gradient-text">liste d&apos;attente</span>.
              </>
            ) : surListeDAttente ? (
              <>
                Rejoindre la <span className="gold-gradient-text">liste d&apos;attente</span>.
              </>
            ) : (
              <>
                Parlons de votre projet de <span className="gold-gradient-text">formation</span>.
              </>
            )}
          </h1>

          {/*
            Une demande de rappel est un lead, au même titre qu'une
            pré-inscription — et c'est même celui que le trafic acheté produit
            le plus souvent. Sans lui, Meta n'apprendrait à chercher que les
            rares visiteurs qui vont jusqu'au bout du tunnel du premier coup.
            L'étiquette les distingue dans le tableau de bord.

            ⚠️ La clef est fixe, et n'inclut donc qu'une demande par navigateur.
            Il n'existe rien d'unique à quoi l'accrocher — la même règle que la
            fenêtre de rappel, qui ne se represente jamais après un envoi.
          */}
          <SignalerLead actif={Boolean(envoye)} clef="rappel" source="demande-de-rappel" />

          {envoye ? (
            <div className="border-emerald/60 bg-emerald/15 rounded-clixa border p-8 shadow-xl backdrop-blur-sm">
              <p className="font-display text-ivory mb-3 text-[1.35rem] font-semibold">
                Votre demande est bien enregistrée.
              </p>
              <p className="text-ivory-dim/95 text-[0.96rem] leading-relaxed">
                {surListeDAttente
                  ? "Vous êtes sur la liste d'attente de ce parcours. Nous vous prévenons dès qu'une place se libère ou qu'une date s'ouvre, et un conseiller vous rappelle sous 24 h ouvrées. Inutile de renvoyer le formulaire."
                  : "Un conseiller CLIXA vous rappelle sous 24 h ouvrées, sur le numéro WhatsApp que vous avez indiqué. Inutile de renvoyer le formulaire."}
              </p>
            </div>
          ) : (
            <div className="glass-panel-gold rounded-clixa p-8 shadow-2xl sm:p-10">
              <p className="text-ivory-dim/95 mb-8 text-[0.98rem] leading-relaxed">
                {/*
                  ⚠️ **La page ne parlait pas de ce qu'on venait d'y demander.**
                  Elle promettait « un conseiller revient vers vous pour
                  préciser le programme, les dates et les possibilités de
                  financement » — vrai pour un rappel ordinaire, à côté de la
                  plaque pour quelqu'un qui vient d'apprendre que la cohorte est
                  pleine. Ce qu'il attend, c'est de savoir qu'il est sur la
                  liste ; le reste vient après.
                */}
                {surListeDAttente
                  ? "Cette cohorte est complète. Laissez-nous vos coordonnées : nous vous prévenons dès qu'une place se libère ou qu'une date s'ouvre, et un conseiller vous rappelle sous 24 h ouvrées."
                  : "Renseignez vos coordonnées : un conseiller pédagogique revient vers vous sous 24 h ouvrées pour préciser le programme, les dates et les possibilités de financement."}
              </p>

              {/*
                ── Nos coordonnées avant notre formulaire ────────────────────
                Beaucoup préfèrent écrire eux-mêmes plutôt que de laisser un
                numéro et attendre. Leur imposer un formulaire pour obtenir une
                adresse qu'on affiche partout ailleurs n'a pas de sens : on
                donne les deux, et chacun choisit.
              */}
              <div className="border-line/70 bg-ink/40 rounded-clixa mb-8 border p-5">
                <p className="mono-label text-gold mb-3 text-[0.68rem] tracking-wider">
                  Nous joindre directement
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <a
                    href={RESEAUX_CLIXA.whatsapp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-emerald/40 bg-emerald/10 text-emerald-bright hover:border-emerald-bright hover:bg-emerald-bright/20 rounded-clixa inline-flex min-h-11 flex-1 items-center justify-center border px-4 text-[0.88rem] font-medium transition-colors"
                  >
                    WhatsApp · {RESEAUX_CLIXA.whatsapp.numeroAffiche}
                  </a>
                  <a
                    href={RESEAUX_CLIXA.email.url}
                    className="border-line text-ivory hover:border-gold rounded-clixa inline-flex min-h-11 flex-1 items-center justify-center border px-4 text-[0.88rem] font-medium transition-colors"
                  >
                    {RESEAUX_CLIXA.email.adresse}
                  </a>
                </div>
                <p className="text-ivory-dim/70 mt-3 text-[0.8rem] leading-relaxed">
                  Ou laissez-nous votre numéro ci-dessous : c&apos;est le conseiller qui vous
                  rappelle.
                </p>
              </div>

              {erreur && (
                <p
                  role="alert"
                  className="border-gold bg-gold/15 text-gold-bright rounded-clixa mb-8 border p-4 text-[0.9rem]"
                >
                  {erreur === "indicatif"
                    ? "Votre numéro WhatsApp doit commencer par l'indicatif de votre pays — +212 au Maroc, +225 en Côte d'Ivoire, +221 au Sénégal. C'est par ce numéro que le conseiller vous rappellera."
                    : erreur === "consentement"
                      ? "Il manque votre accord pour que nous conservions vos coordonnées — sans lui, nous ne pouvons pas vous rappeler."
                      : erreur === "champs"
                        ? "Il manque une information obligatoire. Vérifiez les champs marqués d'une étoile."
                        : "Votre demande n'a pas pu être enregistrée. Réessayez, ou écrivez-nous à " +
                          RESEAUX_CLIXA.email.adresse +
                          "."}
                </p>
              )}

              <form
                action="/api/demande-rappel"
                method="post"
                className="grid gap-5 sm:grid-cols-2"
              >
                {/* Champ leurre : masqué aux humains, souvent rempli par les robots. */}
                <div aria-hidden="true" className="hidden">
                  <label htmlFor="site_web">Ne pas remplir</label>
                  <input
                    id="site_web"
                    name="site_web"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                {/*
                  ⚠️ **Deux champs cachés, et le second n'existait pas.** Le
                  parcours voyage jusqu'ici depuis la fiche ; sans lui,
                  `api/demande-rappel` — qui sait pourtant résoudre un slug et le
                  ranger en relation — n'avait rien à ranger.

                  ⚠️ Et `origine` nomme la liste d'attente en toutes lettres :
                  le parcours seul ne la distingue pas d'une demande de rappel
                  ordinaire, et c'est cette colonne que l'équipe lit dans sa
                  liste comme dans le classeur des admissions.
                */}
                <input
                  type="hidden"
                  name="origine"
                  value={
                    surListeDAttente && programme ? origineListeAttente(programme) : "/contact"
                  }
                />
                {programme ? <input type="hidden" name="programme" value={programme} /> : null}
                {/*
                  ⚠️ **Sans lui, la page de confirmation retombe sur le message
                  ordinaire.** La route redirige vers `/contact?envoye=1` et
                  perd tout le reste : celui qui vient de rejoindre la liste
                  lisait « un conseiller vous rappelle », sans un mot de la
                  liste — c'est-à-dire sans jamais voir confirmé ce qu'il était
                  venu faire.

                  ⚠️ La valeur est un littéral, jamais du texte reçu : la route
                  ne réinjecte dans l'adresse qu'un booléen qu'elle a reconnu,
                  pas une chaîne du visiteur.
                */}
                {surListeDAttente ? <input type="hidden" name="attente" value="1" /> : null}

                <Champ label="Nom complet" name="nom" autoComplete="name" requis />
                {/*
                  ── Trois champs, et rien d'autre ──────────────────────────
                  Le formulaire en demandait sept : pays, formation visée,
                  rythme de paiement, message. C'est un rappel qu'on demande,
                  pas un dossier — et chaque champ de plus est une occasion de
                  refermer l'onglet. Le conseiller pose ces questions lui-même,
                  c'est son métier et c'est plus rapide de vive voix.

                  Le pays se déduit de l'indicatif : deux saisies pour un même
                  fait laissaient écrire « Maroc » sous un numéro ivoirien.
                */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="whatsapp"
                    className="mono-label text-ivory-dim text-[0.68rem] tracking-wider"
                  >
                    Numéro WhatsApp <span className="text-gold">*</span>
                  </label>
                  <ChampWhatsapp classeChamp="border-line/70 bg-ink/70 rounded-clixa text-ivory focus:border-gold focus:ring-gold border px-4 py-3 text-[0.95rem] transition-all focus:ring-1" />
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

                <div className="sm:col-span-2">
                  {/*
                    ⚠️ Cochée par personne d'avance. Une case pré-cochée n'est
                    pas un consentement : c'est un consentement présumé, et
                    c'est exactement ce que le règlement refuse.

                    Le texte dit ce qu'on fait des données et rien de plus —
                    traiter la demande. Pas de mention d'un partenaire, pas de
                    « et nos partenaires » : on ne les transmet à personne.
                  */}
                  <label className="text-ivory-dim/90 flex cursor-pointer items-start gap-3 text-[0.86rem] leading-relaxed">
                    <input
                      type="checkbox"
                      name="consentement"
                      value="oui"
                      required
                      className="accent-gold mt-1 h-4 w-4 shrink-0 cursor-pointer"
                    />
                    <span>
                      J&apos;accepte que CLIXA Institute conserve les informations ci-dessus pour
                      traiter ma demande et me recontacter. Elles ne sont transmises à personne.
                    </span>
                  </label>
                </div>

                <div className="pt-2 sm:col-span-2">
                  <button
                    type="submit"
                    className="shimmer-gold from-gold-bright via-gold to-gold-bright text-ink rounded-clixa border-gold w-full cursor-pointer border bg-gradient-to-r px-8 py-4 text-xs font-bold tracking-wider uppercase shadow-[0_4px_18px_rgba(201,162,76,0.35)] transition-all hover:shadow-[0_6px_24px_rgba(201,162,76,0.5)]"
                  >
                    Envoyer ma demande de rappel
                  </button>
                  <p className="text-ivory-dim/70 mt-4 text-center text-[0.78rem]">
                    Vos données servent uniquement à traiter votre demande. Aucune utilisation
                    commerciale tierce.
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* ── Logos officiels WhatsApp, LinkedIn, Facebook (purs logos cliquables) ── */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3">
            <span className="mono-label text-ivory-dim/60 text-[0.68rem] tracking-widest uppercase">
              Canaux officiels
            </span>
            <ReseauxSociaux taille="large" />
          </div>
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
  inputMode,
  placeholder,
  aide,
  requis = false,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "tel" | "email" | "text";
  placeholder?: string;
  /** Une phrase sous le champ, quand la saisie attendue n'est pas évidente. */
  aide?: string;
  requis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="mono-label text-ivory-dim text-[0.68rem] tracking-wider">
        {label} {requis && <span className="text-gold">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-describedby={aide ? `${name}-aide` : undefined}
        required={requis}
        className="border-line/70 bg-ink/70 rounded-clixa text-ivory focus:border-gold focus:ring-gold border px-4 py-3 text-[0.95rem] transition-all focus:ring-1"
      />
      {aide && (
        <p id={`${name}-aide`} className="text-ivory-dim/70 text-[0.78rem] leading-relaxed">
          {aide}
        </p>
      )}
    </div>
  );
}
