import type { ReactNode } from "react";

type Ton = "disponible" | "tension" | "complet" | "certification" | "neutre";

const tons: Record<Ton, string> = {
  // DES-04 — l'émeraude porte le sens « disponible / validé »
  disponible: "text-emerald-bright border-emerald bg-emerald/15",
  tension: "text-gold-bright border-gold bg-gold/10",
  complet: "text-ivory-dim border-line-strong",
  certification: "text-ink bg-gold border-gold font-bold",
  neutre: "text-ivory-dim border-line-strong",
};

export function Badge({ ton = "neutre", children }: { ton?: Ton; children: ReactNode }) {
  return (
    <span
      className={`rounded-clixa inline-block border px-2.5 py-1 font-mono text-[0.56rem] tracking-[0.1em] whitespace-nowrap uppercase ${tons[ton]}`}
    >
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
