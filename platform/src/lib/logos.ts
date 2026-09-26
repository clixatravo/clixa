/**
 * Les tracés des logos, écrits une fois.
 *
 * Ils vivaient dans `ReseauxSociaux.tsx`, le seul endroit qui les dessinait.
 * Depuis que le formulaire de pré-inscription demande par où l'on nous a
 * connus (`lib/provenance.ts`), LinkedIn, Facebook et Instagram se dessinent à
 * deux endroits : deux copies d'un même tracé finissent par ne plus montrer
 * la même marque.
 *
 * Des tracés SVG en 24 × 24, pas des images : ils se teintent par
 * `currentColor`, ne pèsent rien, et ne font partir aucune requête chez la
 * marque — un logo servi depuis linkedin.com signalerait la visite.
 */
export interface Logo {
  chemin: string;
  /** `true` : un trait (fill none, stroke). `false` : une forme pleine. */
  trace: boolean;
}

export const LOGOS = {
  whatsapp: {
    trace: true,
    chemin:
      "M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21 M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1",
  },
  linkedin: {
    trace: false,
    chemin:
      "M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.68 1.68 0 1 0-.02-3.36 1.68 1.68 0 0 0 .02 3.36m1.39 9.74v-8.37H5.07v8.37h2.78z",
  },
  facebook: {
    trace: false,
    chemin:
      "M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z",
  },
  instagram: {
    trace: false,
    chemin:
      "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9a3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16m0 5.68a4.16 4.16 0 1 0 0 8.32 4.16 4.16 0 0 0 0-8.32m0 6.86a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4m5.3-7.02a.97.97 0 1 1-1.94 0 .97.97 0 0 1 1.94 0",
  },
  courriel: {
    trace: true,
    chemin:
      "M4 5.5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z M3.5 6.5l8.5 6.5 8.5-6.5",
  },
  entourage: {
    trace: true,
    chemin:
      "M15.5 20v-1.5a3.5 3.5 0 0 0-3.5-3.5H6.5A3.5 3.5 0 0 0 3 18.5V20 M9.25 11.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5 M21 20v-1.5a3.5 3.5 0 0 0-2.6-3.38 M15.4 5.12a3.25 3.25 0 0 1 0 6.26",
  },
  autre: {
    trace: true,
    chemin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M7.75 12h.01 M12 12h.01 M16.25 12h.01",
  },
} as const satisfies Record<string, Logo>;
