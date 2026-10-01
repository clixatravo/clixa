import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { FilAriane } from "@/components/FilAriane";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { ChampWhatsapp } from "@/components/ChampWhatsapp";
import { ChampPays } from "@/components/ChampPays";
import { getProgrammes } from "@/lib/catalogue";
import { EXPERIENCES_FORMATION, MESSAGES_CANDIDATURE, SPECIALITES } from "@/lib/candidatures";
import { ChampLeurre } from "@/components/ChampLeurre";

export const metadata: Metadata = {
  title: "Devenir formateur",
  description:
    "Vous êtes formateur ou praticien expérimenté ? Rejoignez CLIXA Institute et animez des parcours pour les cadres et les dirigeants d'Afrique francophone.",
};

interface Props {
  searchParams: Promise<{ erreur?: string; envoye?: string }>;
}

/*
  Ce que la page dit de nous. Rien n'y est promis que la maison ne tienne : ni
  rémunération, ni volume d'heures, ni délai de réponse chiffré. Ce sont des
  décisions de la direction, prises au cas par cas après l'échange.
*/
const pourquoi = [
  {
    titre: "Des cadres en poste",
    texte:
      "Vous formez des professionnels qui appliquent le lendemain ce qu'ils ont vu la veille : DAF, responsables RH, chefs de projet, directeurs de production.",
    trace:
      "M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 20v-2a4 4 0 0 0-3-3.87 M16 2.13a4 4 0 0 1 0 7.75",
  },
  {
    titre: "La classe virtuelle, en soirée",
    texte:
      "Nos parcours se donnent en direct, deux soirs par semaine, de 19h00 à 21h00 UTC. Vous animez depuis chez vous, pour des participants de tout le continent.",
    trace: "M3 5h18v11H3z M8 21h8 M12 16v5 M10 9l4 2.5-4 2.5z",
  },
  {
    titre: "Des séminaires d'entreprise",
    texte:
      "Nous organisons aussi des séminaires de deux semaines pour les entreprises, en présentiel, à Madrid, Barcelone, Paris, Casablanca et Las Palmas.",
    trace:
      "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M2 12h20 M12 2a15 15 0 0 1 0 20 M12 2a15 15 0 0 0 0 20",
  },
];

const recherche = [
  "Une expérience réelle du métier que vous enseignez, pas seulement de la matière.",
  "Le goût des cas pratiques, des outils et des exercices qu'on peut réutiliser au travail.",
  "L'aisance pour animer un groupe à distance et le faire participer.",
];

const etapes = [
  {
    titre: "Vous envoyez votre candidature",
    texte: "Avec votre CV ou votre profil LinkedIn : l'un des deux suffit.",
  },
  { titre: "Nous l'étudions", texte: "L'équipe pédagogique lit chaque candidature." },
  {
    titre: "Nous revenons vers vous",
    texte: "Par e-mail ou sur WhatsApp, pour un premier échange.",
  },
];

/*
  Ce que la colonne d'à côté rappelle pendant qu'on remplit. Chaque phrase est
  vraie du code : le CV vit dans le magasin privé et ne se lit qu'avec une
  session d'équipe (`lib/cv.ts`), et rien n'y promet un délai.
*/
const assurances = [
  {
    titre: "Le CV ou LinkedIn",
    texte:
      "L'un des deux suffit. Vous écrivez depuis votre téléphone\u00a0? Le lien LinkedIn fera l'affaire.",
    trace: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M14 3v6h6 M8 13h8 M8 17h5",
  },
  {
    titre: "Votre CV reste privé",
    texte: "Seule l'équipe pédagogique peut l'ouvrir. Il n'est transmis à personne.",
    trace: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4",
  },
  {
    titre: "Une réponse",
    texte: "Nous revenons vers vous par e-mail ou sur WhatsApp.",
    trace: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
];

/* « Autre » reste au formulaire, pas dans la vitrine des domaines. */
const domaines = SPECIALITES.filter((s) => s.valeur !== "autre");

const classeChamp =
  "border-line bg-ink rounded-clixa text-ivory focus:border-gold placeholder:text-ivory-dim/50 w-full min-w-0 border px-3.5 py-3 text-[0.95rem] transition-colors";

const classeLabel = "mono-label text-ivory-dim text-[0.7rem] tracking-wider";

export default async function DevenirFormateur({ searchParams }: Props) {
  const { erreur, envoye } = await searchParams;
  const parcours = (await getProgrammes()).length;
  const message = erreur
    ? (MESSAGES_CANDIDATURE[erreur as keyof typeof MESSAGES_CANDIDATURE] ??
      MESSAGES_CANDIDATURE.technique)
    : undefined;

  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "Devenir formateur" }]} />

      {/* ── L'appel ─────────────────────────────────────────────────────── */}
      <section className="border-line relative overflow-hidden border-b px-6 py-12 sm:px-8 lg:py-20">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="eyebrow mono-label mb-5">Recrutement des formateurs</div>
            <h1 className="mb-6 text-[clamp(2.1rem,4.6vw,3.5rem)] leading-[1.06] font-bold">
              Vous êtes formateur&nbsp;?{" "}
              <span className="gold-gradient-text">N&apos;hésitez pas à nous rejoindre.</span>
            </h1>
            <p className="text-ivory-dim/95 mb-8 max-w-[58ch] text-[1.03rem] leading-relaxed">
              CLIXA Institute forme les cadres et les dirigeants d&apos;Afrique francophone. Nous
              cherchons des praticiens qui transmettent ce qu&apos;ils font au quotidien, et qui
              aiment le faire devant un groupe.
            </p>

            {/*
              Trois faits, pas trois promesses. Le nombre de parcours est lu
              dans le catalogue : écrit à la main, il vieillirait au premier
              parcours ajouté — le défaut des « 12 Formations » du tableau de
              bord.
            */}
            <dl className="border-line mb-9 grid max-w-[560px] grid-cols-3 border-y py-5">
              <Fait valeur={String(parcours)} libelle="parcours au catalogue" />
              <Fait valeur="Live" libelle="en classe virtuelle" separe />
              <Fait valeur="2 sem." libelle="séminaires d'entreprise" separe />
            </dl>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <a
                href="#formulaire"
                className="shimmer-gold from-gold-bright via-gold to-gold-bright text-ink border-gold rounded-clixa inline-flex min-h-12 w-full items-center justify-center gap-2 border bg-gradient-to-r px-7 py-3.5 text-[0.82rem] font-bold tracking-[0.08em] uppercase shadow-[0_4px_18px_-4px_rgba(201,162,76,0.3)] transition-all hover:scale-[1.01] hover:shadow-[0_6px_24px_-2px_rgba(201,162,76,0.45)] sm:w-auto"
              >
                Proposer ma candidature
                <span aria-hidden="true">→</span>
              </a>
              <Link
                href="/formations"
                className="text-ivory-dim hover:text-ivory hover:border-gold border-ivory-dim border-b py-2 text-sm transition-colors"
              >
                Voir les parcours que nous donnons
              </Link>
            </div>
          </div>

          {/*
            La photo vient d'une vraie séance CLIXA, transmise par la direction
            le 27 septembre 2026 pour /entreprises. Sa légende dit ce qu'elle
            montre, et rien de plus : ni nom, ni lieu, ni date.
          */}
          <figure className="relative mx-auto w-full max-w-[300px] pr-4 pb-4 sm:max-w-[400px]">
            <div
              className="border-gold/35 rounded-clixa absolute inset-0 translate-x-4 translate-y-4 border"
              aria-hidden="true"
            />
            <div className="rounded-clixa relative z-10 overflow-hidden border border-white/10 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.9)]">
              <Image
                src="/images/entreprises/formateur-en-seance.jpg"
                alt="Un formateur CLIXA anime une séance devant un groupe"
                width={738}
                height={922}
                priority
                sizes="(min-width: 1024px) 400px, 85vw"
                className="aspect-[4/5] w-full object-cover"
              />
              <div
                className="from-ink/90 absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t to-transparent"
                aria-hidden="true"
              />
              <span className="bg-ink/75 border-gold/40 text-gold-bright rounded-clixa absolute top-4 left-4 border px-2.5 py-1 font-mono text-[0.6rem] tracking-[0.14em] uppercase backdrop-blur-sm">
                En séance
              </span>
              <figcaption className="text-ivory absolute inset-x-0 bottom-0 p-5 text-[0.92rem] leading-snug font-semibold">
                Transmettre ce que l&apos;on pratique, à des cadres qui l&apos;appliquent.
              </figcaption>
            </div>
          </figure>
        </div>
      </section>

      {/* ── Pourquoi nous rejoindre ────────────────────────────────────── */}
      <section className="px-6 py-14 sm:px-8 lg:py-18">
        <div className="mx-auto max-w-[1180px]">
          <Entete
            surtitre="Pourquoi nous rejoindre"
            titre="Former là où cela change quelque chose."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {pourquoi.map((p, i) => (
              <article key={p.titre} className="executive-card rounded-clixa flex flex-col p-7">
                <div className="mb-6 flex items-center justify-between">
                  <span className="border-gold/40 bg-gold/10 text-gold-bright inline-flex size-12 items-center justify-center rounded-full border">
                    <Pictogramme trace={p.trace} className="size-[22px]" />
                  </span>
                  <span className="text-ivory-dim/50 font-mono text-[0.75rem]">0{i + 1}</span>
                </div>
                <h3 className="mb-2.5 text-[1.12rem] font-semibold">{p.titre}</h3>
                <p className="text-ivory-dim text-[0.92rem] leading-relaxed">{p.texte}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Les domaines ───────────────────────────────────────────────── */}
      <section className="border-line bg-panel/40 border-y px-6 py-12 sm:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <span className="mono-label text-gold mb-3 block">Les domaines</span>
            <h2 className="font-display mb-3 text-[clamp(1.4rem,2.6vw,1.9rem)] leading-tight font-semibold">
              Nous cherchons des formateurs dans ces domaines.
            </h2>
            <p className="text-ivory-dim text-[0.92rem] leading-relaxed">
              Le vôtre n&apos;y figure pas&nbsp;? Proposez quand même : le formulaire offre
              «&nbsp;Autre domaine&nbsp;».
            </p>
          </div>
          <ul className="flex flex-wrap gap-2.5" aria-label="Domaines de formation">
            {domaines.map((d) => (
              <li
                key={d.valeur}
                className="border-line bg-ink/60 text-ivory rounded-full border px-4 py-2 text-[0.86rem]"
              >
                {d.libelle}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Le profil et les étapes ────────────────────────────────────── */}
      <section className="px-6 py-14 sm:px-8 lg:py-18">
        <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-2">
          <div className="glass-panel-gold rounded-clixa p-7 sm:p-9">
            <span className="mono-label text-gold mb-3 block">Le profil</span>
            <h2 className="font-display mb-6 text-[clamp(1.3rem,2.4vw,1.7rem)] font-semibold">
              Ce que nous recherchons
            </h2>
            <ul className="flex flex-col gap-4">
              {recherche.map((r) => (
                <li key={r} className="flex gap-3.5 text-[0.95rem] leading-relaxed">
                  <span className="border-gold/50 text-gold-bright mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border">
                    <Pictogramme trace="M5 12l5 5L20 7" className="size-3.5" />
                  </span>
                  <span className="text-ivory/90">{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-line bg-panel rounded-clixa border p-7 sm:p-9">
            <span className="mono-label text-gold mb-3 block">Les étapes</span>
            <h2 className="font-display mb-6 text-[clamp(1.3rem,2.4vw,1.7rem)] font-semibold">
              Comment ça se passe
            </h2>
            <ol className="relative flex flex-col gap-7">
              <span
                className="bg-gold/25 absolute top-4 bottom-4 left-[17px] w-px"
                aria-hidden="true"
              />
              {etapes.map((e, i) => (
                <li key={e.titre} className="relative flex gap-4">
                  <span className="border-gold bg-ink text-gold relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border font-semibold">
                    {i + 1}
                  </span>
                  <div className="pt-1">
                    <p className="font-medium">{e.titre}</p>
                    <p className="text-ivory-dim text-[0.88rem] leading-relaxed">{e.texte}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── La candidature ─────────────────────────────────────────────── */}
      <section
        id="formulaire"
        className="border-line bg-panel/30 scroll-mt-20 border-t px-6 py-14 sm:px-8 lg:py-20"
      >
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-14">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <span className="mono-label text-gold mb-3 block">Votre candidature</span>
            <h2 className="font-display mb-4 text-[clamp(1.6rem,3vw,2.2rem)] leading-tight font-semibold">
              Parlez-nous de votre parcours.
            </h2>
            <p className="text-ivory-dim mb-8 text-[0.95rem] leading-relaxed">
              Quelques minutes suffisent. L&apos;équipe pédagogique lit chaque candidature.
            </p>
            <ul className="flex flex-col gap-5">
              {assurances.map((a) => (
                <li key={a.titre} className="flex gap-4">
                  <span className="border-line bg-ink text-gold-bright inline-flex size-10 shrink-0 items-center justify-center rounded-full border">
                    <Pictogramme trace={a.trace} className="size-[18px]" />
                  </span>
                  <div>
                    <p className="text-[0.95rem] font-semibold">{a.titre}</p>
                    <p className="text-ivory-dim text-[0.86rem] leading-relaxed">{a.texte}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          <div className="min-w-0">
            {envoye ? (
              <div
                role="status"
                className="glass-panel-gold rounded-clixa flex flex-col items-start gap-5 p-8 sm:p-10"
              >
                <span className="border-gold bg-gold/15 text-gold-bright inline-flex size-14 items-center justify-center rounded-full border">
                  <Pictogramme trace="M5 12l5 5L20 7" className="size-7" />
                </span>
                <div>
                  <p className="font-display mb-2 text-[1.5rem] font-semibold">
                    Merci, votre candidature est bien arrivée.
                  </p>
                  <p className="text-ivory-dim max-w-[52ch] text-[0.95rem] leading-relaxed">
                    L&apos;équipe pédagogique va l&apos;étudier et reviendra vers vous par e-mail ou
                    sur WhatsApp.
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <Link
                    href="/formations"
                    className="text-gold hover:text-gold-bright text-[0.9rem] font-semibold"
                  >
                    Découvrir nos parcours →
                  </Link>
                  <Link
                    href="/a-propos"
                    className="text-ivory-dim hover:text-ivory text-[0.9rem] font-semibold"
                  >
                    Qui sommes-nous →
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {message && (
                  <p
                    role="alert"
                    className="border-gold bg-ink text-ivory rounded-clixa mb-6 border-l-2 p-4 text-[0.9rem]"
                  >
                    {message}
                  </p>
                )}

                <form
                  action="/api/candidature"
                  method="POST"
                  encType="multipart/form-data"
                  className="border-line bg-panel rounded-clixa relative border p-6 shadow-[0_30px_70px_-35px_rgba(0,0,0,0.9)] sm:p-9"
                >
                  <div
                    className="via-gold/60 absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
                    aria-hidden="true"
                  />

                  <ChampLeurre />

                  <Groupe numero="01" titre="Vous">
                    <Champ label="Nom complet" name="nom" autoComplete="name" />
                    <Champ label="E-mail" name="email" type="email" autoComplete="email" />
                    <div className="flex flex-col gap-2">
                      <label htmlFor="whatsapp" className={classeLabel}>
                        WHATSAPP <span className="text-gold">*</span>
                      </label>
                      <ChampWhatsapp classeChamp="border-line bg-ink rounded-clixa text-ivory focus:border-gold min-w-0 border px-3.5 py-3 text-[0.95rem]" />
                    </div>
                    <ChampPays classeChamp={classeChamp} />
                  </Groupe>

                  <Groupe numero="02" titre="Votre expertise">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="specialite" className={classeLabel}>
                        DOMAINE DANS LEQUEL VOUS FORMEZ <span className="text-gold">*</span>
                      </label>
                      <select
                        id="specialite"
                        name="specialite"
                        required
                        defaultValue=""
                        className={classeChamp}
                      >
                        <option value="" disabled>
                          Choisissez…
                        </option>
                        {SPECIALITES.map((s) => (
                          <option key={s.valeur} value={s.valeur}>
                            {s.libelle}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="experience" className={classeLabel}>
                        EXPÉRIENCE COMME FORMATEUR <span className="text-gold">*</span>
                      </label>
                      <select
                        id="experience"
                        name="experience"
                        required
                        defaultValue=""
                        className={classeChamp}
                      >
                        <option value="" disabled>
                          Choisissez…
                        </option>
                        {EXPERIENCES_FORMATION.map((e) => (
                          <option key={e.valeur} value={e.valeur}>
                            {e.libelle}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Groupe>

                  <Groupe
                    numero="03"
                    titre="Votre parcours"
                    note="Le CV ou le profil LinkedIn : l'un des deux suffit."
                  >
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <label htmlFor="linkedin" className={classeLabel}>
                        PROFIL LINKEDIN
                      </label>
                      <input
                        id="linkedin"
                        name="linkedin"
                        type="text"
                        inputMode="url"
                        autoComplete="url"
                        placeholder="linkedin.com/in/votre-nom"
                        className={classeChamp}
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <label htmlFor="cv" className={classeLabel}>
                        VOTRE CV
                      </label>
                      <div className="border-line hover:border-gold/60 bg-ink/60 rounded-clixa flex flex-col gap-3 border border-dashed p-5 transition-colors sm:flex-row sm:items-center">
                        <span className="border-gold/40 bg-gold/10 text-gold-bright inline-flex size-11 shrink-0 items-center justify-center rounded-full border">
                          <Pictogramme
                            trace="M12 16V4 M7 9l5-5 5 5 M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
                            className="size-5"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <input
                            id="cv"
                            name="cv"
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="text-ivory-dim file:bg-gold file:text-ink file:rounded-clixa file:hover:bg-gold-bright w-full min-w-0 text-[0.86rem] file:mr-4 file:cursor-pointer file:border-0 file:px-4 file:py-2 file:text-[0.82rem] file:font-semibold"
                          />
                          <p className="text-ivory-dim/80 mt-1.5 text-[0.78rem]">
                            PDF ou Word, 4 Mo au plus.
                          </p>
                        </div>
                      </div>
                    </div>
                  </Groupe>

                  <Groupe numero="04" titre="Un mot sur vous" note="Facultatif." dernier>
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <label htmlFor="message" className="sr-only">
                        Un mot sur vous
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        maxLength={2000}
                        placeholder="Les formations que vous avez déjà animées, les sujets que vous aimeriez transmettre…"
                        className={classeChamp}
                      />
                    </div>
                  </Groupe>

                  <div className="border-line mt-8 border-t pt-7">
                    <label className="text-ivory-dim flex cursor-pointer items-start gap-3 text-[0.86rem] leading-relaxed">
                      <input
                        type="checkbox"
                        name="consentement"
                        value="oui"
                        required
                        className="accent-gold mt-1 h-4 w-4 shrink-0 cursor-pointer"
                      />
                      <span>
                        J&apos;accepte que CLIXA Institute conserve ma candidature et mon CV pour
                        l&apos;étudier et me recontacter. Ils ne sont transmis à personne.
                      </span>
                    </label>

                    <BoutonEnvoi
                      libelle="Envoyer ma candidature"
                      pendant="Envoi en cours…"
                      className="shimmer-gold from-gold-bright via-gold to-gold-bright text-ink border-gold rounded-clixa mt-6 inline-flex min-h-12 w-full items-center justify-center border bg-gradient-to-r px-8 py-3.5 text-[0.82rem] font-bold tracking-[0.08em] uppercase shadow-[0_4px_18px_-4px_rgba(201,162,76,0.3)] transition-all hover:shadow-[0_6px_24px_-2px_rgba(201,162,76,0.45)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    />
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Entete({ surtitre, titre }: { surtitre: string; titre: string }) {
  return (
    <div className="mb-9">
      <span className="mono-label text-gold mb-3 block">{surtitre}</span>
      <h2 className="font-display max-w-[30ch] text-[clamp(1.5rem,2.8vw,2.1rem)] leading-tight font-semibold">
        {titre}
      </h2>
    </div>
  );
}

function Fait({ valeur, libelle, separe }: { valeur: string; libelle: string; separe?: boolean }) {
  return (
    <div className={separe ? "border-line border-l pl-4 sm:pl-6" : "pr-4 sm:pr-6"}>
      <dt className="sr-only">{libelle}</dt>
      <dd className="font-display text-gold-bright text-[clamp(1.35rem,2.6vw,1.9rem)] leading-none font-semibold">
        {valeur}
      </dd>
      <dd className="text-ivory-dim mt-1.5 text-[0.74rem] leading-snug sm:text-[0.8rem]">
        {libelle}
      </dd>
    </div>
  );
}

/** Un groupe de champs, numéroté : le formulaire se lit en quatre temps. */
function Groupe({
  numero,
  titre,
  note,
  dernier,
  children,
}: {
  numero: string;
  titre: string;
  note?: string;
  dernier?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset className={dernier ? "min-w-0" : "border-line mb-8 min-w-0 border-b pb-8"}>
      <legend className="mb-5 flex w-full flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-gold font-mono text-[0.75rem]">{numero}</span>
        <span className="text-[1.05rem] font-semibold">{titre}</span>
        {note && <span className="text-ivory-dim text-[0.82rem]">{note}</span>}
      </legend>
      <div className="grid gap-5 sm:grid-cols-2 [&>*]:min-w-0">{children}</div>
    </fieldset>
  );
}

function Champ({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className={classeLabel}>
        {label.toUpperCase()} <span className="text-gold">*</span>
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className={classeChamp}
      />
    </div>
  );
}

function Pictogramme({ trace, className = "size-5" }: { trace: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={trace} />
    </svg>
  );
}
