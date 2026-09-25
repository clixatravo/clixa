"use client";

import React from "react";

/**
 * Les justificatifs de versement, depuis le dossier.
 *
 * ── ⚠️ Le défaut que ce bloc ferme ──────────────────────────────────────────
 * Le participant joint la photo de son reçu au moment où il annonce son
 * transfert, et le fichier arrivait bien en base. Mais **rien, sur le dossier,
 * n'y menait** : il fallait quitter la fiche, ouvrir « Reçus de versement » dans
 * le menu, retrouver la bonne ligne parmi toutes, l'ouvrir, puis cliquer. Cinq
 * gestes — et la direction a conclu, en essayant le parcours de bout en bout le
 * 9 septembre 2026, qu'il n'y avait « pas d'endroit pour vérifier le reçu ».
 *
 * C'est le même défaut que les quatre boutons du fil des étapes corrigent
 * ailleurs : ce qui demande cinq gestes finit par ne plus être fait. Or c'est
 * ici que se décide la seule chose qui compte — marquer l'échéance réglée.
 *
 * ── ⚠️ Pourquoi une requête, et non un champ ────────────────────────────────
 * Le reçu vit dans sa propre collection, et le dossier n'en garde aucune trace :
 * c'est le reçu qui pointe vers lui. Un `join` afficherait bien la liste, mais
 * mènerait à la fiche du reçu — un clic de plus avant de voir l'image. Ici le
 * lien va droit à `api/recu/[id]`, qui vérifie la session d'équipe et relaie le
 * fichier depuis le magasin privé.
 */
export interface Recu {
  id: number | string;
  nomOriginal?: string | null;
  typeFichier?: string | null;
  taille?: number | null;
  echeance?: number | null;
  createdAt?: string | null;
}

export const POIDS = (o?: number | null) =>
  typeof o === "number" ? `${Math.max(1, Math.round(o / 1024))} Ko` : "";

export const JOUR = (v?: string | null) =>
  v
    ? new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : "";

/**
 * La lecture des justificatifs d'un dossier, pour le fil des étapes
 * (`EtapesContrat.tsx`), seul endroit de la fiche qui les montre depuis le
 * 25 septembre 2026. Le bloc qui vivait sous les échéances a été retiré : deux
 * boutons « Ouvrir le justificatif » sur la même fiche se lisaient comme un
 * doublon, et c'en était un.
 */
export function useJustificatifs(id: number | string | undefined): {
  recus: Recu[] | undefined;
  enPanne: boolean;
} {
  const [recus, setRecus] = React.useState<Recu[] | undefined>(undefined);
  const [enPanne, setEnPanne] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    let vivant = true;
    /*
      ⚠️ On distingue « aucun reçu » d'« on n'a pas pu regarder ». Répondre
      « aucun justificatif » quand la requête a échoué ferait marquer une
      échéance réglée sans pièce, ou refuser de la marquer alors que la pièce
      existe. Les deux se paient sur de l'argent reçu.
    */
    fetch(`/api/recus?limit=20&depth=0&sort=echeance&where[dossier][equals]=${id}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => vivant && setRecus((j.docs ?? []) as Recu[]))
      .catch(() => vivant && setEnPanne(true));
    return () => {
      vivant = false;
    };
  }, [id]);

  return { recus, enPanne };
}
