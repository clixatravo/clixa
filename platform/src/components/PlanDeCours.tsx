"use client";

import { useState } from "react";
import type { Module } from "@/lib/types";
import { dureeModule, formatDuree } from "@/lib/format";

/**
 * FE-06 — Plan de cours en modules et leçons.
 *
 * Décision A (e-learning non visé cette année) : on n'affiche que le titre et la
 * durée de chaque leçon. La structure Module → Leçon existe bien en base — c'est
 * elle qui rendra l'ajout du LMS trivial — mais on ne demande pas d'objectifs
 * leçon par leçon à l'équipe pédagogique.
 */
export function PlanDeCours({ modules }: { modules: Module[] }) {
  const [ouverts, setOuverts] = useState<Set<string>>(new Set(modules[0] ? [modules[0].id] : []));

  const basculer = (id: string) =>
    setOuverts((prec) => {
      const suiv = new Set(prec);
      if (suiv.has(id)) suiv.delete(id);
      else suiv.add(id);
      return suiv;
    });

  return (
    <div>
      {modules.map((m, i) => {
        const ouvert = ouverts.has(m.id);
        return (
          <div key={m.id} className="border-line -mb-px border">
            <button
              onClick={() => basculer(m.id)}
              aria-expanded={ouvert}
              aria-controls={`mod-${m.id}`}
              className="bg-panel flex w-full items-center gap-4 p-5 text-left"
            >
              <span className="text-gold shrink-0 font-mono text-[0.62rem] tracking-[0.1em]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display flex-1 text-base">{m.titre}</span>
              <span className="text-ivory-dim shrink-0 font-mono text-[0.68rem]">
                {Math.round(dureeModule(m.lecons) / 60)} h
              </span>
              <span
                className={`text-gold shrink-0 text-xl transition-transform ${ouvert ? "rotate-45" : ""}`}
                aria-hidden="true"
              >
                +
              </span>
            </button>

            {ouvert && (
              <div id={`mod-${m.id}`} className="bg-ink px-5 pt-1.5 pb-4">
                {m.objectif && (
                  <p className="text-ivory-dim border-line border-b py-2.5 text-sm italic">
                    {m.objectif}
                  </p>
                )}
                {m.lecons.map((l) => (
                  <div
                    key={l.id}
                    className="border-line text-ivory-dim flex justify-between gap-4 border-b py-2.5 text-sm last:border-b-0"
                  >
                    <span>{l.titre}</span>
                    <span className="shrink-0 font-mono text-[0.72rem] tabular-nums">
                      {formatDuree(l.dureeMinutes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
