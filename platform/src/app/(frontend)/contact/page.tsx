import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilAriane } from "@/components/FilAriane";
import { ReseauxSociaux } from "@/components/ReseauxSociaux";
import { RESEAUX_CLIXA } from "@/lib/reseaux";

export const metadata: Metadata = {
  title: "Nous contacter",
  description:
    "Écrivez-nous sur WhatsApp ou par courriel : notre Responsable Orientation répond sur le programme, les dates et les modalités de règlement.",
};

interface Props {
  searchParams: Promise<{
    /** Posé par le lien d'une cohorte complète — voir `lib/attente.ts`. */
    attente?: string;
    /** Le parcours d'où l'on vient, pour écrire un message qui le nomme. */
    programme?: string;
    /**
     * ⚠️ Gardés bien qu'inutilisés : d'anciens liens « Être rappelé » les
     * portent encore, et les retirer du type ferait échouer le build dessus.
     */
    envoye?: string;
    erreur?: string;
    plan?: string;
  }>;
}

/**
 * Nous contacter.
 *
 * ── ⚠️ Cette page portait un formulaire de rappel, et il a été retiré ────────
 * Décision de la direction le 18 septembre 2026 — « khass l wahed darori i diir
 * inscription 3ad tla9 lih dommand de rappel » : on ne laisse plus un numéro
 * pour être rappelé, on se pré-inscrit, et **c'est depuis son dossier** qu'on
 * demande un appel.
 *
 * **Mesuré sur la production le jour même**, avant d'y toucher :
 *
 * - **36 demandes de rappel en treize jours**, et **les 36 encore au statut
 *   « nouvelle »** — pas une n'avait été traitée. La file n'était pas longue,
 *   elle n'était relevée par personne ;
 * - **4 sur 36** ont fini par s'inscrire.
 *
 * Ce n'est donc pas une porte qu'on ferme, c'est une porte qui ne menait nulle
 * part. Et le geste qu'elle demandait — laisser un numéro — était le plus
 * facile à obtenir, ce qui est précisément le reproche : la pré-inscription
 * n'engage à rien non plus, et elle donne un dossier, un parcours, une formule,
 * un poste. Le journal note déjà le même raisonnement au 6 septembre 2026, pour
 * la fenêtre de rappel : « on offre de parler, on ne le réclame pas ».
 *
 * ── Ce que la page fait maintenant ──────────────────────────────────────────
 * Elle donne les deux adresses par lesquelles on nous joint vraiment, et elle
 * mène au catalogue. Rien n'y est demandé, rien n'y est enregistré, et la page
 * ne dépend plus ni de la base ni d'aucune route.
 *
 * ⚠️ **Elle ne disparaît pas pour autant.** « Nous contacter » est dans l'en-tête
 * de chaque page et quatorze endroits y renvoient ; c'est aussi ce qu'un
 * employeur ou une banque cherche avant de croire un certificat. Une page de
 * contact qui ne contient que des moyens de contact reste une page de contact.
 *
 * ⚠️ **Ce que le retrait coûte, écrit pour qu'on le sache** : plus aucun
 * `Lead` n'est signalé à Meta depuis cette page. Le commentaire d'origine
 * affirmait que la demande de rappel était « celui que le trafic acheté produit
 * le plus souvent » — c'était vrai quand il a été écrit, et la mesure du
 * 18 septembre le dément : **111 dossiers contre 36 demandes**. La
 * pré-inscription signale toujours le sien, et c'est désormais le seul, ce qui
 * est exactement ce qu'on veut apprendre à la diffusion.
 */
export default async function Contact({ searchParams }: Props) {
  const { attente, programme } = await searchParams;

  const surListeDAttente = attente === "1";

  /*
    ── ⚠️ La cohorte complète garde une porte, et c'est WhatsApp ──────────────
    Elle ne peut pas passer par la pré-inscription : il n'y a plus de place à
    retenir, c'est tout le problème. La lui refuser reviendrait à perdre
    justement celui qui voulait s'inscrire et n'a pas pu — le cas que le journal
    relève comme « le moment le plus conséquent d'une campagne ».

    Le message nomme le parcours, pour que l'équipe sache quoi rouvrir. Il part
    d'un slug reconnu dans l'adresse, et rien de ce qui est reçu n'est réfléchi
    tel quel dans la page : `encodeURIComponent` le porte dans l'URL de WhatsApp,
    jamais dans le HTML.
  */
  const messageAttente = programme
    ? `Bonjour, la cohorte « ${programme.replace(/-/g, " ")} » est complète. Je souhaite être prévenu(e) dès qu'une place se libère ou qu'une date s'ouvre.`
    : "Bonjour, la cohorte qui m'intéresse est complète. Je souhaite être prévenu(e) dès qu'une place se libère ou qu'une date s'ouvre.";

  const texteWhatsapp = surListeDAttente
    ? messageAttente
    : "Bonjour, je souhaite des précisions sur vos parcours CLIXA.";

  return (
    <>
      <FilAriane
        items={[
          { href: "/", label: "Accueil" },
          { label: surListeDAttente ? "Liste d'attente" : "Nous contacter" },
        ]}
      />

      <section className="relative overflow-hidden px-8 py-16 lg:py-20">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[680px]">
          <div className="eyebrow mono-label mb-5">
            {surListeDAttente ? "Cohorte complète" : "Nous joindre"}
          </div>

          {/*
            ⚠️ **Le titre doit dire ce sur quoi on vient de cliquer.** Le premier
            jet annonçait « Cette cohorte est complète » — vrai, et à côté de la
            question : qui vient de cliquer « Rejoindre la liste d'attente »
            sait déjà que la cohorte est pleine, ce qu'il cherche est la
            confirmation d'avoir rejoint quelque chose. C'est le défaut corrigé
            une première fois quand il atterrissait sur « Parlons de votre
            projet de formation », et une épreuve le garde depuis — elle est
            passée au rouge sur ce jet, ce qui est exactement son travail.
          */}
          <h1 className="mb-4 text-[clamp(2.1rem,4.4vw,3.2rem)] font-bold">
            {surListeDAttente ? (
              <>
                Rejoindre la <span className="gold-gradient-text">liste d&apos;attente</span>.
              </>
            ) : (
              <>
                Parlons de votre projet de <span className="gold-gradient-text">formation</span>.
              </>
            )}
          </h1>

          <p className="text-ivory-dim/95 mb-9 text-[1rem] leading-relaxed">
            {surListeDAttente
              ? "Cette cohorte est complète. Écrivez-nous en un message : nous vous prévenons dès qu'une place se libère ou qu'une date s'ouvre."
              : "Notre Responsable Orientation répond sur le programme, les dates, le rythme de paiement et les modalités de règlement. Écrivez-nous, vous aurez quelqu'un au bout."}
          </p>

          <div className="glass-panel-gold rounded-clixa p-8 shadow-2xl sm:p-10">
            <p className="mono-label text-gold mb-4 text-[0.68rem] tracking-wider">
              Nous joindre directement
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <a
                href={`${RESEAUX_CLIXA.whatsapp.url}?text=${encodeURIComponent(texteWhatsapp)}`}
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

            {/*
              ⚠️ **On dit ce qui a changé, plutôt que de laisser un vide.**
              Quelqu'un qui revient sur cette page y cherchera le formulaire qu'il
              y a vu. Ne rien dire lui ferait croire à une page à moitié chargée
              — le défaut relevé pour la rubrique de filtre sans choix, et pour
              le lecteur vidéo qui montrait un carré noir.
            */}
            {!surListeDAttente && (
              <div className="border-line/70 bg-ink/40 rounded-clixa mt-8 border p-5">
                <p className="text-ivory-dim/95 text-[0.92rem] leading-relaxed">
                  Vous cherchez le formulaire de rappel ? Il a été retiré. Pour être rappelé par un
                  conseiller,{" "}
                  <Link href={"/formations" as Route} className="border-gold text-ivory border-b">
                    choisissez votre parcours
                  </Link>{" "}
                  et demandez votre place : la pré-inscription ne vous engage à rien, et le bouton «
                  Être rappelé » se trouve ensuite sur la page de votre dossier.
                </p>
                <p className="text-ivory-dim/70 mt-3 text-[0.8rem] leading-relaxed">
                  Vous y reprenez la main : votre demande arrive avec votre parcours et votre
                  formule, et le conseiller sait de quoi vous parler.
                </p>
              </div>
            )}
          </div>

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
