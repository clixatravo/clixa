"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  consentementAuServeur,
  lireConsentement,
  PIXEL_META,
  souscrireConsentement,
} from "@/lib/consentement";

/**
 * Le Pixel Meta, pour savoir ce que rapportent les annonces Facebook.
 *
 * ── ⚠️ Pourquoi il n'est pas collé dans le `<head>` ─────────────────────────
 * C'est ce que Meta demande, et c'est ce qu'il ne faut pas faire ici. Le code
 * de base pose les cookies `_fbp` / `_fbc` et signale la page à Facebook
 * **au chargement**, avant que le visiteur ait pu dire quoi que ce soit. Le
 * site porte un bandeau de consentement écrit exprès pour l'empêcher, et une
 * épreuve qui garde la règle : « aucune mesure d'audience ne démarre sans
 * réponse du visiteur ».
 *
 * Le pixel suit donc le même chemin que PostHog : tant qu'il n'y a pas
 * d'accord, **le script n'est même pas téléchargé**. Ce n'est pas un traceur
 * qu'on démarre puis qu'on éteint, c'est un traceur qui n'existe pas.
 *
 * ⚠️ Conséquence à connaître avant de lire les chiffres : Meta comptera moins
 * de conversions que de clics, puisque les visiteurs qui refusent ne sont pas
 * suivis. Ce n'est pas une panne du pixel.
 *
 * ── Ce qu'il compte ─────────────────────────────────────────────────────────
 * `PageView` à chaque page, et `Lead` **une seule fois**, à l'arrivée sur le
 * dossier après une pré-inscription réussie — jamais à l'ouverture du
 * formulaire. Voir `SignalerLead`.
 */

/** Le script de Meta, chargé au plus une fois, et seulement après l'accord. */
let chargement: Promise<boolean> | null = null;

type Fbq = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
};

function charger(): Promise<boolean> {
  if (!PIXEL_META) return Promise.resolve(false);

  chargement ??= new Promise<boolean>((resoudre) => {
    const f = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
    if (f.fbq) return resoudre(true);

    /*
      La navette de Meta, réécrite lisiblement : elle empile les appels tant
      que `fbevents.js` n'est pas arrivé, puis les rejoue. On la garde parce
      que `fbq(...)` est appelé ailleurs sans savoir si le script a fini de
      charger — la file est ce qui rend cet ordre sans importance.
    */
    const fbq = ((...args: unknown[]) => {
      fbq.queue?.push(args);
    }) as Fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    f.fbq = fbq;
    f._fbq = fbq;

    const balise = document.createElement("script");
    balise.async = true;
    balise.src = "https://connect.facebook.net/en_US/fbevents.js";
    /*
      ⚠️ On résout sur `load` **et** sur `error`. Un bloqueur de publicité
      empêche le script d'arriver : sans le second, la promesse resterait en
      suspens pour toujours et chaque changement de page ajouterait un appel à
      une file que personne ne viderait jamais.
    */
    balise.addEventListener("load", () => resoudre(true));
    balise.addEventListener("error", () => resoudre(false));
    document.head.appendChild(balise);

    fbq("init", PIXEL_META);
  });

  return chargement;
}

/**
 * Empile un événement pour Meta, si et seulement si le visiteur a accepté.
 *
 * ⚠️ La vérification est refaite ici, et pas seulement dans les composants.
 * C'est la porte que tout traverse : un appel ajouté plus tard, depuis un
 * endroit qui aurait oublié la règle, ne peut pas la contourner.
 */
export function signaler(evenement: string, parametres?: Record<string, unknown>): void {
  if (!PIXEL_META || lireConsentement() !== "accepte") return;
  void charger().then((pret) => {
    if (!pret) return;
    const fbq = (window as unknown as { fbq?: Fbq }).fbq;
    if (parametres) fbq?.("track", evenement, parametres);
    else fbq?.("track", evenement);
  });
}

/** `PageView` à chaque page — le routeur d'app ne recharge pas le document. */
export function PixelMeta() {
  const chemin = usePathname();
  /*
    Relu à chaque réponse du bandeau : quelqu'un qui accepte ne doit pas avoir
    à recharger la page pour que sa visite compte. Même raison que dans
    `Analytics`.
  */
  const accepte =
    useSyncExternalStore(souscrireConsentement, lireConsentement, consentementAuServeur) ===
    "accepte";

  useEffect(() => {
    if (!accepte) return;
    signaler("PageView");
  }, [chemin, accepte]);

  /*
    ⚠️ Rien n'est rendu, et surtout **pas le `<noscript><img>`** du code de
    Meta. Cette balise appelle `facebook.com/tr` dès l'affichage, sans passer
    par le moindre script : posée dans le HTML, elle signalerait la visite de
    tous ceux qui refusent — et de tous ceux à qui l'on n'a encore rien
    demandé. C'est précisément le contournement que le bandeau interdit.
  */
  return null;
}
