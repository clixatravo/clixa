import type { Metadata } from "next";
import Link from "next/link";
import { getSessions, getProgrammes, formatPeriode, lieuSession } from "@/lib/catalogue";
import { placesRestantes } from "@/lib/types";
import { PlacesBadge } from "@/components/ui/Badge";
import { FilAriane } from "@/components/FilAriane";

export const metadata: Metadata = {
  title: "Campus",
  description:
    "CLIXA opère depuis Agadir, Abidjan et Dakar pour rester proche des professionnels qu'il forme.",
};

/** Coordonnées reprises de index.html — source de vérité tant que le CMS n'est pas en place. */
const campus = [
  {
    ville: "Agadir, Maroc",
    role: "Siège social",
    adresse: "N° 1525, Bureau n° 5, Hay Essalam",
    telephone: "+212 6 69 30 34 67",
    email: "contact@clixa-institute.org",
    note: null,
  },
  {
    ville: "Abidjan, Côte d'Ivoire",
    role: "Hub Afrique de l'Ouest",
    adresse: "Cocody, zone administrative",
    telephone: null,
    email: null,
    note: "Antenne partenaire SkillAfrique",
  },
  {
    ville: "Dakar, Sénégal",
    role: "Hub Afrique de l'Ouest",
    adresse: "Plateau, zone d'affaires",
    telephone: null,
    email: null,
    note: "Antenne partenaire SkillAfrique",
  },
];

export default async function Campus() {
  const programmes = await getProgrammes();

  // Prochaines sessions en présentiel, groupées par ville
  const parProgramme = await Promise.all(
    programmes.map(async (p) =>
      (await getSessions(p.slug)).map((s) => ({ session: s, programme: p })),
    ),
  );
  const presentiel = parProgramme
    .flat()
    .filter((x) => x.session.mode === "presentiel")
    .sort((a, b) => a.session.debut.localeCompare(b.session.debut));

  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "Campus" }]} />

      <section className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="eyebrow mono-label mb-5">Présence panafricaine</div>
          <h1 className="mb-5 max-w-[18ch] text-[clamp(2rem,4.4vw,3.2rem)]">
            Un ancrage local, une ambition continentale.
          </h1>
          <p className="text-ivory-dim max-w-[60ch] text-[1.02rem]">
            CLIXA opère depuis plusieurs hubs pour rester proche des professionnels qu&apos;il
            forme. Les mêmes programmes, les mêmes intervenants, sans imposer un déplacement
            international.
          </p>
        </div>
      </section>

      <section className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="hairline-grid lg:grid-cols-3">
            {campus.map((c) => (
              <div key={c.ville} className="bg-panel flex flex-col gap-3 p-8">
                <span className="mono-label text-gold">{c.role}</span>
                <h2 className="font-display text-[1.2rem]">{c.ville}</h2>
                <p className="text-ivory-dim text-[0.92rem]">{c.adresse}</p>

                {c.telephone && (
                  <a
                    href={`tel:${c.telephone.replace(/\s/g, "")}`}
                    className="text-ivory hover:text-gold-bright text-[0.9rem]"
                  >
                    {c.telephone}
                  </a>
                )}
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="border-gold text-ivory w-fit border-b text-[0.88rem]"
                  >
                    {c.email}
                  </a>
                )}
                {c.note && (
                  <span className="text-emerald-bright mt-auto font-mono text-[0.64rem] tracking-[0.1em] uppercase">
                    {c.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9">
            <span className="mono-label text-gold mb-3 block">Calendrier</span>
            <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)]">
              Les prochaines sessions en présentiel.
            </h2>
          </div>

          <div className="carte-grid">
            {presentiel.map(({ session, programme }) => (
              <Link
                key={session.id}
                href={`/formations/${programme.slug}`}
                className="bg-panel hover:bg-panel-2 grid items-center gap-4 p-5 transition-colors sm:grid-cols-[1fr_1.4fr_auto_auto]"
              >
                <span className="font-display text-[0.95rem] whitespace-nowrap">
                  {formatPeriode(session.debut, session.fin)}
                </span>
                <span className="text-ivory text-sm">{programme.titre}</span>
                <span className="text-ivory-dim text-[0.82rem] whitespace-nowrap">
                  {lieuSession(session)}
                </span>
                <PlacesBadge restantes={placesRestantes(session)} />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
