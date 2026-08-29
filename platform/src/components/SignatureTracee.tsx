"use client";

import React from "react";

/**
 * Signer au doigt sur un téléphone, à la souris sur un ordinateur.
 *
 * ── Ce que le tracé ajoute, et ce qu'il n'ajoute pas ────────────────────────
 * Il n'ajoute pas de force juridique : ce qui défend une signature électronique
 * simple, c'est l'empreinte des termes, l'horodatage et l'adresse d'où l'on a
 * signé — pas le dessin. Il ajoute ce qu'un contrat doit avoir pour être lu
 * comme un contrat : une signature qu'on voit, sur le document qu'on garde.
 *
 * ── Pourquoi les événements « pointer », et pas la souris ni le toucher ─────
 * Un seul jeu d'événements couvre le doigt, le stylet et la souris. Écrire les
 * deux séparément, c'est écrire deux fois le même code et n'en éprouver qu'un.
 *
 * ⚠️ `touch-action: none` est indispensable. Sans lui, le doigt fait défiler la
 * page au lieu de tracer, et sur mobile la zone paraît simplement inerte.
 */

/** Un tracé sérieux fait plus que quelques pixels : sinon c'est un clic. */
const POINTS_MINIMUM = 8;

export function SignatureTracee({ nom }: { nom: string }) {
  const toile = React.useRef<HTMLCanvasElement | null>(null);
  const champ = React.useRef<HTMLInputElement | null>(null);
  const dessine = React.useRef(false);
  const points = React.useRef(0);
  const [trace, setTrace] = React.useState(false);

  /*
    La toile est dimensionnée en pixels réels, pas en pixels CSS : sur un écran
    à densité double, un trait dessiné sur une toile aux dimensions CSS ressort
    flou dans le PDF, où il est agrandi.
  */
  React.useEffect(() => {
    const c = toile.current;
    if (!c) return;
    const densite = window.devicePixelRatio || 1;
    const largeur = c.clientWidth;
    const hauteur = c.clientHeight;
    c.width = largeur * densite;
    c.height = hauteur * densite;

    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(densite, densite);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#F3EFE4";
  }, []);

  const position = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = toile.current!;
    const cadre = c.getBoundingClientRect();
    return { x: e.clientX - cadre.left, y: e.clientY - cadre.top };
  };

  const commencer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = toile.current?.getContext("2d");
    if (!ctx) return;
    // Le pointeur est capturé : le trait suit le doigt même s'il sort du cadre.
    toile.current?.setPointerCapture(e.pointerId);
    dessine.current = true;
    const { x, y } = position(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const tracer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dessine.current) return;
    const ctx = toile.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = position(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    points.current += 1;
    if (points.current >= POINTS_MINIMUM && !trace) setTrace(true);
  };

  const finir = () => {
    if (!dessine.current) return;
    dessine.current = false;
    const c = toile.current;
    if (!c || !champ.current) return;
    /*
      Le PNG part dans le formulaire, en clair. Il pèse quelques kilo-octets —
      un trait sur fond transparent se compresse bien — et voyage dans la même
      requête que le nom et la mention, ce qui garantit qu'ils décrivent le même
      geste.
    */
    champ.current.value = points.current >= POINTS_MINIMUM ? c.toDataURL("image/png") : "";
  };

  const effacer = () => {
    const c = toile.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    points.current = 0;
    setTrace(false);
    if (champ.current) champ.current.value = "";
  };

  return (
    <div className="sm:col-span-2">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor="signature-toile" className="text-ivory-dim text-[0.8rem]">
          Signez ci-dessous — au doigt sur téléphone, à la souris sur ordinateur
        </label>
        {trace && (
          <button
            type="button"
            onClick={effacer}
            className="text-ivory-dim hover:text-gold text-[0.78rem] underline transition-colors"
          >
            Effacer
          </button>
        )}
      </div>

      <canvas
        id="signature-toile"
        ref={toile}
        onPointerDown={commencer}
        onPointerMove={tracer}
        onPointerUp={finir}
        onPointerLeave={finir}
        onPointerCancel={finir}
        style={{ touchAction: "none" }}
        className="border-line bg-ink rounded-clixa h-40 w-full cursor-crosshair border"
      />

      <input ref={champ} type="hidden" name="trace" />

      <p className="text-ivory-dim/70 mt-2 text-[0.78rem] leading-relaxed">
        {trace
          ? `Votre signature accompagnera votre nom, ${nom}, sur le contrat.`
          : "Le cadre est vide : tracez votre signature avant d'envoyer."}
      </p>
    </div>
  );
}
