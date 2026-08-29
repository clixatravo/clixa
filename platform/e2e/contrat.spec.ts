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
    Le tracé se fait au doigt sur téléphone et à la souris sur ordinateur : un
    seul jeu d'événements « pointer » couvre les deux. On imite ici la main —
    poser, déplacer, lever — plutôt que d'écrire directement dans le champ
    caché, qui ne prouverait que l'existence du champ.
  */
  const tracer = async () => {
    /*
      On attend que la toile ait une largeur : dessiner avant que la mise en
      page soit posée laisse le trait dans le vide, et la signature est refusée
      pour « cadre vide » alors qu'on vient de tracer. C'est arrivé en
      intégration continue, où la machine est plus lente qu'ici.
    */
    await page
      .locator("#signature-toile")
      .evaluate((c) => (c as HTMLCanvasElement).clientWidth > 0 || Promise.reject());
    await page.evaluate(() => {
      const c = document.querySelector("#signature-toile") as HTMLCanvasElement | null;
      if (!c) throw new Error("cadre de signature absent");
      const r = c.getBoundingClientRect();
      const evt = (type: string, x: number, y: number) =>
        c.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 1,
            pointerType: "touch",
            isPrimary: true,
            bubbles: true,
            cancelable: true,
            clientX: r.left + x,
            clientY: r.top + y,
          }),
        );
      evt("pointerdown", 20, 60);
      for (let i = 0; i <= 40; i += 1) evt("pointermove", 20 + i * 5, 60 - Math.sin(i / 4) * 25);
      evt("pointerup", 220, 60);
    });
  };

  /*
    Un nom qui n'est pas celui du dossier ne signe pas. Sans ce refus, la
    signature ne dirait rien de plus qu'un clic.
  */
  await formulaire.locator('input[name="nom"]').fill("Quelqu'un d'autre");
  await formulaire.locator('input[name="mention"]').fill("Lu et approuvé");
  await tracer();
  await formulaire.locator('button[type="submit"]').click();
  await page.waitForURL(/signature=nom/);

  /*
    Un cadre vide n'est pas une signature. Sans ce refus, le tracé serait
    décoratif — et le contrat porterait un blanc là où l'on attend une main.
  */
  const sansTrace = page.locator('form[action="/api/signature"]');
  await sansTrace.locator('input[name="nom"]').fill(NOM);
  await sansTrace.locator('input[name="mention"]').fill("Lu et approuvé");
  await sansTrace.locator('button[type="submit"]').click();
  await page.waitForURL(/signature=trace/);

  // La mention que le contrat exige, et pas une approximation.
  const encore = page.locator('form[action="/api/signature"]');
  await encore.locator('input[name="nom"]').fill(NOM);
  await encore.locator('input[name="mention"]').fill("ok");
  await tracer();
  await encore.locator('button[type="submit"]').click();
  await page.waitForURL(/signature=mention/);

  // Cette fois, comme il faut — la casse et les accents sont indulgents.
  const bonne = page.locator('form[action="/api/signature"]');
  await bonne.locator('input[name="nom"]').fill(NOM.toLowerCase());
  await bonne.locator('input[name="mention"]').fill("lu et approuve");
  await tracer();
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
  /*
    `.first()` parce que la page le dit deux fois — dans « Ce qu'il reste à
    faire » et dans le bloc du contrat. C'est voulu : la promesse vaut d'être
    répétée là où l'on hésite. L'épreuve vérifie qu'elle est dite, pas combien
    de fois.
  */
  await expect(
    page.getByText("rien ne vous engage encore", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Responsable Orientation/ }),
    "l'orientation doit être offerte avant l'engagement",
  ).toBeVisible();
});
