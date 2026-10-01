import type { CSSProperties } from "react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilAriane } from "@/components/FilAriane";
import { Button } from "@/components/ui/Button";
import { getAgenda, getProgrammes, getSpecialisations, libelleFuseau } from "@/lib/catalogue";
import { composerEmploi, NOMS_DES_JOURS, type Rythme } from "@/lib/emploi";

export const metadata: Metadata = {
  title: "Emploi du temps",
  description:
    "Qui étudie quel soir, du premier au dernier : l'emploi du temps de la cohorte ouverte, soirée par soirée.",
  alternates: { canonical: "/emploi-du-temps" },
};

/*
  Composée depuis le cache de données du catalogue ; les crochets des sessions
  et des parcours rafraîchissent aussi `/emploi-du-temps`. Le plafond d'une
  heure rattrape une écriture faite par script, qui ne lève rien.
*/
export const revalidate = 3600;

const LONG = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const COURT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const MOIS = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const midi = (jour: string) => new Date(`${jour.slice(0, 10)}T12:00:00.000Z`);
const couleur = (r: Rythme) => ({ "--c": r.couleur }) as CSSProperties;

/**
 * L'emploi du temps de la cohorte ouverte, tel que le visiteur le lit avant de
 * s'inscrire : les rythmes, le calendrier soir par soir, et chaque formation.
 *
 * ⚠️ **Rien n'y est écrit à la main.** Tout sort de `composerEmploi`, qui lit
 * les sessions ouvertes par la même règle que le calendrier d'une fiche
 * (`planDesSeances`). Le PDF validé par la direction le 1er octobre 2026 est
 * une photographie ; cette page suit /admin.
 *
 * ⚠️ **Une seule heure, avec son fuseau** — la décision du 4 septembre 2026 :
 * pas de conversion « chez vous » à côté, qui se lirait comme un second
 * créneau au choix.
 */
export default async function PageEmploiDuTemps() {
  const [programmes, sessions, specialisations] = await Promise.all([
    getProgrammes(),
    getAgenda(500),
    getSpecialisations(),
  ]);
  const emploi = composerEmploi(sessions, programmes);
  const nomFiliere = new Map<string, string>(specialisations.map((s) => [s.slug, s.nom]));

  if (!emploi) {
    return (
      <>
        <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "Emploi du temps" }]} />
        <section className="px-8 py-24">
          <div className="mx-auto max-w-[720px] text-center">
            <div className="eyebrow mono-label mb-5">Emploi du temps</div>
            <h1 className="mb-5 text-[clamp(2rem,4.2vw,3rem)] font-bold">
              Aucune cohorte n&apos;est ouverte pour l&apos;instant
            </h1>
            <p className="text-ivory-dim/95 mx-auto mb-8 max-w-[52ch] leading-relaxed">
              Le calendrier de la prochaine cohorte paraîtra ici dès son ouverture.
            </p>
            <Button href="/formations">Voir les formations</Button>
          </div>
        </section>
      </>
    );
  }

  const { rythmes, colonnes, semaines, debut, fin, nonDatees } = emploi;
  const nbFormations = rythmes.reduce((n, r) => n + r.formations.length, 0);
  const soirsParSemaine = [...new Set(rythmes.map((r) => r.jours.length))];
  const horaires = [...new Set(rythmes.map((r) => r.horaire).filter(Boolean))];
  const fuseaux = [...new Set(rythmes.map((r) => r.fuseau).filter(Boolean) as string[])];
  const fuseau = fuseaux.length === 1 ? libelleFuseau(fuseaux[0]!) : undefined;
  const heure = horaires.length === 1 ? [horaires[0], fuseau].filter(Boolean).join(" ") : undefined;
  const titreDeRythme = new Map(rythmes.map((r, i) => [i, r]));
  const enPlusParJour = new Map<number, Set<string>>();
  for (const r of rythmes) {
    for (const f of r.formations) {
      for (const d of f.enPlus) {
        const j = new Date(d).getUTCDay();
        enPlusParJour.set(j, (enPlusParJour.get(j) ?? new Set()).add(f.titre));
      }
    }
  }

  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "Emploi du temps" }]} />

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <section className="border-line relative overflow-hidden border-b px-6 py-14 sm:px-8 lg:py-20">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1180px]">
          <div className="eyebrow mono-label mb-5">Cohorte de {MOIS.format(midi(debut))}</div>
          <h1 className="mb-5 text-[clamp(2rem,4.6vw,3.3rem)] font-bold">Emploi du temps</h1>
          <p className="text-ivory-dim/95 max-w-[64ch] text-[1.02rem] leading-relaxed">
            Les {nbFormations} formations
            {soirsParSemaine.length === 1 && `, ${soirsParSemaine[0]} soirées par semaine`}
            {heure && `, de ${heure}`}, du {LONG.format(midi(debut))} au {LONG.format(midi(fin))}.
            Chaque formation a lieu en direct, dans sa classe, avec son formateur.
          </p>

          <dl className="border-line mt-9 grid grid-cols-2 gap-y-6 border-y py-6 sm:grid-cols-4">
            {[
              [String(nbFormations), "formations"],
              ...(soirsParSemaine.length === 1
                ? [[String(soirsParSemaine[0]), "soirées par semaine"]]
                : []),
              [String(semaines.length), "semaines"],
              ...(horaires.length === 1 ? [[horaires[0]!, fuseau ?? "horaire"]] : []),
            ].map(([valeur, legende], i) => (
              <div
                key={legende}
                className={`border-line ${i % 2 === 1 ? "border-l pl-5" : ""} ${i > 0 ? "sm:border-l sm:pl-6" : ""}`}
              >
                <dt className="sr-only">{legende}</dt>
                <dd>
                  <span className="font-display text-gold-bright block text-[clamp(1.5rem,3vw,2.1rem)] leading-none font-semibold">
                    {valeur}
                  </span>
                  <span className="text-ivory-dim mt-2 block font-mono text-[0.66rem] tracking-[0.12em] uppercase">
                    {legende}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── La semaine type ─────────────────────────────────────────────── */}
      <section className="px-6 py-14 sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="mono-label text-gold mb-2 text-[0.66rem] tracking-[0.14em]">
            La semaine type
          </div>
          <h2 className="font-display mb-3 text-[clamp(1.4rem,2.6vw,2rem)]">
            Qui étudie quel soir
          </h2>
          <p className="text-ivory-dim/90 mb-8 max-w-[62ch] text-[0.95rem] leading-relaxed">
            Chaque formation suit l&apos;un des rythmes ci-dessous. Les formations d&apos;un même
            soir ont lieu en même temps, chacune dans sa classe.
          </p>

          <ol
            className="mb-8 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${colonnes.length}, minmax(0, 1fr))` }}
            aria-label="Les soirs de la semaine"
          >
            {colonnes.map((j) => {
              const ici = rythmes.filter((r) => r.jours.includes(j));
              const enPlus = enPlusParJour.get(j);
              return (
                <li
                  key={j}
                  className={`rounded-clixa border px-2 py-3 text-center ${ici.length ? "border-line bg-panel/60" : "border-line/60 border-dashed"}`}
                >
                  <span className="text-ivory block text-[0.78rem] font-semibold sm:text-[0.9rem]">
                    <span className="sm:hidden">{NOMS_DES_JOURS[j]!.slice(0, 3)}</span>
                    <span className="hidden sm:inline">{NOMS_DES_JOURS[j]}</span>
                  </span>
                  <span className="mt-2 flex flex-wrap justify-center gap-1">
                    {ici.length > 0 ? (
                      ici.map((r) => (
                        <span
                          key={r.libelle}
                          style={couleur(r)}
                          className="size-2.5 rounded-full bg-(--c)"
                          aria-label={r.libelle}
                        />
                      ))
                    ) : (
                      <span className="text-ivory-dim/70 font-mono text-[0.58rem] tracking-[0.08em] uppercase">
                        {enPlus ? "PMP®" : "Libre"}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="grid gap-5 lg:grid-cols-2">
            {rythmes.map((r) => (
              <article
                key={r.libelle}
                style={couleur(r)}
                className="executive-card rounded-clixa border-line relative overflow-hidden border p-6 sm:p-7"
              >
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-(--c)" />
                <div className="mb-1 font-mono text-[0.66rem] tracking-[0.14em] text-(--c) uppercase">
                  {[r.horaire, r.fuseau && libelleFuseau(r.fuseau)].filter(Boolean).join(" · ")}
                </div>
                <h3 className="font-display text-ivory mb-1 text-[1.5rem]">{r.libelle}</h3>
                <p className="text-ivory-dim mb-5 text-[0.88rem]">
                  {r.regulieres.length} soirées · du {COURT.format(midi(r.regulieres[0]!))} au{" "}
                  {COURT.format(midi(r.regulieres.at(-1)!))}
                </p>
                <ul className="divide-line/60 divide-y">
                  {r.formations.map((f) => (
                    <li key={f.slug} className="flex items-baseline justify-between gap-3 py-2.5">
                      <Link
                        href={`/formations/${f.slug}` as Route}
                        className="text-ivory hover:text-gold-bright text-[0.95rem] font-medium transition-colors"
                      >
                        {f.titre}
                      </Link>
                      {f.enPlus.length > 0 && (
                        <span className="text-ivory-dim shrink-0 text-right text-[0.74rem]">
                          + {f.enPlus.length}{" "}
                          {NOMS_DES_JOURS[new Date(f.enPlus[0]!).getUTCDay()]!.toLowerCase()}s :{" "}
                          {f.enPlus.map((d) => COURT.format(midi(d))).join(" et ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Le calendrier ───────────────────────────────────────────────── */}
      <section className="border-line border-t px-6 py-14 sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="mono-label text-gold mb-2 text-[0.66rem] tracking-[0.14em]">
            Soir par soir
          </div>
          <h2 className="font-display mb-3 text-[clamp(1.4rem,2.6vw,2rem)]">
            Le calendrier complet
          </h2>
          <p className="text-ivory-dim/90 mb-5 max-w-[62ch] text-[0.95rem] leading-relaxed">
            « 5/16 » veut dire cinquième soirée sur seize, pour toutes les formations du rythme.
          </p>
          <ul className="mb-7 flex flex-wrap gap-x-6 gap-y-2 text-[0.85rem]">
            {rythmes.map((r) => (
              <li
                key={r.libelle}
                style={couleur(r)}
                className="text-ivory-dim flex items-center gap-2"
              >
                <span aria-hidden="true" className="size-2.5 rounded-full bg-(--c)" />
                {r.libelle}
              </li>
            ))}
          </ul>

          <div className="space-y-3">
            {semaines.map((s, i) => (
              <div key={s.lundi} className="grid gap-2 lg:grid-cols-[88px_1fr]">
                <div className="text-ivory-dim pt-2 font-mono text-[0.66rem] tracking-[0.12em] uppercase">
                  Semaine {i + 1}
                </div>
                <ol
                  className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]"
                  style={{ "--n": colonnes.length } as CSSProperties}
                >
                  {s.jours.map((j) => {
                    const vide = j.rythmes.length === 0 && j.enPlus.length === 0;
                    const date = midi(j.jour);
                    return (
                      <li
                        key={j.jour}
                        className={`rounded-clixa border px-3 py-2.5 ${vide ? "border-line/50 border-dashed max-lg:hidden" : "border-line bg-panel/50"}`}
                      >
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                          <span className="text-ivory text-[0.82rem] font-semibold">
                            {NOMS_DES_JOURS[date.getUTCDay()]}
                          </span>
                          <span className="text-ivory-dim font-mono text-[0.68rem]">
                            {COURT.format(date)}
                          </span>
                        </div>
                        {vide ? (
                          <span className="text-ivory-dim/60 font-mono text-[0.6rem] tracking-[0.08em] uppercase">
                            Pas de cours
                          </span>
                        ) : (
                          <ul className="space-y-1">
                            {j.rythmes.map((e) => {
                              const r = titreDeRythme.get(e.index)!;
                              return (
                                <li
                                  key={e.index}
                                  style={couleur(r)}
                                  className="flex items-center justify-between gap-2 border-l-2 border-(--c) pl-2 text-[0.74rem]"
                                >
                                  <span className="text-ivory-dim truncate">{r.libelle}</span>
                                  <b className="shrink-0 font-mono font-semibold text-(--c)">
                                    {e.n}/{e.total}
                                  </b>
                                </li>
                              );
                            })}
                            {j.enPlus.map((e) => {
                              const r = titreDeRythme.get(e.index)!;
                              return (
                                <li
                                  key={e.titre}
                                  style={couleur(r)}
                                  className="flex items-end justify-between gap-2 border-l-2 border-dashed border-(--c) pl-2 text-[0.74rem]"
                                >
                                  <span className="text-ivory-dim leading-snug italic">
                                    {e.titre} · en plus
                                  </span>
                                  <b className="shrink-0 font-mono font-semibold text-(--c)">
                                    {e.n}/{e.total}
                                  </b>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chaque formation ────────────────────────────────────────────── */}
      <section className="border-line border-t px-6 py-14 sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="mono-label text-gold mb-2 text-[0.66rem] tracking-[0.14em]">
            Les {nbFormations} formations
          </div>
          <h2 className="font-display mb-7 text-[clamp(1.4rem,2.6vw,2rem)]">
            Du premier au dernier soir
          </h2>

          <div className="border-line rounded-clixa overflow-hidden border">
            <div className="text-ivory-dim border-line bg-panel/60 hidden grid-cols-[1.6fr_1fr_0.8fr_0.8fr_0.6fr_auto] gap-4 border-b px-5 py-3 font-mono text-[0.62rem] tracking-[0.12em] uppercase md:grid">
              <span>Formation</span>
              <span>Soirs</span>
              <span>Début</span>
              <span>Fin</span>
              <span>Soirées</span>
              <span className="sr-only">Inscription</span>
            </div>
            <ul className="divide-line/70 divide-y">
              {rythmes.flatMap((r) =>
                r.formations.map((f) => (
                  <li
                    key={f.slug}
                    style={couleur(r)}
                    className="grid gap-x-4 gap-y-1.5 px-5 py-4 md:grid-cols-[1.6fr_1fr_0.8fr_0.8fr_0.6fr_auto] md:items-center"
                  >
                    <div>
                      <Link
                        href={`/formations/${f.slug}` as Route}
                        className="text-ivory hover:text-gold-bright font-medium transition-colors"
                      >
                        {f.titre}
                      </Link>
                      {f.specialisation && nomFiliere.get(f.specialisation) && (
                        <span className="text-ivory-dim block text-[0.76rem]">
                          {nomFiliere.get(f.specialisation)}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-2 text-[0.86rem] text-(--c)">
                      <span aria-hidden="true" className="size-2 rounded-full bg-(--c)" />
                      {r.libelle}
                    </span>
                    <span className="text-ivory-dim text-[0.86rem]">
                      <span className="md:hidden">Du </span>
                      {COURT.format(midi(f.debut))}
                    </span>
                    <span className="text-ivory-dim text-[0.86rem]">
                      <span className="md:hidden">au </span>
                      {COURT.format(midi(f.fin))}
                    </span>
                    <span className="text-ivory-dim font-mono text-[0.8rem]">
                      {f.soirees} × 2 h
                    </span>
                    <Link
                      href={
                        `/inscription?formation=${f.slug}&debut=${f.debut.slice(0, 10)}` as Route
                      }
                      className="text-gold hover:text-gold-bright mt-1 font-mono text-[0.68rem] tracking-[0.1em] uppercase transition-colors md:mt-0"
                    >
                      Me pré-inscrire →
                    </Link>
                  </li>
                )),
              )}
            </ul>
          </div>

          {nonDatees.length > 0 && (
            <p className="text-ivory-dim mt-5 text-[0.88rem]">
              Le calendrier de{" "}
              {nonDatees.map((n, i) => (
                <span key={n.slug}>
                  {i > 0 && ", "}
                  <Link href={`/formations/${n.slug}` as Route} className="text-gold underline">
                    {n.titre}
                  </Link>
                </span>
              ))}{" "}
              se lit sur sa fiche.
            </p>
          )}

          {fuseau && (
            <p className="text-ivory-dim/80 mt-6 text-[0.84rem]">
              Les horaires sont donnés en {fuseau}. Si vous êtes dans un autre fuseau, pensez à les
              convertir avant de vous inscrire.
            </p>
          )}
        </div>
      </section>

      <section className="border-line border-t px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-[820px] text-center">
          <h2 className="font-display mb-4 text-[clamp(1.4rem,2.6vw,2rem)]">
            Votre soir vous convient ?
          </h2>
          <p className="text-ivory-dim/90 mx-auto mb-7 max-w-[52ch] text-[0.98rem] leading-relaxed">
            La pré-inscription n&apos;engage à rien : rien n&apos;est encaissé, et votre place est
            retenue.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button href="/formations">Choisir ma formation</Button>
            <Button href="/faq" variante="contour">
              Questions fréquentes
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
