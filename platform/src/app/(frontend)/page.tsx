import Link from "next/link";
import Image from "next/image";
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
  getTarifs,
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

  /*
    Les trois repères du héros, et les quatre chiffres du bandeau qui suit. Tous
    déduits du catalogue : aucun n'est écrit à la main, aucun ne peut donc
    survivre à ce qu'il décrit.

    Le nombre de séances n'est annoncé que si les douze parcours s'accordent —
    sinon la phrase serait vraie pour certains et fausse pour d'autres, et c'est
    exactement le genre d'approximation qui a valu au site d'annoncer des
    campus où aucune session n'existe.
  */
  const seances = [...new Set(programmes.map((p) => p.modules.length).filter((n) => n > 0))];
  const tarifs = await getTarifs();
  const rythmes = tarifs.plans.length;

  const reperes = [
    villes.length > 0 ? `En présentiel et à distance` : "À distance, en classe virtuelle",
    ...(seances.length === 1 ? [`${seances[0]} séances par parcours`] : []),
    ...(rythmes > 1 ? [`Paiement en 1, 2 ou ${rythmes} fois`] : []),
  ];

  const prochaineSeance = agenda[0]?.debut;

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
                <span>Certifications · Exécutif · Corporate</span>
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

              {/*
                Trois repères, et chacun se vérifie dans la base.

                Ils remplacent « 100 % praticiens en exercice », « certifications
                reconnues » et « facilités de paiement en 3x ». Les deux premiers
                n'étaient adossés à rien — le CMS ne porte aucune donnée sur les
                intervenants, et « reconnues » ne dit pas par qui. Le troisième
                était faux dans son sens courant : payer en trois fois coûte
                47 € de plus que comptant. On le dit donc comme il est.
              */}
              <div className="border-line/60 mt-10 flex flex-wrap items-center gap-6 border-t pt-6 text-[0.78rem]">
                {reperes.map((r) => (
                  <div key={r} className="text-ivory-dim flex items-center gap-2">
                    <span className="text-emerald-bright font-bold">✓</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*
        ── Le bandeau de chiffres ──────────────────────────────────────────
        Il en portait quatre : « 12+ », « 100 % praticiens experts en
        exercice », « 3 Hubs — Agadir · Abidjan · Dakar » et « 98 % taux
        d'assiduité & complétion ».

        Aucun ne tenait. Le catalogue compte douze parcours, pas « douze et
        plus ». Le CMS ne porte rien sur les intervenants. Les douze sessions
        sont toutes en classe virtuelle et aucune ville n'y figure — c'est la
        troisième fois que ces trois villes reviennent sur le site sans qu'une
        seule session s'y donne. Et un taux d'assiduité de 98 % supposait des
        participants : la base en compte zéro, personne n'a encore suivi le
        premier cours.

        Les quatre qui les remplacent se déduisent tous du catalogue. Chacun
        n'apparaît que s'il a une valeur à montrer : un chiffre absent vaut
        mieux qu'un chiffre inventé.
      */}
      <section className="border-line bg-panel/40 border-b px-8 py-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            <Chiffre valeur={String(total)} legende="parcours au catalogue" />
            <Chiffre valeur={String(specs.length)} legende="filières métier" />
            {seances.length === 1 && (
              <Chiffre valeur={String(seances[0])} legende="séances par parcours" />
            )}
            {prochaineSeance && (
              <Chiffre
                valeur={formatDateCourte(prochaineSeance)}
                legende="première séance de la cohorte"
              />
            )}
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

      {/* ── Galerie & Immersion Exécutive ── */}
      <section className="border-line bg-panel/30 border-t border-b px-8 py-16 lg:py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-12 text-center">
            <span className="mono-label text-gold mb-3 block text-xs tracking-widest">
              ✦ Immersion &amp; Standard d&apos;Excellence
            </span>
            <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold">
              Au cœur de l&apos;Institut <span className="gold-gradient-text">CLIXA</span>.
            </h2>
            <p className="text-ivory-dim/80 mx-auto mt-3 max-w-[62ch] text-[0.94rem] leading-relaxed">
              De la salle de conseil exécutive à la délivrance des diplômes officiels : découvrez
              les standards pédagogiques panafricains.
            </p>
          </div>

          {/*
            ⚠️ Les `width`/`height` d'une `Image` sont ceux du *fichier*, jamais
            ceux du cadre. Ici le conteneur impose son rapport et `object-cover`
            remplit : les changer ne déplace rien à l'écran, et c'est ce qui rend
            l'erreur difficile à voir. Ils décident du srcset — annoncer un 16/10
            pour un fichier en 4/3 fait calculer les variantes sur une image qui
            n'existe pas.
          */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Carte 1 : Catalogue Exécutif */}
            <div className="group bg-panel/80 hover:border-gold/60 rounded-clixa flex flex-col overflow-hidden border border-white/[0.08] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.7)]">
              <div className="bg-ink relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src="/images/marketing/catalogue-executive-clixa.jpg"
                  alt="Catalogue Exécutif et Brochure Officielle CLIXA Institute"
                  width={1200}
                  height={896}
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="border-gold/40 bg-ink/80 text-gold-bright rounded-clixa border px-2.5 py-1 font-mono text-[9px] font-medium tracking-wider uppercase backdrop-blur-md">
                    Brochure Officielle
                  </span>
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <h3 className="font-display text-ivory group-hover:text-gold-bright text-lg font-semibold transition-colors">
                    Le Catalogue Exécutif
                  </h3>
                  <p className="text-ivory-dim/85 mt-2 text-xs leading-relaxed">
                    Syllabus complets des 12 filières d&apos;excellence, plans de cours et modalités
                    de financement entreprise.
                  </p>
                </div>
                <div className="mt-5 border-t border-white/[0.06] pt-3 text-right">
                  <Link
                    href="/formations"
                    className="text-gold-bright hover:text-gold inline-flex items-center gap-1 font-mono text-xs transition-colors"
                  >
                    <span>Consulter les programmes</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Carte 2 : Séminaire Exécutif */}
            <div className="group bg-panel/80 hover:border-gold/60 rounded-clixa flex flex-col overflow-hidden border border-white/[0.08] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.7)]">
              <div className="bg-ink relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src="/images/marketing/seminaire-directeur-clixa.jpg"
                  alt="Séminaire Exécutif et Masterclass Dirigeants CLIXA Institute"
                  width={1376}
                  height={768}
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="border-emerald/40 bg-ink/80 text-emerald-bright rounded-clixa border px-2.5 py-1 font-mono text-[9px] font-medium tracking-wider uppercase backdrop-blur-md">
                    Masterclasses &amp; Hubs
                  </span>
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <h3 className="font-display text-ivory group-hover:text-gold-bright text-lg font-semibold transition-colors">
                    Séminaires &amp; Salle de Conseil
                  </h3>
                  <p className="text-ivory-dim/85 mt-2 text-xs leading-relaxed">
                    Des cohortes de cadres et directeurs d&apos;Afrique formés par des praticiens en
                    exercice en présentiel et en ligne.
                  </p>
                </div>
                <div className="mt-5 border-t border-white/[0.06] pt-3 text-right">
                  <Link
                    href="/campus"
                    className="text-gold-bright hover:text-gold inline-flex items-center gap-1 font-mono text-xs transition-colors"
                  >
                    <span>Découvrir nos campus</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Carte 3 : Certification Diplômante */}
            <div className="group bg-panel/80 hover:border-gold/60 rounded-clixa flex flex-col overflow-hidden border border-white/[0.08] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.7)]">
              <div className="bg-ink relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src="/images/marketing/certification-diplome-clixa.jpg"
                  alt="Diplôme Officiel et Certification Exécutive CLIXA"
                  width={1200}
                  height={896}
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="bg-ink/80 rounded-clixa border border-[#0077b5]/40 px-2.5 py-1 font-mono text-[9px] font-medium tracking-wider text-[#38bdf8] uppercase backdrop-blur-md">
                    Double Certification
                  </span>
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <h3 className="font-display text-ivory group-hover:text-gold-bright text-lg font-semibold transition-colors">
                    Diplôme &amp; Reconnaissance
                  </h3>
                  <p className="text-ivory-dim/85 mt-2 text-xs leading-relaxed">
                    Délivrance de titres certifiants avec médaillon officiel pour valoriser votre
                    trajectoire professionnelle et vos appels d&apos;offres.
                  </p>
                </div>
                <div className="mt-5 border-t border-white/[0.06] pt-3 text-right">
                  <Link
                    href="/contact"
                    className="text-gold-bright hover:text-gold inline-flex items-center gap-1 font-mono text-xs transition-colors"
                  >
                    <span>Demander une admission</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
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

/**
 * Un chiffre du bandeau d'accueil.
 *
 * Volontairement sans logique : c'est l'appelant qui décide s'il y a quelque
 * chose à montrer. Un composant qui inventerait un repli afficherait un jour
 * ce repli comme s'il était vrai.
 */
function Chiffre({ valeur, legende }: { valeur: string; legende: string }) {
  return (
    <div className="border-line/60 bg-panel/60 rounded-clixa border p-5">
      <div className="font-display text-gold-bright text-[1.8rem] leading-none font-bold">
        {valeur}
      </div>
      <div className="text-ivory-dim mt-2 text-[0.8rem]">{legende}</div>
    </div>
  );
}
