"use client";

import { useEffect } from "react";
import { lireConsentement, souscrireConsentement } from "@/lib/consentement";
import { signaler } from "@/components/PixelMeta";

/**
 * `Lead` — quelqu'un vient de laisser de quoi le recontacter.
 *
 * ── ⚠️ Ce qu'un lead n'est pas ──────────────────────────────────────────────
 * Ce n'est pas l'ouverture d'un formulaire. Meta optimise la diffusion sur
 * l'événement qu'on lui déclare : le brancher sur la visite de
 * `/inscription?formation=…` lui apprendrait à chercher des gens qui ouvrent
 * un formulaire et s'en vont. L'argent suivrait cette leçon.
 *
 * L'événement ne part donc que d'un écran qui n'existe **qu'après** un
 * enregistrement réussi.
 *
 * ── Deux sortes de leads, un seul événement ─────────────────────────────────
 * La pré-inscription et la demande de rappel envoient toutes deux `Lead`, et
 * se distinguent par `content_name`. C'est délibéré :
 *
 *  - deux événements séparés diviseraient le volume, et Meta a besoin d'un
 *    nombre de conversions suffisant pour apprendre quoi que ce soit ;
 *  - les confondre sans étiquette rendrait le tableau de bord illisible, et
 *    l'on ne saurait plus ce que la campagne rapporte vraiment.
 *
 * ⚠️ Aucune valeur monétaire n'est envoyée. Une pré-inscription vaut plus
 * qu'une demande de rappel, mais de combien est une décision de la direction,
 * pas une constante à inventer ici.
 *
 * ── ⚠️ Et une seule fois ────────────────────────────────────────────────────
 * Les deux écrans se rouvrent : la page du dossier est celle que le
 * participant consulte pendant des semaines, et `?envoye=1` survit à un
 * rechargement. Sans garde, chaque visite ajouterait une conversion. Deux
 * verrous, parce qu'ils n'attrapent pas la même chose :
 *
 *  - `actif`, que la page calcule depuis son paramètre d'URL, distingue
 *    l'arrivée après envoi d'un retour ordinaire ;
 *  - `clef` est retenue dans `localStorage`, ce qui tient le rechargement —
 *    où le paramètre est toujours là.
 *
 * ── Et rien ne part sans accord ─────────────────────────────────────────────
 * `signaler` revérifie le consentement, et l'on **attend** une réponse plutôt
 * que de renoncer : quelqu'un qui accepte au moment même où il vient de
 * s'inscrire doit compter. C'est le seul endroit du site où la réponse peut
 * arriver après le fait qu'elle autorise.
 */
const CLEF = "clixa.lead.v1";

function dejaCompte(clef: string): boolean {
  try {
    const brut = window.localStorage.getItem(CLEF);
    return brut ? (JSON.parse(brut) as string[]).includes(clef) : false;
  } catch {
    /*
      Stockage refusé — fenêtre privée, navigateur verrouillé. On préfère
      compter deux fois que pas du tout : une conversion en trop se voit dans
      le tableau de bord, une conversion perdue ne se voit nulle part.
    */
    return false;
  }
}

function retenir(clef: string): void {
  try {
    const brut = window.localStorage.getItem(CLEF);
    const vues = brut ? (JSON.parse(brut) as string[]) : [];
    // Les vingt dernières suffisent : personne n'a mille dossiers.
    window.localStorage.setItem(CLEF, JSON.stringify([...vues, clef].slice(-20)));
  } catch {
    // Sans stockage, la garde du paramètre reste ; tant pis pour le reste.
  }
}

/**
 * Envoie `Lead` une fois, dès que le consentement le permet.
 *
 * Exporté parce que la fenêtre de rappel n'a pas d'écran de confirmation à
 * elle : elle affiche sa réponse sur place, et appelle donc ceci directement.
 */
export function compterLead(clef: string, source: string): (() => void) | undefined {
  if (dejaCompte(clef)) return undefined;

  const envoyer = () => {
    if (lireConsentement() !== "accepte" || dejaCompte(clef)) return;
    signaler("Lead", { content_name: source });
    retenir(clef);
  };

  envoyer();
  // Et si la réponse au bandeau vient après coup, on repasse.
  return souscrireConsentement(envoyer);
}

export function SignalerLead({
  actif,
  clef,
  source,
}: {
  /** La page vient-elle d'un envoi, ou est-ce une visite ordinaire ? */
  actif: boolean;
  /** Ce qui ne doit être compté qu'une fois — une référence de dossier, par exemple. */
  clef: string;
  /** Ce que le tableau de bord de Meta affichera à côté de la conversion. */
  source: string;
}) {
  useEffect(() => {
    if (!actif) return;
    return compterLead(clef, source);
  }, [actif, clef, source]);

  return null;
}
