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
import { lireLesExtraits } from "@/lib/extraits";
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
    La lecture du site, appelée telle quelle — et non recopiée ici. C'est pour
    cela que `lireLesExtraits` est exportée séparément de la version mise en
    cache : `unstable_cache` demande le contexte de Next, qu'un script n'a pas.
  */
  const vus = (await lireLesExtraits()).map((e) => e.slug);

  dire(
    "le brouillon ne sort pas de la lecture du site",
    !vus.includes(`${marque}-brouillon`),
    vus.filter((s) => s.startsWith(marque)).join(" · ") || "rien",
  );
  /*
    ⚠️ Le témoin. Sans lui, une lecture qui ne rendrait **rien** — un filtre
    trop large, une collection mal déclarée — passerait au vert sur le contrôle
    d'au-dessus, et le site n'afficherait plus aucun extrait.
  */
  dire("mais le publié, lui, se lit", vus.includes(`${marque}-publie`));

  console.log("\n▸ Ce que l'API ne laisse pas énumérer\n");

  /*
    ⚠️ Le contrôle qui manquait, et que la direction a trouvé en demandant
    simplement « la vidéo ne va pas se retrouver sur le site ? ». La page n'est
    liée nulle part et porte `noindex` — mais avec `lecturePubliee`,
    `/api/extraits` rendait la **liste entière** des extraits publiés, slug
    compris, à qui la demandait sans session. Un lien qu'on croyait non
    répertorié était énumérable.

    On éprouve donc ce que voit un anonyme : `overrideAccess: false` et aucun
    utilisateur, soit exactement ce que fait la route REST.
  */
  /*
    ⚠️ Le refus prend deux formes selon la règle d'accès, et les deux
    conviennent : une règle qui rend `false` fait **lever** un 403 — c'est le cas
    ici — tandis qu'une règle qui rend un filtre laisserait passer la requête
    avec zéro résultat. Exiger l'une des deux ferait tomber la garde sur un code
    parfaitement sain le jour où l'on changerait de forme.
  */
  let rendus = -1;
  let refuse = false;
  try {
    const anonyme = await payload.find({
      collection: "extraits",
      limit: 50,
      depth: 0,
      overrideAccess: false,
    });
    rendus = anonyme.totalDocs;
  } catch {
    refuse = true;
  }
  dire(
    "un anonyme n'obtient aucun extrait",
    refuse || rendus === 0,
    refuse ? "refusé (403)" : `${rendus} rendu(s)`,
  );

  /*
    Le témoin de ce contrôle : l'équipe, elle, doit continuer de les voir —
    sans quoi /admin afficherait une collection vide et personne ne pourrait
    plus corriger un titre.
  */
  const { docs: personnel } = await payload.find({
    collection: "utilisateurs",
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (personnel[0]) {
    const vuParLEquipe = await payload.find({
      collection: "extraits",
      limit: 50,
      depth: 0,
      overrideAccess: false,
      user: personnel[0],
    });
    dire("mais l'équipe les voit", vuParLEquipe.totalDocs > 0, `${vuParLEquipe.totalDocs} rendu(s)`);
  } else {
    console.log("  · aucun compte d'équipe en base : témoin non joué");
  }

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
