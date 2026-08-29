import { RESEAUX_CLIXA } from "@/lib/reseaux";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { FilAriane } from "@/components/FilAriane";
import { formatPrix, getTarifs } from "@/lib/catalogue";
import { getDossier, prochaineEtape } from "@/lib/inscriptions";
import { participantConnecte } from "@/lib/session-apprenant";
import { finDeLaTenue } from "@/lib/places";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Votre dossier",
  // Un dossier porte des coordonnées : il n'a rien à faire dans un index.
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ annonce?: string }>;
}

/** Ce que dit la page au retour d'une annonce de transfert. */
const RETOUR_ANNONCE: Record<string, string> = {
  ok: "C'est noté. Nous vérifions le transfert et vous confirmons votre place — comptez un jour ouvré.",
  champs: "Il manque le moyen d'envoi ou le numéro de transfert.",
  rien: "Aucune échéance n'attend d'annonce en ce moment.",
  format: "Le justificatif doit être une photo (JPG, PNG, HEIC) ou un PDF.",
  lourd: "Le justificatif dépasse 5 Mo. Une photo un peu moins grande suffira.",
  stockage:
    "Votre annonce n'a pas été enregistrée : nous ne pouvons pas recevoir de pièce jointe pour l'instant. Réessayez sans le fichier, le numéro seul nous suffit.",
};

const JOUR = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Hors du composant, exprès : `Date.now()` appelé pendant le rendu est refusé
 * — le rendu doit être pur, et l'heure ne l'est pas. La page se rend à chaque
 * requête (un dossier n'est pas mis en cache), donc la date lue est la bonne.
 */
/**
 * Ce que le participant a demandé, dit dans sa langue à lui.
 *
 * `choix` se lit après « vous avez choisi de régler », `envoi` après « nous
 * vous envoyons » : deux tournures pour un même choix, plutôt qu'une phrase
 * unique qui sonnerait de travers dans l'un des deux cas.
 */
const ATTENDU = {
  carte: { choix: "par carte bancaire", envoi: "un lien de paiement sécurisé" },
  virement: { choix: "par virement bancaire", envoi: "notre RIB et le motif à indiquer" },
  transfert: {
    choix: "par Western Union, Ria ou MoneyGram",
    envoi: "les coordonnées du bénéficiaire",
  },
} as const;

function verifierTenueExpiree(tenueJusquau?: Date): boolean {
  if (!tenueJusquau) return false;
  return tenueJusquau.getTime() < Date.now();
}

/**
 * FE-18 — Le dossier d'inscription.
 *
 * Accessible par sa seule référence, sans compte. C'est un compromis assumé :
 * la page ne montre ni pièce d'identité ni coordonnées bancaires, et exiger un
 * mot de passe avant même le paiement ferait perdre des inscrits. Elle n'est
 * pas indexée, et la référence ne se devine pas.
 */
export default async function Dossier({ params, searchParams }: Props) {
  const { reference } = await params;
  const dossier = await getDossier(reference);
  if (!dossier) notFound();

  const tarifs = await getTarifs();
  const participant = await participantConnecte();
  const beneficiaireConnu = Boolean(tarifs.beneficiaireNom);
  const { annonce } = await searchParams;

  /*
    On ne propose d'annoncer que s'il y a quelque chose à annoncer, et seulement
    pour la première échéance non réglée : on paie dans l'ordre. Tant qu'une
    annonce attend vérification, le formulaire se retire — le reproposer
    inviterait à envoyer deux fois le même numéro, ou à annoncer d'avance une
    échéance qu'on n'a pas encore versée.
  */
  const enCours = dossier.echeances.find((e) => e.statut !== "regle");
  const aAnnoncer =
    dossier.statut !== "annulee" && dossier.statut !== "terminee" && enCours?.statut === "attendu";

  /*
    ── Une place tenue a un terme, et il se lit ──────────────────────────────
    Tant qu'aucun versement n'est parvenu, la place est tenue sept jours puis
    rendue au catalogue. Le dire n'est pas une précaution juridique : c'est la
    seule chose qui distingue « prenez le temps » de « vous avez jusqu'au ».
    Qui lit « place retenue » sans terme organise son transfert à son rythme et
    découvre la session complète — sans avoir jamais été prévenu.

    Un versement reçu retient la place sans limite : on ne montre alors aucune
    date, parce qu'il n'y en a plus.
  */
  const tenueProvisoire = dossier.statut === "demandee" && Boolean(dossier.depuis);
  const tenueJusquau = tenueProvisoire ? finDeLaTenue(dossier.depuis!) : undefined;
  const tenueExpiree = verifierTenueExpiree(tenueJusquau);

  return (
    <>
      <FilAriane items={[{ label: "Votre dossier" }]} />

      <section className="px-8 py-13">
        <div className="mx-auto max-w-[820px]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
            <span className="mono-label text-gold block">
              {tenueExpiree ? "Place à confirmer" : "Place retenue"}
            </span>
            <a
              href={`/api/attestation/${dossier.reference}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-gold/40 hover:border-gold bg-ink-panel/90 text-gold-bright hover:bg-gold hover:text-ink inline-flex items-center gap-2 rounded-lg border px-3.5 py-1.5 font-mono text-xs font-semibold shadow-sm transition-all"
            >
              <span>📄 Attestation d&apos;admission (PDF)</span>
              <span>↗</span>
            </a>
          </div>
          <h1 className="mb-2 text-[clamp(1.5rem,2.8vw,2.1rem)]">{dossier.programmeTitre}</h1>
          <p className="text-ivory-dim mb-8 text-[0.95rem]">
            {dossier.sessionDetail} · dossier{" "}
            <strong className="text-gold-bright font-mono">{dossier.reference}</strong>
          </p>

          {annonce && (
            <p
              role="status"
              className={`bg-panel mb-8 border-l-2 p-4 text-[0.9rem] ${
                annonce === "ok" ? "border-emerald-bright text-ivory" : "border-gold text-ivory"
              }`}
            >
              {RETOUR_ANNONCE[annonce] ?? RETOUR_ANNONCE.champs}
            </p>
          )}

          {tenueJusquau && (
            <p
              className={`bg-panel mb-8 border-l-2 p-4 text-[0.9rem] leading-relaxed ${
                tenueExpiree ? "border-gold text-ivory" : "border-line text-ivory-dim"
              }`}
            >
              {tenueExpiree ? (
                <>
                  Le délai de sept jours est passé et votre place est repartie au catalogue. Elle
                  vous est rendue dès réception de votre premier versement, si la session n&apos;est
                  pas complète — écrivez-nous plutôt que d&apos;attendre.
                </>
              ) : (
                <>
                  Votre place vous est tenue jusqu&apos;au{" "}
                  <strong className="text-ivory">{JOUR.format(tenueJusquau)}</strong> — le temps
                  qu&apos;un transfert parte et arrive. Passé cette date, sans versement reçu, elle
                  repart au catalogue. Un premier versement la retient définitivement.
                </>
              )}
            </p>
          )}

          <div className="border-gold bg-panel mb-8 border p-6">
            <h2 className="font-display mb-3 text-[1.1rem]">Ce qu&apos;il reste à faire</h2>
            <p className="text-gold-bright mb-4 text-[0.92rem]">{prochaineEtape(dossier)}</p>
            <ol className="text-ivory-dim flex flex-col gap-3 text-[0.9rem]">
              <li>
                <strong className="text-ivory">1.</strong> Envoyer le montant de la première
                échéance par Western Union, Ria ou MoneyGram.
              </li>
              <li>
                <strong className="text-ivory">2.</strong> Nous indiquer le numéro de transfert{" "}
                {aAnnoncer ? "dans le formulaire ci-dessous" : "depuis cette page"} — il arrive
                rattaché à votre dossier, sans que vous ayez à citer sa référence.
              </li>
              <li>
                <strong className="text-ivory">3.</strong> Nous vérifions le transfert et confirmons
                votre place — vous recevez alors le lien de connexion.
              </li>
            </ol>
          </div>

          {/* ── Les échéances ── */}
          <h2 className="font-display mb-4 text-[1.15rem]">Votre échéancier</h2>
          <div className="carte-grid mb-9 sm:grid-cols-3">
            {dossier.echeances.map((e, i) => (
              <div key={i} className="bg-panel p-5">
                <span className="mono-label text-ivory-dim mb-2 block text-[0.6rem]">
                  Échéance {i + 1}
                </span>
                <div className="font-display text-gold-bright text-[1.3rem] leading-none">
                  {formatPrix(e.montantCentimes)}
                </div>
                {e.dateLimite && (
                  <div className="text-ivory-dim mt-2 text-[0.76rem]">
                    avant le {JOUR.format(new Date(e.dateLimite))}
                  </div>
                )}
                <div
                  className={`mt-3 font-mono text-[0.62rem] tracking-[0.1em] uppercase ${
                    e.statut === "regle" ? "text-emerald-bright" : "text-ivory-dim"
                  }`}
                >
                  {e.statut === "regle"
                    ? "réglée"
                    : e.statut === "annonce"
                      ? "en vérification"
                      : "à régler"}
                </div>
              </div>
            ))}
          </div>

          {/* ── Où envoyer ── */}
          <h2 className="font-display mb-4 text-[1.15rem]">Où envoyer le règlement</h2>
          {beneficiaireConnu ? (
            <div className="border-line bg-panel border p-6">
              <dl className="flex flex-col gap-3 text-[0.9rem]">
                <Ligne terme="Bénéficiaire" valeur={tarifs.beneficiaireNom} />
                <Ligne
                  terme="Ville et pays"
                  valeur={[tarifs.beneficiaireVille, tarifs.beneficiairePays]
                    .filter(Boolean)
                    .join(", ")}
                />
                <Ligne terme="Services acceptés" valeur={tarifs.moyensPaiement.join(" · ")} />
                <Ligne terme="Motif à indiquer" valeur={dossier.reference} />
              </dl>
              {tarifs.consignesPaiement && (
                <p className="border-line text-ivory-dim mt-5 border-t pt-4 text-[0.84rem] leading-relaxed">
                  {tarifs.consignesPaiement}
                </p>
              )}
            </div>
          ) : (
            /*
              Les coordonnées du bénéficiaire ne s'inventent pas. Tant qu'elles
              ne sont pas saisies, on le dit plutôt que d'afficher un cadre vide
              qui laisserait croire à un oubli du participant.
            */
            <div className="border-line bg-panel border p-6">
              <p className="text-[0.92rem]">
                Vous avez choisi de régler {ATTENDU[dossier.moyenSouhaite ?? "transfert"].choix}.
                Nous vous envoyons {ATTENDU[dossier.moyenSouhaite ?? "transfert"].envoi} par
                courriel, à l&apos;adresse indiquée à l&apos;inscription. Votre dossier{" "}
                <span className="text-gold-bright font-mono">{dossier.reference}</span> est déjà
                enregistré : vous n&apos;avez rien à écrire de votre côté.
              </p>

              {/*
                ── La seule vérification qu'on puisse lui offrir ─────────────
                Un lien bancaire reçu par courriel ressemble trait pour trait à
                un hameçonnage, et le participant n'a aucun moyen de distinguer
                le nôtre d'un autre. La direction ne veut pas du lien sur le
                site — c'est son choix, et il tient. Mais la *date* d'envoi ne
                coûte rien à publier et ne donne rien à personne : elle
                s'affiche sur une page qu'il a ouverte avec sa propre référence.
                Un message qui ne correspond à aucune date affichée n'est pas
                de nous.
              */}
              <p
                className={`mt-4 border-l-2 py-2 pl-4 text-[0.86rem] leading-relaxed ${
                  dossier.coordonneesEnvoyeesLe
                    ? "border-emerald-bright text-ivory"
                    : "border-line text-ivory-dim"
                }`}
              >
                {dossier.coordonneesEnvoyeesLe ? (
                  <>
                    Envoyé le{" "}
                    <strong className="text-ivory">
                      {JOUR.format(new Date(dossier.coordonneesEnvoyeesLe))}
                    </strong>
                    . Si un message vous réclame un paiement sans correspondre à cette date, il ne
                    vient pas de nous : ne le suivez pas, écrivez-nous.
                  </>
                ) : (
                  <>
                    Rien ne vous a encore été envoyé. Quand ce sera fait, la date apparaîtra ici —
                    c&apos;est ce qui vous permettra de reconnaître notre message. Nous ne vous
                    demanderons jamais vos identifiants bancaires, et aucun règlement ne se fait sur
                    ce site.
                  </>
                )}
              </p>

              {/*
                ── Une porte de sortie, pas le chemin principal ──────────────
                Ce qu'il attend arrive par courriel : c'est écrit au-dessus, et
                c'est la décision de la direction. Le bouton n'est plus là pour
                réclamer des coordonnées mais pour poser une question — le
                courriel tarde, l'adresse était fausse, le lien ne s'ouvre pas.
                Il ouvre la conversation avec la référence déjà écrite, ce qui
                évite à l'équipe de deviner de quel dossier on lui parle.

                ⚠️ Son intitulé disait « Demander les coordonnées sur
                WhatsApp », ce qui contredisait la phrase juste au-dessus et
                invitait à faire circuler un RIB par messagerie.
              */}
              <a
                href={`${RESEAUX_CLIXA.whatsapp.url}?text=${encodeURIComponent(
                  `Bonjour, je souhaite recevoir les coordonnées de transfert pour mon dossier ${dossier.reference}.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border-emerald/40 bg-emerald/10 text-emerald-bright hover:border-emerald-bright hover:bg-emerald-bright/20 rounded-clixa mt-5 inline-flex min-h-11 items-center gap-2 border px-4 text-[0.86rem] font-medium transition-colors"
              >
                Nous écrire sur WhatsApp
              </a>
            </div>
          )}

          {/*
            ── Annoncer le transfert ───────────────────────────────────────
            L'échéancier prévoyait « Annoncé par le participant » depuis le
            début, et rien ne l'écrivait : la page demandait d'envoyer le
            numéro « par WhatsApp », sans qu'aucun numéro ne figure nulle part
            sur le site. Le voici rattaché à son dossier, ce qui épargne
            surtout à l'équipe de deviner de quelle inscription parle un
            message reçu seul.

            Annoncer n'est pas payer : l'échéance passe « en vérification »,
            et c'est un humain qui la marque réglée après avoir vu l'argent.
          */}
          {aAnnoncer && (
            <div className="border-line bg-panel mt-9 border p-6 sm:p-8">
              <span className="mono-label text-gold mb-3 block">Transfert envoyé ?</span>
              <h2 className="font-display mb-2 text-[1.1rem]">Indiquez-nous son numéro</h2>
              <p className="text-ivory-dim mb-6 text-[0.88rem]">
                Western Union et MoneyGram l&apos;appellent MTCN, Ria le numéro de commande. Il
                figure sur le reçu remis à l&apos;envoi.
              </p>

              {/*
                `multipart/form-data` : sans cet encodage, le navigateur
                n'envoie que le *nom* du fichier, et la route reçoit une chaîne
                là où elle attend un File. L'annonce passerait, le justificatif
                disparaîtrait — sans erreur nulle part.
              */}
              <form
                action="/api/transfert"
                method="POST"
                encType="multipart/form-data"
                className="grid gap-5 sm:grid-cols-2 [&>*]:min-w-0"
              >
                {/* Leurre : invisible pour un humain, rempli par la plupart des robots. */}
                <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
                  <label htmlFor="site_web">Ne pas remplir</label>
                  <input
                    id="site_web"
                    name="site_web"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <input type="hidden" name="dossier" value={dossier.reference} />

                <div className="flex flex-col gap-2">
                  <label htmlFor="moyen" className="mono-label text-ivory-dim text-[0.7rem]">
                    Moyen d&apos;envoi
                  </label>
                  <select
                    id="moyen"
                    name="moyen"
                    required
                    defaultValue="western-union"
                    className="border-line bg-ink rounded-clixa text-ivory focus:border-gold w-full min-w-0 border px-3.5 py-3 text-[0.95rem]"
                  >
                    <option value="western-union">Western Union</option>
                    <option value="ria">Ria</option>
                    <option value="moneygram">MoneyGram</option>
                    <option value="virement">Virement bancaire</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="numero" className="mono-label text-ivory-dim text-[0.7rem]">
                    Numéro de transfert
                  </label>
                  <input
                    id="numero"
                    name="numero"
                    type="text"
                    required
                    maxLength={40}
                    inputMode="numeric"
                    autoComplete="off"
                    className="border-line bg-ink rounded-clixa text-ivory focus:border-gold min-h-11 w-full min-w-0 border px-3.5 text-[0.95rem]"
                  />
                </div>

                {/*
                  ── Le justificatif reste facultatif ────────────────────────
                  Beaucoup annoncent depuis un téléphone, le reçu encore dans
                  la poche. Exiger la pièce ferait perdre le numéro, qui est ce
                  qui permet de retrouver l'argent ; la demander quand elle est
                  là évite un aller-retour à l'équipe.
                */}
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="recu" className="mono-label text-ivory-dim text-[0.7rem]">
                    Photo du reçu <span className="normal-case">(facultatif)</span>
                  </label>
                  <input
                    id="recu"
                    name="recu"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
                    className="border-line bg-ink rounded-clixa text-ivory-dim focus:border-gold file:bg-panel file:text-ivory file:border-line w-full min-w-0 border px-3.5 py-2.5 text-[0.86rem] file:mr-3 file:rounded file:border file:px-3 file:py-1.5 file:text-[0.82rem]"
                  />
                  <p className="text-ivory-dim/70 text-[0.78rem] leading-relaxed">
                    Une photo du reçu du guichet, ou le PDF de votre banque. 5 Mo au plus. Il
                    n&apos;est lisible que par notre équipe.
                  </p>
                </div>

                <button
                  type="submit"
                  className="bg-gold text-ink rounded-clixa hover:bg-gold-bright min-h-11 px-6 text-[0.9rem] font-semibold transition-colors sm:col-span-2 sm:justify-self-start"
                >
                  Annoncer le transfert
                </button>
              </form>
            </div>
          )}

          {participant ? (
            <p className="text-ivory-dim mt-8 text-[0.8rem]">
              Ce dossier figure dans{" "}
              <Link href="/compte" className="border-gold text-ivory border-b">
                votre espace
              </Link>
              , avec les précédents.
            </p>
          ) : (
            /*
              Proposé ici et pas avant : la place est retenue, la personne a vu
              que cela a marché. Un mot de passe demandé plus tôt, avant même le
              paiement, en aurait écarté.
            */
            <div className="border-line bg-panel mt-8 border p-5">
              <p className="text-[0.9rem]">
                Retrouvez ce dossier et les suivants au même endroit, sans avoir à conserver la
                référence.
              </p>
              {/*
                La référence voyage avec le lien : c'est elle qui rattachera ce
                dossier au compte. Sans elle, le compte se crée quand même et la
                page « mon espace » propose de le rattacher après coup.
              */}
              <Link
                href={`/compte/creer?dossier=${dossier.reference}` as Route}
                className="border-gold text-ivory mt-3 inline-block border-b pb-1 text-[0.86rem]"
              >
                Créer un accès →
              </Link>
              <p className="text-ivory-dim mt-3 text-[0.78rem]">
                Sinon, conservez cette adresse : elle vous ramène ici, sans mot de passe.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Ligne({ terme, valeur }: { terme: string; valeur?: string }) {
  if (!valeur) return null;
  return (
    <div className="border-line flex flex-wrap justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
      <dt className="text-ivory-dim">{terme}</dt>
      <dd className="text-ivory font-semibold">{valeur}</dd>
    </div>
  );
}
