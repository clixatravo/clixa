import type { Metadata, Route } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { FilAriane } from "@/components/FilAriane";

export const metadata: Metadata = {
  title: "Confirmer votre adresse",
  robots: { index: false, follow: false },
};

/**
 * Le lien reçu par courriel aboutit ici.
 *
 * ── Pourquoi une page et non une route ──────────────────────────────────────
 * Payload expose bien un point d'entrée pour vérifier un jeton, mais il répond
 * en JSON. Quelqu'un qui clique dans sa boîte aux lettres doit voir une phrase,
 * pas un objet — et savoir quoi faire ensuite.
 *
 * ⚠️ On ne connecte pas dans la foulée. Le lien vit dans une boîte aux lettres,
 * qui se partage, se transfère et se retrouve dans un historique : le suivre
 * prouve que l'adresse est atteignable, pas que celui qui l'ouvre est le
 * titulaire du compte. Il confirme, puis on demande le mot de passe.
 */
export default async function Confirmer({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let etat: "confirme" | "invalide" | "absent" = token ? "invalide" : "absent";

  if (token) {
    try {
      const payload = await getPayload({ config });
      await payload.verifyEmail({ collection: "apprenants", token });
      etat = "confirme";
    } catch {
      /*
        Un jeton déjà consommé et un jeton inventé se ressemblent : dans les
        deux cas, on renvoie à la connexion. Distinguer apprendrait à qui
        essaie lesquels ont existé.
      */
      etat = "invalide";
    }
  }

  const titre = etat === "confirme" ? "Votre adresse est confirmée" : "Ce lien n'est plus valable";

  return (
    <>
      <FilAriane items={[{ label: "Accueil", href: "/" }, { label: "Confirmation" }]} />

      <section className="px-5 py-8 sm:px-8 sm:py-13">
        <div className="mx-auto max-w-[46rem]">
          <span className="mono-label text-gold mb-3 block">Mon espace</span>
          <h1 className="mb-4 text-[clamp(1.4rem,2.6vw,1.9rem)]">{titre}</h1>

          {etat === "confirme" ? (
            <p className="text-ivory-dim mb-8 text-[0.95rem] leading-relaxed">
              Votre accès est ouvert. Connectez-vous pour retrouver vos dossiers, vos échéances et
              les dates de vos séances.
            </p>
          ) : (
            <p className="text-ivory-dim mb-8 text-[0.95rem] leading-relaxed">
              Il a peut-être déjà servi — un lien de confirmation ne fonctionne qu&apos;une fois —
              ou il a été recopié en partie. Essayez de vous connecter : si votre adresse est déjà
              confirmée, tout est en ordre.
            </p>
          )}

          <Link
            href={"/compte/connexion" as Route}
            className="bg-gold text-ink rounded-clixa hover:bg-gold-bright inline-flex min-h-11 items-center px-5 text-[0.9rem] font-semibold transition-colors"
          >
            Aller à la connexion
          </Link>
        </div>
      </section>
    </>
  );
}
