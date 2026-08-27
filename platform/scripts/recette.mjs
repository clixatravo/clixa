/**
 * La recette : ce qu'on vérifiait à la main après chaque déploiement.
 *
 * Les épreuves Playwright couvrent le site en développement ; celle-ci regarde
 * la production telle qu'elle répond vraiment — avec son domaine, ses
 * redirections, son cache et ses en-têtes. Ce sont deux questions différentes :
 * « le code est-il juste » et « le site en ligne est-il celui qu'on croit ».
 *
 *   node scripts/recette.mjs
 *   node scripts/recette.mjs http://localhost:3000
 *
 * Sort en 1 si quoi que ce soit manque, pour qu'on puisse l'enchaîner.
 */

const BASE = (process.argv[2] || "https://www.clixa.africa").replace(/\/$/, "");
const NAVIGATEUR =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36";

let manques = 0;
const dire = (ok, quoi, detail = "") => {
  if (!ok) manques += 1;
  console.log(`  ${ok ? "✓" : "✗"} ${quoi}${detail ? ` — ${detail}` : ""}`);
};

async function repond(chemin, options = {}) {
  const r = await fetch(BASE + chemin, {
    redirect: "manual",
    headers: { "User-Agent": NAVIGATEUR },
    ...options,
  });
  return { code: r.status, vers: r.headers.get("location"), corps: r };
}

console.log(`\nRecette de ${BASE}\n`);

// ── Le plan du site, et tout ce qu'il annonce ──────────────────────────────
console.log("Plan du site");
const plan = await (await fetch(`${BASE}/sitemap.xml`)).text();
const adresses = [...plan.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
dire(adresses.length > 20, `${adresses.length} adresses annoncées`);

let cassees = 0;
for (const a of adresses) {
  const r = await fetch(a, { headers: { "User-Agent": NAVIGATEUR } });
  if (!r.ok) {
    cassees += 1;
    console.log(`      ${r.status} ${a}`);
  }
}
dire(cassees === 0, "toutes répondent", cassees ? `${cassees} en défaut` : "");

// ── Les redirections, qu'aucune compilation ne protège ────────────────────
console.log("\nRedirections");
for (const [depuis, vers, code] of [
  ["/index.html", "/", 308],
  ["/mentions-legales.html", "/mentions-legales", 308],
  ["/politique-confidentialite.html", "/confidentialite", 308],
  ["/mon-espace", "/compte", 308],
  ["/nous-contacter", "/contact", 308],
  ["/formation/directeur-marketing", "/formations/directeur-marketing", 307],
  ["/inscription", "/formations", 307],
]) {
  const { code: recu, vers: lieu } = await repond(depuis);
  const chemin = lieu ? new URL(lieu, BASE).pathname : "";
  dire(
    recu === code && chemin === vers,
    `${depuis} → ${vers}`,
    recu === code ? "" : `reçu ${recu} → ${chemin}`,
  );
}

// ── Ce que le site raconte de lui-même ────────────────────────────────────
console.log("\nCe que voit un moteur");
const accueil = await (await fetch(BASE, { headers: { "User-Agent": NAVIGATEUR } })).text();
dire(/index, follow/.test(accueil), "les pages sont indexables");
dire(accueil.includes('"logo"'), "l'enseigne est déclarée");
const robots = await (await fetch(`${BASE}/robots.txt`)).text();
dire(/Allow: \//.test(robots) && !/Disallow: \/$/m.test(robots), "robots.txt ouvre le site");

const fiche = await (
  await fetch(`${BASE}/formations/directeur-marketing`, {
    headers: { "User-Agent": NAVIGATEUR },
  })
).text();
const canonique = fiche.match(/rel="canonical" href="([^"]+)"/)?.[1];
dire(canonique === `${BASE}/formations/directeur-marketing`, "la balise canonique désigne www");
const offre = fiche.match(/"@type":"AggregateOffer".{0,160}/)?.[0] ?? "";
dire(/lowPrice/.test(offre) && /highPrice/.test(offre), "le prix est annoncé en fourchette");

// ── Les plaquettes, calculées à la demande ────────────────────────────────
console.log("\nPlaquettes");
const parcours = adresses.filter((a) => /\/formations\/[a-z-]+$/.test(a));
let mauvaises = 0;
for (const p of parcours) {
  const r = await fetch(`${p}/plaquette`, { headers: { "User-Agent": NAVIGATEUR } });
  const octets = (await r.arrayBuffer()).byteLength;
  if (!r.ok || octets < 5000) {
    mauvaises += 1;
    console.log(`      ${r.status} ${octets} o — ${p}`);
  }
}
dire(
  mauvaises === 0,
  `${parcours.length} parcours, ${parcours.length - mauvaises} plaquettes servies`,
);

// ── Les gardes ────────────────────────────────────────────────────────────
console.log("\nGardes");
const relances = await repond("/api/relances");
dire(
  [401, 503].includes(relances.code),
  "les relances refusent sans jeton",
  `reçu ${relances.code}`,
);

const google = await repond("/api/auth/google/retour?code=x&state=inventé");
dire(
  google.code === 303 && /erreur=google/.test(google.vers ?? ""),
  "un retour Google forgé est refusé",
);

const suite = await repond("/api/auth/google?suite=https://ailleurs.test");
dire(!/ailleurs\.test/.test(suite.vers ?? ""), "la destination reste interne");

let refus = 0;
for (let i = 0; i < 26; i += 1) {
  const r = await repond(`/api/attestation/CLX-RECETTE${i % 2}`);
  if (r.code === 429) refus += 1;
}
dire(refus > 0, "la cadence finit par mordre", `${refus} refus sur 26`);

console.log(
  manques === 0
    ? "\nRecette : rien à signaler.\n"
    : `\nRecette : ${manques} point(s) à regarder.\n`,
);
process.exit(manques === 0 ? 0 : 1);
