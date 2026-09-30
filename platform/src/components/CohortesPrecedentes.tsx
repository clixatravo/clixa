import type { Session } from "@/lib/types";
import { formatPeriode, libelleFuseau, libelleMode, lieuSession } from "@/lib/catalogue";

/**
 * Les cohortes déjà données d'un parcours, marquées « Clôturée ».
 *
 * Une ligne par cohorte : ses dates, son rythme, sa modalité. Ni places ni
 * bouton — on ne rejoint pas une cohorte passée, et une liste d'attente pour
 * elle n'aurait aucun sens. Le ton est effacé exprès : ce bloc atteste que le
 * parcours a eu lieu, il ne doit pas disputer l'œil aux sessions ouvertes
 * juste au-dessus.
 */
export function CohortesPrecedentes({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) return null;

  return (
    <ul className="divide-line/60 border-line/60 rounded-clixa divide-y border">
      {sessions.map((s) => (
        <li
          key={s.id}
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3.5"
        >
          <div className="min-w-0">
            <span className="text-ivory/85 block text-[0.92rem] font-medium">
              {formatPeriode(s.debut, s.fin)}
            </span>
            <small className="text-ivory-dim block text-[0.74rem]">
              {[
                s.cadence,
                s.cadence && s.fuseau ? libelleFuseau(s.fuseau) : undefined,
                s.mode === "presentiel" ? lieuSession(s) : libelleMode[s.mode],
              ]
                .filter(Boolean)
                .join(" · ")}
            </small>
          </div>
          <span className="border-line-strong text-ivory-dim rounded-clixa border px-3 py-1 font-mono text-[0.62rem] tracking-[0.1em] uppercase">
            Clôturée
          </span>
        </li>
      ))}
    </ul>
  );
}
