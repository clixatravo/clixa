"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * FE-13 / FE-14 — Navigation mobile.
 *
 * Sans ce composant, l'en-tête masquait les liens en dessous de 768 px et le
 * bouton burger n'ouvrait rien : la navigation était tout simplement impossible
 * sur téléphone, alors que c'est là que sera l'essentiel du trafic.
 *
 * Accessibilité : aria-expanded/aria-controls, fermeture à Échap, retour du
 * focus sur le bouton, et défilement du fond bloqué pendant l'ouverture.
 */
export function MobileMenu({ liens }: { liens: readonly { href: Route; label: string }[] }) {
  const [ouvert, setOuvert] = useState(false);
  const boutonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Toute navigation referme le menu.
  useEffect(() => setOuvert(false), [pathname]);

  useEffect(() => {
    if (!ouvert) return;

    const surEchap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOuvert(false);
        boutonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", surEchap);
    const overflowInitial = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", surEchap);
      document.body.style.overflow = overflowInitial;
    };
  }, [ouvert]);

  return (
    <>
      <button
        ref={boutonRef}
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-controls="menu-mobile"
        aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
        className="-mr-3 flex size-11 items-center justify-center md:hidden"
      >
        <span className="relative block h-4 w-[22px]" aria-hidden="true">
          <span
            className={`bg-ivory absolute left-0 block h-px w-full transition-all duration-300 ${
              ouvert ? "top-1/2 rotate-45" : "top-0"
            }`}
          />
          <span
            className={`bg-ivory absolute top-1/2 left-0 block h-px w-full transition-opacity duration-200 ${
              ouvert ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`bg-ivory absolute left-0 block h-px w-full transition-all duration-300 ${
              ouvert ? "top-1/2 -rotate-45" : "top-full"
            }`}
          />
        </span>
      </button>

      <div
        id="menu-mobile"
        hidden={!ouvert}
        className="bg-ink fixed inset-0 top-[73px] z-40 flex flex-col gap-2 overflow-y-auto px-8 py-10 md:hidden"
      >
        {liens.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="border-line font-display flex min-h-14 items-center border-b text-2xl"
          >
            {l.label}
          </Link>
        ))}

        <Link
          href="/contact"
          className="border-gold text-ivory rounded-clixa mt-6 flex min-h-14 items-center justify-center border px-6 text-base"
        >
          Nous contacter
        </Link>
      </div>
    </>
  );
}
