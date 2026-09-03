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

import { execSync } from "node:child_process";

const BASE = (process.argv[2] || "https://www.clixa.africa").replace(/\/$/, "");
const NAVIGATEUR =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36";

let manques = 0;
const dire = (ok, quoi, detail = "") => {
  if (!ok) manques += 1;
  console.log(`  ${ok ? "✓" : "✗"} ${quoi}${detail ? ` — ${detail}` : ""}`);
};

async function repond(chemin, options = {}) {
  /*
    Les en-têtes se fondent, elles ne se remplacent pas : `...options` posé
    après aurait effacé le User-Agent dès qu'un appel en fournit une autre, et
    la requête serait partie sans lui sans que rien ne le dise.
  */
  const r = await fetch(BASE + chemin, {
    redirect: "manual",
    ...options,
    headers: { "User-Agent": NAVIGATEUR, ...(options.headers ?? {}) },
  });
  return { code: r.status, vers: r.headers.get("location"), corps: r };
}

console.log(`\nRecette de ${BASE}\n`);

/*
  ── Le premier contrôle, parce qu'il conditionne tous les autres ───────────
  Un déploiement qui échoue ne remplace pas celui qui sert : le site reste
  debout et la recette passe, sur le build précédent. Sept déploiements ont
  ainsi échoué deux heures durant sans que rien ne le dise. On demande donc au
  site quel commit il porte, et on le compare au dépôt.

  Le décalage n'est pas toujours une panne — on peut avoir poussé il y a
  trente secondes, ou vérifier une adresse depuis une autre machine. C'est un
  avertissement, pas un échec : il dit où regarder.
*/
console.log("Ce qui est en ligne");
try {
  const { commit } = await (await fetch(`${BASE}/api/version`)).json();
  const local = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  if (commit === "local") {
    dire(true, "serveur de développement", "pas de commit à comparer");
  } else if (commit === local) {
    dire(true, `le site sert le dernier commit`, commit.slice(0, 8));
  } else {
    console.log(
      `  ⚠ le site sert ${commit.slice(0, 8)}, le dépôt porte ${local.slice(0, 8)}` +
        ` — un déploiement a peut-être échoué`,
    );
  }
} catch {
  dire(false, "le site répond sur /api/version", "route absente ou injoignable");
}

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

/*
  ── Les justificatifs, et ce qui les protège ────────────────────────────────
  Un reçu porte un nom, un montant et parfois un numéro de compte. Trois choses
  doivent rester vraies : la route de lecture exige une session d'équipe, la
  collection refuse d'être listée, et elle refuse d'être écrite.

  ⚠️ On demande un identifiant qui existe et un qui n'existe pas : les deux
  doivent répondre pareil. Un 404 sur l'un et un 401 sur l'autre apprendrait à
  qui essaie quels reçus existent.
*/
const recuConnu = await repond("/api/recu/1");
const recuInvente = await repond("/api/recu/999999");
dire(
  recuConnu.code === 401 && recuInvente.code === 401,
  "un justificatif ne se lit pas sans session d'équipe",
  `reçus ${recuConnu.code} et ${recuInvente.code}`,
);

/*
  Le fichier clients entier en un clic — noms, adresses, téléphones, montants,
  et toutes les demandes de rappel. La route ne vérifiait qu'une session
  quelconque, et `apprenants` en est une : n'importe quel compte participant
  l'obtenait. On ne peut pas monter une session d'équipe depuis ici ; on
  vérifie au moins que la porte est fermée à qui n'en a aucune.
*/
const exportCsv = await repond("/api/admin/export-admissions");
dire(
  exportCsv.code === 401,
  "le fichier des admissions ne sort pas sans session d'équipe",
  `reçu ${exportCsv.code}`,
);

const listeRecus = await repond("/api/recus");
dire(listeRecus.code === 403, "les justificatifs ne se listent pas", `reçu ${listeRecus.code}`);

const ecrireRecu = await repond("/api/recus", { method: "POST" });
dire(
  ecrireRecu.code === 403,
  "on ne dépose pas un justificatif par l'API",
  `reçu ${ecrireRecu.code}`,
);

/*
  Le contrat et la signature sont des routes publiques, fermées par la référence
  du dossier. Une référence inventée ne doit ouvrir ni l'un ni l'autre — et
  surtout, la signature ne doit jamais aboutir sur un dossier qui n'existe pas.
*/
const contratInvente = await repond("/inscription/CLX-RECETTE0/contrat");
dire(
  contratInvente.code === 404,
  "un contrat sans dossier répond 404",
  `reçu ${contratInvente.code}`,
);

/*
  Même clef, même garde — et une seconde question que le contrat ne se pose
  pas : le certificat refuse aussi un dossier qui existe mais n'est pas
  terminé. On ne peut pas monter de dossier « Terminée » depuis ici, mais un
  dossier inventé suffit à prouver que la porte est fermée par défaut.
*/
const certificatInvente = await repond("/inscription/CLX-RECETTE0/certificat");
dire(
  certificatInvente.code === 404,
  "un certificat sans dossier répond 404",
  `reçu ${certificatInvente.code}`,
);

const signatureInventee = await repond("/api/signature", {
  method: "POST",
  body: "dossier=CLX-RECETTE0&nom=Personne&mention=Lu+et+approuv%C3%A9",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
});
dire(
  signatureInventee.code === 303 && !/signature=ok/.test(signatureInventee.vers ?? ""),
  "on ne signe pas un dossier qui n'existe pas",
  `reçu ${signatureInventee.code} → ${signatureInventee.vers ?? "—"}`,
);

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
