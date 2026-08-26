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
    email: "contact@clixa.africa",
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

      <section className="border-line relative overflow-hidden border-b px-8 py-16 lg:py-20">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1180px]">
          <div className="eyebrow mono-label mb-5">Présence panafricaine</div>
          <h1 className="mb-5 max-w-[18ch] text-[clamp(2.2rem,4.6vw,3.4rem)] font-bold">
            Un ancrage local, une <span className="gold-gradient-text">ambition continentale</span>.
          </h1>
          <p className="text-ivory-dim/95 max-w-[60ch] text-[1.05rem] leading-relaxed">
            CLIXA opère depuis plusieurs hubs pour rester proche des professionnels qu&apos;il
            forme. Les mêmes programmes, les mêmes intervenants, sans imposer un déplacement
            international.
          </p>
        </div>
      </section>

      <section className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="carte-grid lg:grid-cols-3">
            {campus.map((c) => (
              <div
                key={c.ville}
                className="executive-card rounded-clixa flex flex-col justify-between gap-4 p-8"
              >
                <div className="space-y-2">
                  <span className="mono-label text-gold block text-[0.62rem] tracking-wider uppercase">
                    {c.role}
                  </span>
                  <h2 className="font-display text-ivory text-[1.3rem] font-semibold">{c.ville}</h2>
                  <p className="text-ivory-dim/90 text-[0.92rem] leading-relaxed">{c.adresse}</p>
                </div>

                <div className="border-line/60 space-y-2 border-t pt-4">
                  {c.telephone && (
                    <a
                      href={`tel:${c.telephone.replace(/\s/g, "")}`}
                      className="text-ivory hover:text-gold-bright flex items-center gap-2 font-mono text-[0.88rem] transition-colors"
                    >
                      <span>📞</span>
                      <span>{c.telephone}</span>
                    </a>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="text-gold-bright hover:text-gold flex items-center gap-2 text-[0.86rem] transition-colors"
                    >
                      <span>✉️</span>
                      <span className="border-gold/40 border-b">{c.email}</span>
                    </a>
                  )}
                  {c.note && (
                    <span className="text-emerald-bright block pt-1 font-mono text-[0.66rem] tracking-[0.1em] uppercase">
                      ✦ {c.note}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9">
            <span className="mono-label text-gold mb-3 block">Calendrier des sessions</span>
            <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)] font-semibold">
              Les prochaines sessions en présentiel.
            </h2>
          </div>

          <div className="carte-grid">
            {presentiel.length === 0 ? (
              <div className="border-line/70 bg-panel/60 rounded-clixa border p-8 text-center backdrop-blur-sm">
                <p className="font-display text-ivory mb-2 text-lg font-semibold">
                  Toutes les sessions actuelles sont en classe virtuelle (Visio Live)
                </p>
                <p className="text-ivory-dim mx-auto max-w-[50ch] text-sm">
                  Les prochaines dates en présentiel à Agadir, Abidjan et Dakar seront annoncées ici
                  très prochainement.
                </p>
              </div>
            ) : (
              presentiel.map(({ session, programme }) => (
                <Link
                  key={session.id}
                  href={`/formations/${programme.slug}`}
                  className="executive-card group rounded-clixa grid items-center gap-4 p-5.5 transition-all sm:grid-cols-[1fr_1.4fr_auto_auto]"
                >
                  <span className="font-display text-ivory text-[0.95rem] font-semibold whitespace-nowrap">
                    {formatPeriode(session.debut, session.fin)}
                  </span>
                  <span className="text-ivory group-hover:text-gold-bright text-sm font-medium transition-colors">
                    {programme.titre}
                  </span>
                  <span className="text-ivory-dim font-mono text-[0.82rem] whitespace-nowrap">
                    📍 {lieuSession(session)}
                  </span>
                  <PlacesBadge restantes={placesRestantes(session)} />
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
