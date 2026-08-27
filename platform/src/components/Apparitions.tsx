"use client";

import { useEffect } from "react";

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

export function Apparitions() {
  useEffect(() => {
    const racine = document.documentElement;
    const sections = [...document.querySelectorAll<HTMLElement>(CIBLES)].filter(
      (s) => !s.hasAttribute("data-sans-apparition"),
    );
    if (sections.length === 0) return;

    racine.classList.add("apparitions");
    sections.forEach((s) => s.setAttribute("data-apparait", ""));

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
      premiere!.removeAttribute("data-apparait");
      morceaux.forEach((m, i) => {
        m.setAttribute("data-apparait", "");
        m.style.setProperty("--delai", `${i * ECHELON}ms`);
      });
    }

    const aLever = [...morceaux, ...dejaVisibles.filter((s) => s !== premiere)];
    dejaVisibles
      .filter((s) => s !== premiere)
      .forEach((s, i) => s.style.setProperty("--delai", `${(morceaux.length + i) * ECHELON}ms`));

    // Deux images successives avant de lever le voile : la première applique
    // l'état masqué, la seconde le transition. Sans cela le navigateur regroupe
    // les deux et rien ne bouge.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => aLever.forEach((e) => e.classList.add("est-la")));
    });

    const aObserver = sections.filter((s) => !dejaVisibles.includes(s));
    if (aObserver.length === 0) return;

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("est-la");
          observateur.unobserve(e.target);
        }
      },
      // 12 % : assez pour que le bloc soit franchement engagé dans l'écran, pas
      // assez pour qu'on l'ait lu avant qu'il paraisse.
      { threshold: 0.12 },
    );

    aObserver.forEach((s) => observateur.observe(s));
    return () => observateur.disconnect();
  }, []);

  return null;
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
