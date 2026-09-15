/**
 * Extrait une image d'une vidéo, à la seconde qu'on choisit.
 *
 *   node scripts/image-de-video.mjs <vidéo> <seconde> <sortie.jpg>
 *
 * ── À quoi elle sert ────────────────────────────────────────────────────────
 * À l'affiche d'un extrait partagé. Sans elle, deux choses tombent d'un coup :
 * le lecteur montre un carré noir — que le journal note déjà comme se lisant
 * « vidéo cassée » — et WhatsApp n'a aucune vignette à mettre dans la
 * conversation, si bien que le lien paraît douteux.
 *
 * ⚠️ **La seconde se choisit, elle ne se devine pas.** La première image d'une
 * séance filmée est presque toujours noire, ou une diapositive vide avant que
 * l'orateur ne commence. C'est une décision de rédaction : on regarde, puis on
 * choisit.
 *
 * ── Pourquoi le Chrome du poste, et pas le Chromium de Playwright ───────────
 * Ces fichiers sont en H.264. Le Chromium livré avec Playwright n'a pas les
 * codecs propriétaires : `readyState` n'y dépasse jamais 0, et l'on conclut à
 * tort que le fichier est illisible. `channel: "chrome"` règle cela.
 *
 * `--allow-file-access-from-files` est nécessaire pour l'autre moitié : sans
 * lui, Chrome tient chaque fichier local pour une origine opaque, la toile est
 * « teintée » et `toDataURL` lève. On capturerait alors l'écran plutôt que
 * l'image, et l'affiche sortirait à la taille de la fenêtre au lieu de celle de
 * la vidéo.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [fichier, seconde, sortie] = process.argv.slice(2);
if (!fichier || seconde === undefined || !sortie) {
  console.error("  usage : node scripts/image-de-video.mjs <vidéo> <seconde> <sortie.jpg>");
  process.exit(1);
}

const chemin = resolve(fichier);
const navigateur = await chromium.launch({
  channel: "chrome",
  args: ["--allow-file-access-from-files"],
});
const page = await navigateur.newPage();
await page.goto(`file://${encodeURI(chemin)}`);
await page.waitForFunction(
  () => {
    const v = document.querySelector("video");
    return v && v.readyState >= 2;
  },
  { timeout: 60_000 },
);

const donnees = await page.evaluate(async (t) => {
  const v = document.querySelector("video");
  v.pause();
  v.currentTime = t;
  await new Promise((r) => v.addEventListener("seeked", r, { once: true }));
  const c = document.createElement("canvas");
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  c.getContext("2d").drawImage(v, 0, 0);
  return {
    image: c.toDataURL("image/jpeg", 0.9).split(",")[1],
    largeur: v.videoWidth,
    hauteur: v.videoHeight,
    duree: v.duration,
  };
}, Number(seconde));

writeFileSync(resolve(sortie), Buffer.from(donnees.image, "base64"));
console.log(
  `\n  ✓ ${resolve(sortie)}` +
    `\n     ${donnees.largeur} × ${donnees.hauteur}, prise à ${seconde} s` +
    ` sur ${Math.round(donnees.duree)} s\n`,
);

await navigateur.close();
