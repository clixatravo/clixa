/**
 * Verse une vidéo dans le magasin et lui donne une adresse à partager.
 *
 *   TITRE="Les 4 piliers du DAF moderne" SLUG=daf-4-piliers \
 *     ACCROCHE="…" AFFICHE=/chemin/affiche.jpg \
 *     FORMATION=directeur-administratif-et-financier PUBLIER=1 \
 *     npx payload run scripts/publier-un-extrait.ts <vidéo>
 *
 * ── Pourquoi un script, et pas /admin ───────────────────────────────────────
 * ⚠️ **Le plafond de 4 Mo d'/admin est celui de Vercel, pas le nôtre.** Un envoi
 * depuis le back-office traverse une fonction serverless, qui refuse tout corps
 * de requête au-delà de 4,5 Mo — une quinzaine de secondes de vidéo. Ici, le
 * fichier va du disque au magasin par l'API locale : aucune fonction ne le
 * porte, donc aucune limite de ce genre. C'est la seule voie praticable pour un
 * extrait de cours, qui pèse des dizaines de mégaoctets.
 *
 * ── Sans `PUBLIER=1`, il ne publie pas ──────────────────────────────────────
 * L'extrait est créé en brouillon : l'adresse répond alors 404, le temps qu'on
 * relise. Avec `PUBLIER=1`, elle répond tout de suite — c'est ce qu'on veut
 * quand le lien doit partir dans l'heure, mais **ouvrir la page avant de
 * l'envoyer** reste la règle : un lien parti dans un WhatsApp ne se rattrape
 * pas.
 *
 * ⚠️ **Des variables d'environnement, parce que `payload run` mange les
 * `--drapeaux`.** Sa propre ligne de commande les consomme avant le script :
 * mesuré, `payload run x.ts fichier --titre "…" --publier` ne laisse arriver
 * que `fichier`, et rien ne le signale — le script croit simplement qu'on a
 * oublié ses arguments. Les positionnels, eux, passent tous. C'est la raison
 * pour laquelle le reste de la maison écrit `ECRIRE=1`.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { basename, extname } from "path";
import { readFileSync, statSync } from "fs";

/**
 * Le fichier, renommé d'après l'extrait.
 *
 * ⚠️ **Le nom d'origine se retrouve dans l'adresse publique**, et celle-ci
 * figure dans la balise `og:video` et dans le lien de repli de la page. Un
 * fichier reçu par WhatsApp s'appelle « WhatsApp Video 2026-09-14 at
 * 23.12.30.mp4 » : l'adresse devient illisible une fois encodée, elle annonce
 * d'où vient le fichier et l'heure à laquelle il a été pris — et elle ne dit
 * rien de ce qu'on regarde. `daf-4-piliers.mp4` dit l'inverse.
 */
function sousLeNom(chemin: string, nom: string, type: string) {
  const donnees = readFileSync(chemin);
  return {
    data: donnees,
    name: `${nom}${extname(chemin).toLowerCase()}`,
    mimetype: type,
    size: donnees.length,
  };
}

const TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Une variable d'environnement non vide, ou rien. */
function env(nom: string): string | undefined {
  const valeur = process.env[nom];
  return valeur && valeur.trim().length > 0 ? valeur.trim() : undefined;
}

const publier = env("PUBLIER") === "1";
/*
  ⚠️ `payload run` **convertit les nombres** dans `process.argv` : un chemin qui
  n'aurait que des chiffres arriverait en entier, et `.test()` lèverait sur
  autre chose qu'une chaîne. D'où le `String()`.
*/
const fichierVideo = process.argv.slice(2).map(String)[0];
const titre = env("TITRE");
const slug = env("SLUG");
const accroche = env("ACCROCHE");
const affiche = env("AFFICHE");
const formation = env("FORMATION");

if (!fichierVideo || !titre || !slug) {
  console.error(
    '\n  usage : TITRE="…" SLUG=… [ACCROCHE="…"] [AFFICHE=image.jpg] ' +
      "[FORMATION=<slug>] [PUBLIER=1] \\\n" +
      "            npx payload run scripts/publier-un-extrait.ts <vidéo>\n",
  );
  process.exit(1);
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error(`\n  ✗ « ${slug} » n'est pas un identifiant d'adresse valide.`);
  console.error("     Minuscules, chiffres et tirets — par exemple « daf-4-piliers ».\n");
  process.exit(1);
}

const payload = await getPayload({ config });

/*
  Un slug déjà pris ne se devine pas à l'erreur de contrainte, qui parle d'index
  et de colonne. On le dit ici, avec l'adresse que cela occuperait.
*/
const { totalDocs: dejaPris } = await payload.find({
  collection: "extraits",
  where: { slug: { equals: slug } },
  limit: 0,
  overrideAccess: true,
  draft: true,
});
if (dejaPris > 0) {
  console.error(`\n  ✗ /v/${slug} est déjà pris. Choisir un autre identifiant.\n`);
  process.exit(1);
}

const poids = statSync(fichierVideo).size;
console.log(`\n  ▸ ${basename(fichierVideo)} — ${(poids / 1024 / 1024).toFixed(1)} Mo`);

const typeVideo = TYPES[extname(fichierVideo).toLowerCase()];
if (!typeVideo) {
  console.error(`\n  ✗ ${extname(fichierVideo)} n'est pas un format accepté (.mp4, .webm, .mov).\n`);
  process.exit(1);
}

const video = await payload.create({
  collection: "videos",
  data: { titre },
  file: sousLeNom(fichierVideo, slug, typeVideo),
  overrideAccess: true,
});
console.log(`     vidéo versée — ${(video as { url?: string }).url ?? "(sans adresse)"}`);

let afficheId: number | undefined;
if (affiche) {
  const typeAffiche = TYPES[extname(affiche).toLowerCase()];
  if (!typeAffiche) {
    console.error(`\n  ✗ ${extname(affiche)} n'est pas une image acceptée (.jpg, .png, .webp).\n`);
    process.exit(1);
  }
  const media = await payload.create({
    collection: "medias",
    data: { alt: titre },
    file: sousLeNom(affiche, `${slug}-affiche`, typeAffiche),
    overrideAccess: true,
  });
  afficheId = media.id;
  console.log(`     affiche versée — ${(media as { url?: string }).url ?? "(sans adresse)"}`);
} else {
  console.log("     ⚠️  sans affiche : pas de vignette dans WhatsApp, et lecteur noir.");
}

let programmeId: number | undefined;
if (formation) {
  const { docs } = await payload.find({
    collection: "programmes",
    where: { slug: { equals: formation } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (docs[0]) programmeId = docs[0].id;
  else console.log(`     ⚠️  aucun parcours « ${formation} » — le bouton ne sera pas posé.`);
}

const extrait = await payload.create({
  collection: "extraits",
  overrideAccess: true,
  draft: !publier,
  data: {
    titre,
    slug,
    ...(accroche ? { accroche } : {}),
    fichier: video.id,
    ...(afficheId ? { affiche: afficheId } : {}),
    ...(programmeId ? { programme: programmeId } : {}),
    _status: publier ? "published" : "draft",
  },
});

console.log(`\n  ✓ extrait ${publier ? "publié" : "en brouillon"} — id ${extrait.id}`);

/*
  ⚠️ **Le script ne sait pas quel site sert la base qu'il vient d'écrire**, et il
  ne doit pas faire semblant. `NEXT_PUBLIC_SITE_URL` décrit *un site* ;
  `DATABASE_URL` désigne *une base*. Les deux se règlent séparément, et c'est
  précisément ce qui arrive quand on lance ce script contre la production :
  `.env.prod` ne porte que la base, l'adresse reste celle d'`.env.local`, et le
  script imprimait « http://localhost:3000/v/… » pour un extrait bel et bien
  publié en ligne.

  Rien n'était cassé — mais un outil qui imprime une adresse fausse est
  exactement ce que ce journal passe son temps à corriger ailleurs. Il imprime
  donc le chemin, qui est vrai partout, et ne compose l'adresse entière que
  lorsqu'elle ne désigne pas une machine locale.
*/
const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(base);

console.log(`\n     /v/${slug}`);
if (base && !local) {
  console.log(`     ${base}/v/${slug}`);
} else {
  console.log(
    `\n     ⚠️  NEXT_PUBLIC_SITE_URL ${base ? `vaut « ${base} »` : "n'est pas défini"} :` +
      `\n         c'est l'adresse du site local, pas forcément celle du site qui sert` +
      `\n         cette base. Le lien à partager est <ce site>/v/${slug}.`,
  );
}

if (!publier) {
  console.log(
    "\n     (brouillon : l’adresse répond 404 tant qu’on ne l’a pas publié depuis /admin)",
  );
}
console.log("");
