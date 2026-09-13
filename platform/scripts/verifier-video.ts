/**
 * Ce qu'on accepte d'encadrer dans la page.
 *
 * ── ⚠️ Pourquoi cette garde existe ──────────────────────────────────────────
 * L'adresse d'une vidéo est saisie dans /admin et finit dans le `src` d'une
 * `<iframe>` : c'est la seule donnée du site qui **charge du code venu
 * d'ailleurs** dans la page du visiteur. Un `javascript:`, un hôte inconnu, une
 * page qui imite la nôtre pour réclamer un paiement — tout cela s'écrit dans une
 * case de texte, et rien à la compilation ne s'en plaindrait.
 *
 * `lireLaVideo` ne nettoie pas ce qu'elle reçoit : elle en **extrait un
 * identifiant**, en vérifie la forme, et recompose l'adresse depuis un hôte
 * écrit en dur. Ce script éprouve les deux moitiés — ce qui doit passer, et
 * surtout ce qui ne doit pas.
 *
 * Le calcul est pur : ni base, ni réseau, ni navigateur.
 *
 *   npx payload run scripts/verifier-video.ts
 */
import { lireLaVideo } from "@/lib/video";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  Les adresses de vidéos\n");

const ID = "dQw4w9WgXcQ"; // onze caractères, l'alphabet de YouTube

/* ── 1. Les formes qu'on colle réellement ────────────────────────────────── */
/*
  Chacune vient d'un geste différent : la barre d'adresse, le bouton
  « Partager », un code d'intégration déjà copié, une vidéo verticale prise au
  téléphone. Les quatre arrivent, et toutes doivent rendre le même lecteur.
*/
const formes: [string, string][] = [
  ["la barre d'adresse", `https://www.youtube.com/watch?v=${ID}`],
  ["le bouton Partager", `https://youtu.be/${ID}`],
  ["un code d'intégration", `https://www.youtube.com/embed/${ID}`],
  ["un short", `https://www.youtube.com/shorts/${ID}`],
  ["l'application mobile", `https://m.youtube.com/watch?v=${ID}`],
  ["sans le protocole", `youtube.com/watch?v=${ID}`],
  ["avec des espaces autour", `  https://youtu.be/${ID}  `],
];

for (const [quoi, adresse] of formes) {
  const v = lireLaVideo(adresse);
  dire(
    `${quoi} rend le même lecteur`,
    v?.embed === `https://www.youtube-nocookie.com/embed/${ID}`,
    v?.embed ?? "rien",
  );
}

/*
  ⚠️ **Le domaine sans cookie, pas youtube.com.** Le site porte un bandeau de
  consentement et n'allume aucune mesure sans accord ; encadrer un lecteur qui
  dépose ses cookies à l'affichage le contredirait. Un jour où quelqu'un
  « simplifierait » l'hôte, ce contrôle tombe.
*/
dire(
  "l'hôte est celui qui ne dépose rien avant la lecture",
  lireLaVideo(`https://youtu.be/${ID}`)?.embed.startsWith(
    "https://www.youtube-nocookie.com/embed/",
  ) === true,
);

/* ── 2. ⚠️ Les paramètres du partage sont jetés, jamais recopiés ─────────── */
/*
  YouTube ajoute `?t=42`, `&list=…`, `&si=…` au lien qu'on copie. Les garder
  ferait démarrer la vidéo au milieu, ou enchaîner sur une playlist qui n'est
  pas la nôtre — et c'est la moitié « on ne recopie pas ce qui est saisi ».
*/
const avecParametres = lireLaVideo(`https://youtu.be/${ID}?t=42&si=abcdef`);
dire(
  "un lien partagé perd ses paramètres",
  avecParametres?.embed === `https://www.youtube-nocookie.com/embed/${ID}`,
  avecParametres?.embed ?? "rien",
);

/* ── 3. Vimeo ────────────────────────────────────────────────────────────── */

dire(
  "une page Vimeo rend son lecteur",
  lireLaVideo("https://vimeo.com/123456789")?.embed === "https://player.vimeo.com/video/123456789",
);
dire(
  "un lecteur Vimeo déjà copié aussi",
  lireLaVideo("https://player.vimeo.com/video/123456789")?.embed ===
    "https://player.vimeo.com/video/123456789",
);
dire(
  "Vimeo n'invente pas de vignette",
  lireLaVideo("https://vimeo.com/123456789")?.vignette === undefined,
);

/* ── 4. ⚠️ Ce qui ne doit rien rendre ────────────────────────────────────── */
/*
  C'est la moitié qui compte. Chacune de ces adresses est *valide* pour le
  navigateur : ce n'est pas leur forme qui les rend dangereuses, c'est ce
  qu'elles chargeraient. Une seule qui passerait, et l'`<iframe>` de la page
  porterait autre chose que ce que l'équipe croyait poser.
*/
const refus: [string, unknown][] = [
  ["un javascript:", "javascript:alert(1)"],
  ["un data:", "data:text/html,<script>alert(1)</script>"],
  ["un hôte inconnu", "https://exemple.test/watch?v=dQw4w9WgXcQ"],
  /*
    ⚠️ Celui-ci est le piège : l'hôte *contient* youtube.com sans en être. Un
    contrôle écrit avec `includes()` plutôt qu'une égalité de nom d'hôte le
    laisserait passer.
  */
  ["un hôte qui imite YouTube", "https://youtube.com.exemple.test/watch?v=dQw4w9WgXcQ"],
  ["un sous-domaine qui n'est pas le nôtre", "https://evil.youtube.com.attaquant.test/embed/x"],
  ["un identifiant trop court", "https://youtu.be/abc"],
  ["un identifiant trop long", `https://youtu.be/${ID}XXXX`],
  ["un identifiant qui remonte d'un cran", "https://youtu.be/../../admin"],
  ["une page YouTube qui n'est pas une vidéo", "https://www.youtube.com/@clixa"],
  ["un lien YouTube sans identifiant", "https://www.youtube.com/watch"],
  ["un identifiant Vimeo trop court", "https://vimeo.com/123"],
  ["un identifiant Vimeo qui n'en est pas un", "https://vimeo.com/staffpicks"],
  ["une chaîne vide", ""],
  ["des espaces seuls", "   "],
  ["autre chose qu'une chaîne", 42],
  ["rien du tout", undefined],
  ["null", null],
];

for (const [quoi, adresse] of refus) {
  dire(`${quoi} ne rend rien`, lireLaVideo(adresse) === undefined, String(lireLaVideo(adresse)));
}

/* ── 5. ⚠️ L'identifiant ne ressort jamais tel qu'il est entré ───────────── */
/*
  Le seul morceau de l'adresse qui vienne de la saisie est l'identifiant, et il
  a passé l'expression. Ce contrôle vérifie qu'il n'y a pas d'autre chemin :
  rien de ce qui suit l'identifiant dans l'adresse saisie ne se retrouve dans
  l'adresse rendue.
*/
const injecte = lireLaVideo(`https://youtu.be/${ID}?x=%22%3E%3Cscript%3E`);
dire(
  "rien de la requête saisie ne survit dans l'adresse rendue",
  injecte?.embed === `https://www.youtube-nocookie.com/embed/${ID}` &&
    !injecte.embed.includes("script"),
  injecte?.embed ?? "rien",
);

/* ── 6. La vignette suit la même règle ───────────────────────────────────── */

dire(
  "la vignette YouTube se compose du même identifiant",
  lireLaVideo(`https://youtu.be/${ID}`)?.vignette === `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
);

console.log(
  manques === 0
    ? "\n  ✓ Tout tient.\n"
    : `\n  ✗ ${manques} contrôle(s) au rouge — l'iframe accepterait ce qu'elle ne devrait pas.\n`,
);

if (manques > 0) process.exit(1);
