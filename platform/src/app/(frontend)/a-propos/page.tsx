import type { Metadata } from "next";
import { FilAriane } from "@/components/FilAriane";
import { Button } from "@/components/ui/Button";
import { getAgenda, getProgrammes, getSpecialisations, libelleMode } from "@/lib/catalogue";
import { DEVISE } from "@/lib/societe";

export const metadata: Metadata = {
  title: "À propos",
  description: `CLIXA Institute — ${DEVISE}. Former, certifier et accompagner les dirigeants et les organisations du continent.`,
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

      <section className="border-line relative overflow-hidden border-b px-8 py-16 lg:py-20">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1180px]">
          <div className="eyebrow mono-label mb-5">{DEVISE}</div>
          <h1 className="mb-6 max-w-[18ch] text-[clamp(2.2rem,4.6vw,3.4rem)] font-bold">
            Former ceux qui font bouger les{" "}
            <span className="gold-gradient-text">organisations africaines</span>.
          </h1>
          <p className="text-ivory-dim/95 mb-4 max-w-[64ch] text-[1.05rem] leading-relaxed">
            CLIXA Institute accompagne dirigeants, managers et organisations à travers des
            programmes certifiants, des parcours exécutifs et des dispositifs sur mesure. Nous
            opérons depuis Agadir, et préparons nos implantations d&apos;Abidjan et de Dakar.
          </p>
          <p className="text-ivory-dim/80 max-w-[64ch] text-[1.02rem] leading-relaxed">
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
            <h2 className="max-w-[24ch] text-[clamp(1.5rem,2.8vw,2.1rem)] font-semibold">
              Une plateforme, trois leviers de transformation.
            </h2>
          </div>

          <div className="carte-grid lg:grid-cols-3">
            {leviers.map((l, i) => (
              <div key={l.titre} className="executive-card rounded-clixa p-8">
                <span className="text-gold mb-4 block font-mono text-[0.66rem] tracking-[0.14em]">
                  LEVIER {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-ivory mb-3 text-[1.3rem] font-semibold">
                  {l.titre}
                </h3>
                <p className="text-ivory-dim/90 text-[0.95rem] leading-relaxed">{l.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-line bg-panel/30 border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {quatre.map(([n, l]) => (
              <div
                key={l}
                className="border-line/60 bg-panel/70 rounded-clixa border p-6 backdrop-blur-sm"
              >
                <div className="font-display text-gold-bright text-[2.2rem] leading-none font-bold">
                  {n}
                </div>
                <div className="text-ivory-dim mt-3 text-[0.86rem]">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="glass-panel-gold rounded-clixa p-10">
            <span className="mono-label text-gold mb-3 block">SkillAfrique by CLIXA</span>
            <h2 className="mb-4 max-w-[24ch] text-[clamp(1.5rem,2.8vw,2.1rem)] font-semibold">
              La marque de formation en ligne de CLIXA.
            </h2>
            <p className="text-ivory-dim/90 mb-8 max-w-[62ch] text-[1rem] leading-relaxed">
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
