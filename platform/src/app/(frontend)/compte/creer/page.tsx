import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { participantConnecte } from "@/lib/session-apprenant";
import { ChampCompte, FormulaireCompte } from "@/components/FormulaireCompte";

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
  searchParams: Promise<{ erreur?: string }>;
}) {
  if (await participantConnecte()) redirect("/compte" as Route);

  const { erreur } = await searchParams;

  return (
    <>
      <FilAriane items={[{ label: "Accueil", href: "/" }, { label: "Créer un compte" }]} />

      <section className="px-8 py-13">
        <div className="mx-auto max-w-[460px]">
          <span className="mono-label text-gold mb-3 block">Mon espace</span>
          <h1 className="mb-3 text-[clamp(1.4rem,2.6vw,1.9rem)]">Créer un compte</h1>
          <p className="text-ivory-dim mb-8 text-[0.92rem]">
            Utilisez l&apos;adresse de votre inscription : vos dossiers s&apos;y rattacheront
            automatiquement.
          </p>

          <FormulaireCompte
            action="creation"
            erreur={erreur ? (MESSAGES[erreur] ?? MESSAGES.impossible) : undefined}
            libelleBouton="Créer mon compte"
          >
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

          <p className="text-ivory-dim mt-6 text-[0.86rem]">
            Vous avez déjà un compte ?{" "}
            <Link href="/compte/connexion" className="border-gold text-ivory border-b">
              Se connecter
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
