"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";

interface Pilier {
  titre: string;
  description: string;
}

interface PisteVideo {
  id: string;
  onglet: string;
  icone: string;
  badge: string;
  programmeTitre: string;
  programmeSlug: string;
  citation: string;
  explication: string;
  sourceFichier: string;
  affiche: string;
  dureeFormat: string;
  /*
    ⚠️ « portrait » a remplacé « carre » le 15 septembre 2026. Les deux reels
    étaient servis recadrés en 720 × 720, à 667 et 874 Ko : la direction a
    transmis les originaux, 1080 × 1920, et une vidéo verticale dans un cadre
    carré est soit coupée haut et bas — la légende incrustée « À chaud, après
    la 1re séance » disparaît — soit réduite entre deux bandes.
  */
  ratio: "16/9" | "portrait";
  lienExterne: string;
  labelLien: string;
  piliers: Pilier[];
  ctaTitre: string;
  ctaLien: string;
}

const PISTES: PisteVideo[] = [
  {
    id: "trailer-officiel",
    onglet: "Trailer Officiel CLIXA",
    icone: "🎬",
    badge: "Film Officiel 2026 · CLIXA Institute",
    programmeTitre: "Toutes Formations · DAF, PMP®, Management & Leadership",
    programmeSlug: "formations",
    citation:
      "« L’excellence exécutive pour les leaders d’Afrique : Finance de direction, Gouvernance de projets PMP® et Management stratégique. Le leadership commence par un clic. »",
    explication:
      "Découvrez en 48 secondes l'expérience CLIXA Institute : cas réels d'entreprise, cohortes de dirigeants en direct, préparation aux certifications internationales et délivrance d'un certificat professionnel nominatif, vérifiable en ligne.",
    sourceFichier: "/videos/trailer_clixa_officiel.mp4",
    affiche: "/videos/trailer_clixa_officiel_poster.jpg",
    dureeFormat: "0:48",
    ratio: "16/9",
    lienExterne: "https://www.clixa.africa",
    labelLien: "www.clixa.africa",
    piliers: [
      {
        titre: "DAF & Finance Stratégique :",
        description:
          "pilotage de la performance économique, modélisation de trésorerie et décisions de direction.",
      },
      {
        titre: "PMP® & Gouvernance de Projets :",
        description:
          "alignement stratégique, méthodologies agiles/hybrides et préparation à la certification PMI.",
      },
      {
        /*
          ⚠️ Le titre promettait un « Réseau Pan-Africain » et une « communauté
          active de décideurs » — rien sur le site ne l'étaye, et la mention
          « Institut Panafricain » est justement notée comme à trancher par la
          direction. Il ne promet plus que ce que le parcours délivre vraiment.

          ⚠️ Et il annonce la vérification depuis le 15 septembre 2026. Le
          13 septembre, « code unique de vérification » avait dû être retiré du
          film : rien ne vérifiait un certificat, il n'existait ni page ni route
          où saisir quoi que ce soit. `/verifier` a été livrée le lendemain — la
          promesse est redevenue vraie, et c'est celle qui compte pour qui reçoit
          le document.
        */
        titre: "Certificat professionnel :",
        description:
          "certificat nominatif détaillant les modules suivis, remis à l'issue du parcours et vérifiable en ligne par son code.",
      },
    ],
    ctaTitre: "Explorer toutes les formations",
    ctaLien: "/formations",
  },
  {
    id: "extrait-daf",
    onglet: "Extrait Masterclass DAF",
    icone: "🎥",
    badge: "Séance réelle enregistrée",
    programmeTitre: "Directeur Administratif et Financier (DAF)",
    programmeSlug: "directeur-administratif-et-financier",
    citation:
      "« Être DAF, ce n’est pas seulement faire de la finance. C’est piloter la performance, sécuriser la gestion, structurer les processus et savoir interagir avec l’ensemble des parties prenantes. »",
    explication:
      "Aller au-delà des concepts théoriques pour comprendre le métier, ses responsabilités et les décisions stratégiques auxquelles un dirigeant financier est réellement confronté.",
    sourceFichier: "/videos/immersion/reel_daf_extrait.mp4",
    affiche: "/videos/immersion/reel_daf_extrait_poster.jpg",
    dureeFormat: "0:32",
    ratio: "portrait",
    lienExterne: "https://www.instagram.com/reel/DdNOvrLuj7-/",
    labelLien: "Voir sur @clixa.africa",
    piliers: [
      {
        titre: "Cas réels d'entreprise :",
        description:
          "aucun exposé abstrait, chaque module résout une décision de direction générale.",
      },
      {
        titre: "Interactivité en direct :",
        description:
          "débats contradictoires, simulations de comités et retours d'expérience entre pairs directeurs.",
      },
      {
        titre: "Validation certifiante :",
        description:
          "parcours structuré délivrant un certificat professionnel dont l'authenticité se vérifie en ligne.",
      },
    ],
    ctaTitre: "Découvrir le programme DAF",
    ctaLien: "/formations/directeur-administratif-et-financier",
  },
  {
    id: "temoignage-daf",
    onglet: "Retour à chaud cohorte",
    icone: "🎙️",
    badge: "À chaud · 1ʳᵉ séance",
    programmeTitre: "Cohorte DAF · Témoignage Participant",
    programmeSlug: "directeur-administratif-et-financier",
    citation:
      "« Un retour spontané dès la première séance : des échanges de très haut niveau, concrets et immédiatement applicables. L’aventure ne fait que commencer. »",
    explication:
      "Le témoignage sans filtre d'un cadre financier participant à la cohorte DAF chez CLIXA Institute, enregistré dès la sortie de son tout premier cours en direct.",
    sourceFichier: "/videos/immersion/reel_daf_temoignage.mp4",
    affiche: "/videos/immersion/reel_daf_temoignage_poster.jpg",
    dureeFormat: "0:57",
    ratio: "portrait",
    lienExterne: "https://www.instagram.com/reel/DdMoJOKsIbe/",
    labelLien: "Voir sur @clixa.africa",
    piliers: [
      {
        titre: "Émulation collective :",
        description:
          "diversité des secteurs représentés et synergies stratégiques entre directeurs d'Afrique.",
      },
      {
        titre: "Pragmatisme immédiat :",
        description:
          "concepts et grilles de lecture actionnables dès le lendemain matin dans son organisation.",
      },
      {
        titre: "Mentorats & Suivi continu :",
        description:
          "accompagnement personnalisé par des formateurs praticiens tout au long du parcours.",
      },
    ],
    ctaTitre: "Découvrir le programme DAF",
    ctaLien: "/formations/directeur-administratif-et-financier",
  },
];

export function TrailerImmersion({
  titre = "Au cœur de l'expérience CLIXA",
  sousTitre = "Film officiel, extraits de masterclasses réelles et retours d'expérience à chaud : vivez l'immersion CLIXA Institute.",
  afficherCtaProgramme = true,
  pisteInitiale = 0,
}: {
  titre?: string;
  sousTitre?: string;
  afficherCtaProgramme?: boolean;
  pisteInitiale?: number;
}) {
  const [indexPiste, setIndexPiste] = useState(
    pisteInitiale >= 0 && pisteInitiale < PISTES.length ? pisteInitiale : 0,
  );
  const [enLecture, setEnLecture] = useState(false);
  const [muet, setMuet] = useState(false);
  const [progression, setProgression] = useState(0);
  const [tempsEcoule, setTempsEcoule] = useState("0:00");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const active = PISTES[indexPiste]!;

  const changerPiste = (idx: number) => {
    if (idx === indexPiste) return;
    setIndexPiste(idx);
    setEnLecture(false);
    setProgression(0);
    setTempsEcoule("0:00");
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  };

  const basculerLecture = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play()
        .then(() => setEnLecture(true))
        .catch(() => setEnLecture(false));
    } else {
      v.pause();
      setEnLecture(false);
    }
  };

  const basculerSon = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuet(v.muted);
  };

  const gererTemps = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    setProgression(pct);

    const min = Math.floor(v.currentTime / 60);
    const sec = Math.floor(v.currentTime % 60);
    setTempsEcoule(`${min}:${sec < 10 ? "0" : ""}${sec}`);
  };

  const chercherTemps = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    v.currentTime = pos * v.duration;
  };

  const basculerPleinEcran = () => {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (v.requestFullscreen) {
      void v.requestFullscreen();
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = muet;
    }
  }, [indexPiste, muet]);

  return (
    <section className="border-line relative overflow-hidden border-t border-b px-8 py-16 lg:py-24">
      {/* Halo d'ambiance doré subtil */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/4 -translate-y-1/2 rounded-full bg-amber-500/5 blur-[120px] filter"
        style={{ width: "420px", height: "420px" }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-[1180px]">
        {/* En-tête de section */}
        <div className="mb-12 text-center">
          <div className="border-gold/30 bg-panel/80 text-gold-bright rounded-clixa mb-4 inline-flex items-center gap-2 border px-3.5 py-1.5 font-mono text-[0.68rem] tracking-[0.14em] uppercase backdrop-blur-md">
            <span className="text-gold font-bold">✦</span>
            <span>Immersion Directe · Preuve par l&apos;Image</span>
          </div>
          <h2 className="text-[clamp(1.6rem,3.2vw,2.5rem)] font-bold tracking-tight">{titre}</h2>
          <p className="text-ivory-dim/90 mx-auto mt-3 max-w-[62ch] text-[0.98rem] leading-relaxed">
            {sousTitre}
          </p>
        </div>

        {/* Sélecteur d'onglets / Pistes vidéo */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          {PISTES.map((p, i) => {
            const estActif = i === indexPiste;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => changerPiste(i)}
                className={`rounded-clixa flex cursor-pointer items-center gap-2.5 px-4.5 py-2.5 font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
                  estActif
                    ? "border-gold bg-gold/15 text-gold-bright border shadow-[0_0_20px_rgba(201,162,76,0.2)]"
                    : "border-line bg-panel/60 text-ivory-dim hover:border-gold/40 hover:text-ivory border"
                }`}
              >
                <span>{p.icone}</span>
                <span>{p.onglet}</span>
                <span className="border-line/60 bg-ink/50 text-ivory-dim/70 rounded-full border px-2 py-0.5 text-[0.62rem]">
                  {p.dureeFormat}
                </span>
              </button>
            );
          })}
        </div>

        {/* Conteneur principal 2 colonnes (Lecteur vidéo + Carte de contexte) */}
        <div className="executive-card rounded-clixa border-line/80 grid grid-cols-1 items-center gap-8 overflow-hidden p-6 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:p-10">
          {/* Colonne gauche : Lecteur vidéo exécutif */}
          <div
            className={`relative mx-auto w-full transition-all duration-300 ${
              /*
                Un reel à 440 px de large ferait 782 px de haut : plus haut que
                l'écran d'un ordinateur portable, et la carte de contexte d'à
                côté flotterait au milieu d'un vide.
              */
              active.ratio === "16/9" ? "max-w-[560px]" : "max-w-[320px]"
            }`}
          >
            <div
              className={`rounded-clixa border-gold/30 bg-ink group relative w-full overflow-hidden border shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)] ${
                active.ratio === "16/9" ? "aspect-video" : "aspect-[9/16]"
              }`}
            >
              {/* Vidéo MP4 native avec key pour forcer le remontage propre au changement de piste */}
              <video
                key={active.id}
                ref={videoRef}
                src={active.sourceFichier}
                poster={active.affiche}
                playsInline
                preload="metadata"
                onTimeUpdate={gererTemps}
                onEnded={() => {
                  setEnLecture(false);
                  setProgression(100);
                }}
                className="size-full object-cover"
              />

              {/* Bouton Play au centre si la vidéo n'est pas lancée */}
              {!enLecture && (
                <button
                  type="button"
                  onClick={basculerLecture}
                  aria-label="Lancer la lecture de la vidéo"
                  className="group/btn absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/45 backdrop-blur-[2px] transition-all duration-300 hover:bg-black/35"
                >
                  <span className="border-gold bg-panel/90 text-gold-bright flex size-18 items-center justify-center rounded-full border shadow-[0_0_30px_rgba(201,162,76,0.35)] transition-transform duration-300 group-hover/btn:scale-110">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="ml-1 size-8"
                      aria-hidden="true"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <span className="border-line/60 bg-ink/80 text-ivory rounded-clixa mt-4 border px-3.5 py-1.5 font-mono text-[0.72rem] tracking-wider uppercase backdrop-blur-md">
                    Lancer la vidéo ({active.dureeFormat})
                  </span>
                </button>
              )}

              {/* Barre de commandes personnalisée */}
              <div
                className={`from-ink/95 via-ink/75 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-4 transition-opacity duration-300 ${
                  enLecture ? "opacity-90 hover:opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                {/* Barre de progression cliquable */}
                <div
                  onClick={chercherTemps}
                  className="bg-ivory/20 mb-3 h-1.5 w-full cursor-pointer overflow-hidden rounded-full"
                  role="slider"
                  aria-valuenow={progression}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progression de la vidéo"
                  tabIndex={0}
                >
                  <div
                    className="bg-gold h-full transition-[width] duration-150"
                    style={{ width: `${progression}%` }}
                  />
                </div>

                {/* Boutons de contrôle */}
                <div className="flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={basculerLecture}
                      className="hover:text-gold-bright text-ivory cursor-pointer p-1 transition-colors"
                      aria-label={enLecture ? "Mettre en pause" : "Lire"}
                    >
                      {enLecture ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={basculerSon}
                      className="hover:text-gold-bright text-ivory cursor-pointer p-1 transition-colors"
                      aria-label={muet ? "Activer le son" : "Couper le son"}
                    >
                      {muet ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27l4.73 4.73H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                        </svg>
                      )}
                    </button>

                    <span className="text-ivory-dim font-mono text-[0.74rem]">
                      {tempsEcoule} / {active.dureeFormat}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={basculerPleinEcran}
                      className="hover:text-gold-bright text-ivory-dim cursor-pointer p-1 transition-colors"
                      aria-label="Plein écran"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Légende & source officielle */}
            <div className="mt-3 flex items-center justify-between px-1">
              <span className="text-ivory-dim/70 flex items-center gap-1.5 font-mono text-[0.7rem]">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                {/*
                  « Format Reel Certifié » ne certifiait rien. Les reels sont
                  désormais servis en 1080p : c'est ce qui se dit.
                */}
                {active.ratio === "16/9" ? "Production Haute Définition" : "Format Reel · 1080p"}
              </span>
              <a
                href={active.lienExterne}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ivory-dim hover:text-gold-bright inline-flex items-center gap-1 font-mono text-[0.72rem] transition-colors"
              >
                <span>{active.labelLien}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          {/* Colonne droite : Fiche d'impact & Contexte pédagogique */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Badge supérieur */}
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <span className="border-gold/30 bg-gold/10 text-gold-bright rounded-clixa border px-2.5 py-1 font-mono text-[0.66rem] font-bold tracking-wider uppercase">
                  {active.badge}
                </span>
                <span className="text-ivory-dim font-mono text-[0.76rem]">
                  {active.programmeTitre}
                </span>
              </div>

              {/* Citation principale */}
              <blockquote className="border-gold/60 text-ivory my-4 border-l-2 pl-4 text-[1.08rem] leading-relaxed font-medium italic">
                {active.citation}
              </blockquote>

              {/* Explication du contexte */}
              <p className="text-ivory-dim/90 mt-4 text-[0.92rem] leading-relaxed">
                {active.explication}
              </p>

              {/* Piliers clés observés dans la piste */}
              <div className="border-line/60 my-6 space-y-2.5 border-t pt-5">
                {active.piliers.map((p, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-[0.84rem]">
                    <span className="text-gold font-bold">✦</span>
                    <span className="text-ivory-dim">
                      <strong className="text-ivory font-medium">{p.titre}</strong> {p.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions & Redirection dynamique */}
            {afficherCtaProgramme && (
              <div className="border-line/60 flex flex-wrap items-center gap-3.5 border-t pt-5">
                <Link
                  href={active.ctaLien as Route}
                  className="bg-gold text-ink hover:bg-gold-bright rounded-clixa inline-flex items-center gap-2 px-5 py-3 text-xs font-bold tracking-wider uppercase shadow-md transition-all"
                >
                  <span>{active.ctaTitre}</span>
                  <span>→</span>
                </Link>

                <Link
                  href={
                    (active.programmeSlug === "formations"
                      ? "/inscription"
                      : `/inscription?formation=${active.programmeSlug}`) as Route
                  }
                  className="border-line-strong text-ivory hover:border-gold hover:text-gold-bright rounded-clixa bg-panel/50 inline-flex items-center gap-2 border px-4 py-3 text-xs font-semibold transition-all"
                >
                  <span>Rejoindre la prochaine cohorte</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
