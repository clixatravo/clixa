import type { Metadata } from "next";
import { FilAriane } from "@/components/FilAriane";
import { Button } from "@/components/ui/Button";
import { getAgenda, getProgrammes, getSpecialisations, libelleMode } from "@/lib/catalogue";

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

export default async function APropos() {
  const specs = await getSpecialisations();
  const programmes = await getProgrammes();
  const sessions = await getAgenda(500);

  /*
    Les chiffres sortent du catalogue, jamais du clavier.
    Deux d'entre eux annonçaient « 3 campus » et « 2 modalités » alors que les
    douze parcours se donnent tous à distance : des promesses qu'aucune session
    ne tenait. Ceux qui ne valent rien aujourd'hui sont tus, et reparaîtront
    d'eux-mêmes quand une session en présentiel sera ouverte.
  */
  const villes = [...new Set(sessions.map((s) => s.ville).filter(Boolean))];
  const modes = [...new Set(sessions.map((s) => s.mode))];
  const seances = [...new Set(programmes.map((p) => p.modules.length).filter((n) => n > 0))];

  const chiffres: [string, string][] = [
    [String(programmes.length), "programmes au catalogue"],
    [String(specs.length), "spécialisations métier"],
  ];

  // Un nombre de séances identique partout se dit ; s'il varie, il ne veut rien dire.
  const uniqueSeances = seances.length === 1 ? seances[0] : undefined;
  if (uniqueSeances !== undefined) chiffres.push([String(uniqueSeances), "séances par parcours"]);

  if (villes.length > 0) {
    chiffres.push([
      String(villes.length),
      villes.length > 1 ? "villes d'accueil" : "ville d'accueil",
    ]);
  }

  const modeUnique = modes.length === 1 ? modes[0] : undefined;
  if (modes.length > 1) {
    chiffres.push([String(modes.length), "modalités de formation"]);
  } else if (modeUnique) {
    chiffres.push(["100 %", `des parcours ${libelleMode[modeUnique].toLowerCase()}`]);
  }

  const quatre = chiffres.slice(0, 4);

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
            {quatre.map(([n, l]) => (
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
