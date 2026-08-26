import React from "react";
import { RESEAUX_CLIXA } from "@/lib/reseaux";

interface ReseauxSociauxProps {
  taille?: "compact" | "normal" | "large";
  avecLibelle?: boolean;
  className?: string;
}

export function ReseauxSociaux({
  taille = "normal",
  avecLibelle = false,
  className = "",
}: ReseauxSociauxProps) {
  const iconSize = taille === "compact" ? "size-3.5" : taille === "large" ? "size-5" : "size-4";

  const paddingBtn =
    taille === "compact"
      ? "p-1.5"
      : taille === "large"
        ? "px-4 py-2.5 gap-2.5 text-[0.84rem]"
        : avecLibelle
          ? "px-3 py-1.5 gap-2 text-[0.78rem]"
          : "p-2";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* WhatsApp */}
      <a
        href={RESEAUX_CLIXA.whatsapp.url}
        target="_blank"
        rel="noopener noreferrer"
        title="WhatsApp Admissions (+212 6 69 30 34 67)"
        aria-label="Contacter CLIXA sur WhatsApp"
        className={`group border-emerald/40 bg-emerald/10 text-emerald-bright hover:border-emerald-bright hover:bg-emerald-bright/20 hover:text-emerald-bright rounded-clixa inline-flex items-center border font-mono font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(47,163,125,0.35)] ${paddingBtn}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${iconSize} shrink-0 transition-transform duration-200 group-hover:scale-110`}
        >
          <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
          <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
        </svg>
        {avecLibelle && <span className="tracking-wide">WhatsApp</span>}
      </a>

      {/* LinkedIn */}
      <a
        href={RESEAUX_CLIXA.linkedin.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Page LinkedIn Officielle CLIXA Institute"
        aria-label="Suivre CLIXA sur LinkedIn"
        className={`group bg-panel/70 text-ivory/80 rounded-clixa inline-flex items-center border border-white/10 font-mono font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0077b5]/70 hover:bg-[#0077b5]/15 hover:text-[#38bdf8] hover:shadow-[0_4px_16px_rgba(0,119,181,0.3)] ${paddingBtn}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`${iconSize} shrink-0 transition-transform duration-200 group-hover:scale-110`}
        >
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.68 1.68 0 1 0-.02-3.36 1.68 1.68 0 0 0 .02 3.36m1.39 9.74v-8.37H5.07v8.37h2.78z" />
        </svg>
        {avecLibelle && <span className="tracking-wide">LinkedIn</span>}
      </a>

      {/* Facebook */}
      <a
        href={RESEAUX_CLIXA.facebook.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Page Facebook Officielle CLIXA Institute"
        aria-label="Rejoindre CLIXA sur Facebook"
        className={`group bg-panel/70 text-ivory/80 rounded-clixa inline-flex items-center border border-white/10 font-mono font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1877f2]/70 hover:bg-[#1877f2]/15 hover:text-[#60a5fa] hover:shadow-[0_4px_16px_rgba(24,119,242,0.3)] ${paddingBtn}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`${iconSize} shrink-0 transition-transform duration-200 group-hover:scale-110`}
        >
          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
        </svg>
        {avecLibelle && <span className="tracking-wide">Facebook</span>}
      </a>
    </div>
  );
}
