import { test, expect } from "@playwright/test";

/**
 * Le catalogue : ce qu'un visiteur cherche, et ce qu'il trouve.
 *
 * Les trois premières recherches rendaient zéro résultat avant `BE-09`, alors
 * que la fiche existait. Ce sont elles qu'on ne veut plus jamais voir revenir.
 */

test.describe("Recherche", () => {
  const cas: [string, string, string][] = [
    ["financière", "Directeur Administratif et Financier", "féminin — rendait 0 avant BE-09"],
    ["auditer", "Directeur Audit Interne", "verbe — rendait 0 avant BE-09"],
    ["direction financiere", "Directeur Administratif et Financier", "sans accent — rendait 0"],
    ["prépa", "Préparation à la certification PMP", "abréviation — préfixe"],
    ["partner", "Ressources Humaines", "mot anglais — le radicaliseur n'a pas de prise"],
    ["chef comptable", "Directeur Administratif et Financier", "métier, pas titre de fiche"],
    ["contrôle de gestion", "Directeur Contrôle de Gestion", "le titre exact vient en tête"],
  ];

  for (const [requete, attendu, pourquoi] of cas) {
    test(`« ${requete} » ramène ${attendu} — ${pourquoi}`, async ({ page }) => {
      await page.goto(`/formations?q=${encodeURIComponent(requete)}`);
      // En tête : le classement pèse le titre plus lourd que le corps de fiche.
      await expect(page.locator("h2, h3").first()).toContainText(attendu);
    });
  }

  test("une recherche sans réponse le dit, et ne rend pas le catalogue entier", async ({
    page,
  }) => {
    await page.goto("/formations?q=zzzzqqqq");
    await expect(page.locator("h2, h3")).toHaveCount(0);
  });

  test("les guillemets resserrent au lieu d'élargir", async ({ page }) => {
    await page.goto("/formations?q=" + encodeURIComponent('"contrôle de gestion"'));
    const cartes = await page.locator("h2, h3").count();
    await page.goto("/formations?q=" + encodeURIComponent("contrôle de gestion"));
    expect(cartes).toBeLessThanOrEqual(await page.locator("h2, h3").count());
  });

  test("le tiret exclut", async ({ page }) => {
    await page.goto("/formations?q=gestion");
    const avec = await page.locator("h2, h3").allTextContents();
    expect(avec.some((t) => /QHSE/.test(t))).toBe(true);

    await page.goto("/formations?q=" + encodeURIComponent("gestion -qhse"));
    const sans = await page.locator("h2, h3").allTextContents();
    expect(sans.some((t) => /QHSE/.test(t))).toBe(false);
  });
});

test.describe("Ce que le catalogue promet", () => {
  test("aucun brouillon ne fuit vers le public", async ({ request }) => {
    // Les exemples de témoignages et de partenaires sont dépubliés : l'API
    // publique ne doit en rendre aucun. Onze documents avaient fuité ainsi.
    for (const collection of ["temoignages", "partenaires"]) {
      const r = await request.get(`/api/${collection}?limit=100`);
      const { docs } = (await r.json()) as { docs: { _status?: string }[] };
      const brouillons = docs.filter((d) => d._status && d._status !== "published");
      expect(brouillons, `${collection} : des brouillons sont servis publiquement`).toHaveLength(0);
    }
  });

  test("les filtres de façade se combinent à la recherche", async ({ page }) => {
    await page.goto("/formations?specialisation=finance-controle&q=audit");
    const titres = await page.locator("h2, h3").allTextContents();
    expect(titres.length).toBeGreaterThan(0);
    expect(titres.every((t) => !/Marketing|Commercial/.test(t))).toBe(true);
  });
});
