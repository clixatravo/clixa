import Link from "next/link";
import type { Programme } from "@/lib/types";
import { placesRestantes } from "@/lib/types";
import { PlacesBadge } from "@/components/ui/Badge";
import {
  formatDateCourte,
  formatPrix,
  getProchaineSession,
  getSpecialisation,
  getTarifs,
  libelleMode,
  modalites,
  prixMinimum,
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
  const prochaine = await getProchaineSession(programme.slug);
  const modes = await modalites(programme.slug);

  /*
    Le prix d'une session prime quand il existe — un parcours pourra faire
    exception. À défaut, c'est celui du catalogue : les douze parcours partagent
    le même barème, et une carte qui annonce « Sur devis » alors que le tarif est
    public ferait fuir sans raison.
  */
  const tarifs = await getTarifs();
  const prix = (await prixMinimum(programme.slug)) ?? tarifs.prixComptantCentimes;

  const restantes = prochaine ? placesRestantes(prochaine) : undefined;

  return (
    <Link
      href={`/formations/${programme.slug}`}
      className="group bg-panel hover:bg-panel-2 relative flex flex-col gap-3 p-6 transition-colors sm:min-h-[268px]"
    >
      {/*
        Un filet doré qui se déroule au survol, le long du bord haut. Il tient
        lieu de signal de lien : sur une carte entièrement cliquable, rien
        n'indiquait qu'elle en était un.
      */}
      <span
        aria-hidden="true"
        className="bg-gold absolute inset-x-0 top-0 h-px origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
      />

      <span className="text-emerald-bright font-mono text-[0.6rem] tracking-[0.12em] uppercase">
        {spec?.nom}
      </span>

      <h3 className="font-display text-[1.12rem] leading-snug">{programme.titre}</h3>

      {/*
        À défaut de positionnement, la certification visée : sur un parcours qui
        prépare à un examen, c'est elle qui le distingue des autres.
      */}
      {(programme.positionnement ?? programme.certification) && (
        <p className="text-ivory-dim line-clamp-2 text-[0.82rem] leading-relaxed">
          {programme.positionnement ?? programme.certification}
        </p>
      )}

      {/* Deux repères, en pastilles : la durée et la modalité se lisent d'un coup. */}
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <span className="border-line text-ivory-dim rounded-clixa border px-2.5 py-1 font-mono text-[0.66rem]">
          {programme.dureeHeures} h
        </span>
        {modes.map((m) => (
          <span
            key={m}
            className="border-line text-ivory-dim rounded-clixa border px-2.5 py-1 font-mono text-[0.66rem]"
          >
            {libelleMode[m]}
          </span>
        ))}
      </div>

      <div className="border-line flex flex-wrap items-end justify-between gap-3 border-t pt-3.5">
        <div>
          <div className="font-display text-gold-bright text-[1.35rem] leading-none">
            {prix > 0 ? formatPrix(prix) : "Sur devis"}
          </div>
          {modes.length > 1 && (
            <span className="text-ivory-dim mt-1 block text-[0.66rem]">à partir de</span>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 text-right">
          {prochaine ? (
            <>
              <strong className="text-ivory text-[0.82rem] font-semibold">
                {formatDateCourte(prochaine.debut)}
              </strong>
              {/*
                Le décompte suit PlacesBadge : MAQ-06 est un point ouvert chez le
                client, et il doit se trancher à un seul endroit.
              */}
              {restantes !== undefined && <PlacesBadge restantes={restantes} />}
            </>
          ) : (
            <span className="text-ivory-dim text-[0.74rem]">Prochaine session à venir</span>
          )}
        </div>
      </div>
    </Link>
  );
}
