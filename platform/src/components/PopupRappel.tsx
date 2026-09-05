"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  consentementAuServeur,
  lireConsentement,
  MESURE_ACTIVE,
  souscrireConsentement,
} from "@/lib/consentement";
import { pageAcceptelaProposition, peutProposer, retenirReponse } from "@/lib/rappel-propose";
import { compterLead } from "@/components/SignalerLead";
import { ChampWhatsapp } from "@/components/ChampWhatsapp";

/**
 * La proposition de rappel, pour le visiteur qui allait repartir sans rien dire.
 *
 * ── Pourquoi elle existe ────────────────────────────────────────────────────
 * Le trafic acheté sur Facebook arrive sur une fiche, lit, et repart. Sans un
 * moyen de laisser un numéro au passage, il ne reste rien de la visite — ni
 * pour l'équipe, ni pour mesurer ce que la campagne a rapporté.
 *
 * ── ⚠️ Ce qui la sépare de la fenêtre qu'on déteste ─────────────────────────
 * Elle ne s'ouvre pas à l'arrivée. Une fenêtre posée sur la page avant même
 * qu'on ait lu une ligne demande quelque chose à quelqu'un qui ne sait pas
 * encore ce qu'on vend — et c'est ce qui a donné leur réputation à ces
 * fenêtres-là. Celle-ci attend un signe d'intérêt : **vingt-cinq secondes de
 * lecture, ou la moitié de la page parcourue**, le premier des deux.
 *
 * Elle ne s'ouvre pas non plus sur les pages où l'on est déjà en train de
 * convertir — inscription, contact, espace participant. Proposer « laissez vos
 * coordonnées » à quelqu'un qui remplit le formulaire d'inscription est un
 * obstacle posé devant ce qu'on cherche. Voir `lib/rappel-propose.ts`.
 *
 * Et elle ne se rouvre pas : envoyée, plus jamais ; fermée, pas avant un mois.
 *
 * ── Une seule question à la fois ────────────────────────────────────────────
 * ⚠️ Si le bandeau de mesure attend encore une réponse, celle-ci se tait. Deux
 * fenêtres qui demandent deux choses en même temps, en bas du même écran, se
 * chevauchent et se font refuser ensemble.
 */

const SECONDES_AVANT = 25;
const PART_DE_PAGE = 0.5;

export function PopupRappel() {
  const chemin = usePathname();
  const [ouverte, setOuverte] = useState(false);
  const [etat, setEtat] = useState<"formulaire" | "envoye" | "erreur">("formulaire");
  const [message, setMessage] = useState("");
  const formulaire = useRef<HTMLFormElement>(null);
  const premierChamp = useRef<HTMLInputElement>(null);

  const fermer = useCallback(() => {
    setOuverte(false);
    retenirReponse("ferme");
  }, []);

  /*
    ⚠️ **Relu à chaque réponse du bandeau, et pas une seule fois au montage.**
    L'effet ne dépendait que du chemin : quelqu'un qui répondait au bandeau
    puis restait sur la page ne voyait **jamais** la proposition — l'effet
    avait déjà renoncé, et rien ne le rappelait. C'est-à-dire précisément le
    visiteur venu d'une annonce, qui atterrit sur une fiche et n'en bouge pas.
    Trouvé par l'épreuve, le jour où le bandeau s'est mis à paraître.
  */
  const reponse = useSyncExternalStore(
    souscrireConsentement,
    lireConsentement,
    consentementAuServeur,
  );

  useEffect(() => {
    if (!pageAcceptelaProposition(chemin) || !peutProposer()) return;

    /*
      ⚠️ La mesure d'audience passe avant : tant que son bandeau attend une
      réponse, on ne pose pas une seconde question par-dessus.
    */
    if (MESURE_ACTIVE && reponse === undefined) return;

    let fait = false;
    const ouvrir = () => {
      if (fait) return;
      fait = true;
      setOuverte(true);
    };

    const minuteur = window.setTimeout(ouvrir, SECONDES_AVANT * 1000);
    const auDefilement = () => {
      const hauteur = document.body.scrollHeight - window.innerHeight;
      if (hauteur > 0 && window.scrollY / hauteur >= PART_DE_PAGE) ouvrir();
    };
    window.addEventListener("scroll", auDefilement, { passive: true });

    return () => {
      window.clearTimeout(minuteur);
      window.removeEventListener("scroll", auDefilement);
    };
  }, [chemin, reponse]);

  // Échap ferme, et le premier champ prend le clavier à l'ouverture.
  useEffect(() => {
    if (!ouverte) return;
    premierChamp.current?.focus();
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [ouverte, fermer]);

  if (!ouverte) return null;

  /*
    ── L'envoi passe par la même route que la page de contact ────────────────
    Pas de seconde porte, pas de seconde collection : la demande arrive dans
    /admin exactement comme celles du formulaire, l'équipe la voit dans le même
    bandeau, et le courriel part comme d'habitude. `origine` retient d'où elle
    vient — c'est ce qui dira si la campagne a rapporté.

    ⚠️ `redirect: "manual"` : la route répond par une redirection, et c'est son
    adresse qui porte le résultat. Sans cela le navigateur la suivrait, on
    récupérerait la page de contact entière, et on ne saurait pas quoi en
    faire depuis une fenêtre posée sur une autre page.
  */
  const envoyer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      const reponse = await fetch("/api/demande-rappel", {
        method: "POST",
        body: new FormData(form),
        redirect: "manual",
      });
      const ou = reponse.headers.get("location") ?? "";
      if (ou.includes("envoye=1") || reponse.type === "opaqueredirect") {
        retenirReponse("envoye");
        /*
          La même conversion que sur la page de contact, et la même clef :
          c'est le même geste, fait d'un autre endroit. Cette fenêtre n'a pas
          d'écran de confirmation à elle — elle répond sur place — d'où
          l'appel direct plutôt qu'un composant monté sur une page.
        */
        compterLead("rappel", "demande-de-rappel");
        setEtat("envoye");
        return;
      }
      setMessage(
        ou.includes("erreur=indicatif")
          ? "Votre numéro doit commencer par l'indicatif de votre pays — +212, +225, +221…"
          : ou.includes("erreur=consentement")
            ? "Il manque votre accord pour que nous conservions vos coordonnées."
            : "Il manque une information. Vérifiez les champs.",
      );
      setEtat("erreur");
    } catch {
      /*
        Réseau coupé, requête bloquée : on laisse le navigateur poster le
        formulaire lui-même. Il atterrira sur /contact?envoye=1, ce qui est
        moins élégant et parfaitement suffisant — mieux vaut une page de
        confirmation qu'une demande perdue.
      */
      form.submit();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rappel-titre"
      className="border-gold bg-panel fixed right-3 bottom-3 left-3 z-40 border p-6 shadow-2xl sm:left-auto sm:max-w-[400px]"
    >
      <button
        type="button"
        onClick={fermer}
        aria-label="Fermer"
        className="text-ivory-dim hover:text-ivory absolute top-3 right-3 cursor-pointer text-lg leading-none"
      >
        ×
      </button>

      {etat === "envoye" ? (
        <>
          <p id="rappel-titre" className="font-display text-ivory mb-2 text-[1.1rem]">
            C&apos;est noté.
          </p>
          <p className="text-ivory-dim text-[0.88rem] leading-relaxed">
            Un conseiller vous rappelle sous 24 h ouvrées, sur le numéro que vous venez de laisser.
          </p>
        </>
      ) : (
        <>
          <p className="mono-label text-gold mb-2 text-[0.62rem]">Être rappelé</p>
          <p id="rappel-titre" className="font-display text-ivory mb-1 text-[1.1rem]">
            Une question avant de vous décider ?
          </p>
          <p className="text-ivory-dim mb-4 text-[0.85rem] leading-relaxed">
            Laissez votre numéro : un conseiller vous rappelle sous 24 h ouvrées pour le programme,
            les dates et le financement.
          </p>

          {etat === "erreur" && (
            <p role="status" className="border-gold text-ivory mb-3 border-l-2 pl-3 text-[0.82rem]">
              {message}
            </p>
          )}

          <form
            ref={formulaire}
            action="/api/demande-rappel"
            method="POST"
            onSubmit={envoyer}
            className="flex flex-col gap-3"
          >
            <input type="hidden" name="origine" value={chemin} />
            {/* Champ leurre, comme sur la page de contact : invisible, rempli par les robots. */}
            <input
              type="text"
              name="site_web"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px]"
            />

            <input
              ref={premierChamp}
              name="nom"
              required
              autoComplete="name"
              placeholder="Nom complet"
              className="border-line bg-ink rounded-clixa text-ivory focus:border-gold w-full border px-3.5 py-2.5 text-[0.9rem]"
            />
            <ChampWhatsapp
              id="rappel-whatsapp"
              classeChamp="border-line bg-ink rounded-clixa text-ivory focus:border-gold border px-3.5 py-2.5 text-[0.9rem]"
            />

            <label className="text-ivory-dim flex cursor-pointer items-start gap-2.5 text-[0.78rem] leading-relaxed">
              <input
                type="checkbox"
                name="consentement"
                value="oui"
                required
                className="accent-gold mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer"
              />
              <span>
                J&apos;accepte que CLIXA conserve ces informations pour me recontacter. Elles ne
                sont transmises à personne.
              </span>
            </label>

            <button
              type="submit"
              className="bg-gold text-ink rounded-clixa hover:bg-gold-bright min-h-11 w-full px-5 text-[0.88rem] font-semibold transition-colors"
            >
              Être rappelé
            </button>
          </form>
        </>
      )}
    </div>
  );
}
