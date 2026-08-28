import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { participantConnecte } from "@/lib/session-apprenant";
import { ChampCompte, FormulaireCompte } from "@/components/FormulaireCompte";
import { CadreCompte } from "@/components/CadreCompte";
import { BoutonGoogle } from "@/components/BoutonGoogle";

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
  searchParams: Promise<{ erreur?: string; dossier?: string; envoye?: string }>;
}) {
  if (await participantConnecte()) redirect("/compte" as Route);

  const { erreur, dossier, envoye } = await searchParams;

  /*
    ── Le compte existe, mais il n'ouvre encore rien ─────────────────────────
    On ne connecte pas dans la foulée : Payload vient d'envoyer un lien, et le
    compte reste inutilisable tant qu'il n'est pas suivi. C'est ce qui arrête
    un robot — remplir le formulaire ne donne rien, il faut relever une boîte
    aux lettres — et c'est aussi ce qui prouve enfin l'adresse.

    On réaffiche donc une page, pas le formulaire : le remontrer laisserait
    croire que rien ne s'est passé, et ferait recommencer.
  */
  if (envoye) {
    return (
      <>
        <FilAriane items={[{ label: "Accueil", href: "/" }, { label: "Créer un accès" }]} />
        <section className="px-5 py-8 sm:px-8 sm:py-13">
          <div className="mx-auto max-w-[46rem]">
            <span className="mono-label text-gold mb-3 block">Mon espace</span>
            <h1 className="mb-4 text-[clamp(1.4rem,2.6vw,1.9rem)]">Vérifiez votre boîte</h1>
            <p className="text-ivory-dim mb-6 text-[0.95rem] leading-relaxed">
              Un message vient de partir à l&apos;adresse que vous avez indiquée. Il contient un
              lien à suivre : c&apos;est lui qui ouvre votre accès.
            </p>
            <p className="text-ivory-dim/80 mb-8 text-[0.88rem] leading-relaxed">
              Rien n&apos;arrive au bout de quelques minutes ? Regardez dans les indésirables — un
              premier message d&apos;un domaine qu&apos;on ne connaît pas y atterrit souvent.
            </p>
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
