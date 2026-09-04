import type { Session } from "@/lib/types";
import { placesRestantes } from "@/lib/types";
import {
  formatJourMois,
  formatPeriode,
  libelleFuseau,
  libelleMode,
  lieuSession,
  seancesHebdomadaires,
} from "@/lib/catalogue";
import { PlacesBadge } from "@/components/ui/Badge";

/**
 * FE-07 — Bloc de sélection de session.
 *
 * « Me pré-inscrire » mène au tunnel depuis la phase 02, avec la session déjà
 * choisie : chaque ligne réserve la sienne, pas une autre. Une session
 * complète renvoie au rappel — il n'y a rien à réserver.
 */
export function SessionsDisponibles({
  sessions,
  programmeSlug,
}: {
  sessions: Session[];
  programmeSlug: string;
}) {
  if (sessions.length === 0) {
    return (
      <div className="border-line/70 bg-panel/60 text-ivory-dim rounded-clixa border p-6 text-sm backdrop-blur-sm">
        <p className="font-display text-ivory mb-1 text-base">
          Aucune session ouverte pour l&apos;instant
        </p>
        <p>
          Laissez-nous vos coordonnées : nous vous préviendrons dès l&apos;ouverture de la prochaine
          cohorte.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => {
        const restantes = placesRestantes(s);
        const complete = restantes === 0;
        const seances = seancesHebdomadaires(s.debut, s.fin);

        return (
          <div key={s.id} className="executive-card rounded-clixa p-5.5 transition-all">
            <div className="grid items-center gap-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_0.8fr_auto_auto]">
              <div>
                <span className="font-display text-ivory block text-base font-semibold">
                  {formatPeriode(s.debut, s.fin)}
                </span>
                {/*
                  ⚠️ **L'horaire n'est annoncé qu'une fois.** La ligne portait
                  aussi la conversion dans le fuseau du visiteur : « 8 samedis ·
                  9h00–13h00 · UTC · 10h00–14h00 chez vous ». Deux fourchettes
                  d'heures côte à côte, séparées d'un point médian comme le
                  reste, se lisent comme **deux créneaux au choix** — et non
                  comme le même créneau dit deux fois. Le second, en or, tirait
                  même l'œil davantage.

                  L'attention était bonne : un participant à Abidjan et un autre
                  à Casablanca ne lisent pas la même heure. Elle se paie d'une
                  ambiguïté sur la seule information qui décide si l'on peut
                  suivre, et la direction a tranché le 4 septembre 2026 : une
                  seule heure, celle de la cadence, avec son fuseau écrit à
                  côté.
                */}
                {(() => {
                  const zone = s.mode === "presentiel" ? undefined : s.fuseau;
                  const bas = [s.cadence, zone && libelleFuseau(zone)].filter(Boolean);
                  return bas.length > 0 ? (
                    <small className="font-body text-ivory-dim mt-0.5 block text-[0.74rem]">
                      {bas.join(" · ")}
                    </small>
                  ) : null;
                })()}
              </div>

              <div className="text-ivory-dim/90 flex items-center gap-1.5 text-sm font-medium">
                <span className="text-gold text-xs">📍</span>
                <span>{lieuSession(s)}</span>
              </div>

              <div className="text-emerald-bright font-mono text-[0.64rem] tracking-[0.1em] uppercase">
                {libelleMode[s.mode]}
              </div>

              <PlacesBadge restantes={restantes} />

              <a
                href={
                  complete
                    ? "/contact"
                    : `/inscription?formation=${programmeSlug}&debut=${s.debut.slice(0, 10)}`
                }
                className={`rounded-clixa border px-5 py-2.5 text-center text-xs font-semibold tracking-wide whitespace-nowrap uppercase transition-all ${
                  complete
                    ? "border-line-strong text-ivory-dim hover:border-gold"
                    : "shimmer-gold from-gold-bright via-gold to-gold-bright text-ink border-gold bg-gradient-to-r hover:shadow-[0_0_15px_rgba(201,162,76,0.35)]"
                }`}
              >
                {complete ? "Liste d'attente" : "Me pré-inscrire"}
              </a>
            </div>

            {seances && seances.length > 1 && (
              <div className="border-line/40 mt-4 border-t pt-3">
                <span className="mono-label text-gold mb-2 block text-[0.58rem] tracking-[0.12em]">
                  Calendrier des {seances.length} séances
                </span>
                <ol className="flex flex-wrap gap-1.5">
                  {seances.map((jour) => (
                    <li
                      key={jour}
                      className="border-line bg-ink/60 text-ivory-dim/90 rounded-clixa border px-2.5 py-1 font-mono text-[0.68rem] tabular-nums"
                    >
                      {formatJourMois(jour)}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
