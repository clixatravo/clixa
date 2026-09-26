import type { Logo } from "@/lib/logos";

/**
 * Un logo de `lib/logos.ts`, en SVG. Décoratif : l'intitulé est toujours écrit
 * à côté, si bien que le logo n'a pas à être lu par un lecteur d'écran.
 */
export function LogoSvg({ logo, className = "size-4" }: { logo: Logo; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      {...(logo.trace
        ? {
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 1.8,
            strokeLinecap: "round" as const,
            strokeLinejoin: "round" as const,
          }
        : { fill: "currentColor" })}
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      <path d={logo.chemin} />
    </svg>
  );
}
