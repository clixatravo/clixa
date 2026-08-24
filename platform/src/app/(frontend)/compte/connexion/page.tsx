import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { participantConnecte } from "@/lib/session-apprenant";
import { ChampCompte, FormulaireCompte } from "@/components/FormulaireCompte";

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

      <section className="px-8 py-13">
        <div className="mx-auto max-w-[460px]">
          <span className="mono-label text-gold mb-3 block">Mon espace</span>
          <h1 className="mb-3 text-[clamp(1.4rem,2.6vw,1.9rem)]">Se connecter</h1>
          <p className="text-ivory-dim mb-8 text-[0.92rem]">
            Pour retrouver vos dossiers au même endroit. Un dossier isolé reste accessible par sa
            référence, sans compte.
          </p>

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

          <p className="text-ivory-dim mt-6 text-[0.86rem]">
            Pas encore de compte ?{" "}
            <Link href="/compte/creer" className="border-gold text-ivory border-b">
              En créer un
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
