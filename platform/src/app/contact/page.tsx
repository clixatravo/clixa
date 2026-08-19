import type { Metadata } from "next";
import { FilAriane } from "@/components/FilAriane";

export const metadata: Metadata = {
  title: "Être rappelé",
  description:
    "Laissez-nous vos coordonnées : un conseiller CLIXA vous rappelle pour vous présenter le programme et les modalités de financement.",
};

/**
 * FE-11 — Formulaire de demande de rappel.
 *
 * En phase 01, c'est la sortie de tous les CTA « Réserver » : le tunnel
 * transactionnel n'arrive qu'en phase 02. L'envoi est branché en BE-12.
 */
export default function Contact() {
  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "Être rappelé" }]} />

      <section className="px-8 py-16">
        <div className="mx-auto max-w-[640px]">
          <div className="eyebrow mono-label mb-5">Un conseiller vous rappelle</div>
          <h1 className="mb-5 text-[clamp(1.9rem,4vw,2.8rem)]">
            Parlons de votre projet de formation.
          </h1>
          <p className="text-ivory-dim mb-10 text-[0.98rem]">
            Renseignez vos coordonnées : nous revenons vers vous sous 24 h ouvrées pour préciser le
            programme, les dates et les possibilités de financement.
          </p>

          <form className="grid gap-5 sm:grid-cols-2">
            <Champ label="Nom complet" name="nom" autoComplete="name" requis />
            <Champ label="Adresse e-mail" name="email" type="email" autoComplete="email" requis />
            <Champ label="Numéro WhatsApp" name="whatsapp" type="tel" autoComplete="tel" requis />
            <Champ label="Pays" name="pays" autoComplete="country-name" requis />

            <div className="flex flex-col gap-2 sm:col-span-2">
              <label htmlFor="programme" className="mono-label text-ivory-dim text-[0.7rem]">
                Formation qui vous intéresse
              </label>
              <select
                id="programme"
                name="programme"
                className="border-line bg-panel rounded-clixa text-ivory focus:border-gold border px-3.5 py-3 text-[0.95rem]"
              >
                <option>Je ne sais pas encore</option>
                <option>Préparation à la certification PMP</option>
                <option>IFRS — Comptable international</option>
                <option>CMA — Certified Management Accountant</option>
                <option>Contrôle de gestion &amp; performance</option>
                <option>Autre / sur mesure</option>
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
                Vos données servent uniquement à traiter votre demande. Elles ne sont ni revendues,
                ni utilisées à d&apos;autres fins.
              </p>
            </div>
          </form>
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
