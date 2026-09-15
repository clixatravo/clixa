import { cache } from "react";
import { unstable_cache } from "next/cache";

import { payloadClient } from "@/lib/payload";
import { ETIQUETTE_EXTRAITS, PEREMPTION } from "@/lib/etiquettes";

/**
 * Les extraits de séance qu'on partage par lien.
 *
 * Même montage que le catalogue et les pages : `cache()` tient la requête en
 * cours — la page et son `generateMetadata` lisent le même extrait, et sans lui
 * la base serait interrogée deux fois pour rendre une seule adresse — et
 * `unstable_cache` tient d'une requête à l'autre, levé par le crochet de la
 * collection.
 */

export interface Extrait {
  titre: string;
  slug: string;
  accroche?: string;
  /** L'adresse du fichier dans le magasin. */
  video: string;
  /** Le type MIME, pour que le navigateur sache avant de télécharger. */
  type?: string;
  affiche?: string;
  afficheLargeur?: number;
  afficheHauteur?: number;
  programmeTitre?: string;
  programmeSlug?: string;
}

/** Une relation peuplée, ou rien — jamais un identifiant nu qu'on prendrait pour une URL. */
function peuplee(valeur: unknown): Record<string, unknown> | undefined {
  return valeur && typeof valeur === "object" ? (valeur as Record<string, unknown>) : undefined;
}

function texte(valeur: unknown): string | undefined {
  return typeof valeur === "string" && valeur.length > 0 ? valeur : undefined;
}

function nombre(valeur: unknown): number | undefined {
  return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : undefined;
}

const lire = cache(
  unstable_cache(
    async (): Promise<Extrait[]> => {
      const payload = await payloadClient();
      const { docs } = await payload.find({
        collection: "extraits",
        limit: 200,
        locale: "fr",
        /*
          Profondeur 1 : il faut le fichier, l'affiche et le titre du parcours.
          Au-delà, Payload remonterait les modules et les sessions du programme
          pour rendre une page qui n'en montre rien.
        */
        depth: 1,
        sort: "slug",
        // Comme partout côté public : les brouillons restent invisibles.
        overrideAccess: false,
      });

      return docs
        .map((d): Extrait | undefined => {
          const fichier = peuplee(d.fichier);
          const video = texte(fichier?.url);
          const slug = texte(d.slug);
          const titre = texte(d.titre);
          /*
            ⚠️ Sans fichier servi, la page rendrait un lecteur vide — ce qui, sur
            un lien qu'on vient d'envoyer à un prospect, se lit comme un site
            cassé. Mieux vaut un 404, qui dit au moins qu'il n'y a rien là.
          */
          if (!video || !slug || !titre) return undefined;

          const affiche = peuplee(d.affiche);
          const programme = peuplee(d.programme);

          return {
            titre,
            slug,
            video,
            ...(texte(d.accroche) ? { accroche: texte(d.accroche) as string } : {}),
            ...(texte(fichier?.mimeType) ? { type: texte(fichier?.mimeType) as string } : {}),
            ...(texte(affiche?.url) ? { affiche: texte(affiche?.url) as string } : {}),
            ...(nombre(affiche?.width) ? { afficheLargeur: nombre(affiche?.width) as number } : {}),
            ...(nombre(affiche?.height)
              ? { afficheHauteur: nombre(affiche?.height) as number }
              : {}),
            ...(texte(programme?.titre)
              ? { programmeTitre: texte(programme?.titre) as string }
              : {}),
            ...(texte(programme?.slug) ? { programmeSlug: texte(programme?.slug) as string } : {}),
          };
        })
        .filter((e): e is Extrait => e !== undefined);
    },
    ["extraits"],
    { tags: [ETIQUETTE_EXTRAITS], revalidate: PEREMPTION },
  ),
);

export async function getExtraits(): Promise<Extrait[]> {
  return lire();
}

export async function getExtrait(slug: string): Promise<Extrait | undefined> {
  return (await lire()).find((e) => e.slug === slug);
}
