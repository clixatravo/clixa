import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { intituleDuGroupe, type LigneVersement, type SuiviDesVersements } from "@/lib/versements";

/**
 * Le suivi des versements, au tableau de bord.
 *
 * Demandé par la direction le 25 septembre 2026 : voir, pour chaque personne
 * en phase de règlement, combien de tranches il lui reste — et savoir, dès
 * qu'un justificatif arrive, qu'il attend d'être vérifié. Le calcul vit dans
 * `lib/versements.ts` ; ce composant ne fait que le dessiner.
 *
 * ── Trois couleurs, et chacune veut déjà dire quelque chose ici ─────────────
 * - **Émeraude : réglé.** Le même vert que « fait » dans la colonne « Où en
 *   est ». Les points pleins d'une progression sont des tranches encaissées.
 * - **Or : à vérifier aujourd'hui.** Un versement annoncé attend un geste de
 *   notre part, et c'est la file du jour. ⚠️ L'or ne teinte que du texte et des
 *   filets, jamais un fond — la règle posée pour la colonne « Relances ».
 * - **Rouge : en retard.** Une tranche dont la date est passée sans annonce.
 *
 * ⚠️ **Rien ne s'affiche quand personne n'est en phase de règlement.** Un cadre
 * vide se lit comme une page à moitié chargée — la leçon de la rubrique de
 * filtre sans choix.
 *
 * ⚠️ **Composant serveur, sans `"use client"`** : il ne porte que des liens.
 * Il n'est déclaré nulle part dans la configuration de Payload — `Veille`
 * l'importe directement — et n'a donc pas d'entrée dans `importMap.js`.
 */

const EUROS = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const JOUR = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const MOYENS: Record<string, string> = {
  carte: "Carte bancaire",
  virement: "Virement",
  "western-union": "Western Union",
  ria: "Ria",
  moneygram: "MoneyGram",
  especes: "Espèces",
};

/** Au-delà, la colonne renvoie à la liste : un tableau de bord n'est pas un fichier. */
const PAR_COLONNE = 8;

const LISTE = "/admin/collections/inscriptions?where[coordonneesEnvoyeesLe][exists]=true";

function Progression({ ligne }: { ligne: LigneVersement }) {
  return (
    <span
      className="clixa-versements__progression"
      role="img"
      aria-label={`${ligne.reglees} tranche${ligne.reglees > 1 ? "s" : ""} réglée${ligne.reglees > 1 ? "s" : ""} sur ${ligne.total}`}
    >
      {Array.from({ length: ligne.total }, (_, i) => {
        const etat =
          i < ligne.reglees
            ? "regle"
            : i === ligne.reglees && ligne.annonce
              ? "annonce"
              : "attendu";
        return (
          <span key={i} className={`clixa-versements__point clixa-versements__point--${etat}`} />
        );
      })}
    </span>
  );
}

function Detail({ ligne }: { ligne: LigneVersement }) {
  const p = ligne.prochaine;
  if (!p) return null;
  if (ligne.annonce) {
    return (
      <span className="clixa-versements__detail clixa-versements__detail--or">
        {ligne.avecJustificatif ? "Justificatif joint" : "Annoncé sans justificatif"} · tranche{" "}
        {p.rang}/{ligne.total} · {EUROS.format(p.montant)}
        {p.moyen && MOYENS[p.moyen] ? ` · ${MOYENS[p.moyen]}` : ""}
      </span>
    );
  }
  const date = p.dateLimite ? JOUR.format(new Date(p.dateLimite)) : undefined;
  if (p.enRetard) {
    return (
      <span className="clixa-versements__detail clixa-versements__detail--rouge">
        {EUROS.format(p.montant)} · en retard depuis le {date}
      </span>
    );
  }
  return (
    <span className="clixa-versements__detail">
      Prochaine : {EUROS.format(p.montant)}
      {date ? ` · avant le ${date}` : ""}
    </span>
  );
}

function Ligne({ ligne }: { ligne: LigneVersement }) {
  return (
    <li className="clixa-versements__ligne">
      <div className="clixa-versements__haut">
        <Link
          href={`/admin/collections/inscriptions/${ligne.id}` as Route}
          className="clixa-versements__nom"
        >
          {ligne.nom}
        </Link>
        <Progression ligne={ligne} />
      </div>
      <Detail ligne={ligne} />
    </li>
  );
}

export function SuiviVersements({ suivi }: { suivi: SuiviDesVersements }) {
  if (suivi.total === 0) return null;

  const enCours = suivi.total - suivi.soldes.length;

  return (
    <section className="clixa-versements" aria-labelledby="clixa-versements-titre">
      <div className="clixa-versements__titre">
        <span id="clixa-versements-titre">Suivi des versements</span>
        <span className="clixa-versements__couverture">
          {enCours} dossier{enCours > 1 ? "s" : ""} en cours de règlement
          {suivi.soldes.length > 0
            ? ` · ${suivi.soldes.length} soldé${suivi.soldes.length > 1 ? "s" : ""}`
            : ""}
        </span>
        <Link href={LISTE as Route} className="clixa-versements__tout">
          Ouvrir la liste →
        </Link>
      </div>

      {/*
        ⚠️ **Ce qui attend de nous passe avant ce qui attend du participant.**
        Un justificatif arrivé ce matin est la seule ligne de ce bloc qui
        réclame un geste de l'équipe aujourd'hui ; les colonnes d'en dessous
        disent seulement où chacun en est. La même ligne reparaît dans sa
        colonne — c'est voulu : on la lit ici pour agir, là pour situer.
      */}
      {suivi.aVerifier.length > 0 && (
        <div className="clixa-versements__verifier">
          <div className="clixa-versements__verifier-titre">
            À vérifier maintenant
            <span className="clixa-versements__verifier-nombre">{suivi.aVerifier.length}</span>
          </div>
          <ul className="clixa-versements__liste">
            {suivi.aVerifier.map((l) => (
              <Ligne key={String(l.id)} ligne={l} />
            ))}
          </ul>
        </div>
      )}

      <div className="clixa-versements__colonnes">
        {suivi.groupes.map((g) => (
          <div key={g.restantes} className="clixa-versements__colonne">
            <div className="clixa-versements__entete">
              <span className="clixa-versements__nombre">{g.lignes.length}</span>
              <span className="clixa-versements__intitule">{intituleDuGroupe(g.restantes)}</span>
            </div>
            <ul className="clixa-versements__liste">
              {g.lignes.slice(0, PAR_COLONNE).map((l) => (
                <Ligne key={String(l.id)} ligne={l} />
              ))}
            </ul>
            {g.lignes.length > PAR_COLONNE && (
              <Link href={LISTE as Route} className="clixa-versements__plus">
                et {g.lignes.length - PAR_COLONNE} autre
                {g.lignes.length - PAR_COLONNE > 1 ? "s" : ""} →
              </Link>
            )}
          </div>
        ))}

        {suivi.soldes.length > 0 && (
          <div className="clixa-versements__colonne clixa-versements__colonne--solde">
            <div className="clixa-versements__entete">
              <span className="clixa-versements__nombre">{suivi.soldes.length}</span>
              <span className="clixa-versements__intitule">Soldé — tout est réglé</span>
            </div>
            <ul className="clixa-versements__liste">
              {suivi.soldes.slice(0, PAR_COLONNE).map((l) => (
                <li key={String(l.id)} className="clixa-versements__ligne">
                  <div className="clixa-versements__haut">
                    <Link
                      href={`/admin/collections/inscriptions/${l.id}` as Route}
                      className="clixa-versements__nom"
                    >
                      {l.nom}
                    </Link>
                    <Progression ligne={l} />
                  </div>
                </li>
              ))}
            </ul>
            {suivi.soldes.length > PAR_COLONNE && (
              <Link href={LISTE as Route} className="clixa-versements__plus">
                et {suivi.soldes.length - PAR_COLONNE} autre
                {suivi.soldes.length - PAR_COLONNE > 1 ? "s" : ""} →
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
