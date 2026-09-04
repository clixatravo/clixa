import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Manrope } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JsonLd } from "@/components/JsonLd";
import { Analytics } from "@/components/Analytics";
import { PixelMeta } from "@/components/PixelMeta";
import { BandeauCookies } from "@/components/BandeauCookies";
import { PopupRappel } from "@/components/PopupRappel";
import { Apparitions } from "@/components/Apparitions";
import { SITE_URL, estProduction, jsonLdOrganisation } from "@/lib/seo";
import "./globals.css";

/**
 * DES-02 — Les trois familles sont auto-hébergées par next/font : aucun appel à un
 * CDN de polices, donc pas de repli silencieux et pas de requête tierce.
 */
/*
  INT-07 — ce que pèsent les polices, et ce qui n'y change rien.

  Mesuré sur 3G lente : 80 Ko de polices sur 86 transférés. Ce sont elles, et
  rien d'autre, qui tiennent le premier affichage — 36 Ko pour Fraunces, 24 Ko
  pour Manrope, 2 × 10 Ko pour la chasse fixe.

  ⚠️ Retirer une graisse ne fait pas maigrir Fraunces ni Manrope : ce sont des
  polices variables, un seul fichier porte tout l'intervalle. Demander trois
  graisses ou onze télécharge le même octet. Mesuré avant et après — aucun
  changement. La liste ci-dessous ne sert donc qu'à dire ce qu'on emploie
  vraiment ; la 300 de Fraunces et la 800 de Manrope ne servaient nulle part.

  Ce qui allègerait vraiment : une famille de moins. La chasse fixe coûte 20 Ko
  pour des étiquettes en petites capitales — c'est le seul retrait qui se
  mesurerait, et c'est une décision de dessin, pas de code.

  ⚠️ Avant d'en retirer une : `font-medium` vaut 500, `font-semibold` 600,
  `font-bold` 700, et la 400 sert de graisse de corps sans qu'aucune classe ne
  la nomme.
*/
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const DESCRIPTION =
  "Programmes certifiants et parcours exécutifs pour dirigeants et managers en Afrique. En présentiel à Agadir, Abidjan et Dakar, ou à distance en classe virtuelle.";

export const metadata: Metadata = {
  // metadataBase rend absolues toutes les URL relatives (canonical, Open Graph).
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CLIXA Institute — Formations certifiantes et parcours exécutifs en Afrique",
    template: "%s — CLIXA Institute",
  },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "CLIXA Institute",
    locale: "fr_FR",
    url: "/",
    title: "CLIXA Institute — Formations certifiantes et parcours exécutifs en Afrique",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "CLIXA Institute",
    description: DESCRIPTION,
  },
  // Désindexation par défaut : seule une vraie production annonce index/follow.
  robots: estProduction ? { index: true, follow: true } : { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${manrope.variable} ${plexMono.variable}`}>
      <body>
        {/* INT-04 — identité de l'organisation, référencée par les autres blocs */}
        <JsonLd data={jsonLdOrganisation()} />
        {/* FE-14 — lien d'évitement, repris de index.html */}
        <a
          href="#contenu"
          className="bg-gold text-ink rounded-clixa absolute -top-20 left-3 z-100 px-5 py-3 font-bold transition-[top] focus:top-3"
        >
          Aller au contenu principal
        </a>
        <div className="grain" aria-hidden="true" />
        <div className="relative z-10 flex min-h-screen flex-col">
          <SiteHeader />
          <main id="contenu" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
        <Analytics />
        <PixelMeta />
        <BandeauCookies />
        <PopupRappel />
        <Apparitions />
      </body>
    </html>
  );
}
