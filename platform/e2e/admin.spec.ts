import { test, expect, type Page } from "@playwright/test";
import { MARQUE } from "./menage";

/**
 * Les boutons du back-office enregistrent-ils vraiment ?
 *
 * ── Le défaut que cette série existe pour empêcher ──────────────────────────
 * Le bouton « Contrat vérifié » posait la date avec `setValue`, puis soumettait
 * dans la foulée. `setValue` passe par l'état de React, qui n'était pas propagé
 * au moment de la soumission : l'enregistrement partait **sans la date**. La
 * requête réussissait, la page se rechargeait, et il ne s'était rien passé.
 *
 * Aucune erreur nulle part. Le champ restait vide, le courriel ne partait pas,
 * et l'étape suivante ne s'ouvrait jamais. Le défaut a tenu des heures en
 * production, et c'est un essai à la main qui l'a révélé.
 *
 * ⚠️ Les épreuves couvraient tout ce qui vient **après** la sauvegarde — le
 * crochet, les courriels, l'anti-double-envoi — et rien du clic lui-même.
 * C'est le trou que cette série ferme.
 *
 * ── Pourquoi elle se saute quand rien n'est configuré ───────────────────────
 * Elle a besoin d'un compte de back-office. Aucun mot de passe ne vit dans le
 * dépôt : la série lit `E2E_ADMIN_EMAIL` et `E2E_ADMIN_PASSWORD`, et se saute
 * proprement quand ils manquent. Une épreuve qui exige un secret absent
 * échouerait chez tout le monde sauf sur la machine où elle a été écrite.
 *
 * ⚠️ Elle ne passe **pas** par une route de développement qui ouvrirait une
 * session sans mot de passe. Une telle porte, même gardée par `NODE_ENV`, est
 * exactement le genre de garde qui s'efface quand la configuration change.
 */

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSE = process.env.E2E_ADMIN_PASSWORD;

test.describe("Back-office", () => {
  test.skip(
    !EMAIL || !PASSE,
    "E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD absents : la série du back-office est sautée.",
  );

  /** Connexion par le vrai formulaire — c'est aussi une épreuve de la page. */
  async function entrer(page: Page): Promise<void> {
    await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[name="email"]').waitFor({ timeout: 60_000 });
    await page.fill('input[name="email"]', EMAIL!);
    await page.fill('input[name="password"]', PASSE!);
    await Promise.all([
      page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 60_000 }),
      page.click('button[type="submit"], input[type="submit"]'),
    ]);
  }

  /**
   * Fabrique un dossier signé par le tunnel public, et rend sa référence.
   *
   * On passe par le site plutôt que par la base : le dossier obtenu est celui
   * qu'un vrai participant produirait, échéances et statuts compris.
   */
  async function dossierSigne(page: Page): Promise<string> {
    await page.goto("/inscription?formation=directeur-qhse");
    await page.fill('input[name="nom"]', "Épreuve Bouton");
    await page.fill('input[name="email"]', `bouton.${Date.now()}${MARQUE}`);
    await page.fill('input[name="whatsapp"]', "+212600000000");
    await page.fill('input[name="pays"]', "Maroc");
    await page.selectOption('select[name="moyen"]', "carte");
    await Promise.all([
      page.waitForURL(/\/inscription\/CLX-/, { timeout: 60_000 }),
      page.click('button[type="submit"]'),
    ]);
    const reference = page.url().split("/").pop()!;

    // Demander le contrat, puis le signer.
    await page.click('button:has-text("Demander mon contrat")');
    await page.waitForURL(/contrat=/, { timeout: 60_000 });

    await page.fill('input[name="nom"]', "Épreuve Bouton");
    await page.fill('input[name="mention"]', "Lu et approuvé");

    /*
      Le tracé se fait au doigt : on le dessine par événements de pointeur,
      seul moyen de reproduire ce que fait une main sur une toile.
    */
    const toile = page.locator("#signature-toile");
    const cadre = (await toile.boundingBox())!;
    await page.mouse.move(cadre.x + 20, cadre.y + 40);
    await page.mouse.down();
    for (let i = 1; i <= 20; i += 1) {
      await page.mouse.move(cadre.x + 20 + i * 6, cadre.y + 40 + Math.sin(i / 2) * 12);
    }
    await page.mouse.up();

    await Promise.all([
      page.waitForURL(/signature=ok/, { timeout: 60_000 }),
      page.click('button:has-text("Signer")'),
    ]);

    return reference;
  }

  /*
    ── Le cœur de l'épreuve ───────────────────────────────────────────────────
    On ne se contente pas de cliquer et de regarder l'écran : on intercepte la
    requête que le bouton envoie, et on vérifie qu'elle **porte la date**. C'est
    précisément ce qui manquait — la requête partait, réussissait, et ne
    contenait rien.
  */
  test("le bouton « Contrat vérifié » envoie vraiment la date", async ({ page }) => {
    test.setTimeout(180_000);

    const reference = await dossierSigne(page);
    await entrer(page);

    await page.goto("/admin/collections/inscriptions", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: reference }).click();
    await page.waitForURL(/\/admin\/collections\/inscriptions\/\d+/, { timeout: 60_000 });

    const bouton = page.getByRole("button", { name: /Contrat vérifié/ });
    await bouton.waitFor({ timeout: 60_000 });

    const [requete] = await Promise.all([
      page.waitForRequest(
        (r) => r.method() === "PATCH" && /\/api\/inscriptions\/\d+/.test(r.url()),
        { timeout: 60_000 },
      ),
      bouton.click(),
    ]);

    const corps = requete.postData() ?? "";
    expect(corps, "la requête doit porter contratVerifieLe").toContain("contratVerifieLe");

    /*
      Et la date doit s'être posée pour de bon : une requête qui contient le
      champ mais que le serveur refuse laisserait le même écran vide.
    */
    await expect(page.getByText(/Instructions de paiement envoyées/)).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("button", { name: /instructions de paiement/i })).toBeVisible();
  });
});
