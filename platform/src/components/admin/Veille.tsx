import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { avancementDuDossier } from "@/lib/avancement";
import { resumerLaFormation } from "@/lib/supervision";
import { JOURS_DE_BATTEMENT, JOURS_DE_GRACE } from "@/lib/places";
import {
  JOURS_DE_PRESSE,
  conditionsDesPlacesARendre,
  conditionsDesPlacesAuTerme,
  filtreDesPlacesARendre,
  filtreDesPlacesAuTerme,
} from "@/lib/delai";
import { repartitionParDomaine } from "@/lib/profil";
import { ficheProvenance, repartitionParProvenance } from "@/lib/provenance";
import { LogoSvg } from "@/components/LogoSvg";
import { SupervisionFormations, type FormationResume } from "./SupervisionFormations";
import { AnnonceDemarrage } from "@/components/admin/AnnonceDemarrage";
import { PresenterInstitut } from "@/components/admin/PresenterInstitut";
import { SuiviVersements } from "@/components/admin/SuiviVersements";
import { suiviDesVersements, type DossierSuivi, type RecuSuivi } from "@/lib/versements";

/**
 * Cockpit Exécutif en tête du tableau de bord Payload.
 *
 * Présente les indicateurs critiques nécessitant une action immédiate
 * (transferts annoncés, nouvelles demandes de rappel, échéances en retard),
 * ainsi que la date de la prochaine rentrée et des raccourcis vers les flux clés.
 */

/*
  ⚠️ Le fuseau de la maison, pas UTC. Cette date ne sert qu'à l'intitulé du
  tableau de bord — « quel jour sommes-nous » pour celui qui le lit. En UTC, le
  Maroc étant à +1, l'équipe lisait la veille entre minuit et une heure : vu à
  00 h 58 à Agadir, la console annonçait « Lundi 14 septembre » un mardi.

  Les horaires de sessions, eux, restent en UTC et le doivent : ce sont des
  instants publiés, que le visiteur lit avec leur fuseau écrit à côté. Ici il ne
  s'agit pas d'un instant mais d'un jour de calendrier, et celui qui compte est
  celui du bureau.
*/
const JOUR = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Casablanca",
});

/** Le même fuseau que l'intitulé, en court : « 14 sept. ». */
const JOUR_COURT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Africa/Casablanca",
});

interface Echeance {
  statut?: string | null;
  dateLimite?: string | null;
}

// Micro-icônes vectorielles SVG pour le Cockpit Exécutif (remplaçant les émojis bruts)
function IconePlus() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconeExport() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconeTelephone() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconeLienExterne() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconeEclair() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconeSablier() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </svg>
  );
}

function IconeFlecheRetour() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function IconePlume() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
    </svg>
  );
}

function IconeBulle() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconeTendance() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconeDiplome() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function IconeDossier() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconeUtilisateurs() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconeRecu() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

function IconeLivre() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconeCalendrier() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconeTarif() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function obtenirFiltresDates() {
  const d = new Date();
  const aujourdhui = d.toISOString().slice(0, 10);
  const ilYASeptJours = new Date(d.getTime() - 7 * 86400000).toISOString();
  /*
    Deux jours avant le terme : c'est ce qu'il reste pour appeler avant que la
    tâche de 8 h ne prévienne le participant. L'horloge se lit ici, avec les
    autres — la lire dans le corps du composant est une fonction impure au
    rendu, ce que la règle ESLint refuse.
  */
  const seuilPresse = new Date(
    d.getTime() - (JOURS_DE_GRACE - JOURS_DE_PRESSE) * 86400000,
  ).toISOString();
  /*
    Le battement écoulé depuis l'annonce : au-delà, le bouton « Rendre la
    place » s'ouvre. Même raison de lire l'horloge ici et pas au rendu.
  */
  const seuilRetour = new Date(d.getTime() - JOURS_DE_BATTEMENT * 86400000).toISOString();
  /* L'instant lui-même, pour le suivi des versements — même raison. */
  return { maintenant: d, aujourdhui, ilYASeptJours, seuilPresse, seuilRetour };
}

export async function Veille() {
  const payload = await getPayload({ config });
  const { maintenant, aujourdhui, ilYASeptJours, seuilPresse, seuilRetour } = obtenirFiltresDates();

  // 1. Inscriptions vivantes
  /*
    ⚠️ Ce plafond est une limite connue. Les deux premiers compteurs se
    calculent en mémoire — ils demandent de regarder les échéances de chaque
    dossier, ce qu'un `where` ne sait pas faire en une passe — et au-delà de
    cinq cents dossiers vivants le bandeau compterait moins que la vérité,
    sans le dire. Une cohorte de trente places en est loin ; le jour où elle
    s'en approche, c'est ce calcul-là qu'il faut porter en SQL.
  */
  /*
    ── ⚠️ On ne ramène que ce qu'on lit ───────────────────────────────────────
    Sans `select`, Payload rend le dossier **entier** : le journal des relances,
    l'échéancier complet, la signature, les coordonnées du payeur — chacun dans
    sa table, donc chacun une requête de plus qu'il faut ensuite recoudre.
    Mesuré contre la production, sur trente-trois dossiers : **823 ms**. Avec
    les huit champs que ces compteurs lisent réellement : **119 ms**. Sept fois
    moins, deux fois de suite.

    ⚠️ **Le jour où l'on ajoutera un compteur, il faudra ajouter son champ
    ici.** Un champ absent ne lève pas : il vaut `undefined`, et le compteur
    tombe silencieusement à zéro. C'est le prix de cette optimisation, et il se
    paie en oubli — `verifier-veille.ts` fabrique justement des dossiers dans
    chaque état et vérifie que le bandeau les compte.
  */
  const promesseInscriptions = payload.find({
    collection: "inscriptions",
    limit: 500,
    depth: 0,
    overrideAccess: true,
    select: {
      statut: true,
      createdAt: true,
      session: true,
      contratDemandeLe: true,
      contratSigneLe: true,
      contratVerifieLe: true,
      coordonneesEnvoyeesLe: true,
      placeRappeleeLe: true,
      echeances: true,
      /*
        Le nom et la référence servent au suivi des versements, qui nomme
        chaque personne (25 septembre 2026). ⚠️ Absents d'ici, ils arriveraient
        vides sans erreur, et le bloc afficherait « Sans nom » partout.
      */
      apprenantNom: true,
      reference: true,
    },
  });

  /*
    ── Les justificatifs, réduits à ce qui les rattache ───────────────────────
    Le suivi des versements distingue « annoncé avec sa pièce » d'« annoncé sans
    pièce » : ce n'est pas le même travail de vérification. Deux champs, pas le
    fichier — le dossier et la tranche.
  */
  const promesseRecus = payload.find({
    collection: "recus",
    limit: 500,
    depth: 0,
    overrideAccess: true,
    select: { dossier: true, echeance: true },
  });

  const promesseSemaine = payload.find({
    collection: "inscriptions",
    where: { createdAt: { greater_than_equal: ilYASeptJours } },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  });

  /*
    ── ⚠️ Ceux à qui le courriel « votre place va repartir » va partir ────────
    La tâche de 8 h est le seul endroit du système où quelque chose change sans
    que personne ait agi : elle prévient le participant, puis rend sa place. On
    ne peut pas l'éprouver après coup — le tort est fait, et il est fait à des
    gens venus d'une annonce. La direction voulait donc les voir **avant**.

    ⚠️ **Les conditions sont celles de la tâche, à la lettre** (`api/relances`) :
    statut « demandée », contrat non signé, annonce pas encore partie. Une
    seconde lecture des mêmes champs finirait par nommer quelqu'un d'autre que
    celui qui reçoit le message — et c'est pire que de ne rien annoncer.

    Seul le seuil change : la tâche prend le terme (sept jours), la vignette
    prend deux jours plus tôt, pour laisser le temps d'un appel. Le filtre du
    lien porte donc exactement le même `where` — pas d'écart entre le nombre et
    la liste qu'il ouvre.
  */
  const promessePlacesAuTerme = payload.find({
    collection: "inscriptions",
    where: conditionsDesPlacesAuTerme(seuilPresse) as never,
    limit: 0,
    depth: 0,
    overrideAccess: true,
  });

  /*
    ── ⚠️ Ce que plus personne ne fait à notre place ─────────────────────────
    La tâche de 8 h rendait ces places ; depuis le 11 septembre 2026 elle ne
    rend plus rien, et c'est un geste de l'équipe. Sans cette vignette, une
    session compterait indéfiniment des gens qui ne viendront jamais — le défaut
    exact que les sept jours avaient corrigé le 28 août 2026, réintroduit
    sciemment le jour où la direction a repris la main.

    ⚠️ Elle ne compte que ce sur quoi le geste est **possible** : l'annonce est
    partie, et le battement de deux jours est écoulé. Le bouton refuse avant —
    reprendre une place avant la date promise par écrit serait retirer un délai
    qu'on a donné.
  */
  const promessePlacesARendre = payload.find({
    collection: "inscriptions",
    where: conditionsDesPlacesARendre(seuilRetour) as never,
    /*
      ⚠️ La direction veut **les noms**, pas seulement le nombre : « diir smiyat
      f tableau de bord ». Un « 8 » demande un clic avant de savoir de qui il
      s'agit, et c'est sur ces noms qu'elle décide de rendre une place ou de
      rappeler quelqu'un. Douze lignes suffisent — au-delà, le lien mène à la
      liste complète.

      ⚠️ `select` ne porte que ce que la liste affiche : sans lui, Payload
      remonte le dossier entier — journal des relances, échéancier, signature,
      chacun dans sa table, donc chacun une requête de plus. Le revers est qu'un
      champ ajouté à l'affichage sans l'être ici arriverait vide, sans erreur.
    */
    limit: 12,
    sort: "placeRappeleeLe",
    depth: 0,
    overrideAccess: true,
    select: { reference: true, apprenantNom: true, placeRappeleeLe: true } as never,
  });

  /*
    1 bis. D'où viennent les inscrits — demandé par la direction le 20 septembre
    2026, le jour même où le champ « Domaine actuel » est parti en ligne.

    ⚠️ **Une seule requête, pas sept.** Un compte par domaine aurait été sept
    allers-retours pour une question qui tient dans une colonne ; on ramène la
    colonne et l'on compte en mémoire. `select` ne porte donc que ce champ :
    sans lui Payload remonterait le dossier entier, échéancier et journal
    compris, chacun dans sa table.

    ⚠️ **Cinq cents dossiers au plus**, comme les deux compteurs d'échéances
    plus haut, et pour la même raison : au-delà, le tableau compterait moins que
    la vérité sans le dire. Une cohorte de trente en est loin ; le jour où l'on
    s'en approchera, ce calcul-là se porte en SQL.

    ⚠️ **Les dossiers annulés sont hors du compte.** L'annulation est exactement
    le dossier dont la place vient de repartir ; les garder ferait grossir le
    portrait des inscrits à mesure qu'on en perd — le cinquième des six défauts
    de la supervision, le 12 septembre.
  */
  const promesseDomaines = payload.find({
    collection: "inscriptions",
    where: { statut: { not_equals: "annulee" } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    /*
      La provenance (26 septembre 2026) part dans la même requête : mêmes
      dossiers, même exclusion des annulés, une colonne de plus.
    */
    select: { apprenantDomaine: true, apprenantProvenance: true } as never,
  });

  // 2. Nouvelles demandes de rappel
  const promesseDemandes = payload.find({
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
  const promesseConversations = payload.find({
    collection: "conversations",
    where: { conduite: { equals: "humain" } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  /*
    3. Les formations du catalogue et leurs promotions.

    ── ⚠️ Toutes les formations et toutes les cohortes sont désormais suivies ──
    Auparavant, l'écran limitait la requête à `limit: 3` sur les sessions. Or
    les douze sessions démarrent le même jour (3 octobre 2026). Neuf cohortes
    étaient donc invisibles du tableau de bord.
    Désormais, les douze formations sont chargées avec le décompte exact de
    leurs pré-inscriptions (dossiers déposés en attente de traitement), de leurs
    places réservées et de leurs jauges de capacité, avec des filtres directs
    pour simplifier la gestion quotidienne de l'équipe administrative.
  */
  const promesseProgrammes = payload.find({
    collection: "programmes",
    limit: 50,
    locale: "fr",
    depth: 1,
    sort: "titre",
    overrideAccess: true,
  });

  const promesseSessions = payload.find({
    collection: "sessions",
    where: { debut: { greater_than_equal: aujourdhui } },
    sort: ["-placesReservees", "debut"],
    limit: 50,
    depth: 1,
    overrideAccess: true,
  });
  /*
    ── ⚠️ Les huit requêtes partent ensemble ──────────────────────────────────
    Elles étaient attendues l'une après l'autre : le tableau de bord payait la
    **somme** de leurs allers-retours. Mesuré contre la base de production le
    12 septembre 2026 : 822 + 80 + 143 + 57 + 60 + 278 + 297 ms, soit **1,7 s**
    avant que la page commence à se rendre — et c'est l'écran sur lequel
    l'équipe arrive chaque matin, puis revient entre deux dossiers.

    Aucune ne dépend du résultat d'une autre : elles peuvent partir ensemble, et
    la page ne paie plus que la plus lente.

    ⚠️ **La réserve de connexions de Neon a ses limites**, et huit requêtes
    simultanées y tiennent largement — c'est le même ordre de grandeur qu'une
    page de liste de Payload. Le journal note la panne inverse : une socket
    laissée ouverte que Neon coupe en sous-main, ce que `idleTimeoutMillis`
    règle déjà.
  */
  const [
    { docs: inscriptions },
    { totalDocs: inscriptionsSemaine },
    { totalDocs: placesAuTerme },
    { totalDocs: placesARendre, docs: dossiersARendre },
    { docs: docsDomaines },
    { totalDocs: nouvellesDemandes },
    { totalDocs: conversationsAReprendre },
    { docs: programmes },
    { docs: sessions },
    { docs: docsRecus },
  ] = await Promise.all([
    promesseInscriptions,
    promesseSemaine,
    promessePlacesAuTerme,
    promessePlacesARendre,
    promesseDomaines,
    promesseDemandes,
    promesseConversations,
    promesseProgrammes,
    promesseSessions,
    promesseRecus,
  ]);

  const versements = suiviDesVersements(
    inscriptions as unknown as DossierSuivi[],
    docsRecus as unknown as RecuSuivi[],
    maintenant,
  );

  /*
    ⚠️ Le calcul vit dans `lib/profil.ts`, pur, et non ici : une répartition
    écrite dans un composant serveur ne s'éprouve qu'en ouvrant un navigateur et
    en se connectant. C'est la leçon d'`occupationDeLaSession` et
    d'`avancementDuDossier` — et celle des six défauts de la supervision,
    trouvés en relisant parce qu'aucun n'était tombé au rouge.
  */
  const profils = docsDomaines as unknown as {
    apprenantDomaine?: string | null;
    apprenantProvenance?: string | null;
  }[];
  const domaines = repartitionParDomaine(profils.map((d) => d.apprenantDomaine));
  const provenances = repartitionParProvenance(profils.map((d) => d.apprenantProvenance));

  /*
    ⚠️ Le `select` de la requête est passé en `as never` — Payload rend alors des
    documents que TypeScript ne sait plus décrire. On nomme donc ici, en un seul
    endroit, les quatre champs que la liste affiche : si l'un disparaît du
    `select`, il arrivera vide, et c'est cette déclaration qu'on relit.
  */
  const aRendre = dossiersARendre as unknown as {
    id: number | string;
    reference?: string | null;
    apprenantNom?: string | null;
    placeRappeleeLe?: string | null;
  }[];

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
    const { clef } = avancementDuDossier(dossier, new Date());

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

  const prochaine = sessions[0]?.debut;

  // Associe chaque programme à sa prochaine session active
  const sessionParProgramme = new Map<number, (typeof sessions)[number]>();
  for (const s of sessions) {
    const pId =
      typeof s.programme === "object" && s.programme !== null
        ? (s.programme as { id?: number }).id
        : s.programme;
    const numPId = typeof pId === "number" ? pId : typeof pId === "string" ? Number(pId) : null;
    if (numPId !== null && !sessionParProgramme.has(numPId)) {
      sessionParProgramme.set(numPId, s);
    }
  }

  // Associe chaque session à ses dossiers d'inscription
  const extraireIdSession = (session: unknown): number | null => {
    if (typeof session === "number") return session;
    if (session && typeof session === "object" && "id" in session) {
      const id = (session as { id: unknown }).id;
      if (typeof id === "number") return id;
      if (typeof id === "string" && !Number.isNaN(Number(id))) return Number(id);
    }
    if (typeof session === "string" && !Number.isNaN(Number(session))) return Number(session);
    return null;
  };

  const inscriptionsParSession = new Map<number, typeof inscriptions>();
  for (const ins of inscriptions) {
    const sId = extraireIdSession(ins.session);
    if (sId !== null) {
      const existants = inscriptionsParSession.get(sId) ?? [];
      existants.push(ins);
      inscriptionsParSession.set(sId, existants);
    }
  }

  const formationsResume: FormationResume[] = programmes.map((p) => {
    const s = sessionParProgramme.get(p.id);
    const dossiers = s ? (inscriptionsParSession.get(s.id) ?? []) : [];

    /*
      ⚠️ **Le calcul vit dans `lib/supervision.ts`**, pur, où il s'éprouve sans
      base ni navigateur. Il tenait ici, au milieu d'un composant serveur : six
      défauts y ont été trouvés d'un coup en relisant, aucun n'était tombé au
      rouge. Même raison que `occupationDeLaSession` et `avancementDuDossier`.
    */
    const resume = resumerLaFormation(s, dossiers);

    const specObj =
      typeof p.specialisation === "object" && p.specialisation !== null
        ? (p.specialisation as { nom?: string; slug?: string })
        : null;

    const dateDebut = s?.debut
      ? new Intl.DateTimeFormat("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(s.debut))
      : null;

    return {
      id: p.id,
      titre: p.titre || "Formation",
      slug: p.slug,
      specialisationNom: specObj?.nom || "Management & Business",
      specialisationSlug: specObj?.slug || "general",
      type: p.type || "metier",
      dureeHeures: p.dureeHeures,
      sessionId: s?.id ?? null,
      sessionReference: s?.reference ?? null,
      sessionDebut: dateDebut,
      sessionMode: s?.mode ?? null,
      ...resume,
    };
  });

  // Tri prioritaire : Par nombre de clients inscrits (décroissant).
  // Chaque formation remonte automatiquement au fur et à mesure que les clients s'inscrivent.
  // En cas d'égalité, on départage par les pré-inscriptions en attente, puis les places confirmées, puis alphabétique.
  formationsResume.sort((a, b) => {
    if (b.totalInscriptionsCount !== a.totalInscriptionsCount) {
      return b.totalInscriptionsCount - a.totalInscriptionsCount;
    }
    if (b.preInscriptionsCount !== a.preInscriptionsCount) {
      return b.preInscriptionsCount - a.preInscriptionsCount;
    }
    if (b.placesReservees !== a.placesReservees) {
      return b.placesReservees - a.placesReservees;
    }
    return a.titre.localeCompare(b.titre, "fr");
  });

  const totalGlobalPreInscriptions = formationsResume.reduce(
    (acc, f) => acc + f.preInscriptionsCount,
    0,
  );
  const totalGlobalPlacesReservees = formationsResume.reduce(
    (acc, f) => acc + f.placesReservees,
    0,
  );
  const totalGlobalInscriptions = formationsResume.reduce(
    (acc, f) => acc + f.totalInscriptionsCount,
    0,
  );

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
    /*
      ⚠️ Le même `where` que le comptage, recopié en URL — c'est la seule façon
      qu'a une liste de Payload de dire « et », et le nombre annonce un tri que
      le lien doit faire.
    */
    placesAuTerme: filtreDesPlacesAuTerme(seuilPresse),
    placesARendre: filtreDesPlacesARendre(seuilRetour),
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
    /*
      ⚠️ Celui-ci compte double : les autres disent ce qu'on a laissé traîner,
      celui-là ce qui va se produire tout seul demain à 8 h. Un « tout est à
      jour » au-dessus d'une place qui part demain serait le pire des deux.
    */
    placesAuTerme === 0 &&
    /*
      ⚠️ Et celui-ci compte double dans l'autre sens : plus rien ne le videra
      tout seul. « Tout est à jour » au-dessus de places que personne ne rendra
      jamais serait le message le plus trompeur du tableau de bord.
    */
    placesARendre === 0 &&
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
            <IconePlus />
            <span>Nouvelle Inscription</span>
          </Link>
          <a
            href="/api/admin/export-admissions"
            download
            className="clixa-cockpit__btn clixa-cockpit__btn--accent"
            title="Télécharger le classeur des admissions (.xlsx) : une feuille par nature de donnée"
          >
            <IconeExport />
            <span>Exporter (.xlsx)</span>
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
            <IconeTelephone />
            <span>Rappels {nouvellesDemandes > 0 ? `(${nouvellesDemandes})` : ""}</span>
          </Link>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="clixa-cockpit__btn clixa-cockpit__btn--ghost"
            title="Ouvrir le site public dans un nouvel onglet"
          >
            <span>Site public</span>
            <IconeLienExterne />
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
            <span className="clixa-kpi__indicateur clixa-kpi__indicateur--or">
              <IconeEclair />
            </span>
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

        {/* KPI 1 bis : les places qui arrivent à leur terme */}
        <Link
          href={
            (placesAuTerme > 0 ? filtres.placesAuTerme : "/admin/collections/inscriptions") as Route
          }
          className={`clixa-kpi ${placesAuTerme > 0 ? "clixa-kpi--alerte-or" : ""}`}
        >
          <div className="clixa-kpi__haut">
            <span className="clixa-kpi__indicateur clixa-kpi__indicateur--cyan">
              <IconeSablier />
            </span>
            <span className="clixa-kpi__tag">Places</span>
          </div>
          <div className="clixa-kpi__valeur">{placesAuTerme}</div>
          <div className="clixa-kpi__libelle">
            {placesAuTerme > 1 ? "Places à leur terme" : "Place à son terme"}
          </div>
          <div className="clixa-kpi__action">
            <span>{placesAuTerme > 0 ? "Appeler avant le courriel →" : "Voir les dossiers →"}</span>
          </div>
        </Link>

        {/* KPI 1 quater : les places que plus personne ne rend à notre place */}
        <Link
          href={
            (placesARendre > 0 ? filtres.placesARendre : "/admin/collections/inscriptions") as Route
          }
          className={`clixa-kpi ${placesARendre > 0 ? "clixa-kpi--alerte-or" : ""}`}
        >
          <div className="clixa-kpi__haut">
            <span className="clixa-kpi__indicateur clixa-kpi__indicateur--cyan">
              <IconeFlecheRetour />
            </span>
            <span className="clixa-kpi__tag">Places</span>
          </div>
          <div className="clixa-kpi__valeur">{placesARendre}</div>
          <div className="clixa-kpi__libelle">
            {placesARendre > 1 ? "Places à rendre" : "Place à rendre"}
          </div>
          <div className="clixa-kpi__action">
            <span>{placesARendre > 0 ? "Délai passé — à trancher →" : "Voir les dossiers →"}</span>
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
            <span className="clixa-kpi__indicateur clixa-kpi__indicateur--violet">
              <IconePlume />
            </span>
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
          className={`clixa-kpi ${conversationsAReprendre > 0 ? "clixa-kpi--alerte-rouge" : ""}`}
        >
          <div className="clixa-kpi__haut">
            <span className="clixa-kpi__indicateur clixa-kpi__indicateur--ambre">
              <IconeBulle />
            </span>
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
            <span className="clixa-kpi__indicateur clixa-kpi__indicateur--emeraude">
              <IconeTelephone />
            </span>
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
            <span className="clixa-kpi__indicateur clixa-kpi__indicateur--rose">
              <IconeSablier />
            </span>
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
            <span className="clixa-kpi__indicateur clixa-kpi__indicateur--bleu">
              <IconeTendance />
            </span>
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
            <span className="clixa-kpi__indicateur clixa-kpi__indicateur--or">
              <IconeDiplome />
            </span>
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

      {/*
        ── Le suivi des versements ──────────────────────────────────────────
        Demandé par la direction le 25 septembre 2026 : qui a encore deux
        tranches, qui n'en a plus qu'une, qui a fini — et ce qui vient
        d'arriver et attend d'être vérifié. Sous les vignettes, parce qu'il en
        est le détail : la vignette « Paiements » dit combien, ce bloc dit qui.
      */}
      <SuiviVersements suivi={versements} />

      {/*
        ⚠️ **Les noms, et pas seulement le nombre** (demandé par la direction le
        16 septembre 2026 : « diir smiyat f tableau de bord »). La vignette dit
        « 8 » ; c'est un clic de plus avant de savoir de qui il s'agit, alors que
        la décision — rendre la place, ou rappeler la personne — se prend sur le
        nom. Les huit tiennent sous la grille, chacun menant à son dossier.

        ⚠️ **Rien ne s'affiche quand il n'y a rien.** Un cadre vide sous un
        tableau de bord se lit comme une page à moitié chargée, jamais comme une
        intention : c'est la leçon de la rubrique de filtre sans choix.

        ⚠️ **Ni or ni émeraude ici.** La vignette juste au-dessus porte déjà
        l'alerte ; répéter l'or sur douze lignes le viderait de son sens, et le
        vert voudrait dire « c'est fait ».
      */}
      {placesARendre > 0 && (
        <div className="clixa-arendre">
          <div className="clixa-arendre__titre">
            <span>
              {placesARendre > 1 ? "Places à rendre" : "Place à rendre"} — délai passé, à trancher
            </span>
            <Link href={filtres.placesARendre as Route} className="clixa-arendre__tout">
              Ouvrir la liste →
            </Link>
          </div>
          <ul className="clixa-arendre__liste">
            {aRendre.map((d) => (
              <li key={String(d.id)} className="clixa-arendre__ligne">
                <Link
                  href={`/admin/collections/inscriptions/${d.id}` as Route}
                  className="clixa-arendre__nom"
                >
                  {String(d.apprenantNom ?? "Sans nom")}
                </Link>
                <span className="clixa-arendre__meta">
                  {String(d.reference ?? "")}
                  {d.placeRappeleeLe
                    ? ` · prévenu le ${JOUR_COURT.format(new Date(String(d.placeRappeleeLe)))}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
          {placesARendre > aRendre.length && (
            <Link href={filtres.placesARendre as Route} className="clixa-arendre__plus">
              et {placesARendre - aRendre.length} autre
              {placesARendre - aRendre.length > 1 ? "s" : ""} →
            </Link>
          )}
        </div>
      )}

      {/*
        ── D'où viennent les inscrits ──────────────────────────────────────
        Demandé par la direction le 20 septembre 2026, le jour où le champ
        « Domaine actuel » est parti en ligne. C'est le seul des trois champs de
        profil qui se compte : le poste, en texte libre, ne s'additionne pas.

        ⚠️ **Rien ne s'affiche tant que personne n'a répondu**, et ce n'est pas
        une panne. Le jour de la mise en ligne : 124 dossiers vivants, zéro
        domaine déclaré. Un cadre montrant sept lignes à zéro se lirait comme un
        écran cassé — la leçon de la rubrique de filtre sans choix. Le bloc
        paraîtra de lui-même à la première réponse.

        ⚠️ **La couverture est écrite au-dessus du décompte, jamais après.**
        « Finance 2 » sur trois réponses ne dit rien de cent vingt-quatre
        dossiers ; sans cette ligne, on lirait la partie pour le tout — sur
        l'écran même depuis lequel on décide d'ouvrir une cohorte.

        ⚠️ **Et chaque ligne mène aux dossiers qu'elle compte.** Un nombre qui
        annonce un tri que le lien ne fait pas vide le tableau de bord de son
        intérêt ; c'est la règle posée le 1er septembre pour les quatre
        vignettes.
      */}
      {domaines.declares > 0 && (
        <div className="clixa-domaines">
          <div className="clixa-domaines__titre">
            {/*
              « D'où viennent les inscrits » jusqu'au 26 septembre 2026 : le
              titre se lisait comme la question de la provenance, posée le même
              jour juste en dessous. Il dit maintenant ce qu'il compte.
            */}
            <span>Domaines des inscrits</span>
            <span className="clixa-domaines__couverture">
              {domaines.declares} dossier{domaines.declares > 1 ? "s" : ""} sur {domaines.total}
              {domaines.declares > 1 ? " l'ont" : " l'a"} déclaré
            </span>
          </div>
          <ul className="clixa-domaines__liste">
            {/*
              ⚠️ **Le rang teinte la barre, et rien d'autre ne le fait.** Le
              bloc répond à « lequel domine », jamais à « quelle proportion » —
              c'est écrit dans `repartitionParDomaine`, et la barre est déjà
              proportionnelle au plus fourni. Donner une couleur propre à
              chaque domaine ferait sept teintes qu'il faudrait inventer, et
              qui ne voudraient rien dire : ce ne sont pas les cinq filières du
              catalogue, qui ont les leurs.

              L'or plein va donc au premier, et s'éteint en descendant. La
              couleur porte le classement, ce que le bloc sert à lire.
            */}
            {domaines.lignes.map((l, rang) => (
              <li key={l.valeur} className="clixa-domaines__ligne">
                <Link
                  href={
                    `/admin/collections/inscriptions?where[apprenantDomaine][equals]=${l.valeur}` as Route
                  }
                  className="clixa-domaines__nom"
                >
                  {l.libelle}
                </Link>
                <span className="clixa-domaines__barre" aria-hidden="true">
                  <span
                    className={`clixa-domaines__part${rang === 0 ? "clixa-domaines__part--tete" : ""}`}
                    style={{
                      width: `${Math.max(l.barre, 4)}%`,
                      /*
                        ⚠️ Un plancher à 0,3 : sans lui, le septième domaine
                        sortirait presque invisible, et « peu » se lirait
                        « aucun » — alors qu'il y a bien quelqu'un derrière.
                      */
                      opacity: Math.max(1 - rang * 0.16, 0.3),
                    }}
                  />
                </span>
                <span className="clixa-domaines__nombre">{l.nombre}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/*
        ── Comment ils nous ont connus ──────────────────────────────────────
        Demandé par la direction le 26 septembre 2026, avec la question du
        formulaire. Même dessin et mêmes règles que les domaines, juste
        au-dessus : rien tant que personne n'a répondu, la couverture écrite
        avant le décompte, la barre relative à la provenance la plus fournie —
        jamais une part du total, que les dossiers d'avant fausseraient.

        Chaque provenance porte son logo, à la couleur de sa marque : c'est ce
        qu'on reconnaît avant d'avoir lu. ⚠️ La barre, elle, reste dorée :
        colorer chaque barre à sa marque ferait lire la couleur comme un
        classement, et c'est le rang qui porte le classement.
      */}
      {provenances.declares > 0 && (
        <div className="clixa-domaines">
          <div className="clixa-domaines__titre">
            <span>Comment ils nous ont connus</span>
            <span className="clixa-domaines__couverture">
              {provenances.declares} dossier{provenances.declares > 1 ? "s" : ""} sur{" "}
              {provenances.total}
              {provenances.declares > 1 ? " ont" : " a"} répondu
            </span>
          </div>
          <ul className="clixa-domaines__liste">
            {provenances.lignes.map((l, rang) => {
              const fiche = ficheProvenance(l.valeur);
              return (
                <li key={l.valeur} className="clixa-domaines__ligne">
                  <Link
                    href={
                      `/admin/collections/inscriptions?where[apprenantProvenance][equals]=${l.valeur}` as Route
                    }
                    className="clixa-domaines__nom clixa-provenance"
                  >
                    {fiche && (
                      <span
                        className="clixa-provenance__logo"
                        style={{ backgroundColor: `${fiche.couleur}2e`, color: fiche.couleur }}
                      >
                        <LogoSvg logo={fiche.logo} className="clixa-provenance__svg" />
                      </span>
                    )}
                    {l.libelle}
                  </Link>
                  <span className="clixa-domaines__barre" aria-hidden="true">
                    <span
                      className={`clixa-domaines__part${rang === 0 ? "clixa-domaines__part--tete" : ""}`}
                      style={{
                        width: `${Math.max(l.barre, 4)}%`,
                        opacity: Math.max(1 - rang * 0.16, 0.3),
                      }}
                    />
                  </span>
                  <span className="clixa-domaines__nombre">{l.nombre}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Raccourcis Rapides de Navigation ── */}
      {/*
        ── L'annonce de démarrage ────────────────────────────────────────────
        Posée ici, entre ce qui attend et les accès directs : c'est une action,
        pas un raccourci. Elle ne s'affiche pas toute seule et n'envoie rien
        avant qu'on ait regardé à qui — voir `AnnonceDemarrage`.
      */}
      <AnnonceDemarrage />

      {/*
        La présentation, à côté de l'annonce : les deux écrivent à des gens,
        mais pas aux mêmes. L'annonce s'adresse à qui a un dossier ; celle-ci à
        qui n'en a pas encore.
      */}
      <PresenterInstitut />

      <div className="clixa-raccourcis">
        <span className="clixa-raccourcis__titre">ACCÈS DIRECTS :</span>
        <div className="clixa-raccourcis__pills">
          <Link href="/admin/collections/inscriptions" className="clixa-raccourcis__pill">
            <IconeDossier />
            <span>Inscriptions</span>
          </Link>
          <Link href="/admin/collections/apprenants" className="clixa-raccourcis__pill">
            <IconeUtilisateurs />
            <span>Apprenants</span>
          </Link>
          <Link href="/admin/collections/recus" className="clixa-raccourcis__pill">
            <IconeRecu />
            <span>Reçus &amp; Transferts</span>
          </Link>
          <Link href="/admin/collections/programmes" className="clixa-raccourcis__pill">
            <IconeLivre />
            <span>Formations</span>
          </Link>
          <Link href="/admin/collections/sessions" className="clixa-raccourcis__pill">
            <IconeCalendrier />
            <span>Sessions &amp; Dates</span>
          </Link>
          <Link href="/admin/globals/tarifs" className="clixa-raccourcis__pill">
            <IconeTarif />
            <span>Tarifs</span>
          </Link>
        </div>
      </div>

      {/* ── Supervision des 12 Formations & Pré-inscriptions ── */}
      <SupervisionFormations
        formations={formationsResume}
        totalGlobalPreInscriptions={totalGlobalPreInscriptions}
        totalGlobalPlacesReservees={totalGlobalPlacesReservees}
        totalGlobalInscriptions={totalGlobalInscriptions}
      />
    </section>
  );
}
