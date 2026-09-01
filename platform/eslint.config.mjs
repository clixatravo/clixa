import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * SOC-04 — Règles de qualité.
 *
 * Depuis eslint-config-next 16, les préréglages sont livrés en config plate :
 * on les importe directement, sans passer par FlatCompat.
 *
 * Au-delà des règles Next.js, deux garde-fous propres au projet :
 * l'étanchéité de la couche d'accès aux données, et l'interdiction du `any`.
 */
const config = [
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    /**
     * Le contrat d'architecture, rendu exécutable.
     *
     * Les pages et composants ne doivent jamais lire src/data/ directement :
     * tout passe par src/lib/. C'est cette étanchéité qui permettra de basculer
     * sur Payload en INT-01 sans toucher un seul composant.
     */
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/data/*", "**/data/catalogue", "**/data/blog"],
              message:
                "Passe par src/lib/ (catalogue.ts, blog.ts). L'accès direct à src/data/ casse la couture prévue pour INT-01 (bascule vers Payload).",
            },
          ],
        },
      ],
    },
  },
  {
    /**
     * Les coordonnées officielles ne se recopient pas.
     *
     * `src/lib/reseaux.ts` les porte, et il est le seul à avoir le droit de les
     * écrire. Ce n'est pas une préférence de style : un faux numéro
     * d'admissions a vécu dans **chaque courriel envoyé** parce qu'il avait été
     * recopié à côté de celui du site. Le défaut ne se voit ni à la
     * compilation, ni à la relecture — les deux valeurs ont l'air justes
     * chacune de son côté — et se découvre au moment où quelqu'un compose.
     *
     * Il en existait huit copies au 1er septembre 2026, dont une dans la
     * plaquette PDF, qui portait de surcroît l'apex quand le canonique est
     * `www`. La plaquette est ce qu'un prospect fait suivre à qui décide du
     * budget.
     */
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/reseaux.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/contact@clixa|admissions@clixa|\\+?212\\s?6\\s?69\\s?30\\s?34\\s?67|212669303467/]",
          message:
            "Les coordonnées officielles vivent dans src/lib/reseaux.ts (RESEAUX_CLIXA). Une seconde copie finit toujours par diverger — c'est ainsi qu'un faux numéro d'admissions s'est retrouvé dans chaque courriel envoyé.",
        },
        {
          selector: "TemplateElement[value.raw=/contact@clixa|admissions@clixa|212669303467/]",
          message:
            "Les coordonnées officielles vivent dans src/lib/reseaux.ts (RESEAUX_CLIXA), même dans un gabarit de chaîne.",
        },
      ],
    },
  },
  {
    /**
     * Scripts de maintenance et de vérification.
     *
     * Le style « condition ? ok(…) : ko(…) » y est volontaire : il rend la
     * lecture d'une suite d'assertions plus courte qu'une cascade de if/else.
     * La règle reste active partout ailleurs.
     */
    files: ["scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
];

export default config;
