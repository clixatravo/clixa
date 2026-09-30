import type { Metadata } from "next";
import { FilAriane } from "@/components/FilAriane";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { ChampWhatsapp } from "@/components/ChampWhatsapp";
import { ChampPays } from "@/components/ChampPays";
import { EXPERIENCES_FORMATION, MESSAGES_CANDIDATURE, SPECIALITES } from "@/lib/candidatures";

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
      "Vous formez des professionnels qui appliquent dès le lundi ce qu'ils ont vu le samedi : DAF, responsables RH, chefs de projet, directeurs de production.",
  },
  {
    titre: "La classe virtuelle, le week-end",
    texte:
      "Nos parcours se donnent en direct, le samedi ou le dimanche. Vous animez depuis chez vous, pour des participants de tout le continent.",
  },
  {
    titre: "Des séminaires d'entreprise",
    texte:
      "Nous organisons aussi des séminaires de deux semaines pour les entreprises, en présentiel, à Madrid, Barcelone, Paris, Casablanca et Las Palmas.",
  },
];

const recherche = [
  "Une expérience réelle du métier que vous enseignez, pas seulement de la matière.",
  "Le goût des cas pratiques, des outils et des exercices qu'on peut réutiliser au travail.",
  "L'aisance pour animer un groupe à distance et le faire participer.",
];

const etapes = [
  {
    n: "1",
    titre: "Vous envoyez votre candidature",
    texte: "Avec votre CV ou votre profil LinkedIn.",
  },
  { n: "2", titre: "Nous l'étudions", texte: "L'équipe pédagogique lit chaque candidature." },
  {
    n: "3",
    titre: "Nous revenons vers vous",
    texte: "Par e-mail ou sur WhatsApp, pour un premier échange.",
  },
];

const classeChamp =
  "border-line bg-ink rounded-clixa text-ivory focus:border-gold w-full min-w-0 border px-3.5 py-3 text-[0.95rem]";

export default async function DevenirFormateur({ searchParams }: Props) {
  const { erreur, envoye } = await searchParams;
  const message = erreur
    ? (MESSAGES_CANDIDATURE[erreur as keyof typeof MESSAGES_CANDIDATURE] ??
      MESSAGES_CANDIDATURE.technique)
    : undefined;

  return (
    <>
      <FilAriane items={[{ label: "Devenir formateur" }]} />

      <section className="px-6 pt-10 pb-8 sm:px-8 sm:pt-13">
        <div className="mx-auto max-w-[1080px]">
          <span className="mono-label text-gold mb-3 block">Recrutement des formateurs</span>
          <h1 className="mb-4 max-w-[22ch] text-[clamp(1.8rem,4vw,2.8rem)] leading-tight">
            Vous êtes formateur&nbsp;?{" "}
            <span className="gold-gradient-text">N&apos;hésitez pas à nous rejoindre.</span>
          </h1>
          <p className="text-ivory-dim max-w-[62ch] text-[1rem] leading-relaxed">
            CLIXA Institute forme les cadres et les dirigeants d&apos;Afrique francophone. Nous
            cherchons des praticiens qui transmettent ce qu&apos;ils font au quotidien, et qui
            aiment le faire devant un groupe.
          </p>
          <a
            href="#formulaire"
            className="bg-gold text-ink rounded-clixa hover:bg-gold-bright mt-7 inline-block px-6 py-3.5 text-[0.92rem] font-semibold transition-colors"
          >
            Proposer ma candidature
          </a>
        </div>
      </section>

      <section className="px-6 pb-12 sm:px-8">
        <div className="mx-auto grid max-w-[1080px] gap-4 sm:grid-cols-3">
          {pourquoi.map((p) => (
            <div key={p.titre} className="border-line bg-panel border p-6">
              <h2 className="mb-2 text-[1.08rem]">{p.titre}</h2>
              <p className="text-ivory-dim text-[0.9rem] leading-relaxed">{p.texte}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-12 sm:px-8">
        <div className="mx-auto grid max-w-[1080px] gap-10 lg:grid-cols-2">
          <div>
            <span className="mono-label text-gold mb-3 block">Ce que nous recherchons</span>
            <ul className="flex flex-col gap-3">
              {recherche.map((r) => (
                <li key={r} className="text-ivory-dim flex gap-3 text-[0.95rem] leading-relaxed">
                  <span aria-hidden="true" className="bg-gold mt-2 size-1.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="mono-label text-gold mb-3 block">Comment ça se passe</span>
            <ol className="flex flex-col gap-4">
              {etapes.map((e) => (
                <li key={e.n} className="flex gap-4">
                  <span className="border-gold text-gold flex size-9 shrink-0 items-center justify-center rounded-full border font-semibold">
                    {e.n}
                  </span>
                  <div>
                    <p className="font-medium">{e.titre}</p>
                    <p className="text-ivory-dim text-[0.88rem]">{e.texte}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="formulaire" className="scroll-mt-24 px-6 pb-16 sm:px-8">
        <div className="mx-auto max-w-[860px]">
          <h2 className="mb-2 text-[clamp(1.4rem,2.6vw,1.9rem)]">Votre candidature</h2>
          <p className="text-ivory-dim mb-7 text-[0.95rem]">
            Joignez votre CV ou indiquez votre profil LinkedIn : l&apos;un des deux suffit.
          </p>

          {envoye ? (
            <div role="status" className="border-gold bg-panel border-l-2 p-6">
              <p className="mb-1 text-[1.05rem] font-semibold">
                Merci, votre candidature est bien arrivée.
              </p>
              <p className="text-ivory-dim text-[0.92rem]">
                L&apos;équipe pédagogique va l&apos;étudier et reviendra vers vous par e-mail ou sur
                WhatsApp.
              </p>
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
                action="/api/candidature"
                method="POST"
                encType="multipart/form-data"
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
                  <Champ label="Nom complet" name="nom" autoComplete="name" />
                  <Champ label="E-mail" name="email" type="email" autoComplete="email" />

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="whatsapp"
                      className="mono-label text-ivory-dim text-[0.7rem] tracking-wider"
                    >
                      WhatsApp <span className="text-gold">*</span>
                    </label>
                    <ChampWhatsapp classeChamp="border-line bg-ink rounded-clixa text-ivory focus:border-gold min-w-0 border px-3.5 py-3 text-[0.95rem]" />
                  </div>
                  <ChampPays classeChamp={classeChamp} />

                  <div className="flex flex-col gap-2">
                    <label htmlFor="specialite" className="mono-label text-ivory-dim text-[0.7rem]">
                      Domaine dans lequel vous formez <span className="text-gold">*</span>
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
                    <label htmlFor="experience" className="mono-label text-ivory-dim text-[0.7rem]">
                      Expérience comme formateur <span className="text-gold">*</span>
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

                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label htmlFor="linkedin" className="mono-label text-ivory-dim text-[0.7rem]">
                      Profil LinkedIn
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
                    <label htmlFor="cv" className="mono-label text-ivory-dim text-[0.7rem]">
                      Votre CV <span className="normal-case">(PDF ou Word, 4 Mo au plus)</span>
                    </label>
                    <input
                      id="cv"
                      name="cv"
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="border-line bg-ink rounded-clixa text-ivory-dim file:bg-gold file:text-ink file:rounded-clixa w-full min-w-0 border px-3.5 py-2.5 text-[0.9rem] file:mr-4 file:border-0 file:px-4 file:py-2 file:text-[0.85rem] file:font-semibold"
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label htmlFor="message" className="mono-label text-ivory-dim text-[0.7rem]">
                      Un mot sur vous <span className="normal-case">(facultatif)</span>
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
                    J&apos;accepte que CLIXA Institute conserve ma candidature et mon CV pour
                    l&apos;étudier et me recontacter. Ils ne sont transmis à personne.
                  </span>
                </label>

                <BoutonEnvoi
                  libelle="Envoyer ma candidature"
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
      <label htmlFor={name} className="mono-label text-ivory-dim text-[0.7rem]">
        {label} <span className="text-gold">*</span>
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
