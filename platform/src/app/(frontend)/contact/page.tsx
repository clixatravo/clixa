import type { Metadata } from "next";
import { FilAriane } from "@/components/FilAriane";
import { getProgrammes } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "Être rappelé",
  description:
    "Laissez-nous vos coordonnées : un conseiller CLIXA vous rappelle pour vous présenter le programme et les modalités de financement.",
};

interface Props {
  searchParams: Promise<{ envoye?: string; erreur?: string; programme?: string }>;
}

/**
 * FE-11 / BE-12 — Formulaire de demande de rappel.
 *
 * Sortie de tous les boutons « Réserver » tant que le tunnel de paiement
 * n'existe pas. Le formulaire poste vers /api/demande-rappel : il fonctionne
 * sans JavaScript, et la demande est enregistrée en base avant tout le reste.
 */
export default async function Contact({ searchParams }: Props) {
  const { envoye, erreur, programme: programmePreselectionne } = await searchParams;
  const programmes = await getProgrammes();

  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "Être rappelé" }]} />

      <section className="px-8 py-16">
        <div className="mx-auto max-w-[640px]">
          <div className="eyebrow mono-label mb-5">Un conseiller vous rappelle</div>
          <h1 className="mb-5 text-[clamp(1.9rem,4vw,2.8rem)]">
            Parlons de votre projet de formation.
          </h1>

          {envoye ? (
            <div className="border-emerald bg-emerald/10 rounded-clixa border p-8">
              <p className="font-display text-ivory mb-3 text-[1.3rem]">
                Votre demande est bien arrivée.
              </p>
              <p className="text-ivory-dim text-[0.95rem]">
                Un conseiller vous rappelle sous 24 h ouvrées, sur le numéro WhatsApp que vous avez
                indiqué. Inutile de renvoyer le formulaire.
              </p>
            </div>
          ) : (
            <>
              <p className="text-ivory-dim mb-10 text-[0.98rem]">
                Renseignez vos coordonnées : nous revenons vers vous sous 24 h ouvrées pour préciser
                le programme, les dates et les possibilités de financement.
              </p>

              {erreur && (
                <p
                  role="alert"
                  className="border-gold bg-gold/10 text-gold-bright rounded-clixa mb-8 border p-4 text-[0.9rem]"
                >
                  {erreur === "champs"
                    ? "Il manque une information obligatoire. Vérifiez les champs marqués d'une étoile."
                    : "Votre demande n'a pas pu être enregistrée. Réessayez, ou écrivez-nous à contact@clixa-institute.org."}
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
                  <label htmlFor="programme" className="mono-label text-ivory-dim text-[0.7rem]">
                    Formation qui vous intéresse
                  </label>
                  <select
                    id="programme"
                    name="programme"
                    defaultValue={programmePreselectionne ?? ""}
                    className="border-line bg-panel rounded-clixa text-ivory focus:border-gold border px-3.5 py-3 text-[0.95rem]"
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
                  <label htmlFor="message" className="mono-label text-ivory-dim text-[0.7rem]">
                    Votre message (facultatif)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    className="border-line bg-panel rounded-clixa text-ivory focus:border-gold min-h-20 resize-y border px-3.5 py-3 text-[0.95rem]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="bg-gold text-ink rounded-clixa border-gold hover:text-gold-bright w-full border px-6 py-3.5 text-sm font-bold transition-colors hover:bg-transparent sm:w-auto"
                  >
                    Envoyer ma demande
                  </button>
                  <p className="text-ivory-dim mt-4 text-[0.78rem]">
                    Vos données servent uniquement à traiter votre demande. Elles ne sont ni
                    revendues, ni utilisées à d&apos;autres fins.
                  </p>
                </div>
              </form>
            </>
          )}
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
      <label htmlFor={name} className="mono-label text-ivory-dim text-[0.7rem]">
        {label} {requis && <span className="text-gold">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={requis}
        className="border-line bg-panel rounded-clixa text-ivory focus:border-gold border px-3.5 py-3 text-[0.95rem]"
      />
    </div>
  );
}
