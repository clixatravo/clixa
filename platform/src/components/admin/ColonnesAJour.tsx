"use client";

import React from "react";
import type { Route } from "next";
import { useConfig } from "@payloadcms/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { completerLesColonnesDeLAdresse } from "@/lib/colonnes";

/**
 * Une adresse de liste ne ramène plus une liste de colonnes d'avant.
 *
 * Payload porte les colonnes **dans l'adresse** (`?columns=["reference",…]`)
 * et les préfère à celles du compte pour l'affichage. Un favori ou une page de
 * l'historique pris avant l'ajout d'une colonne la cachent donc à chaque
 * visite — c'est ainsi que « Fonction actuelle » a disparu deux fois du compte
 * de l'administration. Voir `lib/colonnes.ts`.
 *
 * Quand l'adresse d'une liste omet une colonne que la collection déclare, ce
 * fournisseur la réécrit avec la colonne à sa place, **visible**, et remplace
 * l'adresse sans ajouter d'étape à l'historique. Le serveur relit alors la
 * bonne liste, l'affiche, et l'enregistre au compte.
 *
 * ⚠️ **Une colonne décochée reste décochée** : elle figure dans l'adresse avec
 * son tiret, elle n'est donc pas « manquante ».
 *
 * ⚠️ **La liste attendue vient de la configuration** (`defaultColumns`, que
 * Payload transmet au navigateur), jamais d'une copie écrite ici.
 */
export function ColonnesAJour({ children }: { children?: React.ReactNode }) {
  const { config } = useConfig();
  const chemin = usePathname();
  const parametres = useSearchParams();
  const routeur = useRouter();

  React.useEffect(() => {
    const brut = parametres?.get("columns");
    if (!brut || !chemin) return;

    /* Une liste, pas une fiche : …/collections/<slug>, et rien après. */
    const trouve = /\/collections\/([^/]+)\/?$/.exec(chemin);
    if (!trouve) return;
    const attendues = config.collections.find((c) => c.slug === trouve[1])?.admin?.defaultColumns;
    if (!Array.isArray(attendues) || attendues.length === 0) return;

    let figees: unknown;
    try {
      figees = JSON.parse(brut);
    } catch {
      return;
    }
    if (!Array.isArray(figees)) return;

    const { colonnes, ajoutees } = completerLesColonnesDeLAdresse(
      figees.filter((c): c is string => typeof c === "string"),
      attendues,
    );
    if (ajoutees.length === 0) return;

    const suite = new URLSearchParams(parametres.toString());
    suite.set("columns", JSON.stringify(colonnes));
    routeur.replace(`${chemin}?${suite.toString()}` as Route);
  }, [chemin, parametres, config, routeur]);

  return <>{children}</>;
}
