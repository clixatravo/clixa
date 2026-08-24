import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { participantConnecte } from "@/lib/session-apprenant";
import { ChampCompte, FormulaireCompte } from "@/components/FormulaireCompte";
import { CadreCompte } from "@/components/CadreCompte";

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
      </CadreCompte>
    </>
  );
}
