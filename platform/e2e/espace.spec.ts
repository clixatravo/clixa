import { expect, test, type Page } from "@playwright/test";
import { MARQUE } from "./menage";

/**
 * « Mon espace » sur téléphone.
 *
 * Le débordement horizontal est déjà éprouvé sur toutes les pages publiques,
 * mais `/compte` en est absent : il faut une session pour l'atteindre, et
 * l'épreuve doit donc ouvrir un compte avant de regarder. C'est justement la
 * page qu'on lit le plus souvent depuis un téléphone — on y revient pour savoir
 * ce qu'on doit, et quand.
 */

const PARCOURS = "directeur-administratif-et-financier";

/** Ouvre un compte et lui rattache un dossier à trois échéances. */
async function espaceAvecDossier(page: Page): Promise<string> {
  const email = `espace.${Date.now()}${MARQUE}`;

  await page.goto(`/inscription?formation=${PARCOURS}`);
  await page.selectOption('select[name="plan"]', "P3");
  await page.fill('input[name="nom"]', "Épreuve Espace");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="whatsapp"]', "+212600000000");
  await page.fill('input[name="pays"]', "Maroc");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/inscription\/CLX-/);
  const reference = page.url().split("/").pop()!;

  // Le compte se crée avec la même adresse, puis réclame son dossier par sa
  // référence — la double exigence que le formulaire impose.
  await page.goto("/compte/creer");
  await page.fill('input[name="nom"]', "Épreuve Espace");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="motDePasse"]', "epreuve-espace-2026");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/compte/);

  /*
    Le compte tout neuf ne voit rien : depuis qu'une adresse saisie ne suffit
    plus, le rattachement réclame aussi la référence — celle que le participant
    a déjà reçue. C'est ce second geste qui fait apparaître l'échéancier.
  */
  await page.fill('input[name="dossier"]', reference);
  await page.getByRole("button", { name: "Rattacher" }).click();
  await page.waitForURL(/\/compte/);

  return reference;
}

test.describe("Mon espace sur téléphone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("la page tient dans l'écran", async ({ page }) => {
    await espaceAvecDossier(page);
    const trop = await page.evaluate(() => {
      const d = document.documentElement;
      return d.scrollWidth - d.clientWidth;
    });
    expect(trop, `la page dépasse de ${trop} px`).toBeLessThanOrEqual(1);
  });

  /*
    Le champ de référence portait une largeur fixe de 11 rem : sur un écran de
    375 il occupait moins de la moitié de la ligne. Il n'apparaît que sur un
    compte sans dossier — d'où un compte ouvert seul, sans inscription.
  */
  test("le champ de rattachement prend toute la largeur", async ({ page }) => {
    await page.goto("/compte/creer");
    await page.fill('input[name="nom"]', "Épreuve Rattachement");
    await page.fill('input[name="email"]', `rattachement.${Date.now()}${MARQUE}`);
    await page.fill('input[name="motDePasse"]', "epreuve-espace-2026");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/compte/);

    const champ = page.locator('input[name="dossier"]');
    // Deux formulaires vivent sur cette page — la déconnexion en est un.
    const bouton = page.getByRole("button", { name: "Rattacher" });
    const largeurChamp = (await champ.boundingBox())!.width;
    const largeurBouton = (await bouton.boundingBox())!.width;

    expect(largeurChamp, "le champ doit occuper la ligne").toBeGreaterThan(240);
    expect(largeurBouton, "le bouton doit occuper la ligne").toBeGreaterThan(240);
  });

  /*
    ── L'échéancier se lit de haut en bas ──────────────────────────────────
    `flex-wrap` seul les rangeait par paquets : la première échéance prenait
    toute la largeur — sa date est la plus longue — et les deux suivantes se
    serraient côte à côte. Trois versements se lisent comme un calendrier.

    L'épreuve compare les ordonnées : trois lignes distinctes, donc trois
    échéances empilées.
  */
  test("les trois échéances sont empilées, une par ligne", async ({ page }) => {
    await espaceAvecDossier(page);

    const hauts = await page.evaluate(() => {
      const montants = [...document.querySelectorAll("main .tabular-nums")];
      return montants.map((m) => Math.round(m.getBoundingClientRect().top));
    });

    expect(hauts.length, "le dossier doit montrer trois échéances").toBe(3);
    expect(new Set(hauts).size, "chaque échéance occupe sa propre ligne").toBe(3);
  });
});
