/* Racine du back-office Payload.
   Isolée dans le groupe (payload) : elle ne partage ni l'en-tête, ni les polices,
   ni les styles du site public. */
import type { ServerFunctionClient } from "payload";
import config from "@payload-config";
import { RootLayout, handleServerFunctions } from "@payloadcms/next/layouts";
import "@payloadcms/next/css";
/*
  Après celle de Payload, et c'est l'ordre qui compte : elle n'ajoute pas un
  thème, elle en retouche l'accent et les caractères.
*/
import "./clixa.css";
import { Fraunces, IBM_Plex_Mono, Manrope } from "next/font/google";
import { importMap } from "./admin/importMap.js";

/*
  Les trois familles du site, auto-hébergées comme sur le front. Ce groupe de
  routes ne partage rien avec l'autre — Payload rend son propre <html> — donc
  il les charge pour son compte.
*/
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-fraunces" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

type Args = { children: React.ReactNode };

const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({ ...args, config, importMap });
};

export default function Layout({ children }: Args) {
  return (
    <RootLayout
      config={config}
      importMap={importMap}
      serverFunction={serverFunction}
      /*
        `htmlProps` et non `className` : c'est RootLayout qui rend le <html>,
        et les variables de next/font sont portées par une classe. Posées là,
        elles descendent sur tout le back-office, écran de connexion compris.
      */
      htmlProps={{
        className: `${fraunces.variable} ${manrope.variable} ${plexMono.variable}`,
      }}
    >
      {children}
    </RootLayout>
  );
}
