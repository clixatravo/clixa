/**
 * Éprouve les extraits partagés — ce qui sort, et ce qui ne sort pas.
 *
 *   npx payload run scripts/verifier-extraits.ts
 *
 * ── Ce qui est en jeu ───────────────────────────────────────────────────────
 * Un extrait est une adresse qu'on envoie dans un WhatsApp et qu'on ne rattrape
 * plus. Deux choses doivent tenir :
 *
 * - **un brouillon ne se lit pas** — on prépare un extrait, on le relit, et
 *   entre-temps son adresse ne doit rien rendre. Une lecture qui ignorerait le
 *   statut publierait ce que personne n'a relu ;
 * - **l'identifiant se refuse, il ne se corrige pas** — une adresse à demi
 *   réécrite se recopie de travers, et celle-ci circule.
 *
 * ⚠️ **Le fichier d'épreuve n'est pas une vraie vidéo**, et c'est voulu : ces
 * contrôles portent sur l'accès et sur la validation, pas sur la lecture. Un
 * vrai fichier ferait passer des dizaines de mégaoctets dans le magasin à chaque
 * passage, et le magasin est partagé avec la production.
 *
 * ⚠️ **Mais Payload renifle le contenu, pas l'extension.** Un buffer de texte
 * nommé `.mp4` est refusé — « File type text/plain (from extension mp4) is not
 * allowed » — et l'on cherche alors le défaut dans la collection. D'où un vrai
 * en-tête de conteneur MP4, vide de toute image : trente-deux octets qui
 * suffisent à le faire reconnaître.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

let rouges = 0;
function dire(question: string, verdict: boolean, detail = ""): void {
  if (!verdict) rouges += 1;
  console.log(`  ${verdict ? "✓" : "✗"} ${question}${detail ? ` — ${detail}` : ""}`);
}

/** Un conteneur MP4 réduit à sa boîte `ftyp` : reconnaissable, et vide. */
const MP4_VIDE = Buffer.from(
  "000000206674797069736f6d0000020069736f6d69736f32617663316d703431",
  "hex",
);

const payload = await getPayload({ config });
const marque = `epreuve-${Date.now()}`;
const aRetirer: { collection: "extraits" | "videos"; id: number }[] = [];

try {
  /* ── Un support minimal, juste pour satisfaire le champ requis ─────────── */
  const video = await payload.create({
    collection: "videos",
    overrideAccess: true,
    data: { titre: `Épreuve ${marque}` },
    file: {
      data: MP4_VIDE,
      name: `${marque}.mp4`,
      mimetype: "video/mp4",
      size: MP4_VIDE.length,
    },
  });
  aRetirer.push({ collection: "videos", id: video.id });

  console.log("\n▸ Ce qu'on ne publie pas ne se lit pas\n");

  const brouillon = await payload.create({
    collection: "extraits",
    overrideAccess: true,
    draft: true,
    data: {
      titre: "Brouillon d'épreuve",
      slug: `${marque}-brouillon`,
      fichier: video.id,
      _status: "draft",
    },
  });
  aRetirer.push({ collection: "extraits", id: brouillon.id });

  const publie = await payload.create({
    collection: "extraits",
    overrideAccess: true,
    data: {
      titre: "Publié d'épreuve",
      slug: `${marque}-publie`,
      fichier: video.id,
      _status: "published",
    },
  });
  aRetirer.push({ collection: "extraits", id: publie.id });

  /*
    `overrideAccess: false` sans utilisateur : c'est exactement ce que fait
    `lib/extraits.ts` pour le site public.
  */
  const vus = await payload.find({
    collection: "extraits",
    where: { slug: { in: [`${marque}-brouillon`, `${marque}-publie`] } },
    limit: 10,
    depth: 0,
    overrideAccess: false,
  });
  const slugsVus = vus.docs.map((d) => String(d.slug));

  dire(
    "le brouillon reste invisible au public",
    !slugsVus.includes(`${marque}-brouillon`),
    slugsVus.join(" · ") || "rien",
  );
  /*
    ⚠️ Le témoin. Sans lui, une lecture qui ne rendrait **rien** — un filtre
    trop large, une collection mal déclarée — passerait au vert sur le contrôle
    d'au-dessus, et le site n'afficherait plus aucun extrait.
  */
  dire("mais le publié, lui, se lit", slugsVus.includes(`${marque}-publie`));

  console.log("\n▸ L'identifiant de l'adresse\n");

  /*
    Les mauvaises formes passent par l'API locale comme le ferait /admin : c'est
    le validateur du champ qu'on éprouve, pas une expression recopiée ici.
  */
  for (const mauvais of ["Avec Majuscule", "avec espace", "accentué-é", "double--tiret", "-bord"]) {
    let refuse = false;
    try {
      const doc = await payload.create({
        collection: "extraits",
        overrideAccess: true,
        data: {
          titre: "Refus attendu",
          slug: mauvais,
          fichier: video.id,
          _status: "draft",
        },
      });
      aRetirer.push({ collection: "extraits", id: doc.id });
    } catch {
      refuse = true;
    }
    dire(`« ${mauvais} » est refusé`, refuse);
  }

  let accepte = true;
  try {
    const bon = await payload.create({
      collection: "extraits",
      overrideAccess: true,
      data: {
        titre: "Forme correcte",
        slug: `${marque}-daf-4-piliers`,
        fichier: video.id,
        _status: "draft",
      },
    });
    aRetirer.push({ collection: "extraits", id: bon.id });
  } catch (e) {
    accepte = false;
    console.log(`     ${String(e).slice(0, 120)}`);
  }
  dire("une forme correcte est acceptée", accepte);

  console.log("\n▸ Le plafond de 4 Mo\n");

  /*
    ⚠️ Un contrôle qui lit la source, comme `verifier-assistant.ts`. Ce qui est
    en jeu n'est ni une valeur ni un rendu, mais un **branchement** : le plafond
    de Vercel ne doit s'appliquer qu'à ce qui traverse Vercel. Le vérifier à
    l'exécution demanderait de monter une requête REST avec un corps de 5 Mo —
    et un script, par construction, ne passe jamais par là.
  */
  const source = readFileSync(path.resolve(dirname, "../src/collections/Videos.ts"), "utf8");
  dire(
    "il ne s'applique pas à l'API locale",
    /req\.payloadAPI\s*!==\s*"local"/.test(source),
    "sinon aucun extrait de cours ne pourrait être versé",
  );
  dire(
    "mais il s'applique encore à ce qui vient du réseau",
    /fichier\.size\s*>\s*PLAFOND/.test(source),
  );
} finally {
  for (const quoi of aRetirer.reverse()) {
    await payload.delete({ ...quoi, overrideAccess: true }).catch(() => {});
  }
  console.log("\n  · données d'épreuve supprimées");
}

console.log(rouges === 0 ? "\nExtraits : tout tient.\n" : `\nExtraits : ${rouges} au rouge.\n`);
process.exit(rouges === 0 ? 0 : 1);
