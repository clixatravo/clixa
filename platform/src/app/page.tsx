import Link from "next/link";
import { ProgrammeCard } from "@/components/ProgrammeCard";
import { Button } from "@/components/ui/Button";
import { PlacesBadge } from "@/components/ui/Badge";
import { placesRestantes } from "@/lib/types";
import {
  formatDateCourte,
  getAgenda,
  getProgramme,
  getProgrammes,
  getProgrammesParSpecialisation,
  getSpecialisations,
  lieuSession,
} from "@/lib/catalogue";

const EN_VEDETTE = [
  "preparation-certification-pmp",
  "ifrs-comptable-international",
  "cma-certified-management-accountant",
];

export default function Accueil() {
  const specs = getSpecialisations();
  const agenda = getAgenda(4);
  const vedettes = EN_VEDETTE.map(getProgramme).filter((p) => p !== undefined);
  const total = getProgrammes().length;

  return (
    <>
      {/* ── Héros ── */}
      <section className="border-line border-b px-8 py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="eyebrow mono-label mb-6">Certifications · Exécutif · Corporate</div>
          <h1 className="mb-6 max-w-[17ch] text-[clamp(2.2rem,5vw,3.8rem)]">
            Des programmes qui{" "}
            <em className="text-gold-bright not-italic">changent une trajectoire</em>.
          </h1>
          <p className="text-ivory-dim mb-8 max-w-[54ch] text-[1.05rem]">
            Formations certifiantes et parcours exécutifs pour dirigeants et managers en Afrique. En
            présentiel à Agadir, Abidjan et Dakar, ou à distance en classe virtuelle.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <Button href="/formations">Explorer le catalogue</Button>
            <Link
              href="#agenda"
              className="border-ivory-dim text-ivory-dim hover:text-ivory border-b py-3.5 text-sm"
            >
              Voir les prochaines sessions →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Spécialisations ── */}
      <section id="specialisations" className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9">
            <span className="mono-label text-gold mb-3 block">Nos spécialisations</span>
            <h2 className="max-w-[24ch] text-[clamp(1.5rem,2.8vw,2.1rem)]">
              Choisissez votre filière métier.
            </h2>
            <p className="text-ivory-dim mt-3.5 max-w-[60ch] text-[0.94rem]">
              Chaque spécialisation regroupe les certifications et parcours qui mènent à un métier
              précis.
            </p>
          </div>

          <div className="hairline-grid sm:grid-cols-2 lg:grid-cols-4">
            {specs.map((s, i) => {
              const nb = getProgrammesParSpecialisation(s.slug).length;
              return (
                <Link
                  key={s.slug}
                  href={`/specialisations/${s.slug}`}
                  className="bg-panel hover:bg-panel-2 flex min-h-[180px] flex-col gap-3 p-7 transition-colors"
                >
                  <span className="text-gold font-mono text-[0.6rem] tracking-[0.12em]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-[1.1rem]">{s.nom}</h3>
                  <p className="text-ivory-dim text-[0.84rem]">{s.accroche}</p>
                  <span className="text-emerald-bright mt-auto font-mono text-[0.66rem] tracking-[0.08em]">
                    {nb > 0 ? `${nb} formation${nb > 1 ? "s" : ""}` : "Sur devis"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Agenda ── */}
      <section id="agenda" className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9">
            <span className="mono-label text-gold mb-3 block">Prochaines sessions</span>
            <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)]">
              Les places qui s&apos;ouvrent maintenant.
            </h2>
          </div>

          <div className="hairline-grid">
            {agenda.map((s) => {
              const prog = getProgramme(s.programmeSlug);
              return (
                <Link
                  key={s.id}
                  href={`/formations/${s.programmeSlug}`}
                  className="bg-panel hover:bg-panel-2 grid items-center gap-4 p-5 transition-colors sm:grid-cols-[auto_1fr_auto_auto]"
                >
                  <span className="text-gold-bright font-mono text-[0.7rem] tracking-[0.06em] whitespace-nowrap uppercase">
                    {formatDateCourte(s.debut)}
                  </span>
                  <span className="text-ivory text-sm">{prog?.titre}</span>
                  <span className="text-ivory-dim text-[0.8rem] whitespace-nowrap">
                    {lieuSession(s)}
                  </span>
                  <PlacesBadge restantes={placesRestantes(s)} />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── En vedette ── */}
      <section className="px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="mono-label text-gold mb-3 block">Les plus demandées</span>
              <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)]">Formations en vedette.</h2>
            </div>
            <Link href="/formations" className="border-gold text-ivory border-b pb-1 text-sm">
              Voir les {total} formations →
            </Link>
          </div>

          <div className="hairline-grid sm:grid-cols-2 lg:grid-cols-3">
            {vedettes.map((p) => (
              <ProgrammeCard key={p.slug} programme={p} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
