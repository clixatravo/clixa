import Link from "next/link";
import { ProgrammeCard } from "@/components/ProgrammeCard";
import { Temoignages } from "@/components/Temoignages";
import { Partenaires } from "@/components/Partenaires";
import { Button } from "@/components/ui/Button";
import { PlacesBadge } from "@/components/ui/Badge";
import { placesRestantes } from "@/lib/types";
import { MarqueSkillAfrique } from "@/components/MarqueSkillAfrique";
import {
  formatDateCourte,
  getAgenda,
  getProgrammes,
  getSpecialisations,
  getTemoignages,
  getPartenaires,
  lieuSession,
  villesDisponibles,
} from "@/lib/catalogue";

/**
 * Les parcours mis en avant sur l'accueil.
 *
 * Ces adresses ont pointé dans le vide entre le 22 août 2026 et sa correction :
 * le catalogue de démonstration avait été remplacé, ces trois slugs n'existaient
 * plus, et la section s'affichait avec son titre et aucune carte. D'où le repli
 * plus bas — une liste qui vieillit ne doit pas vider la page d'accueil.
 */
const EN_VEDETTE = [
  "directeur-administratif-et-financier",
  "preparation-a-la-certification-pmp",
  "directeur-de-projets",
];

const NOMBRE_EN_VEDETTE = 3;

export default async function Accueil() {
  // Tout est chargé ici : impossible d'attendre une promesse au milieu du JSX,
  // et un seul passage évite autant de requêtes qu'il y a de cartes affichées.
  const [specs, agenda, programmes] = await Promise.all([
    getSpecialisations(),
    getAgenda(4),
    getProgrammes(),
  ]);

  const parSlug = new Map(programmes.map((p) => [p.slug, p]));
  // Les parcours nommés d'abord, puis le début du catalogue pour compléter :
  // une adresse devenue caduque coûte une carte, pas la section entière.
  const choisis = EN_VEDETTE.map((slug) => parSlug.get(slug)).filter((p) => p !== undefined);
  const complements = programmes.filter((p) => !choisis.includes(p));
  const vedettes = [...choisis, ...complements].slice(0, NOMBRE_EN_VEDETTE);
  const total = programmes.length;

  const villes = await villesDisponibles();

  const ouLesCours =
    villes.length > 0
      ? `En présentiel à ${villes.join(", ")}, ou à distance en classe virtuelle.`
      : "À distance, en classe virtuelle, où que vous soyez sur le continent.";

  const temoignages = await getTemoignages();
  const partenaires = await getPartenaires();

  const nbParSpecialisation = new Map(
    specs.map((s) => [s.slug, programmes.filter((p) => p.specialisation === s.slug).length]),
  );

  return (
    <>
      {/* ── Héros Executive ── */}
      <section className="border-line relative overflow-hidden border-b px-8 py-16 lg:py-24">
        {/* Lueur d'ambiance en arrière-plan */}
        <div className="ambient-glow-top" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-[1180px]">
          <div className="max-w-[46rem]">
            <div>
              {/* Badge d'excellence avec étoile dorée */}
              <div className="border-gold/35 bg-panel/80 text-gold-bright rounded-clixa mb-6 inline-flex items-center gap-2 border px-3.5 py-1.5 font-mono text-[0.68rem] tracking-[0.14em] uppercase shadow-[0_0_20px_-3px_rgba(201,162,76,0.25)] backdrop-blur-md">
                <span className="text-gold font-bold">✦</span>
                <span>Institut Panafricain d&apos;Excellence &amp; Certifications</span>
              </div>

              <h1 className="mb-6 max-w-[18ch] text-[clamp(2.3rem,5.2vw,3.9rem)] font-bold tracking-tight">
                Des programmes qui{" "}
                <span className="gold-gradient-text not-italic">changent une trajectoire</span>.
              </h1>

              <p className="text-ivory-dim/95 mb-8 max-w-[54ch] text-[1.06rem] leading-relaxed">
                Formations certifiantes et parcours exécutifs pour dirigeants et managers en
                Afrique. {ouLesCours}
              </p>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <Button href="/formations" className="min-w-[180px]">
                  Explorer le catalogue
                </Button>
                <Link
                  href="#agenda"
                  className="border-line-strong text-ivory hover:border-gold hover:text-gold-bright rounded-clixa bg-panel/50 inline-flex min-h-11 items-center gap-2 border px-5 py-3 text-sm font-medium backdrop-blur-sm transition-all"
                >
                  Prochaines sessions
                  <span className="text-gold">→</span>
                </Link>
              </div>

              {/* Repères de réassurance rapide */}
              <div className="border-line/60 mt-10 flex flex-wrap items-center gap-6 border-t pt-6 text-[0.78rem]">
                <div className="text-ivory-dim flex items-center gap-2">
                  <span className="text-emerald-bright font-bold">✓</span>
                  <span>100% Praticiens en exercice</span>
                </div>
                <div className="text-ivory-dim flex items-center gap-2">
                  <span className="text-emerald-bright font-bold">✓</span>
                  <span>Certifications reconnues</span>
                </div>
                <div className="text-ivory-dim flex items-center gap-2">
                  <span className="text-emerald-bright font-bold">✓</span>
                  <span>Facilités de paiement en 3x</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bandeau Trust Stats ── */}
      <section className="border-line bg-panel/40 border-b px-8 py-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            <div className="border-line/60 bg-panel/60 rounded-clixa border p-5">
              <div className="font-display text-gold-bright text-[1.8rem] leading-none font-bold">
                {total}+
              </div>
              <div className="text-ivory-dim mt-2 text-[0.8rem]">
                Programmes &amp; certifications
              </div>
            </div>
            <div className="border-line/60 bg-panel/60 rounded-clixa border p-5">
              <div className="font-display text-gold-bright text-[1.8rem] leading-none font-bold">
                100 %
              </div>
              <div className="text-ivory-dim mt-2 text-[0.8rem]">
                Praticiens experts en exercice
              </div>
            </div>
            <div className="border-line/60 bg-panel/60 rounded-clixa border p-5">
              <div className="font-display text-gold-bright text-[1.8rem] leading-none font-bold">
                3 Hubs
              </div>
              <div className="text-ivory-dim mt-2 text-[0.8rem]">Agadir · Abidjan · Dakar</div>
            </div>
            <div className="border-line/60 bg-panel/60 rounded-clixa border p-5">
              <div className="font-display text-gold-bright text-[1.8rem] leading-none font-bold">
                98 %
              </div>
              <div className="text-ivory-dim mt-2 text-[0.8rem]">
                Taux d&apos;assiduité &amp; complétion
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Spécialisations ── */}
      <section id="specialisations" className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="mono-label text-gold mb-3 block">Nos spécialisations</span>
              <h2 className="max-w-[24ch] text-[clamp(1.5rem,2.8vw,2.1rem)]">
                Choisissez votre filière métier.
              </h2>
            </div>
            <p className="text-ivory-dim max-w-[48ch] text-[0.92rem]">
              Chaque spécialisation regroupe les certifications et parcours qui mènent à un métier
              précis.
            </p>
          </div>

          <div className="carte-grid sm:grid-cols-2 lg:grid-cols-4">
            {specs.map((s, i) => {
              const nb = nbParSpecialisation.get(s.slug) ?? 0;
              return (
                <Link
                  key={s.slug}
                  href={`/specialisations/${s.slug}`}
                  className="executive-card group rounded-clixa flex min-h-[190px] flex-col justify-between gap-3 p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gold font-mono text-[0.62rem] tracking-[0.14em]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-ivory-dim/40 group-hover:text-gold text-sm transition-colors">
                      ↗
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-ivory group-hover:text-gold-bright text-[1.12rem] font-semibold transition-colors">
                      {s.nom}
                    </h3>
                    <p className="text-ivory-dim/80 mt-1.5 line-clamp-2 text-[0.84rem]">
                      {s.accroche}
                    </p>
                  </div>
                  <span className="text-emerald-bright border-line/40 border-t pt-2 font-mono text-[0.66rem] tracking-[0.08em] uppercase">
                    {nb > 0 ? `${nb} formation${nb > 1 ? "s" : ""}` : "Sur devis"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SkillAfrique ── */}
      <section id="skillafrique" className="border-line border-b px-8 py-16">
        <div className="mx-auto grid max-w-[1180px] items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <MarqueSkillAfrique />

          <div>
            <span className="mono-label text-gold mb-4 block">SkillAfrique by CLIXA</span>
            <h2 className="mb-5 text-[clamp(1.5rem,2.8vw,2.1rem)]">
              La marque de formation en ligne de CLIXA.
            </h2>
            <p className="text-ivory-dim/95 mb-6 text-[0.98rem] leading-relaxed">
              SkillAfrique démocratise l&apos;accès à des formations live, premium et orientées
              résultats, pour les professionnels africains et internationaux.
            </p>

            <div className="mb-8 flex flex-wrap gap-2 lg:gap-2.5">
              {[
                "Formations en direct",
                "Cohortes interactives",
                "Pédagogie concrète",
                "Progression mesurable",
              ].map((t) => (
                <span
                  key={t}
                  className="border-line bg-panel/60 text-ivory-dim rounded-clixa border px-3 py-1.5 text-[0.72rem] lg:px-3.5 lg:py-2 lg:text-[0.8rem]"
                >
                  ✦ {t}
                </span>
              ))}
            </div>

            <Link
              href="/skillafrique"
              className="border-gold text-ivory hover:text-gold-bright inline-flex items-center gap-2 border-b pb-1 text-sm transition-colors"
            >
              Découvrir SkillAfrique <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Agenda ── */}
      <section id="agenda" className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="mono-label text-gold mb-3 block">Prochaines sessions</span>
              <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)]">
                Les places qui s&apos;ouvrent maintenant.
              </h2>
            </div>
            <Link
              href="/formations"
              className="border-gold text-ivory hover:text-gold-bright inline-flex items-center gap-1.5 border-b pb-1 text-sm transition-colors"
            >
              Toutes les dates du catalogue <span>→</span>
            </Link>
          </div>

          <div className="carte-grid">
            {agenda.map((s) => {
              const prog = parSlug.get(s.programmeSlug);
              return (
                <Link
                  key={s.id}
                  href={`/formations/${s.programmeSlug}`}
                  className="executive-card group rounded-clixa grid items-center gap-4 p-5 sm:grid-cols-[auto_1fr_auto_auto]"
                >
                  <span className="text-gold-bright bg-panel/80 border-gold/30 rounded-clixa border px-2.5 py-1 font-mono text-[0.72rem] tracking-[0.06em] whitespace-nowrap uppercase">
                    {formatDateCourte(s.debut)}
                  </span>
                  <span className="text-ivory group-hover:text-gold-bright text-sm font-medium transition-colors">
                    {prog?.titre}
                  </span>
                  <span className="text-ivory-dim bg-ink/40 border-line rounded-clixa border px-2.5 py-1 font-mono text-[0.78rem] whitespace-nowrap">
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
            <Link
              href="/formations"
              className="border-gold text-ivory hover:text-gold-bright inline-flex items-center gap-1.5 border-b pb-1 text-sm transition-colors"
            >
              Voir les {total} formations <span>→</span>
            </Link>
          </div>

          <div className="carte-grid sm:grid-cols-2 lg:grid-cols-3">
            {vedettes.map((p) => (
              <ProgrammeCard key={p.slug} programme={p} />
            ))}
          </div>
        </div>
      </section>

      {/*
        Les deux sections se taisent tant qu'aucun contenu n'est publié.
      */}
      <Temoignages temoignages={temoignages} titre="Ils sont passés par CLIXA." />
      <Partenaires partenaires={partenaires} />
    </>
  );
}

/** Une ligne de la carte du héros : un nombre, ce qu'il compte. */
