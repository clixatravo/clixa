import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

type Variante = "primaire" | "contour" | "fantome";

const variantes: Record<Variante, string> = {
  primaire:
    "shimmer-gold bg-gradient-to-r from-gold-bright via-gold to-gold-bright text-ink font-bold border border-gold px-6 py-3.5 text-center shadow-[0_4px_18px_-4px_rgba(201,162,76,0.3)] hover:shadow-[0_6px_24px_-2px_rgba(201,162,76,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all",
  contour:
    "border border-line-strong bg-panel/50 backdrop-blur-sm text-ivory px-5 py-3 text-center hover:border-gold hover:bg-panel hover:text-gold-bright transition-all",
  fantome:
    "border-b border-ivory-dim text-ivory-dim py-3.5 hover:text-ivory hover:border-gold transition-colors inline-flex items-center gap-1.5",
};

interface Props {
  href?: Route;
  variante?: Variante;
  className?: string;
  children: ReactNode;
}

export function Button({ href, variante = "primaire", className = "", children }: Props) {
  const classes = `inline-flex items-center justify-center rounded-clixa text-sm tracking-wide ${variantes[variante]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return <button className={classes}>{children}</button>;
}
