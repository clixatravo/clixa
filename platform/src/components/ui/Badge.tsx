import type { ReactNode } from "react";

type Ton = "disponible" | "tension" | "complet" | "certification" | "neutre";

const tons: Record<Ton, string> = {
  // DES-04 — l'émeraude porte le sens « disponible / validé »
  disponible:
    "text-emerald-bright border-emerald/50 bg-emerald/15 shadow-[0_0_12px_-2px_rgba(47,163,125,0.25)]",
  tension:
    "text-gold-bright border-gold/50 bg-gold/15 shadow-[0_0_12px_-2px_rgba(201,162,76,0.25)]",
  complet: "text-ivory-dim/70 border-line bg-panel/50",
  certification:
    "text-ink bg-gradient-to-r from-gold-bright to-gold border-gold font-bold shadow-[0_2px_10px_-2px_rgba(201,162,76,0.35)]",
  neutre: "text-ivory-dim border-line-strong bg-panel/40",
};

export function Badge({ ton = "neutre", children }: { ton?: Ton; children: ReactNode }) {
  const isLive = ton === "disponible" || ton === "tension";

  return (
    <span
      className={`rounded-clixa inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[0.62rem] tracking-[0.1em] whitespace-nowrap uppercase backdrop-blur-sm ${tons[ton]}`}
    >
      {isLive && (
        <span
          className={`size-1.5 rounded-full ${
            ton === "disponible" ? "bg-emerald-bright pulse-live" : "bg-gold-bright pulse-live"
          }`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

/**
 * MAQ-06 — point ouvert au jalon 1.
 *
 * Comportement actuel : le nombre exact de places est toujours affiché, comme sur
 * la maquette validée. Recommandation faite au client : ne montrer le décompte
 * qu'en dessous du seuil, et afficher « Places disponibles » au-dessus — un
 * « 16 places restantes » à trois semaines du départ dessert la conversion.
 *
 * Pour basculer : passer AFFICHER_DECOMPTE_TOUJOURS à false.
 */
const AFFICHER_DECOMPTE_TOUJOURS = true;
const SEUIL_TENSION = 5;

export function PlacesBadge({ restantes }: { restantes: number }) {
  if (restantes === 0) return <Badge ton="complet">Complet</Badge>;

  const enTension = restantes <= SEUIL_TENSION;

  if (!AFFICHER_DECOMPTE_TOUJOURS && !enTension) {
    return <Badge ton="disponible">Places disponibles</Badge>;
  }

  return (
    <Badge ton={enTension ? "tension" : "disponible"}>
      {restantes} place{restantes > 1 ? "s" : ""}
    </Badge>
  );
}
