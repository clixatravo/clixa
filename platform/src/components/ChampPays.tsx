"use client";

import React, { useState } from "react";
import { MINIMUM_LETTRES, PAYS_OFFERTS, assainirPays } from "@/lib/pays";

const AUTRE = "autre";

export function ChampPays({
  id = "pays",
  requis = true,
  classeChamp,
  valeurParDefaut = "",
  label = "Pays",
}: {
  id?: string;
  requis?: boolean;
  classeChamp: string;
  valeurParDefaut?: string;
  label?: string;
}) {
  // Déterminer si la valeur initiale est dans la liste ou est "autre"
  const paysExistant = PAYS_OFFERTS.find(
    (p) => p.nom.toLowerCase() === (valeurParDefaut ?? "").trim().toLowerCase(),
  );

  const [choix, setChoix] = useState<string>(
    paysExistant ? paysExistant.nom : valeurParDefaut ? AUTRE : "",
  );
  const [autreSaisi, setAutreSaisi] = useState<string>(paysExistant ? "" : (valeurParDefaut ?? ""));
  const [erreur, setErreur] = useState<string>("");

  /*
    ⚠️ **Le même nettoyage qu'au serveur**, importé et non recopié. Une règle
    écrite deux fois finit par diverger — et ici elle divergeait déjà dans le
    mauvais sens : le premier jet retirait les chiffres côté navigateur et
    filtrait sur Latin-1, quand `assainirPays` accepte les lettres de toutes
    les écritures. Le navigateur aurait refusé « Česko » avant même que le
    serveur, plus permissif, ait eu son mot à dire.
  */
  const handleAutreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAutreSaisi(val);

    const propre = assainirPays(val);
    if (val.trim() && propre.length < MINIMUM_LETTRES) {
      setErreur(
        `Le nom du pays s'écrit en lettres — ${MINIMUM_LETTRES} au moins, et pas un numéro.`,
      );
    } else {
      setErreur("");
    }
  };

  const valeurFinale = choix === AUTRE ? assainirPays(autreSaisi) : choix;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="mono-label text-ivory-dim text-[0.7rem] tracking-wider">
        {label.toUpperCase()} {requis && <span className="text-gold">*</span>}
      </label>

      {choix === AUTRE ? (
        <div className="flex flex-col gap-1.5">
          <input
            id={id}
            type="text"
            required={requis}
            autoFocus
            value={autreSaisi}
            onChange={handleAutreChange}
            placeholder="Ex : Mauritanie, Madagascar, Gabon…"
            pattern="^[\p{L}\p{M}\s\-'.]{2,50}$"
            title="Le nom du pays s'écrit en lettres — les chiffres ne sont pas acceptés."
            className={`${classeChamp} ${erreur ? "border-amber-400 focus:border-amber-400" : ""}`}
          />
          {erreur && (
            <p className="text-[0.78rem] text-amber-400" role="alert">
              ⚠️ {erreur}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setChoix("");
              setAutreSaisi("");
              setErreur("");
            }}
            className="text-ivory-dim hover:text-gold self-start text-[0.78rem] underline underline-offset-2"
          >
            ← Choisir dans la liste des pays
          </button>
        </div>
      ) : (
        <select
          id={id}
          required={requis}
          value={choix}
          onChange={(e) => {
            const val = e.target.value;
            setChoix(val);
            if (val !== AUTRE) {
              setAutreSaisi("");
              setErreur("");
            }
          }}
          className={classeChamp}
        >
          <option value="">Sélectionnez votre pays…</option>
          {PAYS_OFFERTS.map(({ nom, drapeau }) => (
            <option key={nom} value={nom}>
              {drapeau ? `${drapeau} ` : ""}
              {nom}
            </option>
          ))}
          <option value={AUTRE}>🌍 Autre pays (préciser en toutes lettres)…</option>
        </select>
      )}

      {/*
        ⚠️ Un seul champ part au serveur, comme pour le numéro WhatsApp : le
        `select` et le champ libre ne portent pas de `name`. C'est ce champ
        caché qui s'appelle `pays`, recomposé à chaque frappe.
      */}
      <input type="hidden" name="pays" value={valeurFinale} readOnly />
    </div>
  );
}
