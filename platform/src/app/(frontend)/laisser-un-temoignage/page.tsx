import type { Metadata } from "next";
import Link from "next/link";
import { FilAriane } from "@/components/FilAriane";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { getProgrammes } from "@/lib/catalogue";
import { COHORTES, MESSAGES_TEMOIGNAGE, TEXTE_MAX } from "@/lib/temoignages";

/*
  ⚠️ `noindex`, et hors du plan du site. Cette page s'adresse à d'anciens
  participants, à qui l'équipe envoie le lien. Elle n'a rien à faire dans un
  moteur de recherche, où elle n'attirerait que ceux qui n'ont rien suivi.
  Elle reste atteignable depuis /temoignages.
*/
export const metadata: Metadata = {
  title: "Laisser un témoignage",
  description:
    "Vous avez suivi un parcours CLIXA Institute ? Partagez votre expérience avec les prochains participants.",
  robots: { index: false, follow: true },
};

interface Props {
  searchParams: Promise<{ erreur?: string; envoye?: string }>;
}

const classeChamp =
  "border-line bg-ink rounded-clixa text-ivory focus:border-gold w-full min-w-0 border px-3.5 py-3 text-[0.95rem]";

export default async function LaisserUnTemoignage({ searchParams }: Props) {
  const { erreur, envoye } = await searchParams;
  const programmes = await getProgrammes();
  const message = erreur
    ? (MESSAGES_TEMOIGNAGE[erreur as keyof typeof MESSAGES_TEMOIGNAGE] ??
      MESSAGES_TEMOIGNAGE.technique)
    : undefined;

  return (
    <>
      <FilAriane
        items={[
          { href: "/temoignages", label: "Ils l'ont fait" },
          { label: "Laisser un témoignage" },
        ]}
      />

      <section className="px-6 pt-10 pb-8 sm:px-8 sm:pt-13">
        <div className="mx-auto max-w-[860px]">
          <span className="mono-label text-gold mb-3 block">Anciens participants</span>
          <h1 className="mb-4 max-w-[24ch] text-[clamp(1.8rem,4vw,2.6rem)] leading-tight">
            Vous avez suivi un parcours&nbsp;?{" "}
            <span className="gold-gradient-text">Racontez-le.</span>
          </h1>
          <p className="text-ivory-dim max-w-[62ch] text-[1rem] leading-relaxed">
            Ceux qui hésitent à s&apos;inscrire veulent savoir ce que la formation a changé pour
            quelqu&apos;un comme eux. Quelques phrases suffisent : ce que vous en retenez, ce que
            vous appliquez aujourd&apos;hui.
          </p>
        </div>
      </section>

      <section id="formulaire" className="scroll-mt-24 px-6 pb-16 sm:px-8">
        <div className="mx-auto max-w-[860px]">
          {envoye ? (
            <div role="status" className="border-gold bg-panel border-l-2 p-6">
              <p className="mb-1 text-[1.05rem] font-semibold">
                Merci, votre témoignage est bien arrivé.
              </p>
              <p className="text-ivory-dim text-[0.92rem]">
                L&apos;équipe le relit avant de le publier sur le site.
              </p>
              <Link
                href="/temoignages"
                className="text-gold hover:text-gold-bright mt-4 inline-block text-[0.9rem] font-semibold"
              >
                Voir les témoignages →
              </Link>
            </div>
          ) : (
            <>
              {message && (
                <p
                  role="alert"
                  className="border-gold bg-panel text-ivory mb-6 border-l-2 p-4 text-[0.9rem]"
                >
                  {message}
                </p>
              )}

              <form
                action="/api/temoignage"
                method="POST"
                className="border-line bg-panel border p-6 sm:p-8"
              >
                {/* Leurre : invisible pour un humain, rempli par la plupart des robots. */}
                <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
                  <label htmlFor="site_web">Ne pas remplir</label>
                  <input
                    id="site_web"
                    name="site_web"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2 [&>*]:min-w-0">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="nom" className="mono-label text-ivory-dim text-[0.7rem]">
                      Votre nom <span className="text-gold">*</span>
                    </label>
                    <input
                      id="nom"
                      name="nom"
                      type="text"
                      required
                      maxLength={120}
                      autoComplete="name"
                      className={classeChamp}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="fonction" className="mono-label text-ivory-dim text-[0.7rem]">
                      Votre fonction <span className="text-gold">*</span>
                    </label>
                    <input
                      id="fonction"
                      name="fonction"
                      type="text"
                      required
                      maxLength={160}
                      autoComplete="organization-title"
                      placeholder="Directrice financière, groupe agroalimentaire"
                      className={classeChamp}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="formation" className="mono-label text-ivory-dim text-[0.7rem]">
                      Formation suivie <span className="text-gold">*</span>
                    </label>
                    <select
                      id="formation"
                      name="formation"
                      required
                      defaultValue=""
                      className={classeChamp}
                    >
                      <option value="" disabled>
                        Choisissez…
                      </option>
                      {programmes.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.titre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="cohorte" className="mono-label text-ivory-dim text-[0.7rem]">
                      Votre cohorte <span className="text-gold">*</span>
                    </label>
                    <select
                      id="cohorte"
                      name="cohorte"
                      required
                      defaultValue=""
                      className={classeChamp}
                    >
                      <option value="" disabled>
                        Choisissez…
                      </option>
                      {COHORTES.map((c) => (
                        <option key={c.valeur} value={c.valeur}>
                          {c.libelle}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label htmlFor="texte" className="mono-label text-ivory-dim text-[0.7rem]">
                      Votre témoignage <span className="text-gold">*</span>
                    </label>
                    <textarea
                      id="texte"
                      name="texte"
                      rows={6}
                      required
                      minLength={30}
                      maxLength={TEXTE_MAX}
                      placeholder="Ce que la formation vous a apporté, ce que vous appliquez aujourd'hui dans votre travail…"
                      className={classeChamp}
                    />
                  </div>
                </div>

                <label className="text-ivory-dim mt-7 flex cursor-pointer items-start gap-3 text-[0.86rem] leading-relaxed">
                  <input
                    type="checkbox"
                    name="consentement"
                    value="oui"
                    required
                    className="accent-gold mt-1 h-4 w-4 shrink-0 cursor-pointer"
                  />
                  <span>
                    J&apos;accepte que mon témoignage soit publié sur le site de CLIXA Institute,
                    avec mon nom, ma fonction, ma formation et ma cohorte. Il est relu par
                    l&apos;équipe avant publication.
                  </span>
                </label>

                <BoutonEnvoi
                  libelle="Envoyer mon témoignage"
                  pendant="Envoi en cours…"
                  className="bg-gold text-ink rounded-clixa hover:bg-gold-bright mt-5 w-full px-6 py-3.5 text-[0.92rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                />
              </form>
            </>
          )}
        </div>
      </section>
    </>
  );
}
