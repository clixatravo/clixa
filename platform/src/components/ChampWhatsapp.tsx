"use client";

import React, { useState } from "react";
import { INDICATIFS_OFFERTS } from "@/lib/indicatifs";
import { composerNumero } from "@/lib/telephone";

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
 * qu'elle avait à écrire. La règle vit dans `lib/telephone.ts`, où elle
 * s'éprouve sans navigateur.
 *
 * ── ⚠️ Aucun pays n'est choisi d'avance, depuis le 6 septembre 2026 ─────────
 * Le champ s'ouvrait sur « +212 Maroc ». Sur les quatorze demandes de rappel
 * réelles reçues de la campagne, **trois venaient du Maroc** : les onze autres
 * de Guinée, du Togo, du Niger, du Bénin, du Cameroun, du Sénégal, du Gabon,
 * de Mauritanie. Un défaut juste pour un visiteur sur cinq est un piège pour
 * les quatre autres — et il ne se voit pas, puisqu'il *ressemble* à un choix.
 *
 * Il a mordu : une personne au Togo a laissé le sélecteur tranquille et son
 * numéro est parti en `+21298534397`, qui ne joint personne. Elle a recommencé
 * deux minutes plus tard, correctement. Elle a eu de la chance de s'en
 * apercevoir.
 *
 * La liste s'ouvre donc sur une invite, et le `required` du navigateur refuse
 * l'envoi tant que rien n'est choisi. Cela coûte un geste à tout le monde, y
 * compris aux Marocains ; cela évite un numéro faux et silencieux au reste.
 *
 * ── ⚠️ Et le numéro composé se relit à l'écran ──────────────────────────────
 * Deux cases qui n'en forment qu'une, et le résultat n'était montré nulle
 * part. C'est ainsi qu'un `+221` a pu être ajouté devant un numéro qui le
 * portait déjà — quinze chiffres, personne au bout. La ligne sous le champ dit
 * ce qui partira, et nomme ce qu'on a rattrapé quand on rattrape.
 */

/** La valeur du choix « je ne trouve pas mon pays ». */
const AUTRE = "autre";

export function ChampWhatsapp({
  id = "whatsapp",
  requis = true,
  classeChamp,
}: {
  id?: string;
  requis?: boolean;
  /** Les classes du champ texte, pour épouser le formulaire qui l'accueille. */
  classeChamp: string;
}) {
  const [choix, setChoix] = useState("");
  const [saisi, setSaisi] = useState("");
  const [numero, setNumero] = useState("");

  const indicatif = choix === AUTRE ? saisi.replace(/\D/g, "") : choix;

  /* Ce qui part au serveur, et ce qu'on en montre. Voir `lib/telephone.ts`. */
  const { complet, lisible, rattrape } = composerNumero(indicatif, numero);

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
            required={requis}
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
            className={`${classeChamp} w-[9.5rem] shrink-0`}
          >
            {/*
              ⚠️ Valeur vide et `required` : le navigateur refuse l'envoi tant
              que rien n'est choisi, et met la mise au point ici. Le `select` n'a
              pas de `name` — la validation n'en demande pas, elle porte sur le
              contrôle, pas sur ce qu'il enverrait.
            */}
            <option value="">Votre pays…</option>
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
            setChoix("");
            setSaisi("");
          }}
          className="text-ivory-dim hover:text-gold self-start text-[0.78rem] underline underline-offset-2"
        >
          ← Choisir dans la liste des pays
        </button>
      )}

      {/*
        ⚠️ **Le numéro composé se relit.** Deux cases qui n'en forment qu'une,
        et le résultat n'était montré nulle part : c'est ainsi qu'un indicatif
        a pu être ajouté devant un numéro qui le portait déjà. On dit aussi ce
        qu'on a rattrapé — corriger en silence prive la personne du seul moyen
        qu'elle a de voir qu'on l'a mal comprise.
      */}
      {lisible && (
        <p className="text-ivory-dim text-[0.78rem]" aria-live="polite">
          Nous vous joindrons au <strong className="text-ivory">{lisible}</strong>
          {rattrape === "indicatif-en-double" &&
            " — indicatif déjà présent, il n'a pas été doublé."}
          {rattrape === "numero-international" &&
            " — numéro international, tel que vous l'avez écrit."}
        </p>
      )}

      <input type="hidden" name="whatsapp" value={complet} readOnly />
    </div>
  );
}
