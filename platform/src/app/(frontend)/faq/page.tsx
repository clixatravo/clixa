import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilAriane } from "@/components/FilAriane";
import { Button } from "@/components/ui/Button";
import { getAgenda, getProgrammes, getTarifs } from "@/lib/catalogue";
import { questionsFrequentes, type BlocFaq } from "@/lib/faq";
import { MOYENS_AFFICHES } from "@/lib/moyens";
import { JOURS_DE_GRACE } from "@/lib/places";
import { RESEAUX_CLIXA } from "@/lib/reseaux";

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description:
    "Format des formations, prochaine cohorte, tarifs, moyens de paiement, certificat : les réponses aux questions qu'on nous pose le plus.",
  alternates: { canonical: "/faq" },
};

/*
  Les réponses se composent depuis le cache de données du catalogue et du
  barème ; les crochets de ces collections rafraîchissent aussi `/faq`. Le
  plafond d'une heure rattrape une écriture faite par script, qui ne lève rien.
*/
export const revalidate = 3600;

/**
 * Les questions qu'on nous pose le plus, et leurs réponses.
 *
 * ⚠️ **Rien n'y est écrit à la main qui se compte ailleurs.** Prix, moyens de
 * paiement, tenue de la place, dates de rentrée, modes et fuseaux : tout vient
 * de `lib/faq.ts`, qui les lit aux mêmes sources que la fiche d'un parcours.
 * Une FAQ qui recopie un prix est la page qui mentira la première le jour où
 * le barème change.
 *
 * ⚠️ **Des `<details>` natifs, pas un accordéon en JavaScript.** Ils s'ouvrent au
 * clavier, se lisent sans script, et le texte replié reste dans la page — ce
 * qu'un moteur et une recherche dans la page trouvent tous les deux.
 */
export default async function PageFaq() {
  const [programmes, sessions, tarifs] = await Promise.all([
    getProgrammes(),
    getAgenda(500),
    getTarifs(),
  ]);

  const questions = questionsFrequentes({
    programmes,
    sessions,
    tarifs,
    moyens: MOYENS_AFFICHES,
    joursTenue: JOURS_DE_GRACE,
    whatsapp: RESEAUX_CLIXA.whatsapp,
    email: RESEAUX_CLIXA.email.adresse,
    maintenant: new Date(),
  });

  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "Questions fréquentes" }]} />

      <section className="border-line relative overflow-hidden border-b px-8 py-16 lg:py-20">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[820px]">
          <div className="eyebrow mono-label mb-5">Questions fréquentes</div>
          <h1 className="mb-5 text-[clamp(2rem,4.2vw,3rem)] font-bold">Avant de vous inscrire</h1>
          <p className="text-ivory-dim/95 max-w-[60ch] text-[1.02rem] leading-relaxed">
            Format, rentrée, tarifs, paiement, certificat : les réponses aux questions qu&apos;on
            nous pose le plus souvent.
          </p>
        </div>
      </section>

      <section className="px-8 py-14">
        <div className="mx-auto max-w-[820px] space-y-3">
          {questions.map((q) => (
            <details
              key={q.id}
              id={q.id}
              className="group executive-card rounded-clixa border-line/80 open:border-gold/40 border"
            >
              <summary className="text-ivory hover:text-gold-bright flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-[1.02rem] font-semibold transition-colors [&::-webkit-details-marker]:hidden">
                <span>{q.question}</span>
                <span
                  aria-hidden="true"
                  className="text-gold shrink-0 text-xl transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="text-ivory-dim/95 space-y-3 px-6 pb-6 text-[0.95rem] leading-relaxed">
                {q.reponse.map((b, i) => (
                  <Bloc key={i} bloc={b} />
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="border-line border-t px-8 py-16">
        <div className="mx-auto max-w-[820px] text-center">
          <h2 className="font-display mb-4 text-[clamp(1.4rem,2.6vw,2rem)]">
            Une question qui n&apos;est pas ici ?
          </h2>
          <p className="text-ivory-dim/90 mx-auto mb-7 max-w-[52ch] text-[0.98rem] leading-relaxed">
            Écrivez-nous, ou demandez à être rappelé : un conseiller vous répond.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button href="/formations">Voir les formations</Button>
            <Button href="/contact" variante="contour">
              Être rappelé
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Bloc({ bloc }: { bloc: BlocFaq }) {
  if (bloc.type === "texte") return <p>{bloc.texte}</p>;
  if (bloc.type === "liste") {
    return (
      <ul className="space-y-1.5">
        {bloc.items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="text-gold mt-[0.55em] size-1.5 shrink-0 rounded-full bg-current"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1">
      {bloc.liens.map((l) =>
        /^https?:\/\//.test(l.href) ? (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-bright hover:text-gold underline underline-offset-2"
          >
            {l.libelle} ↗
          </a>
        ) : (
          <Link
            key={l.href}
            href={l.href as Route}
            className="text-gold-bright hover:text-gold underline underline-offset-2"
          >
            {l.libelle} →
          </Link>
        ),
      )}
    </p>
  );
}
