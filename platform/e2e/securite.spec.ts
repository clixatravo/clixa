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
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/inscription\/CLX-/);
    const reference = page.url().split("/").pop()!;

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
  test("la référence est longue et tirée sur un alphabet sans confusion", async ({ page }) => {
    await page.goto(`/inscription?formation=${PARCOURS}`);
    await page.fill('input[name="nom"]', "Épreuve Référence");
    await page.fill('input[name="email"]', `ref.${Date.now()}${MARQUE}`);
    await page.fill('input[name="whatsapp"]', "+212600000000");
    await page.fill('input[name="pays"]', "Maroc");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/inscription\/CLX-/);

    const reference = page.url().split("/").pop()!;
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
  const versLeServeurDeMesure: string[] = [];
  page.on("request", (r) => {
    if (/posthog\.com/i.test(new URL(r.url()).hostname)) versLeServeurDeMesure.push(r.url());
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  expect(versLeServeurDeMesure, "aucune requête de mesure avant réponse").toHaveLength(0);

  const cookies = await page.context().cookies();
  const mesure = cookies.filter((c) => /^ph_/.test(c.name));
  expect(
    mesure.map((c) => c.name),
    "aucun cookie de mesure",
  ).toHaveLength(0);

  /*
    Et si le bandeau est là — donc la mesure branchée — il doit offrir les deux
    réponses avec le même poids. Un « Refuser » absent est un consentement
    arraché, pas donné.
  */
  const bandeau = page.getByRole("dialog", { name: "Mesure d'audience" });
  if (await bandeau.isVisible().catch(() => false)) {
    await expect(bandeau.getByRole("button", { name: "Accepter" })).toBeVisible();
    await expect(bandeau.getByRole("button", { name: "Refuser" })).toBeVisible();
  }
});
