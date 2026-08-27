import type { Meta, StoryObj } from "@storybook/nextjs";
import { Badge, PlacesBadge } from "./Badge";

/**
 * Les pastilles d'état.
 *
 * Elles portent une information que le visiteur lit en un coup d'œil et sur
 * laquelle il décide : reste-t-il de la place ? Leurs cas limites — zéro, un,
 * le seuil de tension — ne s'observent sur le site que si une session s'y
 * trouve. Ici, ils sont tous là.
 */
const meta = {
  title: "Base/Pastille",
  component: Badge,
  args: { children: "Disponible" },
} satisfies Meta<typeof Badge>;

export default meta;
type Histoire = StoryObj<typeof meta>;

export const Disponible: Histoire = { args: { ton: "disponible" } };
export const Tension: Histoire = { args: { ton: "tension", children: "Dernières places" } };
export const Complet: Histoire = { args: { ton: "complet", children: "Complet" } };
export const Certification: Histoire = {
  args: { ton: "certification", children: "Certifiant" },
};
export const Neutre: Histoire = { args: { ton: "neutre", children: "À distance" } };

/**
 * Le décompte, du plein au complet.
 *
 * ⚠️ Le seuil de tension et l'affichage permanent du nombre sont deux réglages
 * distincts (`SEUIL_TENSION`, `AFFICHER_DECOMPTE_TOUJOURS`). Les voir alignés
 * évite de croire qu'un seul les gouverne.
 */
export const Decompte: Histoire = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {[30, 12, 5, 3, 1, 0].map((n) => (
        <div key={n} className="flex flex-col items-center gap-2">
          <PlacesBadge restantes={n} />
          <span className="text-ivory-dim font-mono text-[0.7rem]">{n}</span>
        </div>
      ))}
    </div>
  ),
};
