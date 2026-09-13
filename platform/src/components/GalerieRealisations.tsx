"use client";

import { useState } from "react";
import Image from "next/image";
import type { Realisation } from "@/lib/types";

/**
 * Les séances déjà données, en vidéo.
 *
 * ── ⚠️ Rien du fournisseur ne se charge avant un clic ───────────────────────
 * Une `<iframe>` YouTube posée au rendu télécharge son lecteur et signale la
 * visite **avant** que le visiteur ait rien demandé — sous un bandeau de
 * consentement écrit pour l'en empêcher, et c'est exactement la faute que le
 * pixel Meta a corrigée le 4 septembre 2026. La carte montre donc une affiche ;
 * le lecteur ne paraît qu'une fois qu'on l'a réclamé.
 *
 * Cela vaut aussi pour ce que le visiteur paie : douze lecteurs YouTube sur une
 * page, c'est plusieurs mégaoctets de scripts tiers sur un forfait mobile
 * africain — pour des vidéos dont il n'en regardera qu'une.
 *
 * ⚠️ **L'adresse encadrée vient de `lib/video.ts`, jamais de la base.** Elle y
 * est recomposée à partir d'un identifiant vérifié et d'un hôte écrit en dur.
 * Une réalisation dont on n'a su lire ni le lien ni le fichier garde sa carte et
 * son titre, sans bouton : mieux vaut une vignette muette qu'un cadre qui charge
 * on ne sait quoi.
 */
export function GalerieRealisations({
  realisations,
  titre = "Les séances déjà données",
}: {
  realisations: Realisation[];
  titre?: string;
}) {
  /*
    Comme les témoignages : tant qu'aucune vidéo n'est publiée, pas de section.
    Un intitulé au-dessus d'une grille vide se lit comme une page à moitié
    chargée, pas comme une intention.
  */
  if (realisations.length === 0) return null;

  return (
    <section className="border-line border-t px-8 py-16">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-9">
          <span className="mono-label text-gold mb-3 block">En images</span>
          <h2 className="font-display text-[clamp(1.5rem,2.8vw,2.1rem)]">{titre}</h2>
        </div>

        <ul className="carte-grid sm:grid-cols-2 lg:grid-cols-3">
          {realisations.map((r) => (
            <li key={r.id}>
              <CarteVideo realisation={r} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CarteVideo({ realisation: r }: { realisation: Realisation }) {
  const [lance, setLance] = useState(false);
  const lisible = Boolean(r.embed || r.fichier);

  return (
    <figure className="executive-card rounded-clixa flex h-full flex-col overflow-hidden">
      {/*
        ⚠️ Un reel est vertical. Lui donner le 16/9 des autres couperait la
        vidéo par le haut et par le bas — et le cadre d'Instagram porte en plus
        son propre en-tête et son pied, qui prennent de la hauteur sans jamais
        montrer d'image.
      */}
      <div
        className={`bg-panel-2 relative w-full ${r.portrait ? "aspect-[9/14]" : "aspect-video"}`}
      >
        {lance && r.embed && (
          <iframe
            /*
              `autoplay=1` parce que la lecture vient d'être demandée : sans lui
              il faudrait cliquer deux fois, la seconde sur un lecteur qui n'est
              pas le nôtre. Le paramètre s'ajoute ici et non dans `lib/video.ts`,
              qui ne compose que l'adresse — l'intention d'écran n'a rien à faire
              dans la règle de sécurité.
            */
            src={`${r.embed}?autoplay=1&rel=0`}
            title={r.titre}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 size-full border-0"
          />
        )}

        {lance && !r.embed && r.fichier && (
          <video
            src={r.fichier}
            poster={r.affiche}
            controls
            autoPlay
            playsInline
            className="absolute inset-0 size-full object-cover"
          />
        )}

        {!lance && (
          <>
            {r.affiche ? (
              <Image
                src={r.affiche}
                alt={r.afficheAlt ?? ""}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              /*
                Sans affiche, un aplat plutôt qu'un carré noir : celui-ci se lit
                comme une vidéo cassée. Le cas ne se présente que pour un fichier
                déposé sans image d'attente — YouTube, lui, en fournit une.
              */
              <div
                aria-hidden="true"
                className="from-panel-2 to-panel absolute inset-0 bg-gradient-to-br"
              />
            )}

            {lisible && (
              <button
                type="button"
                onClick={() => setLance(true)}
                aria-label={`Lire la vidéo : ${r.titre}`}
                className="group absolute inset-0 flex items-center justify-center bg-black/35 transition-colors hover:bg-black/20 focus-visible:bg-black/20"
              >
                <span className="border-gold/70 bg-ink/80 text-gold-bright flex size-14 items-center justify-center rounded-full border shadow-[0_0_20px_rgba(201,162,76,0.25)] transition-transform group-hover:scale-110">
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="ml-0.5 size-5">
                    <path d="M4 2.5 13 8l-9 5.5z" fill="currentColor" />
                  </svg>
                </span>
              </button>
            )}
          </>
        )}
      </div>

      <figcaption className="flex flex-1 flex-col gap-2 p-6">
        <h3 className="font-display text-ivory text-[1.05rem] font-semibold">{r.titre}</h3>
        {r.description && (
          <p className="text-ivory-dim/90 text-[0.9rem] leading-relaxed">{r.description}</p>
        )}
      </figcaption>
    </figure>
  );
}
