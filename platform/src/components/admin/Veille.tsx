import React from "react";
import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";

/**
 * Cockpit Exécutif en tête du tableau de bord Payload.
 *
 * Présente les indicateurs critiques nécessitant une action immédiate
 * (transferts annoncés, nouvelles demandes de rappel, échéances en retard),
 * ainsi que la date de la prochaine rentrée et des raccourcis vers les flux clés.
 */

const JOUR = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

interface Echeance {
  statut?: string | null;
  dateLimite?: string | null;
}

function obtenirFiltresDates() {
  const d = new Date();
  const aujourdhui = d.toISOString().slice(0, 10);
  const ilYASeptJours = new Date(d.getTime() - 7 * 86400000).toISOString();
  return { aujourdhui, ilYASeptJours };
}

export async function Veille() {
  const payload = await getPayload({ config });
  const { aujourdhui, ilYASeptJours } = obtenirFiltresDates();

  // 1. Inscriptions vivantes
  const { docs: inscriptions } = await payload.find({
    collection: "inscriptions",
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });

  const { totalDocs: inscriptionsSemaine } = await payload.find({
    collection: "inscriptions",
    where: { createdAt: { greater_than_equal: ilYASeptJours } },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  });

  const vivantes = inscriptions.filter((d) => d.statut !== "annulee" && d.statut !== "terminee");

  const echeancesDe = (d: (typeof vivantes)[number]) => (d.echeances ?? []) as Echeance[];

  let aVerifier = 0;
  let enRetard = 0;

  for (const dossier of vivantes) {
    const echeances = echeancesDe(dossier);

    if (echeances.some((e) => e.statut === "annonce")) {
      aVerifier += 1;
    } else if (
      echeances.some(
        (e) => e.statut !== "regle" && e.dateLimite && e.dateLimite.slice(0, 10) < aujourdhui,
      )
    ) {
      enRetard += 1;
    }
  }

  // 2. Nouvelles demandes de rappel
  const { totalDocs: nouvellesDemandes } = await payload.find({
    collection: "demandes-rappel",
    where: { statut: { equals: "nouvelle" } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  // 3. Les prochaines sessions pour le planning et les jauges de remplissage
  const { docs: sessions } = await payload.find({
    collection: "sessions",
    where: { debut: { greater_than_equal: aujourdhui } },
    sort: "debut",
    limit: 3,
    depth: 1,
    overrideAccess: true,
  });
  const prochaine = sessions[0]?.debut;

  const dateAujourdhui = JOUR.format(new Date());
  const dateFormatee = dateAujourdhui.charAt(0).toUpperCase() + dateAujourdhui.slice(1);
  const toutEstCalme = aVerifier === 0 && nouvellesDemandes === 0 && enRetard === 0;

  return (
    <section className="clixa-cockpit">
      <div className="clixa-cockpit__header">
        <div>
          <h2 className="clixa-cockpit__titre">{dateFormatee}</h2>
        </div>
        <div className="clixa-cockpit__actions">
          <a
            href="/api/admin/export-admissions"
            download
            className="clixa-cockpit__btn clixa-cockpit__btn--accent"
            title="Télécharger le rapport complet des admissions au format CSV/Excel"
          >
            <span>📥 Exporter CSV</span>
          </a>
          <Link
            href="/admin/collections/demandes-rappel"
            className={`clixa-cockpit__btn ${nouvellesDemandes > 0 ? "clixa-cockpit__btn--accent" : ""}`}
          >
            <span>Demandes ({nouvellesDemandes})</span>
          </Link>
          <Link href="/admin/collections/inscriptions" className="clixa-cockpit__btn">
            <span>Inscriptions</span>
          </Link>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="clixa-cockpit__btn clixa-cockpit__btn--ghost"
          >
            <span>Site public ↗</span>
          </a>
        </div>
      </div>

      {toutEstCalme && (
        <div className="clixa-cockpit__calme-box">
          <span className="clixa-cockpit__calme-icone">✓</span>
          <span className="clixa-cockpit__calme-texte">
            Tous les dossiers sont à jour. Aucun paiement ni relance en attente.
          </span>
        </div>
      )}

      <div className="clixa-cockpit__grille">
        {/* KPI 1 : Paiements à vérifier */}
        <Link
          href="/admin/collections/inscriptions"
          className={`clixa-kpi ${aVerifier > 0 ? "clixa-kpi--alerte-or" : ""}`}
        >
          <div className="clixa-kpi__haut">
            <span className="clixa-kpi__indicateur">⚡</span>
            <span className="clixa-kpi__tag">Paiements</span>
          </div>
          <div className="clixa-kpi__valeur">{aVerifier}</div>
          <div className="clixa-kpi__libelle">
            {aVerifier > 1 ? "Transferts à vérifier" : "Transfert à vérifier"}
          </div>
          <span className="clixa-kpi__fleche">Ouvrir les dossiers →</span>
        </Link>

        {/* KPI 2 : Demandes de rappel */}
        <Link
          href="/admin/collections/demandes-rappel"
          className={`clixa-kpi ${nouvellesDemandes > 0 ? "clixa-kpi--alerte-vert" : ""}`}
        >
          <div className="clixa-kpi__haut">
            <span className="clixa-kpi__indicateur">📞</span>
            <span className="clixa-kpi__tag">Admissions</span>
          </div>
          <div className="clixa-kpi__valeur">{nouvellesDemandes}</div>
          <div className="clixa-kpi__libelle">
            {nouvellesDemandes > 1 ? "Nouvelles demandes" : "Nouvelle demande"}
          </div>
          <span className="clixa-kpi__fleche">Contacter les prospects →</span>
        </Link>

        {/* KPI 3 : Relances */}
        <Link
          href="/admin/collections/inscriptions"
          className={`clixa-kpi ${enRetard > 0 ? "clixa-kpi--alerte-rouge" : ""}`}
        >
          <div className="clixa-kpi__haut">
            <span className="clixa-kpi__indicateur">⚠️</span>
            <span className="clixa-kpi__tag">Relances</span>
          </div>
          <div className="clixa-kpi__valeur">{enRetard}</div>
          <div className="clixa-kpi__libelle">
            {enRetard > 1 ? "Échéances en retard" : "Échéance en retard"}
          </div>
          <span className="clixa-kpi__fleche">Voir les échéances →</span>
        </Link>

        {/* KPI 4 : Prochaine rentrée */}
        <Link href="/admin/collections/sessions" className="clixa-kpi">
          <div className="clixa-kpi__haut">
            <span className="clixa-kpi__indicateur">🎓</span>
            <span className="clixa-kpi__tag">Calendrier</span>
          </div>
          <div className="clixa-kpi__valeur-date">
            {prochaine
              ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
                  new Date(prochaine),
                )
              : "—"}
          </div>
          <div className="clixa-kpi__libelle">
            {prochaine
              ? `Prochaine séance : ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(prochaine))}`
              : "Aucune séance programmée"}
          </div>
          <span className="clixa-kpi__fleche">Gérer le planning →</span>
        </Link>

        {/* KPI 5 : Activité de la semaine */}
        <Link href="/admin/collections/inscriptions" className="clixa-kpi">
          <div className="clixa-kpi__haut">
            <span className="clixa-kpi__indicateur">📈</span>
            <span className="clixa-kpi__tag">Activité</span>
          </div>
          <div className="clixa-kpi__valeur">{inscriptionsSemaine}</div>
          <div className="clixa-kpi__libelle">
            {inscriptionsSemaine > 1 ? "Inscriptions sur 7 jours" : "Inscription sur 7 jours"}
          </div>
          <span className="clixa-kpi__fleche">Voir les dossiers →</span>
        </Link>
      </div>

      {/* Jauge de Remplissage des Promotions à venir */}
      {sessions.length > 0 && (
        <div className="clixa-jauges">
          <div className="clixa-jauges__en-tete">
            <span className="clixa-jauges__titre">✦ CAPACITÉ & REMPLISSAGE DES PROMOTIONS</span>
            <Link href="/admin/collections/sessions" className="clixa-jauges__lien">
              Gérer les sessions →
            </Link>
          </div>
          <div className="clixa-jauges__liste">
            {sessions.map((s) => {
              const reservees = typeof s.placesReservees === "number" ? s.placesReservees : 0;
              const max = typeof s.capacite === "number" && s.capacite > 0 ? s.capacite : 20;
              const pct = Math.min(100, Math.round((reservees / max) * 100));
              const progObj = s.programme && typeof s.programme === "object" ? s.programme : null;
              const titre =
                s.reference ||
                (progObj && "titre" in progObj ? String(progObj.titre) : "Promotion");
              const dateDebut = s.debut
                ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
                    new Date(s.debut),
                  )
                : "À venir";

              const estComplet = pct >= 100;
              const estBientotPlein = pct >= 75 && !estComplet;

              return (
                <div key={s.id} className="clixa-jauge-carte">
                  <div className="clixa-jauge-carte__haut">
                    <span className="clixa-jauge-carte__nom" title={titre}>
                      {titre}
                    </span>
                    <span
                      className={`clixa-jauge-carte__badge ${
                        estComplet
                          ? "clixa-jauge-carte__badge--complet"
                          : estBientotPlein
                            ? "clixa-jauge-carte__badge--alerte"
                            : ""
                      }`}
                    >
                      {estComplet
                        ? "Complet"
                        : estBientotPlein
                          ? "Dernières places"
                          : `${dateDebut}`}
                    </span>
                  </div>
                  <div className="clixa-jauge-carte__chiffres">
                    <span>
                      <strong>{reservees}</strong> / {max} places
                    </span>
                    <span className="clixa-jauge-carte__pct">{pct}%</span>
                  </div>
                  <div className="clixa-jauge-carte__barre-fond">
                    <div
                      className={`clixa-jauge-carte__barre-remplie ${
                        estComplet
                          ? "clixa-jauge-carte__barre-remplie--rouge"
                          : estBientotPlein
                            ? "clixa-jauge-carte__barre-remplie--or"
                            : ""
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
