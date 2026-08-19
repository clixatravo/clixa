import type { Metadata } from "next";
import { FilAriane } from "@/components/FilAriane";
import { Button } from "@/components/ui/Button";
import { getProgrammes, getSpecialisations } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "CLIXA Institute — Center of Leadership, Innovation & Excellence in Africa. Former, certifier et accompagner les dirigeants et les organisations du continent.",
};

const leviers = [
  {
    titre: "Former",
    texte:
      "Des parcours construits sur des référentiels reconnus et animés par des praticiens en exercice, pas par des formateurs de métier coupés du terrain.",
  },
  {
    titre: "Certifier",
    texte:
      "Des certifications internationales qui ouvrent des portes concrètes : appels d'offres, mobilité, évolution interne. La reconnaissance prime sur le volume horaire.",
  },
  {
    titre: "Accompagner",
    texte:
      "Un suivi qui ne s'arrête pas à la dernière séance : préparation à l'examen, mise en pratique, et académies internes pour les organisations.",
  },
];

export default function APropos() {
  const specs = getSpecialisations();
  const programmes = getProgrammes();

  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "À propos" }]} />

      <section className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="eyebrow mono-label mb-5">
            Center of Leadership, Innovation &amp; Excellence in Africa
          </div>
          <h1 className="mb-6 max-w-[18ch] text-[clamp(2rem,4.4vw,3.2rem)]">
            Former ceux qui font bouger les organisations africaines.
          </h1>
          <p className="text-ivory-dim mb-4 max-w-[64ch] text-[1.02rem]">
            CLIXA Institute accompagne dirigeants, managers et organisations à travers des
            programmes certifiants, des parcours exécutifs et des dispositifs sur mesure. Nous
            opérons depuis Agadir, Abidjan et Dakar.
          </p>
          <p className="text-ivory-dim max-w-[64ch] text-[1.02rem]">
            Notre conviction est simple : sur ce continent, la compétence ne manque pas — ce qui
            manque, c&apos;est la reconnaissance formelle de cette compétence sur les marchés
            internationaux. C&apos;est le problème que nous traitons.
          </p>
        </div>
      </section>

      <section className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9">
            <span className="mono-label text-gold mb-3 block">Ce que nous faisons</span>
            <h2 className="max-w-[24ch] text-[clamp(1.5rem,2.8vw,2.1rem)]">
              Une plateforme, trois leviers de transformation.
            </h2>
          </div>

          <div className="hairline-grid lg:grid-cols-3">
            {leviers.map((l, i) => (
              <div key={l.titre} className="bg-ink p-8">
                <span className="text-gold font-display mb-5 block text-base">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display mb-3 text-[1.28rem]">{l.titre}</h3>
                <p className="text-ivory-dim text-[0.95rem]">{l.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="hairline-grid grid-cols-2 lg:grid-cols-4">
            {[
              [String(programmes.length), "programmes au catalogue"],
              [String(specs.length), "spécialisations métier"],
              ["3", "campus sur le continent"],
              ["2", "modalités — présentiel et distance"],
            ].map(([n, l]) => (
              <div key={l} className="bg-panel p-6">
                <div className="font-display text-gold-bright text-[2rem] leading-none">{n}</div>
                <div className="text-ivory-dim mt-3 text-[0.84rem]">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-8">
            <span className="mono-label text-gold mb-3 block">SkillAfrique by CLIXA</span>
            <h2 className="mb-4 max-w-[24ch] text-[clamp(1.5rem,2.8vw,2.1rem)]">
              La marque de formation en ligne de CLIXA.
            </h2>
            <p className="text-ivory-dim mb-8 max-w-[62ch] text-[0.98rem]">
              SkillAfrique démocratise l&apos;accès à des formations live, premium et orientées
              résultats, pour les professionnels africains et internationaux. C&apos;est la marque
              sur laquelle CLIXA Institute s&apos;est construit, et elle porte aujourd&apos;hui
              toute notre offre à distance.
            </p>
            <div className="flex flex-wrap gap-5">
              <Button href="/skillafrique">Découvrir SkillAfrique</Button>
              <Button href="/formations" variante="contour">
                Voir le catalogue
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
