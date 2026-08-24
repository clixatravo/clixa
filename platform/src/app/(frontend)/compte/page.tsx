import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { participantConnecte } from "@/lib/session-apprenant";
import { dossiersDuCompte, prochaineEtape } from "@/lib/inscriptions";
import { formatPrix } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "Mon espace",
  robots: { index: false, follow: false },
};

const JOUR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

const ETAT: Record<string, string> = {
  demandee: "En attente de paiement",
  confirmee: "Acompte reçu",
  payee: "Réglée",
  terminee: "Parcours suivi",
  annulee: "Annulée",
};

/**
 * FE-20 — L'espace du participant.
 *
 * Ce que la page montre : ses dossiers, ses échéances, ses dates. Pas de
 * contenu de formation — le LMS n'est pas au programme cette année (décision A),
 * et promettre un espace de cours qui n'existe pas serait pire que rien.
 */
export default async function Compte() {
  const participant = await participantConnecte();
  if (!participant) redirect("/compte/connexion" as Route);

  const dossiers = await dossiersDuCompte(participant.id);

  return (
    <>
      <FilAriane items={[{ label: "Accueil", href: "/" }, { label: "Mon espace" }]} />

      <section className="px-8 py-13">
        <div className="mx-auto max-w-[900px]">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="mono-label text-gold mb-3 block">Mon espace</span>
              <h1 className="text-[clamp(1.5rem,2.8vw,2.1rem)]">{participant.nom}</h1>
              <p className="text-ivory-dim mt-2 text-[0.9rem]">{participant.email}</p>
            </div>

            <form action="/api/compte" method="POST">
              <input type="hidden" name="action" value="sortie" />
              <button
                type="submit"
                className="border-line text-ivory-dim hover:border-gold hover:text-ivory rounded-clixa min-h-9 border px-4 text-[0.82rem] transition-colors"
              >
                Se déconnecter
              </button>
            </form>
          </div>

          {dossiers.length === 0 ? (
            <div className="border-line bg-panel border p-6">
              <p className="text-[0.95rem]">
                Aucun dossier n&apos;est encore rattaché à ce compte.
              </p>
              <p className="text-ivory-dim mt-3 text-[0.86rem]">
                Si vous vous êtes inscrit avec une autre adresse, votre dossier reste accessible par
                sa référence — celle qui figure dans le courriel de confirmation.
              </p>
              <Link href="/formations" className="border-gold mt-5 inline-block border-b pb-1">
                Voir les formations →
              </Link>
            </div>
          ) : (
            <div className="carte-grid">
              {dossiers.map((d) => (
                <article key={d.reference} className="bg-panel p-6">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-[1.15rem] leading-snug">
                        {d.programmeTitre}
                      </h2>
                      <p className="text-ivory-dim mt-1 text-[0.82rem]">{d.sessionDetail}</p>
                    </div>
                    <span className="border-line text-ivory-dim rounded-clixa shrink-0 border px-2.5 py-1 font-mono text-[0.62rem] tracking-[0.08em] uppercase">
                      {ETAT[d.statut] ?? d.statut}
                    </span>
                  </div>

                  {/*
                    Ce que le dossier attend, en clair. Le statut seul ne dit ni
                    le montant, ni la date, ni qui doit bouger.
                  */}
                  <p className="border-gold text-ivory mb-4 border-l-2 pl-3 text-[0.88rem]">
                    {prochaineEtape(d)}
                  </p>

                  <div className="border-line flex flex-wrap gap-x-6 gap-y-2 border-t pt-4">
                    {d.echeances.map((e, i) => (
                      <div key={i}>
                        <div
                          className={`font-mono text-[0.86rem] tabular-nums ${
                            e.statut === "regle" ? "text-emerald-bright" : "text-ivory"
                          }`}
                        >
                          {formatPrix(e.montantCentimes)}
                        </div>
                        <div className="text-ivory-dim text-[0.72rem]">
                          {e.statut === "regle"
                            ? "réglée"
                            : e.dateLimite
                              ? `avant le ${JOUR.format(new Date(e.dateLimite))}`
                              : "à régler"}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={`/inscription/${d.reference}` as Route}
                    className="border-gold mt-5 inline-block border-b pb-1 text-[0.84rem]"
                  >
                    Voir le dossier {d.reference} →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
