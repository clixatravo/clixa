import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { FilAriane } from "@/components/FilAriane";
import { appelant, cadenceOk } from "@/lib/cadence";
import { normaliserCodeCertificat } from "@/lib/code-certificat";
import { trouverCertificat } from "@/lib/inscriptions";

export const metadata: Metadata = {
  title: "Vérifier un certificat",
  description:
    "Vérifiez l'authenticité d'un certificat professionnel CLIXA Institute à partir de son code.",
  alternates: { canonical: "/verifier" },
  /*
    ⚠️ Un résultat porte le nom d'une personne. Ni cette page ni ses variantes
    `?code=` n'ont à paraître dans un moteur : on la trouve par le certificat,
    qui en imprime l'adresse.
  */
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const JOUR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

/**
 * La vérification d'un certificat, par un tiers.
 *
 * ── À qui elle sert ─────────────────────────────────────────────────────────
 * À l'employeur, à la banque, au recruteur à qui le participant remet son
 * certificat. Il tape le code imprimé en pied de page — ou suit l'adresse — et
 * apprend si le document est authentique, à quel nom, pour quel parcours, émis
 * quand. Rien de plus : ni le moyen de joindre la personne, ni celui d'ouvrir
 * son dossier (voir `trouverCertificat`).
 *
 * ⚠️ **Le code n'est pas la clef du dossier.** C'est tout ce qui rend cette page
 * possible : jusqu'au 14 septembre 2026, le certificat imprimait une forme de la
 * référence du dossier, et une page de vérification bâtie dessus aurait donné à
 * chaque lecteur de quoi ouvrir la fiche du participant. Voir
 * `lib/code-certificat.ts`.
 *
 * ── Le filtre est dans l'URL ────────────────────────────────────────────────
 * `/verifier?code=…` : un lien se transmet, et le formulaire n'a pas besoin de
 * JavaScript. C'est la convention du site pour tout ce qui se recherche.
 */
export default async function PageVerifier({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const { code: brut } = await searchParams;
  const saisie = Array.isArray(brut) ? brut[0] : brut;
  const code = normaliserCodeCertificat(saisie);

  /*
    ⚠️ **Un frein, même si quarante bits ne se devinent pas.** On ne compte pas
    sur lui pour protéger les codes — leur taille s'en charge — mais une boucle
    qui interroge la base à chaque requête ne doit pas pouvoir tourner sans fin.
    Le plancher est celui de l'attestation, qui nomme elle aussi une personne.
  */
  let freine = false;
  if (saisie) {
    const entetes = await headers();
    freine = !cadenceOk(
      "verifier",
      appelant(new Request("http://local", { headers: entetes })),
      20,
      60_000,
    );
  }

  const certificat = code && !freine ? await trouverCertificat(code) : undefined;

  return (
    <>
      <FilAriane items={[{ href: "/", label: "Accueil" }, { label: "Vérifier un certificat" }]} />

      <section className="border-line relative overflow-hidden border-b px-8 py-16 lg:py-20">
        <div className="ambient-glow-top" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[760px]">
          <div className="eyebrow mono-label mb-5">Authenticité</div>
          <h1 className="mb-5 text-[clamp(2rem,4.2vw,3rem)] font-bold">Vérifier un certificat</h1>
          <p className="text-ivory-dim/95 max-w-[60ch] text-[1.02rem] leading-relaxed">
            Chaque certificat professionnel CLIXA Institute porte, en bas de page, un code de
            vérification. Saisissez-le pour confirmer que le document est authentique.
          </p>

          <form action="/verifier" method="get" className="mt-8 flex flex-wrap gap-3">
            <label htmlFor="code" className="sr-only">
              Code de vérification
            </label>
            <input
              id="code"
              name="code"
              defaultValue={saisie ?? ""}
              placeholder="CLIXA-XXXX-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
              maxLength={24}
              className="border-line-strong bg-panel/70 text-ivory placeholder:text-ivory-dim/50 focus:border-gold rounded-clixa min-h-12 min-w-0 flex-1 border px-4 font-mono text-[1rem] tracking-wider uppercase outline-none"
            />
            <button
              type="submit"
              className="shimmer-gold from-gold-bright via-gold to-gold-bright text-ink border-gold rounded-clixa min-h-12 border bg-gradient-to-r px-6 text-sm font-bold tracking-wide"
            >
              Vérifier
            </button>
          </form>

          {saisie && (
            <div className="mt-8" aria-live="polite">
              {freine ? (
                <Resultat ton="attente" titre="Trop de vérifications à la suite">
                  Réessayez dans une minute.
                </Resultat>
              ) : !code ? (
                /*
                  ⚠️ Une forme invalide se dit comme telle, pas comme un
                  certificat introuvable : « aucun certificat » ferait douter
                  du document quand c'est la saisie qui est fausse.
                */
                <Resultat ton="attente" titre="Ce code n'a pas la bonne forme">
                  Un code de vérification s&apos;écrit <strong>CLIXA-XXXX-XXXX</strong> : huit
                  lettres et chiffres, sans I, O, 0 ni 1. Il figure en bas du certificat.
                </Resultat>
              ) : certificat ? (
                <Resultat ton="valide" titre="Certificat authentique">
                  <dl className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:gap-x-6">
                    <dt className="mono-label text-ivory-dim">Délivré à</dt>
                    <dd className="text-ivory font-semibold">{certificat.titulaire}</dd>
                    <dt className="mono-label text-ivory-dim">Parcours</dt>
                    <dd className="text-ivory">{certificat.parcours}</dd>
                    {certificat.emisLe && (
                      <>
                        <dt className="mono-label text-ivory-dim">Émis le</dt>
                        <dd className="text-ivory">{JOUR.format(new Date(certificat.emisLe))}</dd>
                      </>
                    )}
                    <dt className="mono-label text-ivory-dim">Code</dt>
                    <dd className="text-ivory font-mono tracking-wider">{code}</dd>
                  </dl>
                </Resultat>
              ) : (
                /*
                  ⚠️ **Une seule réponse pour « n'existe pas » et « plus valide ».**
                  Distinguer les deux apprendrait à qui essaie des codes lesquels
                  ont existé. Le tiers, lui, n'a besoin que d'une chose : ce
                  document ne vaut pas certificat.
                */
                <Resultat ton="refus" titre="Aucun certificat valide ne correspond à ce code">
                  Vérifiez la saisie. Si le code est exact, ce document n&apos;est pas un certificat
                  délivré par CLIXA Institute — écrivez-nous à{" "}
                  <Link href="/contact" className="text-gold-bright underline underline-offset-2">
                    la page contact
                  </Link>{" "}
                  pour nous le signaler.
                </Resultat>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Resultat({
  ton,
  titre,
  children,
}: {
  ton: "valide" | "refus" | "attente";
  titre: string;
  children: React.ReactNode;
}) {
  /*
    L'émeraude dit « c'est fait, c'est bon » partout sur le site ; le rouge ne
    sert qu'au refus. Une forme mal saisie reste neutre : ce n'est ni un
    certificat faux, ni un certificat vrai.
  */
  const cadre = {
    valide: "border-emerald/50 bg-emerald/10",
    refus: "border-red-400/50 bg-red-500/10",
    attente: "border-line-strong bg-panel/60",
  }[ton];
  const pastille = {
    valide: "text-emerald-bright",
    refus: "text-red-300",
    attente: "text-ivory-dim",
  }[ton];

  return (
    <div className={`rounded-clixa border p-6 ${cadre}`}>
      <p className={`font-display text-[1.25rem] font-semibold ${pastille}`}>{titre}</p>
      <div className="text-ivory-dim/95 mt-2 text-[0.95rem] leading-relaxed">{children}</div>
    </div>
  );
}
