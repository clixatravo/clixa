import type { Metadata } from "next";
import { FilAriane } from "@/components/FilAriane";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Pour les entreprises",
  description:
    "Académies internes, parcours sur mesure et inscriptions groupées : CLIXA construit des dispositifs de formation à partir de vos référentiels métier.",
};

const dispositifs = [
  {
    titre: "Inscriptions groupées",
    texte:
      "Vos collaborateurs rejoignent nos sessions au catalogue, avec une facturation unique et un suivi de présence consolidé.",
    pour: "À partir de 3 participants",
  },
  {
    titre: "Session dédiée",
    texte:
      "Un programme du catalogue, animé pour vos seules équipes, dans vos locaux ou en classe virtuelle, aux dates qui vous arrangent.",
    pour: "À partir de 8 participants",
  },
  {
    titre: "Académie interne",
    texte:
      "Un parcours conçu à partir de vos référentiels, de vos cas réels et de vos objectifs de montée en compétences, avec validation des acquis.",
    pour: "Dispositif annuel",
  },
];

const etapes = [
  {
    t: "Cadrage",
    d: "Un échange pour comprendre le besoin réel, les publics visés et les contraintes de calendrier.",
  },
  {
    t: "Proposition",
    d: "Un programme détaillé, un budget et un calendrier. Sous cinq jours ouvrés.",
  },
  { t: "Animation", d: "Les sessions se tiennent, avec suivi de présence et points d'étape." },
  {
    t: "Restitution",
    d: "Bilan des acquis, retours des participants et recommandations pour la suite.",
  },
];

export default function Entreprises() {
  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "Pour les entreprises" }]} />

      <section className="border-line from-panel to-ink border-b bg-gradient-to-br px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="eyebrow mono-label mb-5">Formation professionnelle continue</div>
          <h1 className="mb-6 max-w-[20ch] text-[clamp(2rem,4.4vw,3.2rem)]">
            Vous formez une équipe, pas un individu.
          </h1>
          <p className="text-ivory-dim mb-8 max-w-[62ch] text-[1.02rem]">
            Un collaborateur envoyé seul en formation revient rarement avec un effet durable. Les
            dispositifs collectifs changent la donne : même vocabulaire, mêmes outils, et une
            direction qui peut mesurer ce qui a bougé.
          </p>
          <Button href="/contact">Discuter de votre besoin</Button>
        </div>
      </section>

      <section className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9">
            <span className="mono-label text-gold mb-3 block">Trois formules</span>
            <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)]">Selon la taille de votre besoin.</h2>
          </div>

          <div className="hairline-grid lg:grid-cols-3">
            {dispositifs.map((d) => (
              <div key={d.titre} className="bg-panel flex flex-col gap-3 p-8">
                <h3 className="font-display text-[1.2rem]">{d.titre}</h3>
                <p className="text-ivory-dim text-[0.93rem]">{d.texte}</p>
                <span className="text-emerald-bright border-line mt-auto border-t pt-4 font-mono text-[0.64rem] tracking-[0.1em] uppercase">
                  {d.pour}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-line border-b px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9">
            <span className="mono-label text-gold mb-3 block">Comment ça se passe</span>
            <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)]">Quatre étapes, sans surprise.</h2>
          </div>

          <div className="hairline-grid sm:grid-cols-2 lg:grid-cols-4">
            {etapes.map((e, i) => (
              <div key={e.t} className="bg-ink p-7">
                <span className="text-gold font-mono text-[0.62rem] tracking-[0.12em]">
                  Étape {i + 1}
                </span>
                <h3 className="font-display mt-4 mb-2 text-[1.05rem]">{e.t}</h3>
                <p className="text-ivory-dim text-[0.86rem]">{e.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-8 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="border-gold bg-panel flex flex-wrap items-center justify-between gap-8 border p-10">
            <div>
              <h2 className="mb-3 max-w-[26ch] text-[clamp(1.4rem,2.6vw,1.9rem)]">
                Construisons le dispositif qui correspond à vos équipes.
              </h2>
              <p className="text-ivory-dim max-w-[52ch] text-[0.94rem]">
                Décrivez-nous votre besoin : nous revenons vers vous sous 24 h ouvrées avec une
                première proposition de cadrage.
              </p>
            </div>
            <Button href="/contact">Nous écrire</Button>
          </div>
        </div>
      </section>
    </>
  );
}
