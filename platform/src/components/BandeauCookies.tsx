"use client";

import { useSyncExternalStore } from "react";
import {
  consentementAuServeur,
  ecrireConsentement,
  lireConsentement,
  souscrireConsentement,
} from "@/lib/consentement";

/**
 * Le bandeau de consentement à la mesure d'audience.
 *
 * ── ⚠️ Il ne paraît que s'il y a quelque chose à consentir ──────────────────
 * Sans `NEXT_PUBLIC_POSTHOG_KEY`, aucune mesure ne tourne, aucun cookie n'est
 * posé — et le bandeau ne s'affiche pas du tout. Demander l'accord pour des
 * traceurs qu'on n'utilise pas serait du théâtre : le visiteur clique sans
 * lire, et le jour où l'on mesurera vraiment, son clic d'aujourd'hui aurait
 * l'air d'un accord.
 *
 * C'est le cas en production aujourd'hui : la variable n'est pas posée, donc
 * personne ne voit ce bandeau. Il attend le jour où la direction branchera la
 * mesure — et ce jour-là, il sera déjà là.
 *
 * ── Ce qu'il ne demande pas ─────────────────────────────────────────────────
 * Les cookies de session — celui qui garde un participant connecté à son
 * espace, celui du back-office — ne passent pas par ici. Ils sont nécessaires
 * au service demandé, et les soumettre à un accord reviendrait à proposer un
 * site qui ne marche pas.
 *
 * ── Deux boutons de même poids ──────────────────────────────────────────────
 * ⚠️ « Refuser » n'est ni caché, ni grisé, ni relégué à un second écran. Un
 * refus qui coûte trois clics quand l'accord en coûte un n'est pas un choix,
 * et c'est précisément ce que la CNIL reproche aux bandeaux qu'on connaît.
 */
export function BandeauCookies() {
  const mesureActive = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

  /*
    ⚠️ Rien au premier rendu, et c'est voulu. `localStorage` n'existe pas au
    serveur : l'instantané serveur rend `undefined`, le bandeau ne paraît
    qu'après l'hydratation. Décider au rendu ferait diverger le HTML envoyé de
    celui que le navigateur reconstruit.
  */
  const reponse = useSyncExternalStore(
    souscrireConsentement,
    lireConsentement,
    consentementAuServeur,
  );

  if (!mesureActive || reponse !== undefined) return null;

  const repondre = (valeur: "accepte" | "refuse") => () => ecrireConsentement(valeur);

  return (
    <div
      // `role="dialog"` sans `aria-modal` : il informe, il ne piège pas le clavier.
      role="dialog"
      aria-label="Mesure d'audience"
      className="border-line bg-panel fixed right-3 bottom-3 left-3 z-50 border p-5 shadow-lg sm:left-auto sm:max-w-[420px]"
    >
      <p className="mono-label text-gold mb-2 text-[0.62rem]">Mesure d&apos;audience</p>
      <p className="text-ivory-dim mb-4 text-[0.86rem] leading-relaxed">
        Nous aimerions compter les pages vues, pour savoir quels parcours intéressent. Cela pose un
        cookie sur votre appareil. Vous pouvez refuser : le site fonctionne exactement pareil.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={repondre("accepte")}
          className="bg-gold text-ink rounded-clixa hover:bg-gold-bright min-h-11 px-5 text-[0.86rem] font-semibold transition-colors"
        >
          Accepter
        </button>
        <button
          type="button"
          onClick={repondre("refuse")}
          className="border-line text-ivory hover:border-gold rounded-clixa min-h-11 border px-5 text-[0.86rem] font-semibold transition-colors"
        >
          Refuser
        </button>
      </div>
      {/*
        ⚠️ Pas de lien vers /confidentialite tant qu'elle répond 404. La page
        existe en brouillon et attend trois mentions que la direction seule
        peut fournir ; un lien mort dans un bandeau de consentement est pire
        que pas de lien. À rétablir ici le jour de sa publication.
      */}
    </div>
  );
}
