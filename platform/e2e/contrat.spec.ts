import { test, expect, type Page } from "@playwright/test";
import { MARQUE } from "./menage";

/**
 * Le second temps du tunnel : demander son contrat, puis le signer.
 *
 * ── Pourquoi cette série existe ─────────────────────────────────────────────
 * La pré-inscription ne coûte rien ; c'est ici que le participant s'engage, et
 * qu'un défaut coûte le plus cher. Une signature qui ne s'enregistre pas se
 * découvre au moment où l'on en aurait besoin — c'est-à-dire trop tard.
 *
 * ⚠️ Les refus valent autant que la réussite. Une signature qui accepte
 * n'importe quel nom, ou qui se laisse rejouer, ne prouve rien : la série les
 * éprouve avant d'éprouver le cas qui marche.
 */

const PARCOURS = "directeur-audit-interne";
const NOM = "Épreuve Contrat";

async function preInscrire(page: Page): Promise<string> {
  await page.goto(`/inscription?formation=${PARCOURS}`);
  await page.fill('input[name="nom"]', NOM);
  await page.fill('input[name="email"]', `contrat.${Date.now()}${MARQUE}`);
  await page.fill('input[name="whatsapp"]', "+212600000000");
  await page.fill('input[name="pays"]', "Maroc");
  await page.selectOption('select[name="moyen"]', "virement");

  const [reponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/inscription")),
    page.click('button[type="submit"]'),
  ]);
  expect(reponse.status(), `la pré-inscription a répondu ${reponse.status()}`).toBe(303);
  await page.waitForURL(/\/inscription\/CLX-/);
  return page.url().split("/").pop()!;
}

test("le contrat se demande, puis se signe", async ({ page }) => {
  const reference = await preInscrire(page);

  // Avant la demande, on ne propose pas de signer ce qu'on n'a pas lu.
  await expect(
    page.getByRole("button", { name: "Demander mon contrat de formation" }),
  ).toBeVisible();
  await expect(page.locator('form[action="/api/signature"]')).toHaveCount(0);

  await page.click('button:has-text("Demander mon contrat de formation")');
  await page.waitForURL(/contrat=ok/);

  // Le contrat est composé depuis le dossier : il se sert, et il est bien un PDF.
  const pdf = await page.request.get(`/inscription/${reference}/contrat`);
  expect(pdf.status(), "le contrat doit se composer").toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");

  const formulaire = page.locator('form[action="/api/signature"]');
  await expect(formulaire, "le formulaire de signature doit apparaître").toBeVisible();

  /*
    Un nom qui n'est pas celui du dossier ne signe pas. Sans ce refus, la
    signature ne dirait rien de plus qu'un clic.
  */
  await formulaire.locator('input[name="nom"]').fill("Quelqu'un d'autre");
  await formulaire.locator('input[name="mention"]').fill("Lu et approuvé");
  await formulaire.locator('button[type="submit"]').click();
  await page.waitForURL(/signature=nom/);

  // La mention que le contrat exige, et pas une approximation.
  const encore = page.locator('form[action="/api/signature"]');
  await encore.locator('input[name="nom"]').fill(NOM);
  await encore.locator('input[name="mention"]').fill("ok");
  await encore.locator('button[type="submit"]').click();
  await page.waitForURL(/signature=mention/);

  // Cette fois, comme il faut — la casse et les accents sont indulgents.
  const bonne = page.locator('form[action="/api/signature"]');
  await bonne.locator('input[name="nom"]').fill(NOM.toLowerCase());
  await bonne.locator('input[name="mention"]').fill("lu et approuve");
  await bonne.locator('button[type="submit"]').click();
  await page.waitForURL(/signature=ok/);

  await expect(page.getByText("Signé le", { exact: false })).toBeVisible();
  // Le formulaire se retire : on ne signe pas deux fois.
  await expect(page.locator('form[action="/api/signature"]')).toHaveCount(0);
});

test("une pré-inscription n'engage à rien tant qu'on n'a pas demandé le contrat", async ({
  page,
}) => {
  await preInscrire(page);

  /*
    Le texte compte autant que le bouton : quelqu'un qui vient de remplir un
    formulaire doit lire qu'il peut s'arrêter là. C'est la promesse du premier
    temps du tunnel, et elle ne tient que si elle est écrite.
  */
  await expect(page.getByText("rien ne vous engage encore", { exact: false })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Responsable Orientation/ }),
    "l'orientation doit être offerte avant l'engagement",
  ).toBeVisible();
});
