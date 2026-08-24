import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { participantConnecte } from "@/lib/session-apprenant";
import { ChampCompte, FormulaireCompte } from "@/components/FormulaireCompte";
import { CadreCompte } from "@/components/CadreCompte";

export const metadata: Metadata = {
  title: "Se connecter",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, string> = {
  champs: "Il manque l'adresse ou le mot de passe.",
  identifiants: "Adresse ou mot de passe incorrect.",
};

export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  // Déjà connecté : rien à faire ici.
  if (await participantConnecte()) redirect("/compte" as Route);

  const { erreur } = await searchParams;

  return (
    <>
      <FilAriane items={[{ label: "Accueil", href: "/" }, { label: "Se connecter" }]} />

      <CadreCompte
        titre="Se connecter"
        intro="Pour retrouver vos dossiers au même endroit. Un dossier isolé reste accessible par sa référence, sans compte."
        bas={
          <>
            Pas encore de compte ?{" "}
            <Link href="/compte/creer" className="border-gold text-ivory border-b">
              En créer un
            </Link>
          </>
        }
      >
        <FormulaireCompte
          action="connexion"
          erreur={erreur ? (MESSAGES[erreur] ?? MESSAGES.identifiants) : undefined}
          libelleBouton="Se connecter"
        >
          <ChampCompte label="Adresse e-mail" name="email" type="email" autoComplete="email" />
          <ChampCompte
            label="Mot de passe"
            name="motDePasse"
            type="password"
            autoComplete="current-password"
          />
        </FormulaireCompte>
      </CadreCompte>
    </>
  );
}
