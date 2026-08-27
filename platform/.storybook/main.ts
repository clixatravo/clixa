import type { StorybookConfig } from "@storybook/nextjs";

/**
 * DES-07 — l'atelier des composants.
 *
 * Il ne remplace pas les épreuves Playwright, qui regardent des parcours
 * entiers : il montre une pièce isolée dans ses états, y compris ceux qu'on
 * n'atteint qu'avec des données rares — une session complète, une échéance en
 * retard. Ces états-là existent dans le code sans qu'aucune page ne les
 * affiche aujourd'hui.
 *
 * ⚠️ Il n'est pas branché à l'intégration continue. Le construire ajoute une
 * minute à chaque poussée pour vérifier ce qu'aucune épreuve ne vérifie : que
 * l'atelier compile. Le jour où des états y seront comparés d'une version à
 * l'autre, il aura sa place dans la chaîne — pas avant.
 */
const config: StorybookConfig = {
  // Les histoires vivent à côté de ce qu'elles montrent, pas dans un dossier
  // à part : une pièce déplacée emporte sa démonstration.
  stories: ["../src/components/**/*.stories.@(ts|tsx)"],
  addons: [],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  staticDirs: ["../public"],
};

export default config;
