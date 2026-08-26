import type { Metadata } from "next";
import { FilAriane } from "@/components/FilAriane";
import { formatPrix, getProgrammes, getTarifs } from "@/lib/catalogue";
import { ReseauxSociaux } from "@/components/ReseauxSociaux";

export const metadata: Metadata = {
  title: "Être rappelé",
  description:
    "Laissez-nous vos coordonnées : un conseiller CLIXA vous rappelle pour vous présenter le programme et les modalités de financement.",
};

interface Props {
  searchParams: Promise<{
    envoye?: string;
    erreur?: string;
    programme?: string;
    plan?: string;
  }>;
}

/**
 * FE-11 / BE-12 — Formulaire de demande de rappel.
 *
 * Sortie de tous les boutons « Réserver » tant que le tunnel de paiement
 * n'existe pas. Le formulaire poste vers /api/demande-rappel : il fonctionne
 * sans JavaScript, et la demande est enregistrée en base avant tout le reste.
 */
export default async function Contact({ searchParams }: Props) {
  const {
    envoye,
    erreur,
    programme: programmePreselectionne,
    plan: planChoisi,
  } = await searchParams;
  const programmes = await getProgrammes();
  const tarifs = await getTarifs();

  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "Être rappelé" }]} />

      <section className="relative overflow-hidden px-8 py-16 lg:py-20">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[680px]">
          <div className="eyebrow mono-label mb-5">Un conseiller vous rappelle</div>
          <h1 className="mb-4 text-[clamp(2.1rem,4.4vw,3.2rem)] font-bold">
            Parlons de votre projet de <span className="gold-gradient-text">formation</span>.
          </h1>

          {envoye ? (
            <div className="border-emerald/60 bg-emerald/15 rounded-clixa border p-8 shadow-xl backdrop-blur-sm">
              <p className="font-display text-ivory mb-3 text-[1.35rem] font-semibold">
                Votre demande est bien enregistrée.
              </p>
              <p className="text-ivory-dim/95 text-[0.96rem] leading-relaxed">
                Un conseiller CLIXA vous rappelle sous 24 h ouvrées, sur le numéro WhatsApp que vous
                avez indiqué. Inutile de renvoyer le formulaire.
              </p>
            </div>
          ) : (
            <div className="glass-panel-gold rounded-clixa p-8 shadow-2xl sm:p-10">
              <p className="text-ivory-dim/95 mb-8 text-[0.98rem] leading-relaxed">
                Renseignez vos coordonnées : un conseiller pédagogique revient vers vous sous 24 h
                ouvrées pour préciser le programme, les dates et les possibilités de financement.
              </p>

              {erreur && (
                <p
                  role="alert"
                  className="border-gold bg-gold/15 text-gold-bright rounded-clixa mb-8 border p-4 text-[0.9rem]"
                >
                  {erreur === "champs"
                    ? "Il manque une information obligatoire. Vérifiez les champs marqués d'une étoile."
                    : "Votre demande n'a pas pu être enregistrée. Réessayez, ou écrivez-nous à contact@clixa.africa."}
                </p>
              )}

              <form
                action="/api/demande-rappel"
                method="post"
                className="grid gap-5 sm:grid-cols-2"
              >
                {/* Champ leurre : masqué aux humains, souvent rempli par les robots. */}
                <div aria-hidden="true" className="hidden">
                  <label htmlFor="site_web">Ne pas remplir</label>
                  <input
                    id="site_web"
                    name="site_web"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <input type="hidden" name="origine" value="/contact" />

                <Champ label="Nom complet" name="nom" autoComplete="name" requis />
                <Champ
                  label="Adresse e-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  requis
                />
                <Champ
                  label="Numéro WhatsApp"
                  name="whatsapp"
                  type="tel"
                  autoComplete="tel"
                  requis
                />
                <Champ label="Pays" name="pays" autoComplete="country-name" requis />

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label
                    htmlFor="programme"
                    className="mono-label text-ivory-dim text-[0.68rem] tracking-wider"
                  >
                    Formation qui vous intéresse
                  </label>
                  <select
                    id="programme"
                    name="programme"
                    defaultValue={programmePreselectionne ?? ""}
                    className="border-line/70 bg-ink/70 rounded-clixa text-ivory focus:border-gold focus:ring-gold border px-4 py-3 text-[0.95rem] transition-all focus:ring-1"
                  >
                    <option value="">Je ne sais pas encore</option>
                    {programmes.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.titre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label
                    htmlFor="plan"
                    className="mono-label text-ivory-dim text-[0.68rem] tracking-wider"
                  >
                    Rythme de paiement souhaité
                  </label>
                  <select
                    id="plan"
                    name="plan"
                    defaultValue={planChoisi ?? ""}
                    className="border-line/70 bg-ink/70 rounded-clixa text-ivory focus:border-gold focus:ring-gold border px-4 py-3 text-[0.95rem] transition-all focus:ring-1"
                  >
                    <option value="">À décider avec le conseiller</option>
                    {tarifs.plans.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.libelle} — {formatPrix(p.totalCentimes)}
                        {p.echeancesCentimes.length > 1
                          ? ` (${p.echeancesCentimes.map((m) => formatPrix(m)).join(" + ")})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label
                    htmlFor="message"
                    className="mono-label text-ivory-dim text-[0.68rem] tracking-wider"
                  >
                    Votre message (facultatif)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    className="border-line/70 bg-ink/70 rounded-clixa text-ivory focus:border-gold focus:ring-gold min-h-24 resize-y border px-4 py-3 text-[0.95rem] transition-all focus:ring-1"
                  />
                </div>

                <div className="pt-2 sm:col-span-2">
                  <button
                    type="submit"
                    className="shimmer-gold from-gold-bright via-gold to-gold-bright text-ink rounded-clixa border-gold w-full cursor-pointer border bg-gradient-to-r px-8 py-4 text-xs font-bold tracking-wider uppercase shadow-[0_4px_18px_rgba(201,162,76,0.35)] transition-all hover:shadow-[0_6px_24px_rgba(201,162,76,0.5)]"
                  >
                    Envoyer ma demande de rappel
                  </button>
                  <p className="text-ivory-dim/70 mt-4 text-center text-[0.78rem]">
                    Vos données servent uniquement à traiter votre demande. Aucune utilisation
                    commerciale tierce.
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* ── Logos officiels WhatsApp, LinkedIn, Facebook (purs logos cliquables) ── */}
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

function Champ({
  label,
  name,
  type = "text",
  autoComplete,
  requis = false,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  requis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="mono-label text-ivory-dim text-[0.68rem] tracking-wider">
        {label} {requis && <span className="text-gold">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={requis}
        className="border-line/70 bg-ink/70 rounded-clixa text-ivory focus:border-gold focus:ring-gold border px-4 py-3 text-[0.95rem] transition-all focus:ring-1"
      />
    </div>
  );
}
