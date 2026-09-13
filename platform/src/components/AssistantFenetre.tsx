"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Robot } from "@/components/AssistantIA";
import { RESEAUX_CLIXA } from "@/lib/reseaux";

type Message = { role: "user" | "assistant"; content: string };

const CLE = "clixa-assistant";

const SUGGESTIONS = [
  "Quelles formations proposez-vous ?",
  "Prochaine session du parcours DAF ?",
  "Combien coûte une formation ?",
  "Wach kayn khlas b tranches ?",
];

const ACCUEIL: Message = {
  role: "assistant",
  content:
    "Bonjour 👋 Je suis l'assistant IA de **CLIXA Institute**. Posez-moi vos questions sur nos formations : programmes, dates, tarifs, certification.",
};

const lireHistorique = (): Message[] => {
  try {
    const lu: unknown = JSON.parse(sessionStorage.getItem(CLE) ?? "[]");
    return Array.isArray(lu) ? (lu as Message[]) : [];
  } catch {
    return [];
  }
};

/*
  ── Rendu ────────────────────────────────────────────────────────────────────
  Le modèle écrit un markdown minimal : gras, listes, liens. On en fait des
  éléments React, jamais du HTML injecté — une réponse ne peut pas glisser de
  balise dans la page.
*/
const MOTIF =
  /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|https?:\/\/[^\s)\]]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;
const lien = "text-gold-bright underline underline-offset-2 hover:text-gold break-words";

function enLigne(texte: string, cle: string): ReactNode[] {
  return texte.split(MOTIF).map((part, i) => {
    const k = `${cle}-${i}`;
    const md = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (md?.[1] && md[2]) {
      // Lien écrit en markdown [libellé](url) : si le libellé est l'URL elle-même, on l'abrège.
      const libelle = /^https?:\/\//.test(md[1])
        ? md[1].replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
        : md[1].replace(/^\*\*|\*\*$/g, "");
      return (
        <a
          key={k}
          href={md[2]}
          className={lien}
          target={md[2].includes("clixa.africa") ? undefined : "_blank"}
          rel="noopener noreferrer"
        >
          {libelle}
        </a>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={k} className="text-ivory font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^https?:\/\//.test(part)) {
      const url = part.replace(/[.,;:!?]+$/, "");
      return (
        <Fragment key={k}>
          <a
            href={url}
            className={lien}
            target={url.includes("clixa.africa") ? undefined : "_blank"}
            rel="noopener noreferrer"
          >
            {url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
          </a>
          {part.slice(url.length)}
        </Fragment>
      );
    }
    if (/^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/.test(part)) {
      return (
        <a key={k} href={`mailto:${part}`} className={lien}>
          {part}
        </a>
      );
    }
    return part;
  });
}

function Texte({ contenu }: { contenu: string }) {
  const blocs: ReactNode[] = [];
  let puces: string[] = [];
  const fermerListe = (cle: string) => {
    if (!puces.length) return;
    blocs.push(
      <ul key={cle} className="marker:text-gold my-1.5 list-disc space-y-1 pl-4">
        {puces.map((p, i) => (
          <li key={i}>{enLigne(p, `${cle}-${i}`)}</li>
        ))}
      </ul>,
    );
    puces = [];
  };
  contenu.split("\n").forEach((ligne, i) => {
    const puce = ligne.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (puce) {
      puces.push(puce[1] ?? "");
      return;
    }
    fermerListe(`ul-${i}`);
    if (ligne.trim()) {
      blocs.push(
        <p key={`p-${i}`} className="my-1">
          {enLigne(ligne, `p-${i}`)}
        </p>,
      );
    }
  });
  fermerListe("ul-fin");
  return <>{blocs}</>;
}

export function AssistantFenetre({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const [messages, setMessages] = useState<Message[]>(lireHistorique);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const fil = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(CLE, JSON.stringify(messages.slice(-30)));
    } catch {
      /* navigation privée : l'historique ne survivra pas au rechargement */
    }
  }, [messages]);

  useEffect(() => {
    fil.current?.scrollTo({ top: fil.current.scrollHeight });
  }, [messages, ouvert]);

  useEffect(() => {
    if (!ouvert) return;
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", echap);
    // Pas de focus automatique sur téléphone : le clavier recouvrirait la réponse.
    if (window.matchMedia("(min-width: 640px)").matches) champ.current?.focus();
    return () => window.removeEventListener("keydown", echap);
  }, [ouvert, onFermer]);

  async function envoyer(texte: string) {
    const question = texte.trim().slice(0, 1500);
    if (!question || enCours) return;
    setErreur(null);
    setSaisie("");
    const historique: Message[] = [...messages, { role: "user", content: question }];
    setMessages([...historique, { role: "assistant", content: "" }]);
    setEnCours(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historique.slice(-16) }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
        throw new Error(
          data.code === "NOT_CONFIGURED"
            ? "L'assistant est en cours de mise en service. Écrivez-nous sur WhatsApp en attendant."
            : res.status === 429 && !data.error
              ? "Beaucoup de messages en peu de temps. Réessayez dans une minute."
              : (data.error ?? "L'assistant ne répond pas pour le moment."),
        );
      }

      const lecteur = res.body.getReader();
      const decodeur = new TextDecoder();
      let reponse = "";
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        reponse += decodeur.decode(value, { stream: true });
        setMessages([...historique, { role: "assistant", content: reponse }]);
      }
      if (!reponse.trim())
        throw new Error("L'assistant n'a pas répondu. Reformulez votre question.");
    } catch (e) {
      setMessages(historique);
      setErreur(
        e instanceof Error && e.message !== "Failed to fetch"
          ? e.message
          : "Connexion impossible. Vérifiez votre réseau.",
      );
    } finally {
      setEnCours(false);
    }
  }

  return (
    <section
      role="dialog"
      aria-label="Assistant IA CLIXA Institute"
      hidden={!ouvert}
      className="border-line-strong bg-ink fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col border shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-24 sm:h-[min(600px,calc(100dvh-7rem))] sm:w-[400px]"
    >
      <header className="border-line bg-panel flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="border-gold/40 text-gold rounded-clixa flex size-9 items-center justify-center border">
            <Robot className="size-6" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-ivory text-[0.98rem]">Assistant IA</p>
            <p className="mono-label text-gold text-[0.58rem]">CLIXA Institute · Formations</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setErreur(null);
              }}
              className="text-ivory-dim hover:text-ivory cursor-pointer px-2 py-1 text-[0.72rem]"
            >
              Nouvelle discussion
            </button>
          )}
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="text-ivory-dim hover:text-ivory cursor-pointer px-2 text-xl leading-none"
          >
            ×
          </button>
        </div>
      </header>

      <div
        ref={fil}
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {[ACCUEIL, ...messages].map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="bg-gold text-ink rounded-clixa max-w-[85%] px-3.5 py-2 text-[0.88rem] break-words whitespace-pre-wrap">
                {m.content}
              </p>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className="border-line bg-panel text-ivory-dim rounded-clixa max-w-[92%] border px-3.5 py-2 text-[0.88rem] leading-relaxed break-words">
                {m.content ? (
                  <Texte contenu={m.content} />
                ) : (
                  <span className="flex gap-1 py-1.5" aria-label="L'assistant écrit">
                    <span className="bg-gold size-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
                    <span className="bg-gold size-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
                    <span className="bg-gold size-1.5 animate-bounce rounded-full" />
                  </span>
                )}
              </div>
            </div>
          ),
        )}

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void envoyer(s)}
                className="border-line text-ivory-dim hover:border-gold hover:text-ivory rounded-clixa cursor-pointer border px-3 py-1.5 text-left text-[0.78rem] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {erreur && (
          <p className="rounded-clixa border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[0.78rem] text-amber-200">
            {erreur}{" "}
            <a
              href={RESEAUX_CLIXA.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-400 underline"
            >
              WhatsApp Admissions
            </a>
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void envoyer(saisie);
        }}
        className="border-line bg-panel border-t px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={champ}
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void envoyer(saisie);
              }
            }}
            rows={1}
            maxLength={1500}
            placeholder="Posez votre question…"
            aria-label="Votre question"
            className="border-line-strong bg-ink text-ivory placeholder:text-ivory-dim/60 focus:border-gold rounded-clixa max-h-28 min-h-[42px] flex-1 resize-none border px-3 py-2.5 text-base focus:outline-none sm:text-[0.88rem]"
          />
          <button
            type="submit"
            disabled={enCours || !saisie.trim()}
            aria-label="Envoyer"
            className="bg-gold text-ink hover:bg-gold-bright rounded-clixa flex size-[42px] shrink-0 cursor-pointer items-center justify-center font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            →
          </button>
        </div>
        <p className="text-ivory-dim/60 mt-2 text-center text-[0.66rem]">
          Assistant IA : il peut se tromper. Pour votre dossier, un conseiller vous répond.
        </p>
      </form>
    </section>
  );
}
