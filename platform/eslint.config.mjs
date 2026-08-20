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
