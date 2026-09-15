import type { CollectionConfig } from "payload";
import { connecte, reserveA } from "@/access/roles";
import { revaliderExtrait, revaliderExtraitSupprime } from "@/collections/revalider";

/**
 * Les extraits de séance qu'on partage par lien.
 *
 * ── Pourquoi une collection, et pas une réalisation ─────────────────────────
 * Demandé par la direction le 15 septembre 2026 : une vidéo à envoyer « dans un
 * mail ou un whatsapp », juste un lien. `Realisations` porte des vidéos elle
 * aussi — mais elle répond à une autre question : « qu'avons-nous déjà fait »,
 * et tout ce qu'elle publie paraît sur `/temoignages`. Un extrait qu'on envoie
 * à trois prospects n'a pas à entrer dans la vitrine du site, et l'y forcer
 * obligerait à publier pour pouvoir partager.
 *
 * Les deux peuvent porter la même vidéo le jour où la direction voudra l'un et
 * l'autre : le fichier vit dans `videos`, les deux s'y rattachent.
 *
 * ── Ce que le lien doit faire ───────────────────────────────────────────────
 * ⚠️ **Un lien brut vers le fichier était le chemin court, et c'est non.** Son
 * adresse ressemble à `xk3f9.public.blob.vercel-storage.com/…` : pas de marque,
 * pas d'aperçu dans WhatsApp, et surtout l'allure exacte de ce que le reste du
 * tunnel apprend au client à se méfier. `/v/<slug>` porte notre domaine, montre
 * une vignette et un titre dans la conversation, et reste modifiable après
 * l'envoi — ce qu'un lien de fichier n'est jamais.
 */
export const Extraits: CollectionConfig = {
  slug: "extraits",
  labels: { singular: "Extrait partagé", plural: "Extraits partagés" },
  admin: {
    useAsTitle: "titre",
    defaultColumns: ["titre", "slug", "_status", "updatedAt"],
    group: "Éditorial",
    description: "Vidéos qu'on envoie par lien. Adresse publique : /v/<identifiant>.",
  },
  access: {
    /*
      ⚠️ **Réservée à l'équipe, et ce n'est pas une coquille.** `lecturePubliee`
      — ce que portent les témoignages, les articles, les réalisations — laisse
      l'API REST servir la collection à qui la demande : `/api/extraits` rendait
      la **liste entière** des extraits publiés, slug compris, sans la moindre
      session. Mesuré. Un lien qu'on croyait non répertorié devenait alors
      énumérable : il suffisait d'appeler l'API pour connaître toutes les vidéos
      qu'on est en train d'envoyer, à qui, et sous quel titre.

      C'est le défaut d'`admin.hidden` sur le RIB, et celui d'`/api/globals/
      tarifs` : ne pas afficher quelque chose n'est pas le protéger. La
      différence avec les autres collections est réelle — les leurs sont faites
      pour être parcourues depuis une page de liste ; celle-ci n'a pas de page
      de liste, par construction.

      La page publique, elle, lit avec `overrideAccess: true` et filtre
      `_status` à la main (`lib/extraits.ts`) : elle sert une adresse qu'on lui
      donne, jamais un inventaire.
    */
    read: connecte,
    create: reserveA("redaction"),
    update: reserveA("redaction"),
    delete: reserveA("redaction"),
  },
  /*
    Comme la vitrine : on prépare, on relit, puis on publie. Un lien part ensuite
    dans des conversations qu'on ne rattrape pas.
  */
  versions: { drafts: true, maxPerDoc: 20 },

  hooks: {
    afterChange: [revaliderExtrait],
    afterDelete: [revaliderExtraitSupprime],
  },

  fields: [
    {
      name: "titre",
      type: "text",
      label: "Titre",
      required: true,
      admin: {
        description: "Ce que WhatsApp affiche au-dessus de la vignette, et le titre de la page.",
      },
    },
    {
      name: "slug",
      type: "text",
      label: "Identifiant dans l'adresse",
      required: true,
      unique: true,
      index: true,
      admin: {
        description: "L'adresse partagée sera /v/<identifiant>. Lettres, chiffres et tirets.",
      },
      /*
        ⚠️ Le même filtre que partout ailleurs : ce qui n'entre pas dans le moule
        ne se corrige pas en douce. Une adresse à demi réécrite se recopie de
        travers, et celle-ci circule dans des conversations.
      */
      validate: (valeur: unknown, { previousValue }: { previousValue?: unknown }) => {
        if (valeur === previousValue) return true;
        if (typeof valeur !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(valeur)) {
          return "Uniquement des minuscules, des chiffres et des tirets — par exemple « daf-4-piliers ».";
        }
        return true;
      },
    },
    {
      name: "accroche",
      type: "textarea",
      label: "Phrase d'accroche",
      admin: {
        description: "La ligne que WhatsApp montre sous le titre, et qui s'affiche sous la vidéo.",
      },
    },
    {
      name: "fichier",
      type: "upload",
      relationTo: "videos",
      label: "La vidéo",
      required: true,
      admin: {
        description:
          "Au-delà de 4 Mo, /admin ne peut pas la recevoir : passer par scripts/publier-un-extrait.ts.",
      },
    },
    {
      name: "affiche",
      type: "upload",
      relationTo: "medias",
      label: "Image d'attente",
      /*
        ⚠️ Sans affiche, deux choses tombent d'un coup : le lecteur montre un
        carré noir — que le journal note déjà comme se lisant « vidéo cassée » —
        et WhatsApp n'a **aucune vignette** à mettre dans la conversation. Un
        lien sans vignette se lit comme un lien douteux, ce qui est exactement ce
        qu'on cherchait à éviter en n'envoyant pas le fichier brut.
      */
      admin: {
        description: "Une image extraite de la vidéo. Sans elle, pas de vignette dans WhatsApp.",
      },
    },
    {
      name: "programme",
      type: "relationship",
      relationTo: "programmes",
      label: "Formation liée",
      admin: {
        description:
          "Facultatif. Ajoute sous la vidéo un bouton vers la fiche — c'est là que le prospect va ensuite.",
      },
    },
  ],
};
