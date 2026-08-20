import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgrammeCard } from "@/components/ProgrammeCard";
import { FilAriane } from "@/components/FilAriane";
import {
  getProgrammesParSpecialisation,
  getSessions,
  getSpecialisation,
  getSpecialisations,
} from "@/lib/catalogue";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await getSpecialisations()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSpecialisation(slug);
  if (!s) return {};

  const url = `/specialisations/${s.slug}`;
  return {
    title: s.nom,
    description: s.description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: s.nom, description: s.description },
  };
}

export default async function PageSpecialisation({ params }: Props) {
  const { slug } = await params;
  const spec = await getSpecialisation(slug);
  if (!spec) notFound();

  const programmes = await getProgrammesParSpecialisation(spec.slug);
  const sessionsParProgramme = await Promise.all(programmes.map((p) => getSessions(p.slug)));
  const toutesSessions = sessionsParProgramme.flat();

  const nbSessions = toutesSessions.length;
  const nbCertifs = programmes.filter((p) => p.type === "certification").length;
  const villes = new Set(toutesSessions.map((s) => s.ville).filter(Boolean));
  const index = (await getSpecialisations()).findIndex((s) => s.slug === spec.slug) + 1;

  return (
    <>
      <FilAriane
        items={[
          { href: "/", label: "Accueil" },
          { href: "/formations", label: "Spécialisations" },
          { label: spec.nom },
        ]}
      />

      {/* ── Héros ── */}
      <section className="border-line from-panel to-ink border-b bg-gradient-to-br px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="eyebrow mono-label mb-5">
            Spécialisation {String(index).padStart(2, "0")}
          </div>
          <h1 className="mb-5 max-w-[16ch] text-[clamp(2rem,4.4vw,3.2rem)]">{spec.nom}</h1>
          <p className="text-ivory-dim max-w-[60ch] text-[1.02rem]">{spec.description}</p>

          <div className="hairline-grid mt-9 grid-cols-2 lg:grid-cols-4">
            {[
              [programmes.length, `formation${programmes.length > 1 ? "s" : ""}`],
              [
                nbCertifs,
                `certification${nbCertifs > 1 ? "s" : ""} internationale${nbCertifs > 1 ? "s" : ""}`,
              ],
              [
                nbSessions,
                `session${nbSessions > 1 ? "s" : ""} programmée${nbSessions > 1 ? "s" : ""}`,
              ],
              [villes.size, `ville${villes.size > 1 ? "s" : ""} d'accueil`],
            ].map(([n, label]) => (
              <div key={String(label)} className="bg-ink p-5">
                <div className="font-display text-gold-bright text-[1.8rem] leading-tight">{n}</div>
                <div className="text-ivory-dim mt-1 text-[0.78rem]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Formations ── */}
      <section className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9">
            <span className="mono-label text-gold mb-3 block">Les formations</span>
            <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)]">{spec.accroche}</h2>
          </div>

          {programmes.length === 0 ? (
            <div className="border-line bg-panel border p-12 text-center">
              <p className="font-display mb-3 text-xl">Des parcours conçus avec vous.</p>
              <p className="text-ivory-dim mx-auto mb-6 max-w-[46ch] text-sm">
                Cette filière fonctionne sur mesure : le programme est bâti à partir de vos
                référentiels métier et de vos cas réels.
              </p>
              <Link href="/contact" className="border-gold text-ivory border-b pb-1 text-sm">
                Nous parler de votre besoin →
              </Link>
            </div>
          ) : (
            <div className="hairline-grid sm:grid-cols-2 lg:grid-cols-3">
              {programmes.map((p) => (
                <ProgrammeCard key={p.slug} programme={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Débouchés ── */}
      <section className="px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9">
            <span className="mono-label text-gold mb-3 block">Débouchés</span>
            <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)]">
              Les métiers auxquels cette filière prépare.
            </h2>
          </div>

          <div className="hairline-grid sm:grid-cols-2 lg:grid-cols-4">
            {spec.debouches.map((d) => (
              <div key={d.titre} className="bg-panel p-5">
                <h3 className="font-display mb-2 text-[0.98rem]">{d.titre}</h3>
                <p className="text-ivory-dim text-[0.82rem]">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
