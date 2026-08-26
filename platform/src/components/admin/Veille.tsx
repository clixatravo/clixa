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

export async function Veille() {
  const payload = await getPayload({ config });
  const aujourdhui = new Date().toISOString().slice(0, 10);

  // 1. Inscriptions vivantes
  const { docs: inscriptions } = await payload.find({
    collection: "inscriptions",
    limit: 500,
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

  // 3. La prochaine session
  const { docs: sessions } = await payload.find({
    collection: "sessions",
    where: { debut: { greater_than_equal: aujourdhui } },
    sort: "debut",
    limit: 1,
    depth: 0,
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
          <span className="clixa-cockpit__badge">✦ CONSOLE DE PILOTAGE · CLIXA INSTITUTE</span>
          <h2 className="clixa-cockpit__titre">{dateFormatee}</h2>
        </div>
        <div className="clixa-cockpit__actions">
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
      </div>
    </section>
  );
}
