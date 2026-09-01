import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { participantConnecte } from "@/lib/session-apprenant";
import { ChampCompte, FormulaireCompte } from "@/components/FormulaireCompte";
import { CadreCompte } from "@/components/CadreCompte";
import { BoutonGoogle } from "@/components/BoutonGoogle";
import { RESEAUX_CLIXA } from "@/lib/reseaux";

export const metadata: Metadata = {
  title: "Créer un compte",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, string> = {
  champs: "Il manque une information.",
  court: "Le mot de passe doit faire au moins huit caractères.",
  impossible:
    "La création a échoué. Cette adresse a peut-être déjà un compte — essayez de vous connecter.",
};

export default async function CreerCompte({
  searchParams,
}: {
  searchParams: Promise<{
    erreur?: string;
    dossier?: string;
    envoye?: string;
    /** « echec » quand le compte est créé mais que le lien n'a pas pu partir. */
    courriel?: string;
    /** Posé au retour d'un renvoi de lien. */
    renvoye?: string;
  }>;
}) {
  if (await participantConnecte()) redirect("/compte" as Route);

  const { erreur, dossier, envoye, courriel, renvoye } = await searchParams;

  /*
    ── Le compte existe, mais il n'ouvre encore rien ─────────────────────────
    On ne connecte pas dans la foulée : Payload vient d'envoyer un lien, et le
    compte reste inutilisable tant qu'il n'est pas suivi. C'est ce qui arrête
    un robot — remplir le formulaire ne donne rien, il faut relever une boîte
    aux lettres — et c'est aussi ce qui prouve enfin l'adresse.

    On réaffiche donc une page, pas le formulaire : le remontrer laisserait
    croire que rien ne s'est passé, et ferait recommencer.
  */
  if (envoye || renvoye) {
    return (
      <>
        <FilAriane items={[{ label: "Accueil", href: "/" }, { label: "Créer un accès" }]} />
        <section className="px-5 py-8 sm:px-8 sm:py-13">
          <div className="mx-auto max-w-[46rem]">
            <span className="mono-label text-gold mb-3 block">Mon espace</span>
            <h1 className="mb-4 text-[clamp(1.4rem,2.6vw,1.9rem)]">
              {courriel === "echec" ? "Votre accès est créé" : "Vérifiez votre boîte"}
            </h1>

            {/*
              ── Dire la vérité quand le courrier n'est pas parti ────────────
              Le compte se crée même si l'envoi échoue : c'est ce qui empêche un
              expéditeur en panne de fermer l'inscription. Mais annoncer alors
              « un message vient de partir » ferait attendre pour rien, puis
              conclure que le site est cassé.
            */}
            {courriel === "echec" ? (
              <p className="border-gold bg-gold/10 text-ivory mb-6 border-l-2 p-4 text-[0.95rem] leading-relaxed">
                Votre compte existe, mais nous n&apos;avons pas pu vous envoyer le lien de
                confirmation — notre service de courrier est momentanément indisponible. Redemandez
                le lien ci-dessous dans quelques minutes ; si cela persiste, écrivez-nous à
                {RESEAUX_CLIXA.email.adresse}.
              </p>
            ) : (
              <p className="text-ivory-dim mb-6 text-[0.95rem] leading-relaxed">
                Un message vient de partir à l&apos;adresse que vous avez indiquée. Il contient un
                lien à suivre : c&apos;est lui qui ouvre votre accès.
              </p>
            )}

            <p className="text-ivory-dim/80 mb-6 text-[0.88rem] leading-relaxed">
              Rien n&apos;arrive au bout de quelques minutes ? Regardez dans les indésirables — un
              premier message d&apos;un domaine qu&apos;on ne connaît pas y atterrit souvent.
            </p>

            {/*
              Sans ce renvoi, un envoi manqué enferme dehors : l'adresse est
              prise, donc on ne peut pas recommencer, et le compte ne s'ouvre
              pas. La route répond la même chose quoi qu'il arrive — elle n'a
              rien à apprendre à qui essaie des adresses.
            */}
            <form action="/api/confirmation" method="POST" className="mb-8">
              <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
                <label htmlFor="site_web_renvoi">Ne pas remplir</label>
                <input
                  id="site_web_renvoi"
                  name="site_web"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <label
                htmlFor="renvoi-email"
                className="mono-label text-ivory-dim mb-2 block text-[0.7rem]"
              >
                Renvoyer le lien
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="renvoi-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Votre adresse"
                  className="border-line bg-ink rounded-clixa text-ivory focus:border-gold min-h-11 w-full min-w-0 border px-3.5 text-[0.95rem]"
                />
                <button
                  type="submit"
                  className="border-line text-ivory hover:border-gold rounded-clixa min-h-11 shrink-0 border px-5 text-[0.9rem] transition-colors"
                >
                  Renvoyer
                </button>
              </div>
              {renvoye && (
                <p role="status" className="text-ivory-dim mt-3 text-[0.84rem]">
                  Si cette adresse a un accès en attente, le lien vient de repartir.
                </p>
              )}
            </form>
            <Link
              href={"/compte/connexion" as Route}
              className="border-line text-ivory hover:border-gold rounded-clixa inline-flex min-h-11 items-center border px-5 text-[0.9rem] transition-colors"
            >
              Aller à la connexion
            </Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <FilAriane items={[{ label: "Accueil", href: "/" }, { label: "Créer un compte" }]} />

      <CadreCompte
        titre="Créer un compte"
        intro="Utilisez l'adresse de votre inscription : vos dossiers s'y rattacheront automatiquement."
        bas={
          <>
            Vous avez déjà un compte ?{" "}
            <Link href="/compte/connexion" className="border-gold text-ivory border-b">
              Se connecter
            </Link>
          </>
        }
      >
        <BoutonGoogle libelle="S'inscrire avec Google" />

        <FormulaireCompte
          action="creation"
          erreur={erreur ? (MESSAGES[erreur] ?? MESSAGES.impossible) : undefined}
          libelleBouton="Créer mon compte"
        >
          {/*
            La référence du dossier d'où l'on vient, s'il y en a un. Champ caché
            plutôt que visible : le participant l'a déjà donnée en arrivant ici,
            la redemander serait lui faire recopier ce qu'il vient de lire.
          */}
          {dossier && <input type="hidden" name="dossier" value={dossier} />}
          <ChampCompte label="Nom complet" name="nom" autoComplete="name" />
          <ChampCompte label="Adresse e-mail" name="email" type="email" autoComplete="email" />
          <ChampCompte
            label="Mot de passe"
            name="motDePasse"
            type="password"
            autoComplete="new-password"
            aide="Huit caractères au minimum."
          />
        </FormulaireCompte>
      </CadreCompte>
    </>
  );
}
