"use client";

import React, { useState } from "react";
import { INDICATIFS_OFFERTS } from "@/lib/indicatifs";

/**
 * Liste ordonnée des pays courants avec leur drapeau.
 */
export const LISTE_PAYS = [
  // Priorité Afrique de l'Ouest, Centrale & Nord (principale provenance)
  ...INDICATIFS_OFFERTS.map((item) => ({
    nom: item.pays,
    drapeau: item.drapeau,
  })),
  // Ajouts supplémentaires fréquents
  { nom: "Madagascar", drapeau: "🇲🇬" },
  { nom: "Rwanda", drapeau: "🇷🇼" },
  { nom: "Burundi", drapeau: "🇧🇮" },
  { nom: "Comores", drapeau: "🇰🇲" },
  { nom: "Djibouti", drapeau: "🇩🇯" },
  { nom: "Guinée équatoriale", drapeau: "🇬🇶" },
  { nom: "Haïti", drapeau: "🇭🇹" },
  { nom: "Luxembourg", drapeau: "🇱🇺" },
].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

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
  const paysExistant = LISTE_PAYS.find(
    (p) => p.nom.toLowerCase() === (valeurParDefaut ?? "").trim().toLowerCase(),
  );

  const [choix, setChoix] = useState<string>(
    paysExistant ? paysExistant.nom : valeurParDefaut ? AUTRE : "",
  );
  const [autreSaisi, setAutreSaisi] = useState<string>(paysExistant ? "" : (valeurParDefaut ?? ""));
  const [erreur, setErreur] = useState<string>("");

  const handleAutreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAutreSaisi(val);

    // Vérification stricte : le pays ne doit pas être un numéro ou contenir que des chiffres
    if (val.trim() && /^\d+$/.test(val.trim())) {
      setErreur("Le nom du pays doit être écrit en lettres, pas en chiffres.");
    } else if (val.trim() && val.trim().length < 2) {
      setErreur("Le nom du pays doit comporter au moins 2 lettres.");
    } else {
      setErreur("");
    }
  };

  const valeurFinale =
    choix === AUTRE
      ? autreSaisi.replace(/[0-9]/g, "").trim() // Nettoyage automatique des chiffres
      : choix;

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
            pattern="^[A-Za-zÀ-ÿ\s\-\'.]{2,50}$"
            title="Veuillez renseigner le nom de votre pays en lettres (les chiffres ne sont pas autorisés)."
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
          {LISTE_PAYS.map(({ nom, drapeau }) => (
            <option key={nom} value={nom}>
              {drapeau ? `${drapeau} ` : ""}
              {nom}
            </option>
          ))}
          <option value={AUTRE}>🌍 Autre pays (préciser en toutes lettres)…</option>
        </select>
      )}

      {/* Champ caché pour la soumission propre du formulaire */}
      <input type="hidden" name="pays" value={valeurFinale} readOnly />
    </div>
  );
}
