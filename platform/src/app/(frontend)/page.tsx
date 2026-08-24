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
  getTarifs,
  formatPrix,
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
  const tarifs = await getTarifs();

  /*
    Ce que le catalogue propose vraiment, plutôt qu'une promesse écrite une
    fois. L'accroche annonçait « en présentiel à Agadir, Abidjan et Dakar » —
    trois villes où aucune session n'est ouverte. C'est la première phrase que
    lit un visiteur : elle doit tenir.
  */
  /*
    Sur tout le catalogue, pas sur l'agenda : celui-ci ne rend que les quatre
    prochaines sessions. Une promesse faite en tête de page ne peut pas se
    déduire d'une tranche — il suffirait qu'une session en présentiel soit la
    cinquième pour que la page n'en parle plus.
  */
  const villes = await villesDisponibles();
  const prochaine = agenda[0];
  const seances = [...new Set(programmes.map((p) => p.modules.length).filter((n) => n > 0))];

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
      {/* ── Héros ── */}
      <section className="border-line border-b px-8 py-20">
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <div>
            <div className="eyebrow mono-label mb-6">Certifications · Exécutif · Corporate</div>
            <h1 className="mb-6 max-w-[17ch] text-[clamp(2.2rem,5vw,3.8rem)]">
              Des programmes qui{" "}
              <em className="text-gold-bright not-italic">changent une trajectoire</em>.
            </h1>
            <p className="text-ivory-dim mb-8 max-w-[54ch] text-[1.05rem]">
              Formations certifiantes et parcours exécutifs pour dirigeants et managers en Afrique.{" "}
              {ouLesCours}
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

          {/*
            Les quatre chiffres qui décident, et rien d'autre : combien de
            parcours, quand ça commence, à quel prix, sur combien de séances.
            Ils sont calculés — la moitié droite du héros était vide, et un
            visuel décoratif n'aurait rien appris à personne.

            ── Pourquoi plus de cadre ──────────────────────────────────────
            C'était un panneau plein et bordé, le seul de la page. Le reste du
            site est fait de filets et de vide ; ce bloc y arrivait comme un
            encart rapporté, et il disputait le regard au titre au lieu de le
            suivre. Les mêmes chiffres, posés sur des filets, appartiennent au
            héros au lieu de se poser dessus.

            Son étiquette s'aligne sur celle du titre — deux repères de même
            nature à la même hauteur, plutôt qu'un bloc flottant au milieu.
          */}
          <aside className="w-full lg:max-w-[290px] lg:justify-self-end">
            <span className="mono-label text-gold mb-5 block">La prochaine cohorte</span>
            <dl className="border-line flex flex-col border-t">
              <Chiffre valeur={String(total)} legende="parcours au catalogue" />
              {prochaine && (
                <Chiffre valeur={formatDateCourte(prochaine.debut)} legende="première séance" />
              )}
              <Chiffre valeur={formatPrix(tarifs.prixComptantCentimes)} legende="comptant" />
              {seances.length === 1 && (
                <Chiffre valeur={String(seances[0])} legende="séances par parcours" />
              )}
            </dl>
          </aside>
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

          <div className="carte-grid sm:grid-cols-2 lg:grid-cols-4">
            {specs.map((s, i) => {
              const nb = nbParSpecialisation.get(s.slug) ?? 0;
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

      {/* ── SkillAfrique ── reprise de la section #skillafrique de index.html.
           La marque sur laquelle CLIXA s'est construit : elle garde sa place en
           page d'accueil, les anciens clients cherchent ce nom. */}
      <section id="skillafrique" className="border-line border-b px-8 py-16">
        <div className="mx-auto grid max-w-[1180px] items-center gap-8 lg:grid-cols-2 lg:gap-14">
          {/* La même marque qu'en tête de /skillafrique — un seul composant, un
              seul rendu à corriger le jour où le logo change. */}
          <MarqueSkillAfrique />

          <div>
            <span className="mono-label text-gold mb-4 block">SkillAfrique by CLIXA</span>
            <h2 className="mb-5 text-[clamp(1.5rem,2.8vw,2.1rem)]">
              La marque de formation en ligne de CLIXA.
            </h2>
            <p className="text-ivory-dim mb-6 text-[0.98rem]">
              SkillAfrique démocratise l&apos;accès à des formations live, premium et orientées
              résultats, pour les professionnels africains et internationaux.
            </p>

            {/* Typographie resserrée sur mobile pour que deux étiquettes tiennent
                par ligne au lieu d'une seule. */}
            <div className="mb-8 flex flex-wrap gap-2 lg:gap-2.5">
              {[
                "Formations en direct",
                "Cohortes interactives",
                "Pédagogie concrète",
                "Progression mesurable",
              ].map((t) => (
                <span
                  key={t}
                  className="border-line text-ivory-dim rounded-clixa border px-3 py-1.5 text-[0.72rem] lg:px-3.5 lg:py-2 lg:text-[0.8rem]"
                >
                  {t}
                </span>
              ))}
            </div>

            <Link href="/skillafrique" className="border-gold text-ivory border-b pb-1 text-sm">
              Découvrir SkillAfrique →
            </Link>
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

          <div className="carte-grid">
            {agenda.map((s) => {
              const prog = parSlug.get(s.programmeSlug);
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

          <div className="carte-grid sm:grid-cols-2 lg:grid-cols-3">
            {vedettes.map((p) => (
              <ProgrammeCard key={p.slug} programme={p} />
            ))}
          </div>
        </div>
      </section>

      {/*
        Les deux sections se taisent tant qu'aucun contenu n'est publié. Elles
        apparaîtront d'elles-mêmes quand l'équipe en publiera.
      */}
      <Temoignages temoignages={temoignages} titre="Ils sont passés par CLIXA." />
      <Partenaires partenaires={partenaires} />
    </>
  );
}

/** Une ligne de la carte du héros : un nombre, ce qu'il compte. */
function Chiffre({ valeur, legende }: { valeur: string; legende: string }) {
  return (
    /*
      `flex-col-reverse` : la légende reste avant la valeur dans le document —
      c'est ce qu'attend une liste de définitions, et ce que lit un lecteur
      d'écran — mais s'affiche dessous. Légende à gauche et valeur à droite
      faisait zigzaguer l'oeil sur quatre lignes ; l'une sous l'autre, chaque
      chiffre se lit d'un seul mouvement.
    */
    <div className="border-line flex flex-col-reverse gap-1.5 border-b py-4">
      <dt className="text-ivory-dim text-[0.8rem]">{legende}</dt>
      <dd className="font-display text-gold-bright text-[1.55rem] leading-none">{valeur}</dd>
    </div>
  );
}
