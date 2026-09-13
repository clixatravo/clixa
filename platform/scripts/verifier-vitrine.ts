/**
 * Ce que la page « Ils l'ont fait » montre, et ce qu'elle ne montre pas.
 *
 * ── Deux moitiés, et la seconde est celle qui compte ────────────────────────
 * La page réunit les témoignages et les séances filmées. Ce sont des visages de
 * participants réels : une réalisation en préparation qui paraîtrait avant
 * relecture ne se rattrape pas, et un lien qu'on ne sait pas lire encadrerait
 * n'importe quoi dans la page.
 *
 * Le premier temps est pur — la traduction d'une ligne de base en carte. Le
 * second touche la base : c'est le seul moyen d'éprouver `lecturePubliee`, qui
 * ne se lit pas dans le code de la page. Tout ce qui est créé est supprimé.
 *
 *   npx payload run scripts/verifier-vitrine.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { versRealisation } from "@/lib/payload";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const marque = `VERIF-VITRINE-${Date.now()}`;

console.log("\n▸ D'une ligne de base à une carte\n");

/* ── 1. Un lien reconnu devient un lecteur ───────────────────────────────── */

const surLien = versRealisation({
  id: 1,
  titre: "Séance DAF",
  description: "Quatre heures en visio.",
  source: "lien",
  lien: "https://youtu.be/dQw4w9WgXcQ",
});
dire(
  "un lien YouTube donne son lecteur",
  surLien.embed === "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  surLien.embed ?? "rien",
);
dire(
  "et la vignette du fournisseur sert d'affiche",
  surLien.affiche === "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  surLien.affiche ?? "rien",
);

/* ── 2. ⚠️ Une affiche déposée l'emporte sur celle du fournisseur ────────── */
/*
  C'est un choix de l'équipe, et il vaut mieux que l'image que YouTube tire au
  hasard d'une vidéo. L'inverse ferait déposer une affiche sans effet visible —
  un réglage qui ne fait rien est pire qu'un réglage absent.
*/
const avecAffiche = versRealisation({
  id: 2,
  titre: "Séance DAF",
  source: "lien",
  lien: "https://youtu.be/dQw4w9WgXcQ",
  affiche: { url: "https://exemple.blob/affiche.webp", alt: "La promotion en séance" },
});
dire(
  "l'affiche déposée passe devant la vignette YouTube",
  avecAffiche.affiche === "https://exemple.blob/affiche.webp",
  avecAffiche.affiche ?? "rien",
);
dire(
  "et son texte alternatif suit",
  avecAffiche.afficheAlt === "La promotion en séance",
  avecAffiche.afficheAlt ?? "rien",
);

/* ── 3. ⚠️ Une adresse qu'on ne sait pas lire ne rend rien ───────────────── */
/*
  La carte se contente alors de son titre. Le contraire — encadrer l'adresse
  telle qu'elle a été saisie — est exactement ce que `lib/video.ts` existe pour
  empêcher : c'est la seule donnée du site qui charge du code venu d'ailleurs.
*/
const lienDouteux = versRealisation({
  id: 3,
  titre: "Séance",
  source: "lien",
  lien: "javascript:alert(1)",
});
dire("un lien qu'on ne reconnaît pas ne rend aucun lecteur", lienDouteux.embed === undefined);
dire("ni aucune affiche inventée", lienDouteux.affiche === undefined);
dire("mais la carte garde son titre", lienDouteux.titre === "Séance");

/* ── 4. Le choix de la source fait foi ───────────────────────────────────── */
/*
  Un lien resté dans la case après qu'on a basculé sur « fichier » ne doit pas
  reparaître : l'écran ne le montre plus, la page ne doit pas le lire.
*/
const surFichier = versRealisation({
  id: 4,
  titre: "Clip",
  source: "fichier",
  lien: "https://youtu.be/dQw4w9WgXcQ",
  fichier: { url: "https://exemple.blob/clip.mp4" },
});
dire("« fichier » ignore le lien resté dans la case", surFichier.embed === undefined);
dire("et sert le fichier déposé", surFichier.fichier === "https://exemple.blob/clip.mp4");

/* ── 5. Rien de renseigné : une carte, sans lecteur ──────────────────────── */

const vide = versRealisation({ id: 5, titre: "Séance à venir", source: "fichier" });
dire(
  "sans fichier ni lien, la carte n'offre rien à lire",
  vide.embed === undefined && vide.fichier === undefined,
);

/* ── La base, maintenant ─────────────────────────────────────────────────── */

const payload = await getPayload({ config });
const aRetirer: { collection: "realisations"; id: number | string }[] = [];

try {
  console.log("\n▸ Ce qu'un visiteur anonyme a le droit de voir\n");

  /*
    ⚠️ **Le brouillon est le cas dangereux.** Une séance filmée en préparation
    porte des visages que personne n'a encore relus, et l'on ne rattrape pas une
    vidéo parue une heure sur le site d'une campagne.
  */
  const brouillon = await payload.create({
    collection: "realisations",
    locale: "fr",
    overrideAccess: true,
    draft: true,
    data: {
      titre: `${marque} en préparation`,
      source: "lien",
      lien: "https://youtu.be/dQw4w9WgXcQ",
      _status: "draft",
    },
  });
  aRetirer.push({ collection: "realisations", id: brouillon.id });

  const vuAnonyme = await payload.find({
    collection: "realisations",
    where: { titre: { like: marque } },
    overrideAccess: false,
    locale: "fr",
  });
  dire(
    "une réalisation en brouillon reste invisible du public",
    vuAnonyme.totalDocs === 0,
    `${vuAnonyme.totalDocs} rendue(s)`,
  );

  /*
    ── Le témoin ───────────────────────────────────────────────────────────
    Sans lui, une règle d'accès qui refuserait **tout** passerait au vert : la
    page resterait vide quoi qu'on publie, et personne ne verrait la différence
    avant que la direction ne s'en plaigne.
  */
  const publiee = await payload.create({
    collection: "realisations",
    locale: "fr",
    overrideAccess: true,
    data: {
      titre: `${marque} publiée`,
      source: "lien",
      lien: "https://youtu.be/dQw4w9WgXcQ",
      _status: "published",
    },
  });
  aRetirer.push({ collection: "realisations", id: publiee.id });

  const publiques = await payload.find({
    collection: "realisations",
    where: { titre: { like: marque } },
    overrideAccess: false,
    locale: "fr",
  });
  dire(
    "une réalisation publiée, elle, sort bien",
    publiques.totalDocs === 1,
    `${publiques.totalDocs} rendue(s)`,
  );

  console.log("\n▸ Ce que la collection refuse d'enregistrer\n");

  /*
    ⚠️ Le refus arrive au moment où la personne a encore l'adresse sous les
    yeux. Sans lui, un lien mal recopié s'enregistre sans un mot et la page se
    contente de ne rien montrer : la vidéo « ne marche pas », et l'on cherche le
    défaut dans le code alors qu'il est dans la case.
  */
  let refuse = false;
  try {
    const mauvaise = await payload.create({
      collection: "realisations",
      locale: "fr",
      overrideAccess: true,
      data: {
        titre: `${marque} mauvaise adresse`,
        source: "lien",
        lien: "https://exemple.test/ma-video",
        _status: "draft",
      },
    });
    aRetirer.push({ collection: "realisations", id: mauvaise.id });
  } catch {
    refuse = true;
  }
  dire("une adresse qui n'est pas une vidéo reconnue est refusée à la saisie", refuse);

  /*
    Et le témoin de ce refus : une adresse reconnue passe. Une validation qui
    refuserait tout empêcherait l'équipe de publier quoi que ce soit.
  */
  let acceptee = true;
  try {
    const bonne = await payload.create({
      collection: "realisations",
      locale: "fr",
      overrideAccess: true,
      data: {
        titre: `${marque} bonne adresse`,
        source: "lien",
        lien: "https://vimeo.com/123456789",
        _status: "draft",
      },
    });
    aRetirer.push({ collection: "realisations", id: bonne.id });
  } catch {
    acceptee = false;
  }
  dire("une adresse Vimeo ordinaire passe", acceptee);
} finally {
  for (const d of aRetirer) {
    await payload.delete({ collection: d.collection, id: d.id, overrideAccess: true });
  }
  console.log(`\n  (${aRetirer.length} document(s) d'épreuve retiré(s))`);
}

console.log(manques === 0 ? "\n  ✓ Tout tient.\n" : `\n  ✗ ${manques} contrôle(s) au rouge.\n`);

if (manques > 0) process.exit(1);
process.exit(0);
