"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Le bouton d'envoi d'un formulaire, qui ne part qu'une fois.
 *
 * ── ⚠️ Pourquoi il existe : quarante-et-une annulations ────────────────────
 * Mesuré sur la production le 24 septembre 2026, à la demande de la direction
 * qui ne comprenait pas pourquoi des dossiers passaient « annulée » tout
 * seuls. Sur **quarante-et-un dossiers annulés**, presque tous portaient une
 * autre inscription de la **même adresse, créée à la même seconde**. Un
 * participant en avait **sept**.
 *
 * Le formulaire de pré-inscription est un formulaire HTML natif : il poste et
 * la page attend. Pendant cet aller-retour — une à deux secondes sur un
 * mobile africain — **rien ne bouge à l'écran**. Alors on reclique. Et chaque
 * clic crée une inscription, qui retient une place.
 *
 * Le système faisait déjà ce qu'il fallait : la réconciliation garde le
 * dossier au plus petit identifiant et **annule les autres**, avant qu'aucun
 * courriel ne parte (voir `api/inscription`). Le décompte de places n'a donc
 * jamais menti. Mais l'équipe voyait des « annulée » sans savoir d'où ils
 * venaient, et le participant recevait une référence pour un dossier annulé.
 *
 * ── ⚠️ Ce qu'il ne fait pas, et pourquoi ───────────────────────────────────
 * **Il ne remplace pas la réconciliation.** Deux personnes sur deux appareils,
 * un onglet resté ouvert, un navigateur sans JavaScript : la course reste
 * possible, et c'est le serveur qui doit trancher. Ce bouton retire la cause
 * la plus fréquente ; il ne referme pas la porte.
 *
 * **Il ne désactive rien avant que l'envoi soit parti.** Un `disabled` posé
 * dans `onClick` annule la soumission dans certains navigateurs — le clic ne
 * fait alors plus rien du tout, ce qui est pire. On écoute donc l'événement
 * `submit` du formulaire : quand il se déclenche, la soumission native est
 * déjà lancée et rien ne peut plus l'arrêter.
 *
 * ── ⚠️ Aucune épreuve Playwright ne le couvre, et ce n'est pas un oubli ────
 * Une première épreuve cliquait trois fois et comptait les lignes en base :
 * **verte avec la garde retirée**. Sur un formulaire natif, le premier clic
 * lance la navigation et les suivants tombent dans une page qui part déjà —
 * le défaut de production ne se reproduisait jamais. Retarder la réponse
 * (`page.route`) pour reproduire la lenteur ne marche pas davantage :
 * Playwright **détruit le contexte d'exécution** dès la soumission, et
 * « Execution context was destroyed » tombe avant toute lecture du bouton.
 * L'outil ne peut pas observer ce qui se passe entre le clic et la réponse.
 *
 * **La garde a donc été mesurée dans un vrai navigateur**, le 24 septembre
 * 2026, sur le formulaire réel : avant le clic « Envoyer ma pré-inscription »
 * et actif ; **60 ms après, désactivé et « Enregistrement… »** ; toujours ainsi
 * à 460 ms, jusqu'à la redirection. Un bouton désactivé ne reçoit plus de
 * clic : le second envoi est fermé.
 *
 * ⚠️ **Le revers, écrit pour qu'on le sache** : rien ne passera au rouge si
 * quelqu'un retire cette garde. C'est la réconciliation d'`api/inscription`
 * qui reste éprouvée, et c'est elle qui protège la place — celle-ci ne fait
 * qu'épargner au participant un dossier annulé et une référence pour rien.
 *
 * **Sans JavaScript, le formulaire marche comme avant.** Le bouton se rend
 * côté serveur, il est cliquable, et il poste. Il perd seulement sa garde.
 */
export function BoutonEnvoi({
  libelle,
  pendant = "Envoi en cours…",
  className,
}: {
  libelle: string;
  /** Ce qui s'affiche pendant l'aller-retour. Dire « en cours » vaut mieux que se taire. */
  pendant?: string;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [envoi, setEnvoi] = useState(false);
  /*
    ⚠️ **Une référence, pas l'état** — et ce n'est pas un doublon. `disabled`
    n'est posé qu'au re-rendu, et React groupe les mises à jour : deux clics à
    quelques millisecondes lisent tous deux `envoi === false` dans leur
    fermeture, et le second passe. La référence, elle, est à jour dès
    l'affectation.

    Le premier jet lisait `envoi` ici et prétendait en commentaire fermer ce
    cas. Il ne le fermait pas.
  */
  const parti = useRef(false);

  useEffect(() => {
    const formulaire = ref.current?.form;
    if (!formulaire) return;

    const partir = () => {
      parti.current = true;
      setEnvoi(true);
    };
    formulaire.addEventListener("submit", partir);

    /*
      ⚠️ **Le retour arrière du navigateur ressert la page telle quelle.**
      Firefox et Safari gardent la page en cache (bfcache) : quelqu'un qui
      revient en arrière retrouverait un bouton grisé et un formulaire qu'il
      ne peut plus envoyer — c'est-à-dire un site cassé, pour quelqu'un qui
      voulait justement corriger une faute de frappe.
    */
    const revenu = (e: PageTransitionEvent) => {
      if (e.persisted) {
        parti.current = false;
        setEnvoi(false);
      }
    };
    window.addEventListener("pageshow", revenu);

    return () => {
      formulaire.removeEventListener("submit", partir);
      window.removeEventListener("pageshow", revenu);
    };
  }, []);

  return (
    <button
      ref={ref}
      type="submit"
      disabled={envoi}
      aria-busy={envoi}
      className={className}
      onClick={(e) => {
        if (parti.current) e.preventDefault();
      }}
    >
      {envoi ? pendant : libelle}
    </button>
  );
}
