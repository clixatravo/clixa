import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { formatPrix, getTarifs } from "@/lib/catalogue";
import { getDossier } from "@/lib/inscriptions";

export const metadata: Metadata = {
  title: "Votre dossier",
  // Un dossier porte des coordonnées : il n'a rien à faire dans un index.
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ reference: string }>;
}

const JOUR = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * FE-18 — Le dossier d'inscription.
 *
 * Accessible par sa seule référence, sans compte. C'est un compromis assumé :
 * la page ne montre ni pièce d'identité ni coordonnées bancaires, et exiger un
 * mot de passe avant même le paiement ferait perdre des inscrits. Elle n'est
 * pas indexée, et la référence ne se devine pas.
 */
export default async function Dossier({ params }: Props) {
  const { reference } = await params;
  const dossier = await getDossier(reference);
  if (!dossier) notFound();

  const tarifs = await getTarifs();
  const beneficiaireConnu = Boolean(tarifs.beneficiaireNom);

  return (
    <>
      <FilAriane items={[{ label: "Votre dossier" }]} />

      <section className="px-8 py-13">
        <div className="mx-auto max-w-[820px]">
          <span className="mono-label text-gold mb-3 block">Place retenue</span>
          <h1 className="mb-2 text-[clamp(1.5rem,2.8vw,2.1rem)]">{dossier.programmeTitre}</h1>
          <p className="text-ivory-dim mb-8 text-[0.95rem]">
            {dossier.sessionLibelle} · dossier{" "}
            <strong className="text-gold-bright font-mono">{dossier.reference}</strong>
          </p>

          <div className="border-gold bg-panel mb-8 border p-6">
            <h2 className="font-display mb-4 text-[1.1rem]">Ce qu&apos;il reste à faire</h2>
            <ol className="text-ivory-dim flex flex-col gap-3 text-[0.9rem]">
              <li>
                <strong className="text-ivory">1.</strong> Envoyer le montant de la première
                échéance par Western Union, Ria ou MoneyGram.
              </li>
              <li>
                <strong className="text-ivory">2.</strong> Nous transmettre le numéro de transfert
                par WhatsApp, en citant la référence{" "}
                <span className="font-mono">{dossier.reference}</span>.
              </li>
              <li>
                <strong className="text-ivory">3.</strong> Nous vérifions le transfert et confirmons
                votre place — vous recevez alors le lien de connexion.
              </li>
            </ol>
          </div>

          {/* ── Les échéances ── */}
          <h2 className="font-display mb-4 text-[1.15rem]">Votre échéancier</h2>
          <div className="carte-grid mb-9 sm:grid-cols-3">
            {dossier.echeances.map((e, i) => (
              <div key={i} className="bg-panel p-5">
                <span className="mono-label text-ivory-dim mb-2 block text-[0.6rem]">
                  Échéance {i + 1}
                </span>
                <div className="font-display text-gold-bright text-[1.3rem] leading-none">
                  {formatPrix(e.montantCentimes)}
                </div>
                {e.dateLimite && (
                  <div className="text-ivory-dim mt-2 text-[0.76rem]">
                    avant le {JOUR.format(new Date(e.dateLimite))}
                  </div>
                )}
                <div
                  className={`mt-3 font-mono text-[0.62rem] tracking-[0.1em] uppercase ${
                    e.statut === "regle" ? "text-emerald-bright" : "text-ivory-dim"
                  }`}
                >
                  {e.statut === "regle"
                    ? "réglée"
                    : e.statut === "annonce"
                      ? "en vérification"
                      : "à régler"}
                </div>
              </div>
            ))}
          </div>

          {/* ── Où envoyer ── */}
          <h2 className="font-display mb-4 text-[1.15rem]">Où envoyer le règlement</h2>
          {beneficiaireConnu ? (
            <div className="border-line bg-panel border p-6">
              <dl className="flex flex-col gap-3 text-[0.9rem]">
                <Ligne terme="Bénéficiaire" valeur={tarifs.beneficiaireNom} />
                <Ligne
                  terme="Ville et pays"
                  valeur={[tarifs.beneficiaireVille, tarifs.beneficiairePays]
                    .filter(Boolean)
                    .join(", ")}
                />
                <Ligne terme="Services acceptés" valeur={tarifs.moyensPaiement.join(" · ")} />
                <Ligne terme="Motif à indiquer" valeur={dossier.reference} />
              </dl>
              {tarifs.consignesPaiement && (
                <p className="border-line text-ivory-dim mt-5 border-t pt-4 text-[0.84rem] leading-relaxed">
                  {tarifs.consignesPaiement}
                </p>
              )}
            </div>
          ) : (
            /*
              Les coordonnées du bénéficiaire ne s'inventent pas. Tant qu'elles
              ne sont pas saisies, on le dit plutôt que d'afficher un cadre vide
              qui laisserait croire à un oubli du participant.
            */
            <p className="border-line bg-panel border p-6 text-[0.92rem]">
              Les coordonnées de transfert vous seront communiquées par WhatsApp. Citez la référence{" "}
              <span className="text-gold-bright font-mono">{dossier.reference}</span> dans votre
              message.
            </p>
          )}

          <p className="text-ivory-dim mt-8 text-[0.8rem]">
            Conservez cette adresse : elle vous ramène à votre dossier, sans mot de passe.
          </p>
        </div>
      </section>
    </>
  );
}

function Ligne({ terme, valeur }: { terme: string; valeur?: string }) {
  if (!valeur) return null;
  return (
    <div className="border-line flex flex-wrap justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
      <dt className="text-ivory-dim">{terme}</dt>
      <dd className="text-ivory font-semibold">{valeur}</dd>
    </div>
  );
}
