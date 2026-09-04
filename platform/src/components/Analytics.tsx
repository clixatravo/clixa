"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useSyncExternalStore } from "react";
import { consentementAuServeur, lireConsentement, souscrireConsentement } from "@/lib/consentement";

/**
 * SOC-07 — Mesure d'audience.
 *
 * Sans NEXT_PUBLIC_POSTHOG_KEY : aucune requête, aucun cookie, et surtout
 * **aucun octet téléchargé**. C'est la raison de l'import dynamique — en import
 * statique, posthog-js ajoutait un chunk de 246 kB à toutes les pages, y compris
 * quand la mesure est désactivée. Sur un objectif d'affichage utile sous 2,5 s
 * en 3G, c'était inacceptable.
 *
 * Ce qu'on cherche à mesurer, ce sont les KPI de la V1 :
 * visiteur → fiche formation → réservation initiée.
 *
 * ── ⚠️ Rien ne part avant l'accord ──────────────────────────────────────────
 * `posthog.init` pose un cookie. Tant que le visiteur n'a pas répondu au
 * bandeau, la librairie n'est même pas téléchargée : ce n'est pas un traceur
 * qu'on démarre puis qu'on éteint, c'est un traceur qui n'existe pas.
 *
 * Un refus vaut pour toute la visite et les suivantes — il est retenu dans
 * `localStorage`, pas dans un cookie, pour ne pas poser ce qu'on vient de
 * refuser. Voir `lib/consentement.ts`.
 */
type PostHog = (typeof import("posthog-js"))["default"];

const CLE = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOTE = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

/** Promesse mise en cache : la librairie n'est chargée et initialisée qu'une fois. */
let chargement: Promise<PostHog | null> | null = null;

function charger(): Promise<PostHog | null> {
  if (!CLE) return Promise.resolve(null);

  chargement ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(CLE, {
      api_host: HOTE,
      capture_pageview: false, // géré manuellement ci-dessous
      respect_dnt: true, // respecte le signal « ne pas me pister »
      persistence: "localStorage+cookie",
    });
    return posthog;
  });

  return chargement;
}

function SuiviPages() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /*
    Relu à chaque réponse du bandeau : quelqu'un qui accepte ne doit pas avoir
    à recharger la page pour que sa visite compte.
  */
  const accepte =
    useSyncExternalStore(souscrireConsentement, lireConsentement, consentementAuServeur) ===
    "accepte";

  useEffect(() => {
    if (!accepte) return;

    // Avec le routeur d'app, naviguer ne recharge pas la page : sans capture
    // manuelle, seule la première vue serait comptée.
    const url = searchParams.toString() ? `${pathname}?${searchParams}` : pathname;

    void charger().then((posthog) => {
      posthog?.capture("$pageview", { $current_url: window.location.origin + url });
    });
  }, [pathname, searchParams, accepte]);

  return null;
}

export function Analytics() {
  if (!CLE) return null;

  // useSearchParams impose une frontière Suspense sous le routeur d'app.
  return (
    <Suspense fallback={null}>
      <SuiviPages />
    </Suspense>
  );
}
