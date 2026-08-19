import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * SOC-04 — Règles de qualité.
 *
 * Au-delà des règles Next.js, deux garde-fous propres au projet :
 * l'étanchéité de la couche d'accès aux données, et l'interdiction du `any`.
 */
const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
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
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
];

export default config;
