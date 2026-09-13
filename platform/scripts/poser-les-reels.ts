/**
 * Les deux reels de la campagne, posés sur la page « Ils l'ont fait ».
 *
 * ── Rejouable, et il ne double rien ─────────────────────────────────────────
 * Il reconnaît une réalisation à **son lien** — l'identifiant du reel — et met
 * à jour celle qui existe plutôt que d'en créer une seconde. Un script d'import
 * qu'on relance par prudence ne doit pas publier deux fois la même vidéo sur
 * la page qui sert de vitrine.
 *
 * ⚠️ **Il n'écrit rien sans `ECRIRE=1`.** C'est du contenu qui paraît en ligne,
 * sur le site d'une campagne en cours : il montre d'abord ce qu'il ferait.
 *
 * ⚠️ **Et un script ne rafraîchit pas la page** — `revalidatePath` exige le
 * contexte de requête de Next, absent sous `payload run`. Redéployer après.
 *
 *   cd platform && set -a && . ./.env.prod && set +a \
 *     && ECRIRE=1 npx payload run scripts/poser-les-reels.ts
 */
import { readFile } from "node:fs/promises";
import { getPayload } from "payload";
import config from "@payload-config";

const ECRIRE = process.env.ECRIRE === "1";

/**
 * Ce que la direction a transmis le 13 septembre 2026, légendes comprises.
 *
 * ⚠️ **Les couvertures ne suivaient pas l'ordre des légendes**, et la
 * correspondance a été vérifiée image par image plutôt que supposée : le second
 * reel affiche la diapositive « Missions cœur du DAF — pilotage de la
 * performance · gestion financière · structuration des process · relation
 * parties prenantes », mot pour mot sa légende. Le premier montre le même écran
 * partagé pendant ses 57 secondes, sans personne à l'image : c'est une voix
 * par-dessus la séance, ce que le 🎙️ de la légende annonçait.
 */
const REELS: {
  lien: string;
  titre: string;
  description: string;
  ordre: number;
  /** L'image d'attente, quand celle du reel vaut d'être montrée. */
  affiche?: { fichier: string; alt: string };
}[] = [
  {
    lien: "https://www.instagram.com/reel/DdNOvrLuj7-/",
    titre: "Le métier de DAF, au-delà des concepts",
    description:
      "Extrait de séance : les quatre blocs qui structurent la fonction — piloter la performance, sécuriser la gestion financière, structurer les processus, tenir la relation avec les parties prenantes.",
    ordre: 1,
    affiche: {
      fichier: "reel-DdNOvrLuj7-.jpg",
      alt: "Diapositive « Missions cœur du DAF » projetée pendant la séance, avec l'intervenant en médaillon",
    },
  },
  {
    lien: "https://www.instagram.com/reel/DdMoJOKsIbe/",
    titre: "À chaud, après la première séance",
    description:
      "Le retour spontané d'un participant de la cohorte Directeur Administratif et Financier, enregistré à la fin de sa première séance.",
    ordre: 2,
    /*
      ⚠️ **Pas d'image d'attente pour celui-ci, et c'est délibéré.** La
      couverture du reel est un document ouvert à l'écran, barré du bandeau
      « Veuillez vous connecter en utilisant le compte Microsoft 365 » : sur la
      page qui sert de vitrine, c'est la première chose que le visiteur verrait.
      L'aplat sobre de la carte dit moins, mais ne dit rien de faux.
    */
  },
];

const dossierDesImages = process.env.IMAGES ?? ".";
const payload = await getPayload({ config });

for (const reel of REELS) {
  const { docs } = await payload.find({
    collection: "realisations",
    where: { lien: { equals: reel.lien } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    locale: "fr",
  });
  const existante = docs[0];

  console.log(`\n▸ ${reel.titre}`);
  console.log(`  ${reel.lien}`);
  console.log(`  ${existante ? `déjà en base (#${existante.id}) — mise à jour` : "à créer"}`);
  if (reel.affiche) console.log(`  affiche : ${reel.affiche.fichier}`);

  if (!ECRIRE) continue;

  /*
    L'affiche est déposée dans `medias`, qui la convertit en WebP et en fait
    trois tailles. On la reconnaît à son texte alternatif pour ne pas en
    empiler une copie à chaque passage.
  */
  let afficheId: number | undefined;
  if (reel.affiche) {
    const { docs: deja } = await payload.find({
      collection: "medias",
      where: { alt: { equals: reel.affiche.alt } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (deja[0]) {
      afficheId = deja[0].id;
    } else {
      const media = await payload.create({
        collection: "medias",
        overrideAccess: true,
        data: { alt: reel.affiche.alt },
        file: {
          data: await readFile(`${dossierDesImages}/${reel.affiche.fichier}`),
          mimetype: "image/jpeg",
          name: reel.affiche.fichier,
          size: (await readFile(`${dossierDesImages}/${reel.affiche.fichier}`)).length,
        },
      });
      afficheId = media.id;
      console.log(`  → média #${media.id} : ${media.url}`);
    }
  }

  const donnees = {
    titre: reel.titre,
    description: reel.description,
    source: "lien" as const,
    lien: reel.lien,
    ordre: reel.ordre,
    ...(afficheId !== undefined ? { affiche: afficheId } : {}),
    _status: "published" as const,
  };

  const doc = existante
    ? await payload.update({
        collection: "realisations",
        id: existante.id,
        locale: "fr",
        overrideAccess: true,
        data: donnees,
      })
    : await payload.create({
        collection: "realisations",
        locale: "fr",
        overrideAccess: true,
        data: donnees,
      });

  const docId = "id" in doc ? doc.id : (doc as { docs?: { id: number }[] }).docs?.[0]?.id;
  console.log(`  ✓ #${docId}`);
}

if (!ECRIRE) console.log("\n(rien n'a été écrit — poser ECRIRE=1)\n");
process.exit(0);
