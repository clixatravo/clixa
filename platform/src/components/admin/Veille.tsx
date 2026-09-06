import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { avancementDuDossier } from "@/lib/avancement";

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
  /*
    ⚠️ Ce plafond est une limite connue. Les deux premiers compteurs se
    calculent en mémoire — ils demandent de regarder les échéances de chaque
    dossier, ce qu'un `where` ne sait pas faire en une passe — et au-delà de
    cinq cents dossiers vivants le bandeau compterait moins que la vérité,
    sans le dire. Une cohorte de trente places en est loin ; le jour où elle
    s'en approche, c'est ce calcul-là qu'il faut porter en SQL.
  */
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
  let contratsATraiter = 0;
  let enRetard = 0;

  /*
    ── ⚠️ Ce que « ce qui attend de nous » recouvrait, et ce qu'il oubliait ───
    Le bandeau comptait les transferts annoncés et les échéances dépassées. Il
    ne comptait **ni un contrat signé qui attend notre relecture, ni un contrat
    vérifié dont les coordonnées de règlement ne sont pas parties** — les deux
    moments où le participant s'est engagé et ne peut plus rien faire sans
    nous.

    Le journal du projet affirmait pourtant le contraire, et s'appuyait dessus
    pour justifier qu'une place signée soit tenue **sans terme** : « le bandeau
    du tableau de bord compte ces dossiers, c'est là que le rattrapage se
    fait ». Le rattrapage n'existait pas. Un dossier signé pouvait dormir
    indéfiniment, place retenue, sans que rien nulle part ne le signale — la
    tâche quotidienne ne regarde que les échéances, et elle ne les relance pas
    non plus depuis le 6 septembre 2026, justement parce qu'ils ne peuvent pas
    payer.

    ⚠️ **Le calcul est celui de la colonne « Où en est »**, pas une seconde
    lecture des mêmes champs. Deux implémentations du même état finissent par
    diverger, et l'équipe lirait alors deux vérités : trois dossiers dans la
    vignette, quatre pastilles dorées dans la liste. On compte sur `clef`, qui
    est stable, et jamais sur le libellé — une virgule réécrite ferait tomber
    la vignette à zéro sans que rien ne passe au rouge.
  */
  for (const dossier of vivantes) {
    const { clef } = avancementDuDossier(dossier);

    /*
      ⚠️ La partition tient toujours : un dossier ne compte qu'une fois, par
      ordre d'urgence — ce qui attend de nous, puis ce qui est en retard. Trois
      compteurs indépendants feraient additionner cinq choses à faire pour
      trois dossiers.

      ⚠️ Et « attend de nous » passe **avant** « en retard ». Un contrat signé
      dont les coordonnées ne sont pas parties peut très bien avoir une
      échéance dépassée : le compter parmi les retards ferait relancer
      quelqu'un pour un versement que nous l'empêchons de faire.
    */
    if (clef === "annonce") {
      aVerifier += 1;
    } else if (clef === "a-relire" || clef === "a-envoyer") {
      contratsATraiter += 1;
    } else if (
      echeancesDe(dossier).some(
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

  /*
    2 bis. Les conversations WhatsApp qu'un conseiller doit reprendre.

    ⚠️ **C'est le compteur le plus urgent des quatre.** Les trois autres
    constatent ce qui s'est produit et tiennent jusqu'à l'heure suivante ;
    celui-ci dit qu'une personne écrit **maintenant**, et qu'un robot vient de
    lui promettre qu'on lui répondrait. Une promesse tenue vingt minutes plus
    tard n'est plus la même promesse.
  */
  const { totalDocs: conversationsAReprendre } = await payload.find({
    collection: "conversations",
    where: { conduite: { equals: "humain" } },
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
  /*
    ── Chaque vignette mène aux dossiers qu'elle compte ──────────────────────
    Les trois pointaient sur la liste entière : le nombre annonçait un tri que
    le lien ne faisait pas. On cliquait sur « 3 » et l'on tombait sur cinq
    dossiers, à retrouver soi-même.

    ⚠️ Le tri de l'URL n'égale pas tout à fait le comptage. Celui-ci est une
    partition — un dossier dont le transfert est annoncé n'est pas recompté
    parmi les retards, même si sa date est passée — et un filtre de liste ne
    sait pas dire « en retard mais pas annoncé ». L'écart vaut au plus une
    ligne, contre la liste entière auparavant.
  */
  const filtres = {
    aVerifier: "/admin/collections/inscriptions?where[echeances.statut][equals]=annonce",
    enRetard: `/admin/collections/inscriptions?where[prochaineEcheance][less_than]=${aujourdhui}`,
    /*
      ⚠️ Le tri le plus proche que sache faire une URL : les contrats signés.
      Il ramène en plus ceux dont les coordonnées sont déjà parties — un `where`
      ne sait pas dire « signé mais pas encore relu, ou relu mais pas encore
      servi ». L'écart se voit d'un coup d'œil dans la colonne « Où en est »,
      qui est justement là pour cela ; renvoyer sur la liste entière, comme
      c'était l'usage avant le 1er septembre, coûterait bien plus.
    */
    contrats: "/admin/collections/inscriptions?where[contratSigneLe][exists]=true",
    recentes: `/admin/collections/inscriptions?where[createdAt][greater_than]=${ilYASeptJours}`,
    /*
      Le compteur ne relève que les demandes « nouvelle » ; le lien menait à
      l'historique entier, où les appels déjà passés noient ceux qui restent
      à passer.
    */
    rappels: "/admin/collections/demandes-rappel?where[statut][equals]=nouvelle",
    /*
      Même principe que les autres : le nombre annonce un tri, et le lien doit
      le faire. Une vignette qui compte trois conversations à reprendre et
      ouvre la liste entière oblige à les retrouver soi-même.
    */
    conversations: "/admin/collections/conversations?where[conduite][equals]=humain",
  } as const;

  /*
    ⚠️ « Tout est à jour » doit couvrir tout ce qu'on compte. Oublier un
    compteur ici fait afficher le message de sérénité **au-dessus** d'une
    vignette qui réclame un geste — et c'est le message, pas la vignette, qu'on
    croit.
  */
  const toutEstCalme =
    aVerifier === 0 &&
    contratsATraiter === 0 &&
    nouvellesDemandes === 0 &&
    enRetard === 0 &&
    conversationsAReprendre === 0;

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
            href={
              (nouvellesDemandes > 0
                ? filtres.rappels
                : "/admin/collections/demandes-rappel") as Route
            }
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
          href={filtres.aVerifier as Route}
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

        {/* KPI 1 ter : Contrats qui attendent un geste de notre côté */}
        <Link
          href={
            (contratsATraiter > 0 ? filtres.contrats : "/admin/collections/inscriptions") as Route
          }
          className={`clixa-kpi ${contratsATraiter > 0 ? "clixa-kpi--alerte-or" : ""}`}
        >
          <div className="clixa-kpi__haut">
            <span className="clixa-kpi__indicateur">✍️</span>
            <span className="clixa-kpi__tag">Contrats</span>
          </div>
          <div className="clixa-kpi__valeur">{contratsATraiter}</div>
          <div className="clixa-kpi__libelle">
            {contratsATraiter > 1 ? "Contrats à traiter" : "Contrat à traiter"}
          </div>
          <div className="clixa-kpi__action">
            <span>{contratsATraiter > 0 ? "Relire et servir →" : "Voir les dossiers →"}</span>
          </div>
        </Link>

        {/* KPI 1 bis : Conversations à reprendre — la plus urgente */}
        <Link
          href={
            (conversationsAReprendre > 0
              ? filtres.conversations
              : "/admin/collections/conversations") as Route
          }
          /*
            ⚠️ `--alerte-rouge`, pas `--alerte`. Cette dernière n'existe pas :
            la feuille ne déclare que `-or`, `-rouge` et `-vert`. Une classe
            inventée ne casse rien et ne fait rien — la vignette serait restée
            grise pour toujours, sans qu'aucune erreur ne le dise. Le journal
            met en garde contre ce piège exact ; il fallait encore le vérifier.

            Le rouge est celui de l'urgence, et c'est bien de cela qu'il
            s'agit : quelqu'un attend une réponse maintenant.
          */
          className={`clixa-kpi ${conversationsAReprendre > 0 ? "clixa-kpi--alerte-rouge" : ""}`}
        >
          <div className="clixa-kpi__haut">
            <span className="clixa-kpi__indicateur">💬</span>
            <span className="clixa-kpi__tag">Orientation</span>
          </div>
          <div className="clixa-kpi__valeur">{conversationsAReprendre}</div>
          <div className="clixa-kpi__libelle">
            {conversationsAReprendre > 1 ? "Conversations à reprendre" : "Conversation à reprendre"}
          </div>
          <div className="clixa-kpi__action">
            <span>
              {conversationsAReprendre > 0
                ? "Quelqu'un attend une réponse →"
                : "Voir les échanges →"}
            </span>
          </div>
        </Link>

        {/* KPI 2 : Demandes de rappel */}
        <Link
          href={
            (nouvellesDemandes > 0
              ? filtres.rappels
              : "/admin/collections/demandes-rappel") as Route
          }
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
          href={filtres.enRetard as Route}
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
        <Link href={filtres.recentes as Route} className="clixa-kpi">
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
            <span>📚 Formations</span>
          </Link>
          <Link href="/admin/collections/sessions" className="clixa-raccourcis__pill">
            <span>📅 Sessions &amp; Dates</span>
          </Link>
          <Link href="/admin/globals/tarifs" className="clixa-raccourcis__pill">
            <span>💰 Tarifs</span>
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
