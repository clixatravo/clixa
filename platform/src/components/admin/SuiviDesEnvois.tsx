import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { lienDesCourriels, type NatureCourriel, type SuiviDUneNature } from "@/lib/suivi-courriel";
import { IconeBouton } from "./IconeBouton";

/**
 * « Qui l'a reçue » — sous chacun des deux blocs d'envoi.
 *
 * Demandé par la direction le 26 septembre 2026 : savoir, depuis l'endroit même
 * d'où l'on envoie, qui a reçu la présentation et qui a reçu l'annonce de
 * démarrage — **séparément**. Les chiffres viennent de « Courriels envoyés »,
 * que Resend tient à jour ; chacun mène à la liste de ceux qu'il compte.
 *
 * ── Les trois compteurs, et leurs couleurs ──────────────────────────────────
 * - **Remis**, émeraude : c'est fait.
 * - **En cours**, or : Resend n'a pas encore rendu son verdict, ou réessaie.
 * - **N'arriveront pas**, rouge : rejeté, bloqué, non parti ou signalé — ceux
 *   qu'il faut joindre autrement.
 *
 * ⚠️ **Un compteur à zéro reste affiché, mais éteint.** Le retirer ferait
 * croire qu'on ne suit pas les rejets, précisément quand il n'y en a aucun.
 *
 * ⚠️ **Rien avant le 26 septembre 2026** : les courriels partis avant la mise en
 * place du suivi ne sont pas comptés, et l'encart le dit quand il est vide —
 * sinon on lirait « personne ne l'a reçue » sous une présentation envoyée le
 * matin même à soixante-huit personnes.
 */
export function SuiviDesEnvois({
  nature,
  suivi,
  titre,
}: {
  nature: NatureCourriel;
  suivi?: SuiviDUneNature;
  titre: string;
}) {
  const s = suivi ?? { remis: 0, enCours: 0, perdus: 0 };
  const total = s.remis + s.enCours + s.perdus;

  const compteurs = [
    { groupe: "remis", n: s.remis, libelle: "remis", ton: "remis" },
    { groupe: "enCours", n: s.enCours, libelle: "en cours", ton: "attente" },
    {
      groupe: "perdus",
      n: s.perdus,
      libelle: s.perdus > 1 ? "n'arriveront pas" : "n'arrivera pas",
      ton: "perdu",
    },
  ] as const;

  return (
    <div className="clixa-suivi-envois">
      <div className="clixa-suivi-envois__tete">
        <span className="clixa-suivi-envois__titre">{titre}</span>
        {total > 0 && (
          <span className="clixa-suivi-envois__total">
            {total} envoi{total > 1 ? "s" : ""} suivi{total > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="clixa-suivi-envois__vide">
          Aucun envoi suivi pour l’instant. Les courriels partis avant le 26 septembre 2026 ne sont
          pas comptés ici.
        </p>
      ) : (
        <div className="clixa-suivi-envois__rangee">
          <div className="clixa-suivi-envois__compteurs">
            {compteurs.map((c) => (
              <Link
                key={c.groupe}
                href={lienDesCourriels(nature, c.groupe) as Route}
                className={`clixa-compteur clixa-compteur--${c.ton} ${c.n === 0 ? "clixa-compteur--eteint" : ""}`}
              >
                <strong>{c.n}</strong>
                <span>{c.libelle}</span>
              </Link>
            ))}
          </div>
          <Link
            href={lienDesCourriels(nature) as Route}
            className="clixa-bouton clixa-bouton--secondaire"
          >
            Voir les destinataires
            <IconeBouton nom="suite" />
          </Link>
        </div>
      )}
    </div>
  );
}
