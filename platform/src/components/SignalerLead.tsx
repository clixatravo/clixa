"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { lireConsentement, souscrireConsentement } from "@/lib/consentement";
import { signaler } from "@/components/PixelMeta";

/**
 * `Lead` — une pré-inscription vient d'aboutir.
 *
 * ── ⚠️ Ce qu'un lead n'est pas ──────────────────────────────────────────────
 * Ce n'est pas l'ouverture du formulaire. Meta optimise la diffusion sur
 * l'événement qu'on lui déclare : le brancher sur la visite de
 * `/inscription?formation=…` lui apprendrait à chercher des gens qui ouvrent
 * un formulaire et s'en vont. L'argent suivrait cette leçon.
 *
 * L'événement part donc sur la page du dossier, qui n'existe **qu'après** un
 * enregistrement réussi.
 *
 * ── ⚠️ Et une seule fois ────────────────────────────────────────────────────
 * Cette page-là est aussi celle que le participant rouvre pour suivre son
 * dossier, parfois des semaines durant : sans garde, chaque visite ajouterait
 * une conversion. Deux verrous, parce qu'ils n'attrapent pas la même chose :
 *
 *  - `?nouveau=1`, posé par la redirection de `api/inscription`, distingue
 *    l'arrivée après envoi d'un retour ordinaire ;
 *  - la référence est retenue dans `localStorage`, ce qui tient le rechargement
 *    de la page — où le paramètre est toujours là.
 *
 * ── Et rien ne part sans accord ─────────────────────────────────────────────
 * `signaler` revérifie le consentement, et l'on attend une réponse plutôt que
 * de renoncer : quelqu'un qui accepte au moment où il vient de s'inscrire doit
 * compter. C'est le seul endroit du site où la réponse arrive si tard.
 */
const CLEF = "clixa.lead.v1";

function dejaCompte(reference: string): boolean {
  try {
    const brut = window.localStorage.getItem(CLEF);
    return brut ? (JSON.parse(brut) as string[]).includes(reference) : false;
  } catch {
    /*
      Stockage refusé — fenêtre privée, navigateur verrouillé. On préfère
      compter deux fois que pas du tout : une conversion en trop se voit dans
      le tableau de bord, une conversion perdue ne se voit nulle part.
    */
    return false;
  }
}

function retenir(reference: string): void {
  try {
    const brut = window.localStorage.getItem(CLEF);
    const vues = brut ? (JSON.parse(brut) as string[]) : [];
    // Les vingt dernières suffisent : personne n'a mille dossiers.
    window.localStorage.setItem(CLEF, JSON.stringify([...vues, reference].slice(-20)));
  } catch {
    // Sans stockage, la garde du paramètre reste ; tant pis pour le reste.
  }
}

export function SignalerLead({ reference }: { reference: string }) {
  const parametres = useSearchParams();
  const nouveau = parametres.get("nouveau") === "1";

  useEffect(() => {
    if (!nouveau || dejaCompte(reference)) return;

    const envoyer = () => {
      if (lireConsentement() !== "accepte" || dejaCompte(reference)) return;
      signaler("Lead");
      retenir(reference);
    };

    envoyer();
    // Et si la réponse au bandeau vient après l'arrivée, on repasse.
    return souscrireConsentement(envoyer);
  }, [nouveau, reference]);

  return null;
}
