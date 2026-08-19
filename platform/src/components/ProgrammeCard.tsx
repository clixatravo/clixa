import Link from "next/link";
import type { Programme } from "@/lib/types";
import { placesRestantes } from "@/lib/types";
import {
  formatDateCourte,
  formatPrix,
  getProchaineSession,
  getSpecialisation,
  libelleMode,
  modalites,
  prixMinimum,
} from "@/lib/catalogue";

export function ProgrammeCard({ programme }: { programme: Programme }) {
  const spec = getSpecialisation(programme.specialisation);
  const prochaine = getProchaineSession(programme.slug);
  const prix = prixMinimum(programme.slug);
  const modes = modalites(programme.slug);

  return (
    <Link
      href={`/formations/${programme.slug}`}
      className="bg-panel hover:bg-panel-2 flex min-h-[250px] flex-col gap-3.5 p-6 transition-colors"
    >
      <span className="text-emerald-bright font-mono text-[0.6rem] tracking-[0.12em] uppercase">
        {spec?.nom}
      </span>

      <h3 className="font-display text-[1.08rem] leading-tight">{programme.titre}</h3>

      <div className="text-ivory-dim mt-auto flex flex-wrap gap-3.5 text-[0.78rem]">
        <span className="flex items-center gap-1.5">
          <i className="bg-gold block size-[5px] shrink-0 rounded-full" />
          {programme.dureeHeures} h
        </span>
        <span className="flex items-center gap-1.5">
          <i className="bg-gold block size-[5px] shrink-0 rounded-full" />
          {modes.map((m) => libelleMode[m]).join(" · ")}
        </span>
      </div>

      <div className="border-line flex flex-wrap items-end justify-between gap-3 border-t pt-3.5">
        <div className="font-display text-gold-bright text-xl">
          {prix !== undefined ? formatPrix(prix) : "Sur devis"}
          {modes.length > 1 && (
            <small className="font-body text-ivory-dim block text-[0.68rem]">dès</small>
          )}
        </div>

        <div className="text-ivory-dim text-right text-[0.74rem]">
          {prochaine ? (
            <>
              <strong className="text-ivory block text-[0.82rem] font-semibold">
                {formatDateCourte(prochaine.debut)}
              </strong>
              {prochaine.mode === "presentiel" ? prochaine.ville : "À distance"}
              {" · "}
              {placesRestantes(prochaine)} places
            </>
          ) : (
            <span>Prochaine session à venir</span>
          )}
        </div>
      </div>
    </Link>
  );
}
