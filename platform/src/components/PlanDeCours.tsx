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
    <div className="space-y-3">
      {modules.map((m, i) => {
        const ouvert = ouverts.has(m.id);
        return (
          <div
            key={m.id}
            className={`rounded-clixa border transition-all ${
              ouvert
                ? "border-gold/40 bg-panel/80 shadow-md"
                : "border-line/70 bg-panel/50 hover:border-line-strong"
            }`}
          >
            <button
              onClick={() => basculer(m.id)}
              aria-expanded={ouvert}
              aria-controls={`mod-${m.id}`}
              className="flex w-full items-center gap-4 p-5 text-left transition-colors"
            >
              <span className="border-gold/30 bg-gold/10 text-gold rounded-clixa flex size-7 shrink-0 items-center justify-center border font-mono text-[0.68rem] font-bold">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-ivory flex-1 text-[1.05rem] font-semibold">
                {m.titre}
              </span>
              <span className="border-line bg-ink/60 text-ivory-dim/90 rounded-clixa shrink-0 border px-2.5 py-1 font-mono text-[0.68rem]">
                {Math.round(dureeModule(m.lecons) / 60)} h
              </span>
              <span
                className={`text-gold shrink-0 text-lg transition-transform duration-200 ${ouvert ? "rotate-45" : ""}`}
                aria-hidden="true"
              >
                +
              </span>
            </button>

            {ouvert && (
              <div id={`mod-${m.id}`} className="border-line/40 bg-ink/50 border-t px-6 pt-3 pb-5">
                {m.objectif && (
                  <p className="text-ivory-dim/90 border-line/50 border-b py-3 text-sm italic">
                    {m.objectif}
                  </p>
                )}
                {m.livrables && (
                  <p className="text-gold-bright border-line/50 border-b py-2.5 font-mono text-[0.78rem]">
                    ✦ Livrables : {m.livrables}
                  </p>
                )}
                <div className="space-y-2 pt-2">
                  {m.lecons.map((l) => (
                    <div
                      key={l.id}
                      className="border-line/30 text-ivory-dim/90 flex items-center justify-between gap-4 border-b py-2 text-sm last:border-b-0"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="bg-gold/50 size-1.5 rounded-full" />
                        <span>{l.titre}</span>
                      </span>
                      <span className="text-ivory-dim/70 shrink-0 font-mono text-[0.72rem] tabular-nums">
                        {formatDuree(l.dureeMinutes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
