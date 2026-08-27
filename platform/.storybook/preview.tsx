import type { Preview } from "@storybook/nextjs";
import "../src/app/(frontend)/globals.css";

/**
 * Le fond du site, pas celui de Storybook.
 *
 * Les composants sont dessinés pour un fond sombre : les présenter sur blanc
 * montrerait des contrastes qui n'existent nulle part, et ferait corriger des
 * couleurs qui vont très bien.
 */
const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "encre",
      values: [{ name: "encre", value: "#080c18" }],
    },
    controls: { expanded: true },
  },
  decorators: [
    (Histoire) => (
      <div className="text-ivory p-8 font-sans">
        <Histoire />
      </div>
    ),
  ],
};

export default preview;
