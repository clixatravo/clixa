"use client";

import { useSyncExternalStore } from "react";
import {
  consentementAuServeur,
  ecrireConsentement,
  lireConsentement,
  MESURE_ACTIVE,
  souscrireConsentement,
} from "@/lib/consentement";

/**
 * Le bandeau de consentement à la mesure d'audience.
 *
 * ── ⚠️ Il ne paraît que s'il y a quelque chose à consentir ──────────────────
 * Sans traceur configuré, aucune mesure ne tourne, aucun cookie n'est
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
  const mesureActive = MESURE_ACTIVE;

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
      className="border-line bg-panel fixed right-3 bottom-3 left-3 z-50 flex items-center gap-3 border px-4 py-3 shadow-lg sm:left-auto sm:max-w-[420px] sm:flex-col sm:items-start sm:px-5 sm:py-4"
    >
      {/*
        ⚠️ **Une ligne sur téléphone, un encart sur écran large.** Le premier
        jet reprenait la même mise en page partout : sur un téléphone, cela
        faisait un pavé sombre haut de près d'un demi-écran, posé par-dessus le
        titre d'accueil. La direction l'a ouvert et a cru le site tombé — ce qui
        se comprend, rien de ce qu'elle connaissait n'était visible.

        Le texte est donc court par défaut et ne se développe qu'à partir de
        `sm`. Un bandeau qu'on prend pour une panne se fait cliquer au hasard,
        et cela ne vaut aucun consentement.
      */}
      <div className="min-w-0 flex-1">
        <p className="mono-label text-gold mb-1 hidden text-[0.62rem] sm:block">
          Mesure d&apos;audience
        </p>
        <p className="text-ivory-dim text-[0.78rem] leading-snug sm:mb-4 sm:text-[0.86rem] sm:leading-relaxed">
          <span className="sm:hidden">Un cookie pour compter les pages vues ?</span>
          <span className="hidden sm:inline">
            Nous aimerions compter les pages vues, pour savoir quels parcours intéressent. Cela pose
            un cookie sur votre appareil. Vous pouvez refuser : le site fonctionne exactement
            pareil.
          </span>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={repondre("accepte")}
          className="bg-gold text-ink rounded-clixa hover:bg-gold-bright min-h-11 px-4 text-[0.82rem] font-semibold transition-colors sm:px-5 sm:text-[0.86rem]"
        >
          Accepter
        </button>
        <button
          type="button"
          onClick={repondre("refuse")}
          className="border-line text-ivory hover:border-gold rounded-clixa min-h-11 border px-4 text-[0.82rem] font-semibold transition-colors sm:px-5 sm:text-[0.86rem]"
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
