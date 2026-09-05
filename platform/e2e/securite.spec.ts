import { expect, test } from "@playwright/test";
import { MARQUE } from "./menage";

/**
 * Ce qu'un audit a trouvé, et qui ne doit pas revenir.
 *
 * Chacune de ces épreuves correspond à un défaut réel, constaté dans le code
 * puis corrigé. Aucune n'est une précaution de principe.
 */

const PARCOURS = "directeur-administratif-et-financier";

test.describe("Sécurité", () => {
  /*
    ── L'attestation servait du HTML non échappé ────────────────────────────
    Le nom vient du formulaire public et était interpolé tel quel dans un
    document `text/html`. Une balise dans le nom s'exécutait chez qui ouvrait
    l'attestation, avec l'origine du site — l'équipe, la plupart du temps,
    puisque c'est elle qui les consulte.
  */
  test("une balise dans le nom ne s'exécute pas dans l'attestation", async ({ page, request }) => {
    await page.goto(`/inscription?formation=${PARCOURS}`);
    await page.fill('input[name="nom"]', "<script>window.__perce=1</script>Épreuve");
    await page.fill('input[name="email"]', `xss.${Date.now()}${MARQUE}`);
    await page.fill('input[name="whatsapp"]', "+212600000000");
    await page.fill('input[name="pays"]', "Maroc");
    // Comme un visiteur : la case est obligatoire, le navigateur refuse sans elle.
    await page.check('input[name="consentement"]');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/inscription\/CLX-/);
    const reference = new URL(page.url()).pathname.split("/").pop()!;

    const doc = await (await request.get(`/api/attestation/${reference}`)).text();
    expect(doc, "la balise ne doit pas être servie telle quelle").not.toContain(
      "<script>window.__perce",
    );
    expect(doc, "elle doit être visible comme du texte").toContain("&lt;script&gt;");
  });

  /*
    ── La référence est une clef, pas un numéro d'ordre ─────────────────────
    Elle ouvre la fiche du participant et l'annonce de transfert. Elle était
    tirée avec `Math.random()`, dont l'état interne se reconstitue à partir de
    quelques sorties, sur cinq caractères en base 36.
  */
  /*
    ⚠️ **Cette épreuve extrait la référence elle-même**, alors que les autres
    passent par `referenceDeLAdresse`. Ce n'est pas un oubli : ce helper
    vérifie la même forme, et s'en servir ici ferait reposer la garde de
    sécurité sur un outil d'épreuve. Le jour où quelqu'un l'assouplirait, cette
    épreuve cesserait de prouver quoi que ce soit — sans passer au rouge.
  */
  test("la référence est longue et tirée sur un alphabet sans confusion", async ({ page }) => {
    await page.goto(`/inscription?formation=${PARCOURS}`);
    await page.fill('input[name="nom"]', "Épreuve Référence");
    await page.fill('input[name="email"]', `ref.${Date.now()}${MARQUE}`);
    await page.fill('input[name="whatsapp"]', "+212600000000");
    await page.fill('input[name="pays"]', "Maroc");
    // Comme un visiteur : la case est obligatoire, le navigateur refuse sans elle.
    await page.check('input[name="consentement"]');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/inscription\/CLX-/);

    const reference = new URL(page.url()).pathname.split("/").pop()!;
    // Huit symboles sur trente-deux : quarante bits.
    expect(reference).toMatch(/^CLX-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    // I, O, 0 et 1 sont exclus : une référence se dicte au téléphone.
    expect(reference.slice(4)).not.toMatch(/[IO01]/);
  });

  /*
    ── Les routes publiques n'avaient aucun frein ───────────────────────────
    Le registre de l'attestation est éprouvé plutôt que celui de l'inscription :
    il ne consomme pas le budget des autres épreuves, qui créent des dossiers.
  */
  test("marteler l'attestation finit par recevoir un 429", async ({ request }) => {
    const codes: number[] = [];
    for (let i = 0; i < 24; i += 1) {
      const r = await request.get(`/api/attestation/CLX-NEXISTE`, { maxRedirects: 0 });
      codes.push(r.status());
    }
    expect(codes.filter((c) => c === 429).length, "le frein doit finir par mordre").toBeGreaterThan(
      0,
    );
    expect(codes[0], "les premiers appels doivent passer").not.toBe(429);
  });

  /*
    ── Les dépôts de fichiers acceptaient le SVG ────────────────────────────
    Un SVG est un document XML : il accepte `<script>`. Servi depuis notre
    origine, il s'exécuterait avec les droits du site. L'endpoint demande une
    session, mais la règle se vérifie sur la configuration elle-même.
  */
  test("le SVG n'est plus un format accepté", async () => {
    const { Medias } = await import("../src/collections/Medias");
    const acceptes =
      Medias.upload && typeof Medias.upload === "object" ? Medias.upload.mimeTypes : undefined;
    expect(acceptes, "les formats doivent être énumérés").toBeTruthy();
    expect(acceptes).not.toContain("image/svg+xml");
  });
});

/*
  ── L'indicatif est obligatoire, et c'est une garde ─────────────────────────
  Sans lui, le numéro ne désigne personne hors de son pays : le bouton WhatsApp
  du back-office refuse de composer, et l'équipe se retrouve à deviner. Un
  dossier est déjà arrivé avec « 0689324243 » — marocain pour qui le lit,
  injoignable pour qui appelle.
*/
test("un numéro sans indicatif est refusé, aux deux portes", async ({ request }) => {
  const rappel = await request.post("/api/demande-rappel", {
    form: {
      nom: "Épreuve Indicatif",
      email: `indicatif.${Date.now()}${MARQUE}`,
      whatsapp: "0689324243",
      origine: "/contact",
      consentement: "oui",
    },
    maxRedirects: 0,
  });
  expect(rappel.headers()["location"], "le rappel doit refuser").toContain("erreur=indicatif");

  const inscription = await request.post("/api/inscription", {
    form: {
      formation: "directeur-audit-interne",
      nom: "Épreuve Indicatif",
      email: `indicatif.${Date.now()}${MARQUE}`,
      whatsapp: "0689324243",
      pays: "Maroc",
      plan: "P1",
      moyen: "virement",
      payeur: "particulier",
      consentement: "oui",
    },
    maxRedirects: 0,
  });
  expect(inscription.headers()["location"], "la pré-inscription doit refuser").toContain(
    "erreur=indicatif",
  );
});

/**
 * ⚠️ Rien ne pose de cookie de mesure avant que le visiteur ait répondu.
 *
 * L'invariant vaut dans les deux configurations, et c'est ce qui le rend utile :
 *
 *  - aujourd'hui, `NEXT_PUBLIC_POSTHOG_KEY` n'est pas posée en production. Aucune
 *    mesure ne tourne, et le bandeau ne paraît pas — demander l'accord pour des
 *    traceurs qu'on n'utilise pas ferait cliquer sans lire ;
 *  - le jour où la direction branchera la mesure, le bandeau paraîtra et la
 *    librairie ne se chargera qu'après un « Accepter ».
 *
 * Ce que cette épreuve attrape, c'est le cas qu'on redoute entre les deux :
 * quelqu'un pose la clef, la mesure démarre, et personne ne s'aperçoit que le
 * bandeau n'a pas suivi.
 */
test("aucune mesure d'audience ne démarre sans réponse du visiteur", async ({ page }) => {
  /*
    ⚠️ On guette les requêtes vers **le serveur de mesure**, pas les fichiers
    servis par le site. Un premier jet visait toute URL contenant « posthog » :
    il tombait en rouge sur `_next/static/chunks/…posthog-js….js`, que
    Turbopack sert d'avance en développement — un fichier téléchargé mais
    jamais exécuté, qui ne mesure rien et ne pose aucun cookie. L'épreuve
    accusait le paquet au lieu du traceur.

    Ce qui compte est ce qui sort vers l'extérieur, et ce qui se dépose sur
    l'appareil du visiteur.
  */
  /*
    ⚠️ **Deux traceurs, une seule règle.** L'épreuve ne visait que PostHog. Le
    jour où le Pixel Meta a été branché, elle serait restée verte pendant qu'un
    pixel partait sans accord — c'est mot pour mot ce qui est arrivé à la garde
    de `api/recu`, écrite une fois et absente deux portes plus loin. On guette
    donc les deux serveurs, et les cookies des deux.
  */
  const MESUREURS = /(^|\.)(posthog\.com|facebook\.net|facebook\.com)$/i;
  const versLeServeurDeMesure: string[] = [];
  page.on("request", (r) => {
    if (MESUREURS.test(new URL(r.url()).hostname)) versLeServeurDeMesure.push(r.url());
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  expect(versLeServeurDeMesure, "aucune requête de mesure avant réponse").toHaveLength(0);

  const cookies = await page.context().cookies();
  const mesure = cookies.filter((c) => /^(ph_|_fbp$|_fbc$)/.test(c.name));
  expect(
    mesure.map((c) => c.name),
    "aucun cookie de mesure",
  ).toHaveLength(0);

  /*
    Et si le bandeau est là — donc la mesure branchée — il doit offrir les deux
    réponses avec le même poids. Un « Refuser » absent est un consentement
    arraché, pas donné.
  */
  /*
    ⚠️ Et le `<noscript><img>` du code de Meta ne doit être nulle part. Il
    appelle `facebook.com/tr` à l'affichage, **sans passer par le moindre
    script** : aucune vérification de consentement ne peut l'arrêter, et il
    signalerait la visite de ceux qui ont refusé. C'est le seul morceau du
    snippet officiel qu'aucune garde ne rattrape — d'où une épreuve sur le
    HTML lui-même, et non sur le comportement.
  */
  const html = await page.content();
  expect(html, "pas de pixel en noscript").not.toContain("facebook.com/tr");

  const bandeau = page.getByRole("dialog", { name: "Mesure d'audience" });
  if (await bandeau.isVisible().catch(() => false)) {
    await expect(bandeau.getByRole("button", { name: "Accepter" })).toBeVisible();
    await expect(bandeau.getByRole("button", { name: "Refuser" })).toBeVisible();
  }
});

/**
 * ⚠️ Le consentement se refuse au serveur, pas dans la case.
 *
 * Une case `required` n'engage que le navigateur : elle se contourne en
 * retirant l'attribut depuis les outils de développement, et elle n'existe pas
 * du tout pour qui poste directement sur la route. Une preuve de consentement
 * qui ne tient qu'à un attribut HTML ne prouve rien le jour où quelqu'un la
 * conteste — ce qui est précisément le jour où elle sert.
 *
 * L'épreuve poste donc **sans la case**, comme le ferait un script, et vérifie
 * que les deux portes refusent.
 */
test("sans consentement, ni le rappel ni la pré-inscription n'aboutissent", async ({ request }) => {
  const rappel = await request.post("/api/demande-rappel", {
    form: {
      nom: "Épreuve Consentement",
      email: `consentement.${Date.now()}${MARQUE}`,
      whatsapp: "+212600000000",
      origine: "/contact",
      // pas de champ « consentement » : la case n'a pas été cochée
    },
    maxRedirects: 0,
  });
  expect(rappel.headers()["location"], "le rappel doit refuser").toContain("erreur=consentement");

  const inscription = await request.post("/api/inscription", {
    form: {
      formation: "directeur-audit-interne",
      nom: "Épreuve Consentement",
      email: `consentement.${Date.now()}${MARQUE}`,
      whatsapp: "+212600000000",
      pays: "Maroc",
      plan: "P1",
      moyen: "virement",
      payeur: "particulier",
      // pas de champ « consentement » non plus : c'est tout l'objet de l'épreuve
    },
    maxRedirects: 0,
  });
  expect(inscription.headers()["location"], "la pré-inscription doit refuser").toContain(
    "erreur=consentement",
  );

  /*
    Et la même requête, la case cochée, doit passer : une garde qui refuse tout
    protégerait aussi bien, et casserait le tunnel sans qu'on le voie.
  */
  const avecAccord = await request.post("/api/demande-rappel", {
    form: {
      nom: "Épreuve Consentement",
      email: `consentement.ok.${Date.now()}${MARQUE}`,
      whatsapp: "+212600000000",
      origine: "/contact",
      consentement: "oui",
    },
    maxRedirects: 0,
  });
  expect(avecAccord.headers()["location"], "avec l'accord, la demande passe").toContain("envoye=1");
});

/**
 * ⚠️ Le Pixel Meta ne part qu'après un accord — et il part alors vraiment.
 *
 * L'épreuve au-dessus prouve qu'il ne part pas. Celle-ci prouve l'autre
 * moitié, sans laquelle la première serait satisfaite par un pixel cassé : une
 * garde qui n'a jamais vu la chose qu'elle laisse passer ne dit rien de plus
 * qu'un traceur en panne.
 *
 * ⚠️ **Aucune requête n'atteint Meta.** Elles sont interceptées et coupées :
 * on observe la tentative, pas son arrivée. Sans cela, chaque série d'épreuves
 * ajouterait des conversions inventées au tableau de bord de la campagne — et
 * l'identifiant employé ici est faux de toute façon, en développement comme en
 * intégration continue.
 */
test("le pixel Meta attend l'accord, puis se charge", async ({ page }) => {
  const tentatives: string[] = [];
  await page.route(/facebook\.(net|com)/, async (route) => {
    tentatives.push(route.request().url());
    await route.abort();
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const bandeau = page.getByRole("dialog", { name: "Mesure d'audience" });
  await expect(
    bandeau,
    "sans bandeau, cette épreuve ne prouve rien : le pixel n'est pas configuré",
  ).toBeVisible();

  expect(tentatives, "rien vers Meta tant que la question est posée").toHaveLength(0);

  await bandeau.getByRole("button", { name: "Accepter" }).click();

  /*
    Et sans recharger la page : quelqu'un qui accepte ne doit pas avoir à le
    faire pour que sa visite compte. C'est ce que `useSyncExternalStore` sert à
    obtenir dans `PixelMeta`, et c'est ce qu'on vérifie ici.
  */
  await expect
    .poll(() => tentatives.length, { message: "le script de Meta doit être demandé" })
    .toBeGreaterThan(0);
  expect(tentatives.some((u) => u.includes("fbevents.js"))).toBe(true);
});

/**
 * ⚠️ `Lead` part après un envoi réussi, et une seule fois.
 *
 * L'épreuve précédente prouve que le pixel se charge. Celle-ci prouve ce qu'il
 * dit — et surtout **quand** : Meta optimise la diffusion sur l'événement
 * déclaré, si bien qu'un `Lead` posé au chargement du formulaire lui
 * apprendrait à chercher des gens qui ouvrent un formulaire et s'en vont.
 *
 * ⚠️ **`fbq` est remplacé avant le chargement de la page**, et rien ne part sur
 * le réseau — ni vers Meta, ni vers son CDN. `PixelMeta` s'efface devant un
 * `fbq` déjà posé : on mesure donc notre propre logique, sans dépendre d'un
 * script tiers dont l'absence rendrait l'épreuve rouge pour une mauvaise
 * raison.
 */
test("Lead ne part qu'après un envoi réussi, et une seule fois", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { fbq?: unknown; __appels?: unknown[][] };
    w.__appels = [];
    w.fbq = (...args: unknown[]) => w.__appels!.push(args);
  });

  const leads = async () =>
    page.evaluate(() =>
      ((window as unknown as { __appels?: unknown[][] }).__appels ?? []).filter(
        (a) => a[0] === "track" && a[1] === "Lead",
      ),
    );

  await page.goto("/contact");

  const bandeau = page.getByRole("dialog", { name: "Mesure d'audience" });
  await expect(bandeau, "le pixel doit être configuré, sinon rien n'est prouvé").toBeVisible();
  await bandeau.getByRole("button", { name: "Accepter" }).click();

  expect(await leads(), "rien avant l'envoi — ouvrir un formulaire n'est pas un lead").toHaveLength(
    0,
  );

  await page.fill('form input[name="nom"]', "Épreuve Lead");
  await page.fill('form input[name="whatsapp"]', "+212600000000");
  await page.check('form input[name="consentement"]');
  await page.click('form button[type="submit"]');
  await page.waitForURL(/envoye=1/);
  /*
    ⚠️ L'envoi recharge le document : l'événement ne peut partir qu'une fois
    React hydraté. Comparer aussitôt après `waitForURL` mesurait une page qui
    n'avait pas encore exécuté son effet — et donnait zéro, pour une raison qui
    n'a rien à voir avec la règle éprouvée.
  */
  await expect(page.getByText("Votre demande est bien enregistrée")).toBeVisible();
  await expect.poll(async () => (await leads()).length).toBe(1);

  const apres = await leads();
  expect(apres, "un lead, et un seul").toHaveLength(1);
  expect(apres[0]![2], "étiqueté, pour ne pas se confondre avec une pré-inscription").toMatchObject(
    { content_name: "demande-de-rappel" },
  );

  /*
    Et il ne repart pas au rechargement : `?envoye=1` est toujours dans l'URL,
    et c'est le verrou de `localStorage` qui tient — celui du paramètre ne
    suffirait pas.
  */
  await page.reload();
  await page.waitForLoadState("networkidle");
  expect(await leads(), "un rechargement ne compte pas une seconde conversion").toHaveLength(0);
});
