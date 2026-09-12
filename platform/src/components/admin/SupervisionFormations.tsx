"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { TonOccupation } from "@/lib/occupation";

export interface FormationResume {
  id: number;
  titre: string;
  slug: string;
  specialisationNom: string;
  specialisationSlug: string;
  type: string;
  dureeHeures?: number | null;
  sessionId: number | null;
  sessionReference: string | null;
  sessionDebut: string | null;
  sessionMode: string | null;
  placesReservees: number;
  capacite: number;
  remplissageTon: TonOccupation;
  remplissageLibelle: string;
  pct: number;
  preInscriptionsCount: number;
  confirmeesCount: number;
  totalInscriptionsCount: number;
}

interface SupervisionFormationsProps {
  formations: FormationResume[];
  totalGlobalPreInscriptions: number;
  totalGlobalPlacesReservees: number;
  totalGlobalInscriptions: number;
}

export function SupervisionFormations({
  formations,
  totalGlobalPreInscriptions,
  totalGlobalPlacesReservees,
  totalGlobalInscriptions,
}: SupervisionFormationsProps) {
  const [recherche, setRecherche] = useState("");
  const [filtreSpecialisation, setFiltreSpecialisation] = useState<string>("toutes");
  const [triMode, setTriMode] = useState<"clients" | "preinscriptions" | "remplissage" | "titre">(
    "clients",
  );
  const [vueMode, setVueMode] = useState<"grille" | "tableau">("grille");

  // Liste unique des spécialisations disponibles
  const specialisations = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of formations) {
      if (f.specialisationSlug && f.specialisationNom) {
        map.set(f.specialisationSlug, f.specialisationNom);
      }
    }
    return Array.from(map.entries()).map(([slug, nom]) => ({ slug, nom }));
  }, [formations]);

  // Formations filtrées et triées selon la recherche, la filière et le critère de tri
  const formationsFiltreesEtTriees = useMemo(() => {
    const filtrees = formations.filter((f) => {
      // Filtre spécialisation
      if (filtreSpecialisation === "avec-preinscriptions") {
        if (f.preInscriptionsCount <= 0) return false;
      } else if (
        filtreSpecialisation !== "toutes" &&
        f.specialisationSlug !== filtreSpecialisation
      ) {
        return false;
      }

      // Filtre texte recherche
      if (recherche.trim()) {
        const query = recherche.toLowerCase().trim();
        const matchTitre = f.titre.toLowerCase().includes(query);
        const matchSpec = f.specialisationNom.toLowerCase().includes(query);
        const matchSlug = f.slug.toLowerCase().includes(query);
        if (!matchTitre && !matchSpec && !matchSlug) return false;
      }

      return true;
    });

    // Tri dynamique (par défaut : par nombre de clients inscrits décroissant)
    filtrees.sort((a, b) => {
      if (triMode === "clients") {
        // Priorité 1 : Nombre total de clients ayant fait une inscription
        if (b.totalInscriptionsCount !== a.totalInscriptionsCount) {
          return b.totalInscriptionsCount - a.totalInscriptionsCount;
        }
        // Priorité 2 : Pré-inscriptions à traiter
        if (b.preInscriptionsCount !== a.preInscriptionsCount) {
          return b.preInscriptionsCount - a.preInscriptionsCount;
        }
        // Priorité 3 : Places réservées confirmées
        if (b.placesReservees !== a.placesReservees) {
          return b.placesReservees - a.placesReservees;
        }
        return a.titre.localeCompare(b.titre, "fr");
      }

      if (triMode === "preinscriptions") {
        if (b.preInscriptionsCount !== a.preInscriptionsCount) {
          return b.preInscriptionsCount - a.preInscriptionsCount;
        }
        if (b.totalInscriptionsCount !== a.totalInscriptionsCount) {
          return b.totalInscriptionsCount - a.totalInscriptionsCount;
        }
        return a.titre.localeCompare(b.titre, "fr");
      }

      if (triMode === "remplissage") {
        if (b.pct !== a.pct) {
          return b.pct - a.pct;
        }
        return b.placesReservees - a.placesReservees;
      }

      // Par défaut / titre : alphabétique A-Z
      return a.titre.localeCompare(b.titre, "fr");
    });

    return filtrees;
  }, [formations, filtreSpecialisation, recherche, triMode]);

  return (
    <div className="clixa-supervision">
      {/* ── En-tête de section avec KPIs & Contrôles ── */}
      <div className="clixa-supervision__en-tete">
        <div className="clixa-supervision__titres">
          <div className="clixa-supervision__badge-tag">
            <span className="clixa-supervision__dot-pulse" aria-hidden="true" />
            <span>CATALOGUE EXÉCUTIF · 12 FORMATIONS</span>
          </div>
          <h3 className="clixa-supervision__titre-principal">
            SUPERVISION DES FORMATIONS &amp; PRÉ-INSCRIPTIONS
          </h3>
          <p className="clixa-supervision__description">
            Suivi en temps réel des dossiers déposés, places réservées et capacités des cohortes.
          </p>
        </div>

        {/* Métriques globales rapides */}
        <div className="clixa-supervision__metriques-globales">
          <div className="clixa-supervision__metrique-pill">
            <span className="clixa-supervision__metrique-label">Formations :</span>
            <strong className="clixa-supervision__metrique-valeur">{formations.length}</strong>
          </div>
          <div
            className={`clixa-supervision__metrique-pill ${
              totalGlobalInscriptions > 0 ? "clixa-supervision__metrique-pill--clients" : ""
            }`}
          >
            <span className="clixa-supervision__metrique-label">Clients inscrits :</span>
            <strong className="clixa-supervision__metrique-valeur">
              {totalGlobalInscriptions}
            </strong>
          </div>
          <div
            className={`clixa-supervision__metrique-pill ${
              totalGlobalPreInscriptions > 0 ? "clixa-supervision__metrique-pill--alerte" : ""
            }`}
          >
            <span className="clixa-supervision__metrique-label">Pré-inscriptions :</span>
            <strong className="clixa-supervision__metrique-valeur">
              {totalGlobalPreInscriptions}
            </strong>
          </div>
          <div className="clixa-supervision__metrique-pill">
            <span className="clixa-supervision__metrique-label">Places confirmées :</span>
            <strong className="clixa-supervision__metrique-valeur">
              {totalGlobalPlacesReservees}
            </strong>
          </div>
          <div className="clixa-supervision__actions-directes">
            <Link
              href="/admin/collections/programmes"
              className="clixa-supervision__lien-catalogue"
              title="Gérer les programmes dans Payload"
            >
              Catalogue complet →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Barre de Filtres Rapides & Recherche ── */}
      <div className="clixa-supervision__barre-outils">
        {/* Filtres par pilule */}
        <div className="clixa-supervision__pills" role="tablist" aria-label="Filtrer par filière">
          <button
            type="button"
            className={`clixa-supervision__pill ${
              filtreSpecialisation === "toutes" ? "clixa-supervision__pill--actif" : ""
            }`}
            onClick={() => setFiltreSpecialisation("toutes")}
          >
            Toutes ({formations.length})
          </button>
          <button
            type="button"
            className={`clixa-supervision__pill clixa-supervision__pill--alerte ${
              filtreSpecialisation === "avec-preinscriptions"
                ? "clixa-supervision__pill--actif"
                : ""
            }`}
            onClick={() => setFiltreSpecialisation("avec-preinscriptions")}
          >
            ⚡ Avec pré-inscriptions ({formations.filter((f) => f.preInscriptionsCount > 0).length})
          </button>
          {specialisations.map((spec) => {
            const count = formations.filter((f) => f.specialisationSlug === spec.slug).length;
            return (
              <button
                key={spec.slug}
                type="button"
                className={`clixa-supervision__pill ${
                  filtreSpecialisation === spec.slug ? "clixa-supervision__pill--actif" : ""
                }`}
                onClick={() => setFiltreSpecialisation(spec.slug)}
              >
                {spec.nom} ({count})
              </button>
            );
          })}
        </div>

        {/* Contrôles de droite : Tri, Recherche & Bascule de vue */}
        <div className="clixa-supervision__controles-droite">
          {/* Sélecteur de Tri */}
          <div className="clixa-supervision__tri-wrap">
            <label htmlFor="select-tri-formations" className="clixa-supervision__tri-label">
              Tri :
            </label>
            <select
              id="select-tri-formations"
              value={triMode}
              onChange={(e) => setTriMode(e.target.value as typeof triMode)}
              className="clixa-supervision__select-tri"
              aria-label="Trier les formations"
            >
              <option value="clients">👥 Clients inscrits ↓ (Défaut)</option>
              <option value="preinscriptions">⚡ Pré-inscriptions à traiter ↓</option>
              <option value="remplissage">📈 Taux de remplissage (%) ↓</option>
              <option value="titre">🔤 Alphabétique (A-Z)</option>
            </select>
          </div>

          <div className="clixa-supervision__recherche-wrap">
            <span className="clixa-supervision__recherche-icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher une formation..."
              className="clixa-supervision__input-recherche"
              aria-label="Rechercher une formation"
            />
            {recherche && (
              <button
                type="button"
                onClick={() => setRecherche("")}
                className="clixa-supervision__reset-recherche"
                title="Effacer la recherche"
              >
                ✕
              </button>
            )}
          </div>

          <div
            className="clixa-supervision__vues-toggle"
            role="group"
            aria-label="Mode d'affichage"
          >
            <button
              type="button"
              className={`clixa-supervision__vue-btn ${
                vueMode === "grille" ? "clixa-supervision__vue-btn--actif" : ""
              }`}
              onClick={() => setVueMode("grille")}
              title="Vue en cartes détaillées"
            >
              ▦ Cartes
            </button>
            <button
              type="button"
              className={`clixa-supervision__vue-btn ${
                vueMode === "tableau" ? "clixa-supervision__vue-btn--actif" : ""
              }`}
              onClick={() => setVueMode("tableau")}
              title="Vue en tableau synthétique"
            >
              ☰ Tableau
            </button>
          </div>
        </div>
      </div>

      {/* ── Si aucun résultat après filtrage ── */}
      {formationsFiltreesEtTriees.length === 0 && (
        <div className="clixa-supervision__vide">
          <p>Aucune formation ne correspond à vos critères de recherche.</p>
          <button
            type="button"
            className="clixa-supervision__btn-reset"
            onClick={() => {
              setRecherche("");
              setFiltreSpecialisation("toutes");
            }}
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* ── MODE 1 : GRILLE DES 12 CARTES (TRIÉES PAR NOMBRE DE CLIENTS) ── */}
      {vueMode === "grille" && formationsFiltreesEtTriees.length > 0 && (
        <div className="clixa-supervision__grille">
          {formationsFiltreesEtTriees.map((f, index) => {
            const hasPre = f.preInscriptionsCount > 0;
            const hasClients = f.totalInscriptionsCount > 0;
            const estComplet = f.remplissageTon === "complet";
            const estBientotPlein = f.remplissageTon === "tension";

            // URL directe filtrée vers les pré-inscriptions de cette formation
            const lienInscriptions = f.sessionId
              ? (`/admin/collections/inscriptions?where[session][equals]=${f.sessionId}` as Route)
              : ("/admin/collections/inscriptions" as Route);

            const lienPreInscriptions = f.sessionId
              ? (`/admin/collections/inscriptions?where[and][0][session][equals]=${f.sessionId}&where[and][1][statut][equals]=demandee` as Route)
              : ("/admin/collections/inscriptions" as Route);

            return (
              <div
                key={f.id}
                className={`clixa-formation-card ${
                  hasPre
                    ? "clixa-formation-card--has-pre"
                    : hasClients
                      ? "clixa-formation-card--has-clients"
                      : ""
                }`}
              >
                {/* Ligne haute : Spécialisation + Badges statut */}
                <div className="clixa-formation-card__header">
                  <div className="clixa-formation-card__spec-wrap">
                    {triMode === "clients" && hasClients && (
                      <span className="clixa-formation-card__rang">#{index + 1}</span>
                    )}
                    <span
                      className={`clixa-formation-card__spec clixa-formation-card__spec--${f.specialisationSlug}`}
                    >
                      {f.specialisationNom || "Parcours"}
                    </span>
                  </div>

                  <div className="clixa-formation-card__badges">
                    {hasClients && (
                      <span className="clixa-formation-card__badge-total">
                        👥 {f.totalInscriptionsCount}{" "}
                        {f.totalInscriptionsCount > 1 ? "inscrits" : "inscrit"}
                      </span>
                    )}
                    {hasPre && (
                      <span className="clixa-formation-card__badge-pre">
                        ⚡ {f.preInscriptionsCount} en attente
                      </span>
                    )}
                    <span
                      className={`clixa-formation-card__badge-occupation ${
                        estComplet
                          ? "clixa-formation-card__badge-occupation--complet"
                          : estBientotPlein
                            ? "clixa-formation-card__badge-occupation--tension"
                            : ""
                      }`}
                    >
                      {estComplet
                        ? "Complet"
                        : estBientotPlein
                          ? "Dernières places"
                          : f.remplissageLibelle}
                    </span>
                  </div>
                </div>

                {/* Titre de la Formation & Date Session */}
                <div className="clixa-formation-card__corps">
                  <h4 className="clixa-formation-card__titre" title={f.titre}>
                    {f.titre}
                  </h4>
                  <div className="clixa-formation-card__session-info">
                    <span className="clixa-formation-card__session-icon">📅</span>
                    <span>
                      {f.sessionDebut
                        ? `Session du ${f.sessionDebut} · ${
                            f.sessionMode === "presentiel" ? "Présentiel" : "Classe virtuelle"
                          }`
                        : "Aucune session planifiée"}
                    </span>
                  </div>
                </div>

                {/* Blocs Chiffrés : Clients Inscrits, Places réservées & Remplissage */}
                <div className="clixa-formation-card__stats-grid">
                  <div className="clixa-formation-card__stat-item">
                    <span className="clixa-formation-card__stat-label">Clients Inscrits</span>
                    <span
                      className={`clixa-formation-card__stat-valeur ${
                        hasClients ? "clixa-formation-card__stat-valeur--or" : ""
                      }`}
                    >
                      {f.totalInscriptionsCount}
                    </span>
                    <span className="clixa-formation-card__stat-sub">
                      {hasClients
                        ? `${f.confirmeesCount} conf. · ${f.preInscriptionsCount} pré-ins.`
                        : "aucun inscrit"}
                    </span>
                  </div>

                  <div className="clixa-formation-card__stat-item">
                    <span className="clixa-formation-card__stat-label">Places réservées</span>
                    <span className="clixa-formation-card__stat-valeur">
                      <strong>{f.placesReservees}</strong>
                      <span className="clixa-formation-card__stat-max"> / {f.capacite}</span>
                    </span>
                    <span className="clixa-formation-card__stat-sub">
                      {f.capacite - f.placesReservees > 0
                        ? `${f.capacite - f.placesReservees} places dispo.`
                        : "Cohorte complète"}
                    </span>
                  </div>

                  <div className="clixa-formation-card__stat-item">
                    <span className="clixa-formation-card__stat-label">Remplissage</span>
                    <span className="clixa-formation-card__stat-valeur">{f.pct}%</span>
                    <span className="clixa-formation-card__stat-sub">de la capacité</span>
                  </div>
                </div>

                {/* Barre de Jauge Visuelle */}
                <div className="clixa-formation-card__jauge-fond">
                  <div
                    className={`clixa-formation-card__jauge-remplie ${
                      estComplet
                        ? "clixa-formation-card__jauge-remplie--rouge"
                        : estBientotPlein
                          ? "clixa-formation-card__jauge-remplie--or"
                          : ""
                    }`}
                    style={{ width: `${Math.min(100, Math.max(3, f.pct))}%` }}
                  />
                </div>

                {/* Pied de Carte : Actions Directes */}
                <div className="clixa-formation-card__actions">
                  {hasPre ? (
                    <Link
                      href={lienPreInscriptions}
                      className="clixa-formation-card__btn-principal clixa-formation-card__btn-principal--or"
                      title={`Voir les ${f.preInscriptionsCount} pré-inscriptions en attente`}
                    >
                      <span>📋 Traiter les pré-inscriptions ({f.preInscriptionsCount}) →</span>
                    </Link>
                  ) : (
                    <Link
                      href={lienInscriptions}
                      className="clixa-formation-card__btn-principal"
                      title="Voir tous les dossiers de cette formation"
                    >
                      <span>Voir les dossiers ({f.totalInscriptionsCount}) →</span>
                    </Link>
                  )}

                  <div className="clixa-formation-card__liens-secondaires">
                    {f.sessionId && (
                      <Link
                        href={`/admin/collections/sessions/${f.sessionId}` as Route}
                        className="clixa-formation-card__lien-sec"
                        title="Configurer les dates et tarifs de cette session"
                      >
                        Session ⚙️
                      </Link>
                    )}
                    <Link
                      href={`/admin/collections/programmes/${f.id}` as Route}
                      className="clixa-formation-card__lien-sec"
                      title="Modifier le contenu pédagogique du programme"
                    >
                      Fiche ↗
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODE 2 : TABLEAU SYNTHÉTIQUE DES 12 FORMATIONS ── */}
      {vueMode === "tableau" && formationsFiltreesEtTriees.length > 0 && (
        <div className="clixa-supervision__table-wrap">
          <table className="clixa-supervision__table">
            <thead>
              <tr>
                <th>Formation</th>
                <th>Filière</th>
                <th>Rentrée / Mode</th>
                <th className="clixa-supervision__th-centre">Total Clients</th>
                <th className="clixa-supervision__th-centre">Pré-inscriptions</th>
                <th className="clixa-supervision__th-centre">Réservées / Capacité</th>
                <th className="clixa-supervision__th-centre">Remplissage</th>
                <th className="clixa-supervision__th-droite">Actions</th>
              </tr>
            </thead>
            <tbody>
              {formationsFiltreesEtTriees.map((f, index) => {
                const hasPre = f.preInscriptionsCount > 0;
                const hasClients = f.totalInscriptionsCount > 0;
                const lienInscriptions = f.sessionId
                  ? (`/admin/collections/inscriptions?where[session][equals]=${f.sessionId}` as Route)
                  : ("/admin/collections/inscriptions" as Route);

                const lienPre = f.sessionId
                  ? (`/admin/collections/inscriptions?where[and][0][session][equals]=${f.sessionId}&where[and][1][statut][equals]=demandee` as Route)
                  : ("/admin/collections/inscriptions" as Route);

                return (
                  <tr
                    key={f.id}
                    className={
                      hasPre
                        ? "clixa-supervision__tr--has-pre"
                        : hasClients
                          ? "clixa-supervision__tr--has-clients"
                          : undefined
                    }
                  >
                    <td className="clixa-supervision__td-formation">
                      <div className="clixa-supervision__td-formation-inner">
                        {triMode === "clients" && hasClients && (
                          <span className="clixa-supervision__td-rang">#{index + 1}</span>
                        )}
                        <Link
                          href={`/admin/collections/programmes/${f.id}` as Route}
                          className="clixa-supervision__table-nom"
                        >
                          {f.titre}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`clixa-formation-card__spec clixa-formation-card__spec--${f.specialisationSlug}`}
                      >
                        {f.specialisationNom || "—"}
                      </span>
                    </td>
                    <td className="clixa-supervision__td-session">
                      <span>{f.sessionDebut ? f.sessionDebut : "—"}</span>
                      <small className="clixa-supervision__td-mode">
                        {f.sessionMode === "presentiel" ? "Présentiel" : "Virtuelle"}
                      </small>
                    </td>
                    <td className="clixa-supervision__td-centre">
                      {hasClients ? (
                        <span className="clixa-supervision__badge-total-table">
                          👥 <strong>{f.totalInscriptionsCount}</strong>
                        </span>
                      ) : (
                        <span className="clixa-supervision__texte-mute">0</span>
                      )}
                    </td>
                    <td className="clixa-supervision__td-centre">
                      {hasPre ? (
                        <Link
                          href={lienPre}
                          className="clixa-supervision__badge-pre-table"
                          title="Voir les pré-inscriptions"
                        >
                          ⚡ {f.preInscriptionsCount} en attente
                        </Link>
                      ) : (
                        <span className="clixa-supervision__texte-mute">0</span>
                      )}
                    </td>
                    <td className="clixa-supervision__td-centre">
                      <strong>{f.placesReservees}</strong> / {f.capacite}
                    </td>
                    <td className="clixa-supervision__td-centre">
                      <div className="clixa-supervision__table-pct-wrap">
                        <span className="clixa-supervision__table-pct">{f.pct}%</span>
                        <div className="clixa-supervision__table-mini-barre">
                          <div
                            className="clixa-supervision__table-mini-remplie"
                            style={{ width: `${f.pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="clixa-supervision__td-droite">
                      <div className="clixa-supervision__table-actions">
                        <Link
                          href={hasPre ? lienPre : lienInscriptions}
                          className={`clixa-supervision__btn-table ${
                            hasPre ? "clixa-supervision__btn-table--or" : ""
                          }`}
                        >
                          {hasPre ? `Traiter (${f.preInscriptionsCount}) →` : "Dossiers →"}
                        </Link>
                        {f.sessionId && (
                          <Link
                            href={`/admin/collections/sessions/${f.sessionId}` as Route}
                            className="clixa-supervision__btn-table-sec"
                            title="Gérer la session"
                          >
                            ⚙️
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
