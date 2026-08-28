import { expect, test } from "@playwright/test";
import { CHEMINS } from "./chemins";

/**
 * Ce qu'un lecteur d'écran et un clavier trouvent sur le site.
 *
 * Rien ici n'est une précaution de principe : ces contrôles ont été passés une
 * fois à la main, et le seul défaut qu'ils ont trouvé — un niveau de titre
 * sauté sur le catalogue — est corrigé. Ils restent pour qu'il ne revienne pas.
 */

test.describe("Accessibilité", () => {
  /*
    ── Les titres se suivent ────────────────────────────────────────────────
    Qui parcourt une page en sautant de titre en titre — ce que fait un lecteur
    d'écran — perd le fil quand un niveau manque. Le catalogue passait du titre
    de page aux douze cartes sans rien entre les deux : on ne savait pas qu'une
    liste commençait.
  */
  for (const chemin of CHEMINS) {
    test(`${chemin} : un seul h1, aucun niveau sauté`, async ({ page }) => {
      await page.goto(chemin);
      const niveaux = await page.evaluate(() =>
        [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => Number(e.tagName[1])),
      );

      const h1 = niveaux.filter((n) => n === 1).length;
      expect(h1, "une page porte un titre, et un seul").toBe(1);

      for (let i = 1; i < niveaux.length; i += 1) {
        expect(
          niveaux[i]! - niveaux[i - 1]!,
          `niveau sauté : h${niveaux[i - 1]} → h${niveaux[i]}`,
        ).toBeLessThanOrEqual(1);
      }
    });
  }

  /*
    Le premier coup de tabulation doit offrir le saut au contenu : sans lui, on
    retraverse tout l'en-tête à chaque page.
  */
  test("la première tabulation mène au contenu", async ({ page }) => {
    await page.goto("/formations");
    await page.keyboard.press("Tab");
    const premier = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    expect(premier).toContain("contenu principal");
  });

  /*
    Une mise au point invisible rend le clavier inutilisable : on ne sait plus
    où l'on est.
  */
  test("chaque élément atteint au clavier se voit", async ({ page }) => {
    await page.goto("/formations");
    const sansMarque: string[] = [];

    for (let i = 0; i < 15; i += 1) {
      await page.keyboard.press("Tab");
      const r = await page.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body) return null;
        const cs = getComputedStyle(e);
        const marque =
          (cs.outlineStyle !== "none" && cs.outlineWidth !== "0px") || cs.boxShadow !== "none";
        return marque ? null : `${e.tagName} « ${(e.textContent || "").trim().slice(0, 24)} »`;
      });
      if (r) sansMarque.push(r);
    }

    expect(sansMarque, "ces éléments ne montrent pas où l'on est").toEqual([]);
  });
});
