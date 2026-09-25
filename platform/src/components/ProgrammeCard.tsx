import Link from "next/link";
import type { Programme } from "@/lib/types";
import { placesRestantes } from "@/lib/types";
import { PlacesBadge } from "@/components/ui/Badge";
import {
  formatDateCourte,
  formatPrix,
  getProchaineSession,
  getSessions,
  getSpecialisation,
  getTarifs,
  libelleMode,
  modalites,
  prixAffiche,
} from "@/lib/catalogue";

/**
 * FE-03 — La carte d'un parcours dans le catalogue.
 *
 * Les douze parcours partagent la même durée, la même modalité et le même
 * tarif. Une carte qui ne montre que cela les rend interchangeables : douze
 * fois « 32 h · À distance · 423 € », et rien pour choisir.
 *
 * Le positionnement occupe donc la place — « Posture DAF · Pilotage, contrôle,
 * cash & financement ». C'est la seule ligne qui diffère vraiment d'une carte à
 * l'autre, et elle remplit l'espace que le titre laissait vide.
 */
export async function ProgrammeCard({ programme }: { programme: Programme }) {
  const spec = await getSpecialisation(programme.specialisation);
  const sessions = await getSessions(programme.slug);
  const prochaine = await getProchaineSession(programme.slug);
  const sessionAffichee = prochaine ?? sessions[0];
  const modes = await modalites(programme.slug);

  /*
    Le prix d'une session prime quand il existe — un parcours pourra faire
    exception. À défaut, c'est celui du catalogue : les douze parcours partagent
    le même barème, et une carte qui annonce « Sur devis » alors que le tarif est
    public ferait fuir sans raison.
  */
  const tarifs = await getTarifs();
  const prix = prixAffiche(tarifs);
  const restantes = sessionAffichee ? placesRestantes(sessionAffichee) : undefined;
  const estComplete = sessionAffichee
    ? Boolean(sessionAffichee.complete) || restantes === 0
    : false;

  return (
    <Link
      href={`/formations/${programme.slug}`}
      className={`executive-card group relative flex flex-col justify-between gap-4 p-6 sm:min-h-[280px] ${
        estComplete ? "border-rose-500/20 hover:border-rose-500/40" : ""
      }`}
    >
      {/* Filet or ou rose raffiné au survol avec lueur */}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 ${
          estComplete
            ? "bg-gradient-to-r from-rose-500 via-rose-400 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
            : "from-gold via-gold-bright to-gold bg-gradient-to-r shadow-[0_0_8px_rgba(201,162,76,0.6)]"
        }`}
      />

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-gold font-mono text-[0.62rem] tracking-[0.14em] uppercase">
            {spec?.nom}
          </span>
          <div className="flex items-center gap-1.5">
            {estComplete && (
              <span className="rounded-clixa border border-rose-500/50 bg-rose-950/70 px-2 py-0.5 font-mono text-[0.58rem] font-bold tracking-wider text-rose-300 uppercase shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                Complet
              </span>
            )}
            {programme.certification && !estComplete && (
              <span className="border-gold/30 bg-gold/10 text-gold-bright rounded-clixa border px-2 py-0.5 font-mono text-[0.58rem] font-semibold tracking-wider">
                {programme.certification}
              </span>
            )}
          </div>
        </div>

        <h3 className="font-display text-ivory group-hover:text-gold-bright text-[1.14rem] leading-snug font-semibold transition-colors">
          {programme.titre}
        </h3>

        {/*
          À défaut de positionnement, la certification visée : sur un parcours qui
          prépare à un examen, c'est elle qui le distingue des autres.
        */}
        {(programme.positionnement ?? programme.certification) && (
          <p className="text-ivory-dim/90 line-clamp-2 text-[0.82rem] leading-relaxed">
            {programme.positionnement ?? programme.accroche}
          </p>
        )}
      </div>

      <div>
        {/* Deux repères, en pastilles : la durée et la modalité */}
        <div className="flex flex-wrap items-center gap-1.5 pb-3.5">
          <span className="border-line-strong bg-ink/40 text-ivory-dim rounded-clixa border px-2.5 py-1 font-mono text-[0.66rem]">
            {programme.dureeHeures} h
          </span>
          {modes.map((m) => (
            <span
              key={m}
              className="border-line-strong bg-ink/40 text-ivory-dim rounded-clixa border px-2.5 py-1 font-mono text-[0.66rem]"
            >
              {libelleMode[m]}
            </span>
          ))}
        </div>

        <div className="border-line flex flex-wrap items-end justify-between gap-3 border-t pt-3.5">
          <div>
            <div className="font-display text-gold-bright text-[1.38rem] leading-none font-bold tracking-tight">
              {prix > 0 ? formatPrix(prix) : "Sur devis"}
            </div>
            <span className="text-ivory-dim/70 mt-1 block text-[0.66rem]">
              {estComplete ? (
                <span className="font-medium text-rose-300/90">Liste d&apos;attente ouverte</span>
              ) : (
                "Paiement 1x, 2x ou 3x"
              )}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1.5 text-right">
            {sessionAffichee ? (
              <>
                <strong className="text-ivory text-[0.8rem] font-medium">
                  {formatDateCourte(sessionAffichee.debut)}
                </strong>
                <PlacesBadge restantes={estComplete ? 0 : (restantes ?? 0)} />
              </>
            ) : (
              <span className="text-ivory-dim text-[0.74rem]">Prochaine session à venir</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
