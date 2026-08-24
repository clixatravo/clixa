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
 * « Réserver » mène au tunnel depuis la phase 02, avec la session déjà
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
      <p className="border-line bg-panel text-ivory-dim border p-6 text-sm">
        Aucune session programmée pour le moment. Laissez-nous vos coordonnées : nous vous
        préviendrons à l&apos;ouverture des prochaines dates.
      </p>
    );
  }

  return (
    <div className="hairline-grid">
      {sessions.map((s) => {
        const restantes = placesRestantes(s);
        const complete = restantes === 0;

        /*
          Les dates de chaque séance, déduites de la période. La fiche annonçait
          « 8 samedis » sans dire lesquels : le visiteur devait sortir un
          calendrier pour savoir s'il serait libre. Rien ne s'affiche quand le
          rythme n'est pas hebdomadaire — mieux vaut se taire qu'inventer.
        */
        const seances = seancesHebdomadaires(s.debut, s.fin);

        return (
          <div key={s.id} className="bg-panel hover:bg-panel-2 p-5 transition-colors">
            <div className="grid items-center gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.8fr_auto_auto]">
              <div className="font-display text-base">
                {formatPeriode(s.debut, s.fin)}
                {/*
                Le fuseau n'a de sens qu'à distance. Sur une session en présentiel
                à Agadir, la ville dit déjà l'heure : ajouter « UTC » brouillerait
                au lieu de préciser.
              */}
                {(() => {
                  const zone = s.mode === "presentiel" ? undefined : s.fuseau;
                  const bas = [s.cadence, zone && libelleFuseau(zone)].filter(Boolean);
                  return bas.length > 0 ? (
                    <small className="font-body text-ivory-dim block text-[0.72rem]">
                      {bas.join(" · ")}
                    </small>
                  ) : null;
                })()}
              </div>

              <div className="text-ivory-dim text-sm">{lieuSession(s)}</div>

              <div className="text-emerald-bright font-mono text-[0.62rem] tracking-[0.1em] uppercase">
                {libelleMode[s.mode]}
              </div>

              <PlacesBadge restantes={restantes} />

              <a
                href={
                  complete
                    ? "/contact"
                    : `/inscription?formation=${programmeSlug}&debut=${s.debut.slice(0, 10)}`
                }
                className={`rounded-clixa border px-4 py-2.5 text-center text-[0.76rem] whitespace-nowrap ${
                  complete ? "border-line-strong text-ivory-dim" : "border-gold text-ivory"
                }`}
              >
                {complete ? "Liste d'attente" : "Réserver"}
              </a>
            </div>

            {seances && seances.length > 1 && (
              <div className="border-line mt-4 border-t pt-3.5">
                <span className="mono-label text-ivory-dim mb-2 block text-[0.58rem]">
                  Les {seances.length} séances
                </span>
                <ol className="flex flex-wrap gap-1.5">
                  {seances.map((jour) => (
                    <li
                      key={jour}
                      className="border-line text-ivory-dim rounded-clixa border px-2 py-1 font-mono text-[0.66rem] tabular-nums"
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
