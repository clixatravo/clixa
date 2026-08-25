import { test, expect } from "@playwright/test";
import { CHEMINS } from "./chemins";

/**
 * Aucune page ne doit se faire glisser de côté.
 *
 * Deux fois le même défaut a été trouvé à la main, jamais par une épreuve :
 * l'en-tête débordait de 151 px sur toute tablette, et le formulaire
 * d'inscription de 164 px sur téléphone — une liste déroulante prenant la
 * largeur de son option la plus longue. Les deux étaient invisibles tant qu'on
 * ne mesurait pas.
 *
 * ── Pourquoi une seule largeur pour toutes les pages ────────────────────────
 * 375 px est celle où un débordement se déclare : c'est la plus étroite, et
 * rien ne tient à 375 sans tenir plus large. Vérifier chaque page à quatre
 * largeurs faisait cinquante-six épreuves pour un seul renseignement, et la
 * série durait une heure et demie.
 *
 * Ce qui change vraiment avec la largeur, c'est l'en-tête, présent sur toutes
 * les pages : ses seuils sont éprouvés à part, sur une seule page.
 */

test.describe("Tenir dans l'écran d'un téléphone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const chemin of CHEMINS) {
    test(chemin, async ({ page }) => {
      await page.goto(chemin);
      const trop = await page.evaluate(() => {
        const d = document.documentElement;
        return d.scrollWidth - d.clientWidth;
      });
      expect(trop, `la page dépasse de ${trop} px`).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("Les seuils de l'en-tête", () => {
  // 1024 est le seuil du menu : de part et d'autre, la barre change de forme.
  for (const largeur of [375, 768, 1023, 1024, 1440]) {
    test(`${largeur} px : le menu ou la barre, jamais les deux ni aucun`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.goto("/");

      const menuVu = await page.locator("header button").first().isVisible();
      const barreVue = await page.locator('header nav a[href="/formations"]').first().isVisible();

      expect(menuVu !== barreVue, "les deux navigations coexistent, ou aucune ne paraît").toBe(
        true,
      );
      expect(menuVu, `à ${largeur} px on attend ${largeur < 1024 ? "le menu" : "la barre"}`).toBe(
        largeur < 1024,
      );

      const trop = await page.evaluate(() => {
        const d = document.documentElement;
        return d.scrollWidth - d.clientWidth;
      });
      expect(trop, `l'en-tête déborde de ${trop} px`).toBeLessThanOrEqual(1);
    });
  }

  test("chaque action ne paraît qu'une fois, menu ouvert", async ({ page }) => {
    // Entre 640 et 1023 px, l'en-tête montrait un bouton que le panneau
    // ouvert répétait juste en dessous.
    for (const largeur of [375, 700, 820]) {
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.goto("/");
      await page.locator("header button").first().click();

      for (const libelle of ["Mon espace", "Nous contacter"]) {
        const visibles = await page
          .locator("header a", { hasText: new RegExp(`^${libelle}$`) })
          .evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).length);
        expect(visibles, `« ${libelle} » paraît ${visibles} fois à ${largeur} px`).toBe(1);
      }
    }
  });
});
