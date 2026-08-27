import type { Meta, StoryObj } from "@storybook/nextjs";
import { Button } from "./Button";

/**
 * Les trois styles d'action, côte à côte.
 *
 * C'est la comparaison qui compte : un bouton se juge à côté de ses voisins,
 * pas seul. Le principal doit se distinguer sans qu'on le cherche — c'est la
 * raison pour laquelle le secondaire reste neutre.
 */
const meta = {
  title: "Base/Bouton",
  component: Button,
  args: { children: "Explorer le catalogue", href: "/formations" },
} satisfies Meta<typeof Button>;

export default meta;
type Histoire = StoryObj<typeof meta>;

export const Primaire: Histoire = { args: { variante: "primaire" } };
export const Contour: Histoire = { args: { variante: "contour" } };
export const Fantome: Histoire = { args: { variante: "fantome" } };

/** Les trois ensemble : c'est ainsi qu'on voit si la hiérarchie tient. */
export const LesTrois: Histoire = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button href="/formations">Explorer le catalogue</Button>
      <Button href="/contact" variante="contour">
        Prochaines sessions →
      </Button>
      <Button href="/a-propos" variante="fantome">
        En savoir plus
      </Button>
    </div>
  ),
};

/**
 * Un libellé long, qui arrive plus souvent qu'on ne croit : les intitulés de
 * parcours font parfois quarante caractères.
 */
export const LibelleLong: Histoire = {
  args: { children: "Préparation à la certification PMP® — septembre" },
};
