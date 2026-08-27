"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * L'entrée en scène : le site se pose devant le visiteur au lieu d'être déjà là.
 *
 * Repris du site statique, qui montait chaque bloc de 24 px en fondu quand il
 * entrait dans l'écran. Deux différences, tirées de ce qui manquait là-bas :
 *
 * ── Rien n'est caché tant que le script n'a pas pris la main ────────────────
 * La classe `apparitions` est posée par ce composant, et c'est elle seule qui
 * déclenche l'état masqué. Un script bloqué, une erreur d'hydratation, un
 * navigateur qui refuse le JavaScript : la page reste lisible, simplement sans
 * l'effet. L'original mettait `opacity:0` dans la feuille de style — le jour où
 * son script échoue, il ne reste rien à lire.
 *
 * ── L'effet se rejoue à chaque page, avant que le navigateur ne peigne ─────
 * `useLayoutEffect` et non `useEffect` : le second s'exécute *après* le rendu.
 * En navigation interne, la page suivante serait donc apparue en entier, puis
 * se serait effacée pour remonter — un clignotement à chaque lien, qui donne au
 * site l'air plus lent qu'il n'est. Masquer avant la peinture supprime cet
 * aller-retour : le visiteur ne voit que l'arrivée.
 *
 * ── Ce qui est déjà à l'écran monte tout de suite, en cascade ───────────────
 * Un observateur ne sert qu'à ce qui arrive par le défilement. Le premier écran
 * est déjà là : ses blocs s'échelonnent de 90 ms pour que le regard suive une
 * arrivée, plutôt que d'assister à quatre apparitions simultanées.
 *
 * Le mouvement réduit est déjà neutralisé globalement (`globals.css`) : la
 * transition tombe à 0,001 ms et l'élément paraît sans bouger. Rien à faire de
 * plus ici — mais il fallait le vérifier, une opacité nulle rendue permanente
 * par une transition annulée aurait effacé la page pour qui demande le calme.
 */

const CIBLES = "main section";
const ECHELON = 90;

/*
  `useLayoutEffect` avertit lorsqu'il est évalué au rendu serveur, où la
  disposition n'existe pas. Ce composant ne rend rien et n'agit qu'au
  navigateur ; on prend l'un ou l'autre selon l'endroit où l'on tourne.
*/
const surLaMiseEnPage = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function Apparitions() {
  const chemin = usePathname();

  surLaMiseEnPage(() => {
    const racine = document.documentElement;
    const sections = [...document.querySelectorAll<HTMLElement>(CIBLES)].filter(
      (s) => !s.hasAttribute("data-sans-apparition"),
    );
    if (sections.length === 0) return;

    racine.classList.add("apparitions");
    // En attente : masqué, sans animation. Le tour venu, l'attribut change et
    // l'animation part de sa première image.
    sections.forEach((s) => s.setAttribute("data-attente", ""));

    /*
      Le premier écran ne passe pas par l'observateur : il est déjà visible, et
      l'observateur le déclarerait « entré » toutes sections confondues, dans le
      même millième de seconde.
    */
    const dejaVisibles = sections.filter((s) => s.getBoundingClientRect().top < window.innerHeight);

    /*
      La première section monte par morceaux, pas d'un bloc.

      Animée entière, elle arrive comme une image qui glisse — correct, mais
      c'est encore un décor. Échelonner ce qu'elle contient donne à l'arrivée un
      sens de lecture : la mention, puis le titre, puis la promesse, puis le
      bouton. C'est ce que le visiteur parcourt de toute façon ; l'animation ne
      fait que suivre son regard au lieu de le devancer.
    */
    const premiere = dejaVisibles[0];
    const morceaux = premiere ? enfantsSignifiants(premiere) : [];

    if (morceaux.length > 1) {
      premiere!.removeAttribute("data-attente");
      morceaux.forEach((m, i) => {
        m.setAttribute("data-attente", "");
        m.style.setProperty("--delai", `${i * ECHELON}ms`);
      });
    }

    const aLever = [...morceaux, ...dejaVisibles.filter((s) => s !== premiere)];
    dejaVisibles
      .filter((s) => s !== premiere)
      .forEach((s, i) => s.style.setProperty("--delai", `${(morceaux.length + i) * ECHELON}ms`));

    aLever.forEach(lever);

    const aObserver = sections.filter((s) => !dejaVisibles.includes(s));
    if (aObserver.length === 0) return;

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (!e.isIntersecting) continue;
          lever(e.target as HTMLElement);
          observateur.unobserve(e.target);
        }
      },
      // 12 % : assez pour que le bloc soit franchement engagé dans l'écran, pas
      // assez pour qu'on l'ait lu avant qu'il paraisse.
      { threshold: 0.12 },
    );

    aObserver.forEach((s) => observateur.observe(s));
    return () => observateur.disconnect();
    // Rejoué à chaque page : la navigation interne remplace le contenu de
    // `main` sans remonter ce composant.
  }, [chemin]);

  return null;
}

/**
 * Faire paraître : l'attente cède la place à l'animation.
 *
 * Le changement d'attribut suffit — l'animation démarre d'elle-même, à sa
 * première image, sans dépendre de ce que le navigateur avait retenu avant.
 */
function lever(element: HTMLElement): void {
  element.removeAttribute("data-attente");
  element.setAttribute("data-apparait", "");
}

/**
 * Les blocs qu'un lecteur distingue dans une section.
 *
 * Une section est presque toujours enveloppée de conteneurs de mise en page —
 * une largeur maximale, un centrage, une colonne. Les animer un par un ferait
 * cascader des boîtes vides. On descend donc tant qu'un niveau n'a qu'un seul
 * enfant : le premier niveau qui en compte plusieurs est celui que le visiteur
 * lit comme une suite.
 *
 * Les éléments purement décoratifs sont laissés en place : une lueur d'ambiance
 * qui monte de 24 px se remarque, et elle n'a rien à raconter.
 */
function enfantsSignifiants(section: HTMLElement): HTMLElement[] {
  let niveau: HTMLElement = section;

  // Six niveaux : le premier écran empile largeur maximale, centrage, colonne
  // et parfois un groupe de plus avant d'arriver au texte. Quatre s'arrêtaient
  // au milieu des conteneurs, et la cascade ne se déclenchait pas.
  for (let profondeur = 0; profondeur < 6; profondeur += 1) {
    const enfants = [...niveau.children].filter(
      (e): e is HTMLElement => e instanceof HTMLElement && e.getAttribute("aria-hidden") !== "true",
    );
    if (enfants.length === 0) return [];
    if (enfants.length > 1) return enfants;
    niveau = enfants[0]!;
  }

  return [];
}
