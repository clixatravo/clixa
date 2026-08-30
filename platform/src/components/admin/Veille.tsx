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
      {/* ── En-tête Cockpit avec Salutation & Actions Rapides ── */}
      <div className="clixa-cockpit__header">
        <div className="clixa-cockpit__intro">
          <div className="clixa-cockpit__badge-statut">
            <span className="clixa-cockpit__dot-pulse" aria-hidden="true" />
            <span>CONSOLE EXÉCUTIVE · CLIXA INSTITUTE</span>
          </div>
          <h2 className="clixa-cockpit__titre">{dateFormatee}</h2>
          <p className="clixa-cockpit__soustitre">
            Supervision des admissions, encaissements et cohortes en direct.
          </p>
        </div>

        <div className="clixa-cockpit__actions">
          <Link
            href="/admin/collections/inscriptions/create"
            className="clixa-cockpit__btn clixa-cockpit__btn--primary"
            title="Créer manuellement un nouveau dossier d'inscription"
          >
            <span>+ Nouvelle Inscription</span>
          </Link>
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
            className={`clixa-cockpit__btn ${nouvellesDemandes > 0 ? "clixa-cockpit__btn--notif" : ""}`}
            title="Voir les demandes de rappel téléphonique"
          >
            <span>📞 Rappels {nouvellesDemandes > 0 ? `(${nouvellesDemandes})` : ""}</span>
          </Link>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="clixa-cockpit__btn clixa-cockpit__btn--ghost"
            title="Ouvrir le site public dans un nouvel onglet"
          >
            <span>Site public ↗</span>
          </a>
        </div>
      </div>

      {/* ── Message de Sérénité si tout est à jour ── */}
      {toutEstCalme && (
        <div className="clixa-cockpit__calme-box">
          <span className="clixa-cockpit__calme-icone">✓</span>
          <span className="clixa-cockpit__calme-texte">
            Tous les dossiers sont à jour. Aucun paiement en attente de vérification ni relance
            urgente.
          </span>
        </div>
      )}

      {/* ── Grille des 5 KPIs Exécutifs ── */}
      <div className="clixa-cockpit__grille">
        {/* KPI 1 : Transferts à vérifier */}
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
          <div className="clixa-kpi__action">
            <span>{aVerifier > 0 ? "Traiter les reçus →" : "Voir les dossiers →"}</span>
          </div>
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
          <div className="clixa-kpi__action">
            <span>
              {nouvellesDemandes > 0 ? "Appeler les prospects →" : "Consulter l'historique →"}
            </span>
          </div>
        </Link>

        {/* KPI 3 : Échéances en retard */}
        <Link
          href="/admin/collections/inscriptions"
          className={`clixa-kpi ${enRetard > 0 ? "clixa-kpi--alerte-rouge" : ""}`}
        >
          <div className="clixa-kpi__haut">
            <span className="clixa-kpi__indicateur">⏳</span>
            <span className="clixa-kpi__tag">Relances</span>
          </div>
          <div className="clixa-kpi__valeur">{enRetard}</div>
          <div className="clixa-kpi__libelle">
            {enRetard > 1 ? "Échéances en retard" : "Échéance en retard"}
          </div>
          <div className="clixa-kpi__action">
            <span>{enRetard > 0 ? "Envoyer les rappels →" : "Planning des paiements →"}</span>
          </div>
        </Link>

        {/* KPI 4 : Activité de la semaine */}
        <Link href="/admin/collections/inscriptions" className="clixa-kpi">
          <div className="clixa-kpi__haut">
            <span className="clixa-kpi__indicateur">📈</span>
            <span className="clixa-kpi__tag">Activité (7j)</span>
          </div>
          <div className="clixa-kpi__valeur">{inscriptionsSemaine}</div>
          <div className="clixa-kpi__libelle">
            {inscriptionsSemaine > 1 ? "Inscriptions reçues" : "Inscription reçue"}
          </div>
          <div className="clixa-kpi__action">
            <span>Voir les inscriptions →</span>
          </div>
        </Link>

        {/* KPI 5 : Prochaine rentrée */}
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
              ? `Séance : ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(prochaine))}`
              : "Aucune séance"}
          </div>
          <div className="clixa-kpi__action">
            <span>Gérer le planning →</span>
          </div>
        </Link>
      </div>

      {/* ── Raccourcis Rapides de Navigation ── */}
      <div className="clixa-raccourcis">
        <span className="clixa-raccourcis__titre">⚡ ACCÈS DIRECTS :</span>
        <div className="clixa-raccourcis__pills">
          <Link href="/admin/collections/inscriptions" className="clixa-raccourcis__pill">
            <span>📋 Inscriptions</span>
          </Link>
          <Link href="/admin/collections/apprenants" className="clixa-raccourcis__pill">
            <span>👥 Apprenants</span>
          </Link>
          <Link href="/admin/collections/recus" className="clixa-raccourcis__pill">
            <span>🧾 Reçus &amp; Transferts</span>
          </Link>
          <Link href="/admin/collections/programmes" className="clixa-raccourcis__pill">
            <span>📚 12 Formations</span>
          </Link>
          <Link href="/admin/collections/sessions" className="clixa-raccourcis__pill">
            <span>📅 Sessions &amp; Dates</span>
          </Link>
          <Link href="/admin/globals/tarifs" className="clixa-raccourcis__pill">
            <span>💰 Tarifs &amp; Banques</span>
          </Link>
        </div>
      </div>

      {/* ── Jauge de Remplissage des Promotions à venir ── */}
      {sessions.length > 0 && (
        <div className="clixa-jauges">
          <div className="clixa-jauges__en-tete">
            <div className="clixa-jauges__titre-group">
              <span className="clixa-jauges__icon">✦</span>
              <span className="clixa-jauges__titre">CAPACITÉ &amp; REMPLISSAGE DES COHORTES</span>
            </div>
            <Link href="/admin/collections/sessions" className="clixa-jauges__lien">
              Voir tout le calendrier →
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
                      <strong>{reservees}</strong> / {max} places réservées
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
