"use client";

import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  consentementAuServeur,
  lireConsentement,
  MESURE_ACTIVE,
  souscrireConsentement,
} from "@/lib/consentement";
import { pageAcceptelaProposition, peutProposer, retenirReponse } from "@/lib/proposition";

/**
 * La proposition faite au visiteur qui allait repartir sans rien faire.
 *
 * ── Pourquoi elle existe ────────────────────────────────────────────────────
 * Le trafic acheté sur Facebook arrive sur une fiche, lit, et repart. Sans un
 * geste à lui proposer au passage, il ne reste rien de la visite — ni pour
 * l'équipe, ni pour mesurer ce que la campagne a rapporté.
 *
 * ── ⚠️ Ce qu'elle proposait, et pourquoi cela a changé ──────────────────────
 * Elle demandait un numéro de téléphone : « laissez-le, un conseiller vous
 * rappelle sous 24 h ». C'était le geste le plus facile à obtenir, et c'est
 * précisément ce qui n'allait pas — la direction l'a tranché le 6 septembre
 * 2026. Beaucoup de gens le laissaient sans intention d'aller plus loin ;
 * chacun déclenchait un courriel à l'équipe et un appel à passer, pour une
 * conversation qui n'allait nulle part.
 *
 * Elle mène donc à la pré-inscription, qui est le geste qu'on cherche. Elle ne
 * demande plus rien sur place : elle dit ce que ce geste engage — rien — et
 * ouvre la porte.
 *
 * ⚠️ **Parler à quelqu'un reste possible, ailleurs et bien en vue.** Le héros
 * de chaque fiche porte « Parler à un conseiller » depuis le même jour, et
 * `/contact` n'a pas bougé. La fenêtre cesse de pousser cette porte-là ; elle
 * ne la ferme pas. Les deux décisions se lisent ensemble, et l'ordre compte :
 * on offre de parler, on ne le réclame pas.
 *
 * ── ⚠️ Ce qui la sépare de la fenêtre qu'on déteste ─────────────────────────
 * Elle ne s'ouvre pas à l'arrivée. Une fenêtre posée sur la page avant même
 * qu'on ait lu une ligne demande quelque chose à quelqu'un qui ne sait pas
 * encore ce qu'on vend — et c'est ce qui a donné leur réputation à ces
 * fenêtres-là. Celle-ci attend un signe d'intérêt : **vingt-cinq secondes de
 * lecture, ou la moitié de la page parcourue**, le premier des deux.
 *
 * Elle ne s'ouvre pas non plus sur les pages où l'on est déjà en train de
 * convertir — inscription, contact, espace participant. Voir
 * `lib/proposition.ts`.
 *
 * Et elle ne se rouvre pas : acceptée, plus jamais ; fermée, pas avant un mois.
 *
 * ── Une seule question à la fois ────────────────────────────────────────────
 * ⚠️ Si le bandeau de mesure attend encore une réponse, celle-ci se tait. Deux
 * fenêtres qui demandent deux choses en même temps, en bas du même écran, se
 * chevauchent et se font refuser ensemble.
 *
 * ── ⚠️ Aucun `Lead` n'est compté ici ────────────────────────────────────────
 * Ouvrir un formulaire n'est pas une conversion. L'apprendre à Meta lui ferait
 * chercher des gens qui ouvrent un formulaire et s'en vont — et l'argent
 * suivrait cette leçon. Le `Lead` part de la pré-inscription aboutie, comme
 * avant. La règle est écrite dans `PixelMeta`.
 */

const SECONDES_AVANT = 25;
const PART_DE_PAGE = 0.5;

/**
 * Ce que la pré-inscription engage : rien.
 *
 * ⚠️ **Trois faits vérifiables, pas trois arguments.** « Il ne reste que
 * quelques places », « la rentrée se remplit » : personne ne peut les tenir
 * depuis cette fenêtre, qui ne sait pas quelle session le visiteur regarde.
 * Ce qui est écrit ici est vrai de toute pré-inscription, partout, et le reste
 * du site le dit déjà — sept jours vient de `lib/places.ts`, l'absence de
 * compte du formulaire lui-même.
 */
const CE_QUE_CELA_ENGAGE = [
  "Rien n'est encaissé aujourd'hui",
  "Votre place est tenue sept jours",
  "Aucun compte à créer",
];

export function PopupInscription() {
  const chemin = usePathname();

  /*
    ── ⚠️ Ouverte *sur une page*, pas ouverte tout court ─────────────────────
    L'état était un simple booléen, et le composant vit dans le layout : une
    navigation interne ne le démonte pas. Une fois ouverte, la fenêtre suivait
    donc le visiteur de page en page — y compris sur `/inscription` et
    `/contact`, où `pageAcceptelaProposition` interdit précisément de la
    montrer, et y compris **sur la page où son propre bouton venait de mener**.

    Constaté le 6 septembre 2026 : on clique « Voir les formations », on arrive
    sur `/formations`, et la fenêtre est toujours là, proposant d'aller voir
    les formations. L'effet ne pouvait pas la refermer — il ne sait
    qu'*ouvrir*, et il renonce avant même d'y arriver puisque la réponse est
    désormais retenue.

    Retenir **le chemin** plutôt qu'un booléen ferme la fenêtre d'elle-même :
    `ouverte` se dérive, il n'y a rien à remettre à zéro, et aucun `setState`
    dans le corps d'un effet — la règle qui interdit ce dernier existe pour
    éviter exactement ce genre d'état qui se désynchronise de ce qu'on affiche.
  */
  const [ouverteSur, setOuverteSur] = useState<string | null>(null);
  const ouverte = ouverteSur === chemin;

  const fermer = useCallback(() => {
    setOuverteSur(null);
    retenirReponse("ferme");
  }, []);

  /*
    ⚠️ **Relu à chaque réponse du bandeau, et pas une seule fois au montage.**
    L'effet ne dépendait que du chemin : quelqu'un qui répondait au bandeau
    puis restait sur la page ne voyait **jamais** la proposition — l'effet
    avait déjà renoncé, et rien ne le rappelait. C'est-à-dire précisément le
    visiteur venu d'une annonce, qui atterrit sur une fiche et n'en bouge pas.
    Trouvé par l'épreuve, le jour où le bandeau s'est mis à paraître.
  */
  const reponse = useSyncExternalStore(
    souscrireConsentement,
    lireConsentement,
    consentementAuServeur,
  );

  useEffect(() => {
    if (!pageAcceptelaProposition(chemin) || !peutProposer()) return;

    /*
      ⚠️ La mesure d'audience passe avant : tant que son bandeau attend une
      réponse, on ne pose pas une seconde question par-dessus.
    */
    if (MESURE_ACTIVE && reponse === undefined) return;

    let fait = false;
    const ouvrir = () => {
      if (fait) return;
      fait = true;
      setOuverteSur(chemin);
    };

    const minuteur = window.setTimeout(ouvrir, SECONDES_AVANT * 1000);
    const auDefilement = () => {
      const hauteur = document.body.scrollHeight - window.innerHeight;
      if (hauteur > 0 && window.scrollY / hauteur >= PART_DE_PAGE) ouvrir();
    };
    window.addEventListener("scroll", auDefilement, { passive: true });

    return () => {
      window.clearTimeout(minuteur);
      window.removeEventListener("scroll", auDefilement);
    };
  }, [chemin, reponse]);

  // Échap ferme.
  useEffect(() => {
    if (!ouverte) return;
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [ouverte, fermer]);

  if (!ouverte) return null;

  /*
    ⚠️ **La formation vient du chemin, et c'est la seule chose que la fenêtre
    sache de la page.** Sans elle, `/inscription` renvoie au catalogue — et
    l'on ferait recommencer le choix à quelqu'un qui vient de lire la fiche
    entière. Hors d'une fiche, le catalogue est la bonne destination : il n'y a
    rien encore à retenir.
  */
  const surUneFiche = /^\/formations\/[^/]+$/.test(chemin);
  const cible = (
    surUneFiche ? `/inscription?formation=${chemin.split("/")[2]}` : "/formations"
  ) as Route;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposition-titre"
      className="border-gold bg-panel fixed right-3 bottom-3 left-3 z-40 border p-6 shadow-2xl sm:left-auto sm:max-w-[400px]"
    >
      <button
        type="button"
        onClick={fermer}
        aria-label="Fermer"
        className="text-ivory-dim hover:text-ivory absolute top-3 right-3 cursor-pointer text-lg leading-none"
      >
        ×
      </button>

      <p className="mono-label text-gold mb-2 text-[0.62rem]">Pré-inscription</p>
      <p id="proposition-titre" className="font-display text-ivory mb-1 text-[1.1rem]">
        Gardez votre place
      </p>
      <p className="text-ivory-dim mb-4 text-[0.85rem] leading-relaxed">
        {surUneFiche
          ? "Retenir la vôtre ne vous engage à rien — vous décidez ensuite, en connaissance de cause."
          : "Choisissez votre parcours et retenez votre place : cela ne vous engage à rien."}
      </p>

      <ul className="mb-5 flex flex-col gap-2">
        {CE_QUE_CELA_ENGAGE.map((fait) => (
          <li key={fait} className="text-ivory-dim flex items-start gap-2 text-[0.82rem]">
            <span aria-hidden="true" className="text-gold mt-px shrink-0">
              ✓
            </span>
            <span>{fait}</span>
          </li>
        ))}
      </ul>

      {/*
        ⚠️ **On retient la réponse en partant.** Quelqu'un qui suit ce lien a
        répondu à la question posée ; lui reposer la fenêtre au retour serait
        exactement ce que cette fenêtre existe pour ne pas faire.
      */}
      <Link
        href={cible}
        /*
          ⚠️ On ferme **avant** de naviguer, sans attendre que le chemin
          change. La navigation interne est asynchrone : sans cela, la fenêtre
          reste peinte le temps que la page suivante se rende — c'est-à-dire
          exactement le clignotement qu'on remarque.
        */
        onClick={() => {
          setOuverteSur(null);
          retenirReponse("envoye");
        }}
        className="bg-gold text-ink rounded-clixa hover:bg-gold-bright flex min-h-11 w-full items-center justify-center px-5 text-[0.88rem] font-semibold transition-colors"
      >
        {surUneFiche ? "Me pré-inscrire" : "Voir les formations"}
      </Link>
    </div>
  );
}
