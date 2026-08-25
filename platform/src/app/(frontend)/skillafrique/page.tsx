import type { Metadata } from "next";
import { FilAriane } from "@/components/FilAriane";
import { Button } from "@/components/ui/Button";
import { ProgrammeCard } from "@/components/ProgrammeCard";
import { getProgrammes, getSessions } from "@/lib/catalogue";
import { MarqueSkillAfrique } from "@/components/MarqueSkillAfrique";

/**
 * Page dédiée à SkillAfrique.
 *
 * SkillAfrique est la marque de formation en ligne sur laquelle CLIXA s'est
 * construit. Elle a sa propre page — et non une simple mention — pour rester
 * trouvable : les clients de la première heure cherchent ce nom, pas « CLIXA ».
 *
 * Le contenu reprend index.html mot pour mot, c'est la source de vérité.
 */
export const metadata: Metadata = {
  title: "SkillAfrique",
  description:
    "SkillAfrique by CLIXA — la marque de formation en ligne de CLIXA Institute. Formations live, cohortes interactives et pédagogie concrète pour les professionnels africains et internationaux.",
  alternates: { canonical: "/skillafrique" },
  keywords: ["SkillAfrique", "Skill Afrique", "SkillAfrique CLIXA", "formation en ligne Afrique"],
  openGraph: {
    type: "website",
    url: "/skillafrique",
    title: "SkillAfrique by CLIXA",
    description: "La marque de formation en ligne de CLIXA Institute.",
  },
};

const piliers = [
  {
    titre: "Formations en direct",
    texte:
      "Des sessions animées en temps réel par des praticiens, pas des vidéos préenregistrées que personne ne termine.",
  },
  {
    titre: "Cohortes interactives",
    texte:
      "On apprend en groupe, avec un rythme commun et des échanges entre pairs. C'est ce qui fait la différence sur le taux de complétion.",
  },
  {
    titre: "Pédagogie concrète",
    texte:
      "Des cas réels, des outils manipulés en séance, et des livrables que vous réutilisez dès le lendemain au bureau.",
  },
  {
    titre: "Progression mesurable",
    texte:
      "Des points d'étape et une évaluation des acquis, pour que la montée en compétence se constate au lieu de se supposer.",
  },
];

export default async function SkillAfrique() {
  // Les programmes proposés à distance sont ceux portés par SkillAfrique.
  // Les programmes proposés à distance sont ceux portés par SkillAfrique.
  const programmes = await getProgrammes();
  const avecVisio = await Promise.all(
    programmes.map(async (p) => ({
      programme: p,
      aDuVisio: (await getSessions(p.slug)).some((s) => s.mode === "visio"),
    })),
  );
  const enLigne = avecVisio
    .filter((x) => x.aDuVisio)
    .map((x) => x.programme)
    .slice(0, 3);

  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "SkillAfrique" }]} />

      <section className="border-line relative overflow-hidden border-b px-8 py-16 lg:py-20">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="eyebrow mono-label mb-5">SkillAfrique by CLIXA</div>
            <h1 className="mb-6 max-w-[18ch] text-[clamp(2.2rem,4.6vw,3.4rem)] font-bold">
              La marque de formation <span className="gold-gradient-text">en ligne de CLIXA</span>.
            </h1>
            <p className="text-ivory-dim/95 mb-8 max-w-[62ch] text-[1.05rem] leading-relaxed">
              SkillAfrique démocratise l&apos;accès à des formations live, premium et orientées
              résultats, pour les professionnels africains et internationaux.
            </p>
            <div className="flex flex-wrap gap-5">
              <Button href="/formations">Voir les formations en ligne</Button>
              <Button href="/contact" variante="contour">
                Être rappelé
              </Button>
            </div>
          </div>

          {/* La marque */}
          <MarqueSkillAfrique />
        </div>
      </section>

      <section className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9">
            <span className="mono-label text-gold mb-3 block">Ce qui fait SkillAfrique</span>
            <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)] font-semibold">
              Quatre partis pris, tenus depuis le début.
            </h2>
          </div>

          <div className="carte-grid sm:grid-cols-2 lg:grid-cols-4">
            {piliers.map((p, i) => (
              <div key={p.titre} className="executive-card rounded-clixa p-7">
                <span className="text-gold font-display mb-4 block text-lg font-bold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-ivory mb-2.5 text-[1.12rem] font-semibold">
                  {p.titre}
                </h3>
                <p className="text-ivory-dim/85 text-[0.88rem] leading-relaxed">{p.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {enLigne.length > 0 && (
        <section className="border-line border-b px-8 py-16">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="mono-label text-gold mb-3 block">En classe virtuelle</span>
                <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)] font-semibold">
                  Les programmes suivis à distance.
                </h2>
              </div>
              <Button href="/formations" variante="contour">
                Tout le catalogue
              </Button>
            </div>

            <div className="carte-grid sm:grid-cols-2 lg:grid-cols-3">
              {enLigne.map((p) => (
                <ProgrammeCard key={p.slug} programme={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="glass-panel-gold rounded-clixa flex flex-wrap items-center justify-between gap-8 p-10">
            <div>
              <span className="mono-label text-gold mb-3 block">
                Vous connaissiez SkillAfrique ?
              </span>
              <h2 className="mb-3 max-w-[26ch] text-[clamp(1.4rem,2.6vw,1.9rem)] font-semibold">
                SkillAfrique fait partie de CLIXA Institute.
              </h2>
              <p className="text-ivory-dim/90 max-w-[54ch] text-[0.96rem] leading-relaxed">
                Si vous avez déjà suivi une formation SkillAfrique, vous êtes au bon endroit : le
                catalogue, les intervenants et la pédagogie sont les mêmes, désormais réunis sous
                CLIXA Institute.
              </p>
            </div>
            <Button href="/contact">Nous écrire</Button>
          </div>
        </div>
      </section>
    </>
  );
}
