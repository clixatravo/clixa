"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

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

  useEffect(() => {
    // Avec le routeur d'app, naviguer ne recharge pas la page : sans capture
    // manuelle, seule la première vue serait comptée.
    const url = searchParams.toString() ? `${pathname}?${searchParams}` : pathname;

    void charger().then((posthog) => {
      posthog?.capture("$pageview", { $current_url: window.location.origin + url });
    });
  }, [pathname, searchParams]);

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
