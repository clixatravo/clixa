import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

type Variante = "primaire" | "contour" | "fantome";

const variantes: Record<Variante, string> = {
  primaire:
    "bg-gold text-ink font-bold border border-gold px-6 py-3.5 text-center hover:bg-transparent hover:text-gold-bright transition-colors",
  contour:
    "border border-line-strong text-ivory px-5 py-3 text-center hover:border-gold transition-colors",
  fantome:
    "border-b border-ivory-dim text-ivory-dim py-3.5 hover:text-ivory hover:border-ivory transition-colors",
};

interface Props {
  href?: Route;
  variante?: Variante;
  className?: string;
  children: ReactNode;
}

export function Button({ href, variante = "primaire", className = "", children }: Props) {
  const classes = `inline-block rounded-clixa text-sm ${variantes[variante]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return <button className={classes}>{children}</button>;
}
