import { cache } from "react";
import { unstable_cache } from "next/cache";

import type { Bloc } from "@/lib/blog";
import { payloadClient } from "@/lib/payload";
import { ETIQUETTE_PAGES, PEREMPTION } from "@/lib/etiquettes";

/**
 * Les pages libres : mentions légales, confidentialité, et ce que la direction
 * ajoutera.
 *
 * Elles vivaient dans le CMS sans que rien ne les rende — la collection existait,
 * la route non. Un texte qu'on ne peut pas lire ne protège personne.
 *
 * Comme le catalogue : `cache()` pour la requête en cours, `unstable_cache` d'une
 * requête à l'autre, et les crochets lèvent l'étiquette quand la direction
 * enregistre.
 */

export interface PageLibre {
  titre: string;
  slug: string;
  miseAJour?: string;
  contenu: Bloc[];
}

interface BlocBrut {
  blockType?: string;
  texte?: string | null;
  auteur?: string | null;
  items?: { valeur?: string | null }[] | null;
}

/** Le CMS nomme le type `blockType` ; le reste du site attend `type`. */
function versBloc(b: BlocBrut): Bloc | undefined {
  switch (b.blockType) {
    case "intertitre":
    case "paragraphe":
      return b.texte ? ({ type: b.blockType, texte: b.texte } as Bloc) : undefined;
    case "citation":
      return b.texte
        ? ({ type: "citation", texte: b.texte, auteur: b.auteur ?? "" } as Bloc)
        : undefined;
    case "liste": {
      const items = (b.items ?? []).map((i) => i.valeur).filter((v): v is string => Boolean(v));
      return items.length ? ({ type: "liste", items } as Bloc) : undefined;
    }
    default:
      return undefined;
  }
}

const lire = cache(
  unstable_cache(
    async (): Promise<PageLibre[]> => {
      const payload = await payloadClient();
      const { docs } = await payload.find({
        collection: "pages",
        limit: 100,
        locale: "fr",
        depth: 0,
        sort: "slug",
        // Comme partout côté public : les brouillons restent invisibles.
        overrideAccess: false,
      });

      return docs.map((d) => ({
        titre: String(d.titre ?? ""),
        slug: String(d.slug ?? ""),
        ...(d.miseAJour ? { miseAJour: String(d.miseAJour) } : {}),
        contenu: ((d.contenu ?? []) as BlocBrut[])
          .map(versBloc)
          .filter((b): b is Bloc => b !== undefined),
      }));
    },
    ["pages"],
    { tags: [ETIQUETTE_PAGES], revalidate: PEREMPTION },
  ),
);

export async function getPages(): Promise<PageLibre[]> {
  return lire();
}

export async function getPage(slug: string): Promise<PageLibre | undefined> {
  return (await lire()).find((p) => p.slug === slug);
}
