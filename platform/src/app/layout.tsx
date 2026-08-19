import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Manrope } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JsonLd } from "@/components/JsonLd";
import { Analytics } from "@/components/Analytics";
import { SITE_URL, estProduction, jsonLdOrganisation } from "@/lib/seo";
import "./globals.css";

/**
 * DES-02 — Les trois familles sont auto-hébergées par next/font : aucun appel à un
 * CDN de polices, donc pas de repli silencieux et pas de requête tierce.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      </body>
    </html>
  );
}
