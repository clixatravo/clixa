"use client";

import React, { useState } from "react";
import { INDICATIFS_OFFERTS } from "@/lib/indicatifs";

/**
 * Le numéro WhatsApp : un pays qu'on choisit, un numéro qu'on tape.
 *
 * ── ⚠️ Ce qu'il remplace, et pourquoi ───────────────────────────────────────
 * Un champ unique, avec « +212 6 00 00 00 00 » en exemple et la consigne
 * d'écrire l'indicatif. La garde refuse sans lui, à raison : « 0689324243 »
 * est marocain pour qui le lit et injoignable pour qui appelle.
 *
 * Mais `inputMode="tel"` ouvre, sur beaucoup de téléphones Android, un pavé
 * numérique où le **`+` n'existe que sous une pression longue du zéro**. On
 * exigeait donc un caractère que le clavier ne propose pas. Un prospect venu
 * d'une annonce s'en est plaint le 5 septembre 2026 : « je voulais mettre mon
 * numéro, ça ne marche pas ». Il n'avait rien fait de travers.
 *
 * ⚠️ **La règle ne bouge pas, c'est la saisie qui change.** Le visiteur choisit
 * son pays et tape ce qu'il connaît par cœur ; le champ envoyé porte la forme
 * internationale complète. La faute devient impossible plutôt que rattrapée.
 *
 * ── ⚠️ Et une porte de sortie, pour les pays qu'on n'a pas listés ───────────
 * La liste en compte trente-neuf, choisis d'après la provenance des inscrits.
 * Elle sera toujours incomplète : quelqu'un écrira un jour depuis un pays qui
 * n'y figure pas, et une liste fermée le renverrait sans qu'il puisse rien y
 * faire. « Autre pays » ouvre un champ où il compose son indicatif lui-même.
 *
 * C'est la même règle que `lib/indicatifs.ts` applique déjà côté serveur : on
 * exige la forme, pas l'appartenance à la table. Refuser un pays qu'on n'a pas
 * listé écarterait un inscrit pour une lacune qui est la nôtre.
 *
 * ── Un seul champ part au serveur ───────────────────────────────────────────
 * Le `select` et les champs visibles ne portent pas de `name` : c'est un champ
 * caché, recomposé à chaque frappe, qui s'appelle `whatsapp`. Les routes ne
 * changent pas, `aUnIndicatif` non plus, et rien d'autre n'a eu à bouger.
 *
 * ⚠️ **Le zéro de tête est retiré.** « 06 12 34 56 78 » est la façon dont
 * chacun connaît son propre numéro, et « +212 06… » n'appelle personne. Le
 * corriger en silence vaut mieux que le refuser : la personne a écrit ce
 * qu'elle avait à écrire.
 */

/** La valeur du choix « je ne trouve pas mon pays ». */
const AUTRE = "autre";

export function ChampWhatsapp({
  id = "whatsapp",
  defautIndicatif = "212",
  requis = true,
  classeChamp,
}: {
  id?: string;
  defautIndicatif?: string;
  requis?: boolean;
  /** Les classes du champ texte, pour épouser le formulaire qui l'accueille. */
  classeChamp: string;
}) {
  const [choix, setChoix] = useState(defautIndicatif);
  const [saisi, setSaisi] = useState("");
  const [numero, setNumero] = useState("");

  const indicatif = choix === AUTRE ? saisi.replace(/\D/g, "") : choix;

  /*
    Ce qui part au serveur. On ne garde que les chiffres du numéro local, et
    l'on retire son zéro de tête : c'est la forme que `aUnIndicatif` attend, et
    celle qu'un lien `wa.me` sait composer.
  */
  const chiffres = numero.replace(/\D/g, "").replace(/^0+/, "");
  const complet = indicatif && chiffres ? `+${indicatif}${chiffres}` : "";

  return (
    <div className="flex flex-col gap-2">
      {/*
        ⚠️ **Une seule ligne, dans les deux états.** Le premier jet gardait le
        sélecteur affichant « Autre pays » et ajoutait le champ d'indicatif
        en dessous : deux cases pour une seule information, et celle qu'il
        fallait remplir n'était pas là où on la cherchait. Le champ prend donc
        la place du sélecteur, et un lien ramène à la liste.
      */}
      <div className="flex gap-2">
        {choix === AUTRE ? (
          /*
            ⚠️ **Le « + » est imprimé, pas à taper.** Sans lui, le champ est une
            case vide où le visiteur croit devoir écrire « +998 » — et c'est
            exactement le caractère que son clavier ne lui propose pas. On
            retomberait, un cran plus bas, sur le défaut qu'on vient de
            corriger. Il ne tape que des chiffres.

            ⚠️ Le décalage du texte est posé en style, pas en classe : la
            classe reçue porte déjà un `px-*`, et deux règles de padding se
            départagent par l'ordre d'émission de Tailwind — un ordre qu'on ne
            contrôle pas d'ici.
          */
          <div className="relative w-[9.5rem] shrink-0">
            <span
              aria-hidden="true"
              className="text-ivory-dim pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[0.95rem]"
            >
              +
            </span>
            <input
              aria-label="Indicatif de votre pays"
              type="tel"
              inputMode="numeric"
              required={requis}
              autoFocus
              value={saisi}
              onChange={(e) => setSaisi(e.target.value)}
              placeholder="indicatif"
              style={{ paddingLeft: "1.75rem" }}
              className={`${classeChamp} w-full`}
            />
          </div>
        ) : (
          <select
            aria-label="Indicatif du pays"
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
            className={`${classeChamp} w-[9.5rem] shrink-0`}
          >
            {INDICATIFS_OFFERTS.map(({ code, pays, drapeau }) => (
              <option key={code} value={code}>
                {drapeau ? `${drapeau} ` : ""}+{code} {pays}
              </option>
            ))}
            <option value={AUTRE}>🌍 Autre pays</option>
          </select>
        )}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={requis}
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="6 12 34 56 78"
          className={`${classeChamp} min-w-0 flex-1`}
        />
      </div>

      {/*
        Le chemin du retour. Sans lui, qui a choisi « Autre pays » par erreur
        n'a plus aucun moyen de revenir à la liste : le sélecteur a disparu.
      */}
      {choix === AUTRE && (
        <button
          type="button"
          onClick={() => {
            setChoix(defautIndicatif);
            setSaisi("");
          }}
          className="text-ivory-dim hover:text-gold self-start text-[0.78rem] underline underline-offset-2"
        >
          ← Choisir dans la liste des pays
        </button>
      )}

      <input type="hidden" name="whatsapp" value={complet} readOnly />
    </div>
  );
}
