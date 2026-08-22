import type { Session } from "@/lib/types";
import { placesRestantes } from "@/lib/types";
import { formatPeriode, libelleFuseau, libelleMode, lieuSession } from "@/lib/catalogue";
import { PlacesBadge } from "@/components/ui/Badge";

/**
 * FE-07 — Bloc de sélection de session.
 *
 * En phase 01, « Réserver » renvoie vers le formulaire de demande de rappel :
 * le tunnel transactionnel n'existe qu'à partir de la phase 02.
 */
export function SessionsDisponibles({ sessions }: { sessions: Session[] }) {
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

        return (
          <div
            key={s.id}
            className="bg-panel hover:bg-panel-2 grid items-center gap-4 p-5 transition-colors sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.8fr_auto_auto]"
          >
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
              href="/contact"
              className={`rounded-clixa border px-4 py-2.5 text-center text-[0.76rem] whitespace-nowrap ${
                complete ? "border-line-strong text-ivory-dim" : "border-gold text-ivory"
              }`}
            >
              {complete ? "Liste d'attente" : "Réserver"}
            </a>
          </div>
        );
      })}
    </div>
  );
}
