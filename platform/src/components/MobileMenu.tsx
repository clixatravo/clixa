"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ReseauxSociaux } from "@/components/ReseauxSociaux";

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

  /**
   * Toute navigation referme le menu — y compris via les boutons Précédent /
   * Suivant du navigateur, qui ne passent pas par un clic sur un lien.
   *
   * Comparaison pendant le rendu plutôt qu'un effet : c'est le motif recommandé
   * par React pour réinitialiser un état quand une valeur dérivée change, et il
   * évite un second rendu inutile.
   */
  const [cheminPrecedent, setCheminPrecedent] = useState(pathname);
  if (cheminPrecedent !== pathname) {
    setCheminPrecedent(pathname);
    setOuvert(false);
  }

  /**
   * Fermeture explicite au clic, en plus de l'effet ci-dessus.
   *
   * Cliquer la rubrique où l'on se trouve déjà ne change pas l'URL : l'effet ne
   * se déclenche pas, et le menu restait ouvert comme si le clic n'avait servi
   * à rien.
   */
  const fermer = () => setOuvert(false);

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
        className="-mr-2 flex min-h-11 items-center gap-2.5 px-2 lg:hidden"
      >
        {/* Le libellé est explicite : trois traits seuls ne se lisent pas comme
            un bouton pour une partie des visiteurs. */}
        <span className="mono-label text-ivory-dim">{ouvert ? "Fermer" : "Menu"}</span>
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
        /* Positionné sous l'en-tête via top-full, jamais par une hauteur écrite
           en dur : ajouter un libellé au bouton avait suffi à décaler l'en-tête
           de 73 à 85 px, et le panneau passait dessous. */
        className="border-line bg-ink absolute inset-x-0 top-full z-40 flex max-h-[calc(100dvh-5.5rem)] flex-col gap-2 overflow-y-auto border-t px-8 py-6 lg:hidden"
      >
        {/* « Accueil » ouvre la liste : le logo seul ne suffit pas à indiquer
            comment revenir à la page d'accueil. */}
        <LienMenu href="/" label="Accueil" actif={pathname === "/"} onNaviguer={fermer} />

        {liens.map((l) => (
          <LienMenu
            key={l.href}
            href={l.href}
            label={l.label}
            actif={pathname === l.href || pathname.startsWith(`${l.href}/`)}
            onNaviguer={fermer}
          />
        ))}

        {/*
          Les deux actions, sous les rubriques. « Mon espace » n'est pas une
          rubrique du site : le laisser dans la liste le noyait parmi les pages.
          Même hiérarchie que sur écran large — l'or pour l'appel principal, le
          contour pour le second.

          Chacune ne paraît que tant que l'en-tête ne la montre pas : `sm` pour
          « Mon espace », `md` pour « Nous contacter », les seuils mêmes de
          `SiteHeader`. Entre les deux, le menu ouvert répétait un bouton visible
          juste au-dessus de lui. Ces trois valeurs vont par paires — changer un
          seuil dans l'en-tête sans changer celui d'ici fait revenir le doublon.
        */}
        <Link
          href="/compte"
          onClick={fermer}
          className="border-line-strong bg-panel text-ivory rounded-clixa mt-6 flex min-h-14 items-center justify-center gap-2.5 border px-6 text-base sm:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="text-gold size-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <circle cx="8" cy="5" r="2.6" />
            <path d="M2.6 14c0-2.6 2.4-4.2 5.4-4.2s5.4 1.6 5.4 4.2" strokeLinecap="round" />
          </svg>
          Mon espace
        </Link>

        <Link
          href="/contact"
          onClick={fermer}
          className="border-gold text-ivory rounded-clixa mt-3 flex min-h-14 items-center justify-center border px-6 text-base sm:mt-6 md:hidden"
        >
          Nous contacter
        </Link>

        {/* Canaux officiels & Réseaux Sociaux (purs logos cliquables) */}
        <div className="mt-8 border-t border-white/[0.08] pt-6">
          <span className="mono-label text-gold mb-3 block text-xs tracking-wider">
            Réseaux officiels
          </span>
          <ReseauxSociaux taille="large" className="gap-3" />
        </div>
      </div>
    </>
  );
}

/**
 * Un lien du menu mobile.
 *
 * La rubrique courante est signalée par un trait or et un libellé en pleine
 * couleur — même repère que sur écran large, pour que le visiteur sache où il
 * se trouve avant de choisir où aller.
 */
function LienMenu({
  href,
  label,
  actif,
  onNaviguer,
}: {
  href: Route;
  label: string;
  actif: boolean;
  onNaviguer: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNaviguer}
      aria-current={actif ? "page" : undefined}
      className={`border-line font-display flex min-h-14 items-center gap-3 border-b text-2xl transition-colors ${
        actif ? "text-ivory" : "text-ivory-dim"
      }`}
    >
      <span
        aria-hidden="true"
        className={`bg-gold block h-px transition-all duration-300 ${actif ? "w-6" : "w-0"}`}
      />
      {label}
    </Link>
  );
}
