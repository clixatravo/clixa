import { formatPeriode, libelleFuseau, libelleMode, lieuSession } from "@/lib/catalogue";
import { libelleCohorteDuMois, type LigneDeCohorte } from "@/lib/cohortes";

/**
 * Les cohortes déjà données d'un parcours, marquées « Clôturée ».
 *
 * Une ligne par cohorte. Une session en base dit ses dates, son rythme, sa
 * modalité ; une cohorte connue par son seul mois ne dit que ce mois — ni date,
 * ni rythme, ni modalité, faute de les connaître (`COHORTES_SANS_DATE`). Ni
 * places ni bouton : on ne rejoint pas une cohorte passée. Le ton est effacé
 * exprès : ce bloc atteste que le parcours a eu lieu, il ne doit pas disputer
 * l'œil aux sessions ouvertes juste au-dessus.
 */
export function CohortesPrecedentes({ lignes }: { lignes: LigneDeCohorte[] }) {
  if (lignes.length === 0) return null;

  return (
    <ul className="divide-line/60 border-line/60 rounded-clixa divide-y border">
      {lignes.map((l) => {
        const s = l.session;
        return (
          <li
            key={s ? s.id : l.mois}
            className="flex items-center justify-between gap-4 px-5 py-3.5"
          >
            <div className="min-w-0">
              <span className="text-ivory/85 block text-[0.92rem] font-medium">
                {s ? formatPeriode(s.debut, s.fin) : libelleCohorteDuMois(l.mois)}
              </span>
              {s && (
                <small className="text-ivory-dim block text-[0.74rem]">
                  {[
                    s.cadence,
                    s.cadence && s.fuseau ? libelleFuseau(s.fuseau) : undefined,
                    s.mode === "presentiel" ? lieuSession(s) : libelleMode[s.mode],
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              )}
            </div>
            <span className="border-line-strong text-ivory-dim rounded-clixa shrink-0 border px-3 py-1 font-mono text-[0.62rem] tracking-[0.1em] uppercase">
              Clôturée
            </span>
          </li>
        );
      })}
    </ul>
  );
}
