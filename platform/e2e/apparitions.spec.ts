import { expect, test } from "@playwright/test";

/**
 * L'entrée en scène.
 *
 * Une animation ne casse rien quand elle échoue : elle ne fait simplement plus
 * rien, ou — bien pire — elle laisse la page masquée. C'est ce second cas que
 * ces épreuves surveillent.
 */

test.describe("Apparitions", () => {
  test("le premier écran monte par morceaux, en cascade", async ({ page }) => {
    await page.goto("/");

    const morceaux = page.locator("main > section:first-of-type [data-apparait]");
    await expect(morceaux.first()).toBeVisible();

    const delais = await morceaux.evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).style.getPropertyValue("--delai")),
    );

    expect(delais.length, "le premier écran doit être découpé").toBeGreaterThan(2);
    expect(delais[0]).toBe("0ms");
    // Chaque morceau part après le précédent : c'est ce qui fait une arrivée
    // plutôt qu'un clignotement d'ensemble.
    const ms = delais.map((d) => parseInt(d, 10));
    for (let i = 1; i < ms.length; i += 1) {
      expect(ms[i]!, "les délais doivent croître").toBeGreaterThan(ms[i - 1]!);
    }
  });

  test("tout finit par paraître, et rien ne reste masqué", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // Le temps de la transition la plus lente, plus le dernier échelon.
    await page.waitForTimeout(1600);

    const restants = await page.evaluate(() => ({
      enAttente: document.querySelectorAll("[data-attente]").length,
      transparents: [...document.querySelectorAll("main section")].filter(
        (e) => Number(getComputedStyle(e).opacity) < 0.95,
      ).length,
    }));

    expect(restants.enAttente, "aucun bloc ne doit rester en attente").toBe(0);
    expect(restants.transparents, "aucun bloc ne doit rester transparent").toBe(0);
  });

  /*
    ── L'épreuve qui compte vraiment ────────────────────────────────────────
    Le site statique dont l'effet est repris met `opacity: 0` dans sa feuille
    de style : si son script échoue, il ne reste rien à lire. Ici l'état masqué
    dépend d'une classe que seul le script pose. Sans JavaScript, la page doit
    être entière.
  */
  test("sans JavaScript, la page reste entièrement lisible", async ({ browser }) => {
    const contexte = await browser.newContext({ javaScriptEnabled: false });
    const page = await contexte.newPage();
    await page.goto("/");

    const racineMarquee = await page.evaluate(() =>
      document.documentElement.classList.contains("apparitions"),
    );
    expect(racineMarquee, "le script n'a pas tourné, la classe ne doit pas être là").toBe(false);

    // Le titre et les sections sont là, pleinement opaques.
    await expect(page.locator("h1")).toBeVisible();
    const sections = page.locator("main section");
    expect(await sections.count()).toBeGreaterThan(3);
    for (const o of await sections.evaluateAll((els) =>
      els.map((e) => getComputedStyle(e).opacity),
    )) {
      expect(Number(o)).toBe(1);
    }

    await contexte.close();
  });

  /*
    ── Le cas qui rendrait une page blanche ─────────────────────────────────
    L'effet se rejoue à chaque page. Le danger n'est donc plus qu'il manque,
    mais qu'il reste en chemin : une page d'arrivée masquée est une page
    blanche, et rien dans la compilation ne le signalerait.

    Deux mesures, donc : la page suivante est bien mise en scène — sinon le
    rejeu ne fonctionne pas — et elle finit entière.
  */
  test("une navigation interne rejoue l'effet, puis la page est entière", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Explorer le catalogue" }).click();
    await page.waitForURL(/\/formations/);

    const marquees = await page.evaluate(() => document.querySelectorAll("[data-apparait]").length);
    expect(marquees, "la page d'arrivée doit être mise en scène").toBeGreaterThan(0);

    // Le temps de la transition la plus lente, plus le dernier échelon.
    await page.waitForTimeout(1600);
    const invisibles = await page.evaluate(
      () =>
        [...document.querySelectorAll("main section")].filter(
          (e) => Number(getComputedStyle(e).opacity) < 0.95,
        ).length,
    );

    expect(invisibles, "la page d'arrivée doit finir entière").toBe(0);
    expect(await page.evaluate(() => document.querySelectorAll("[data-attente]").length)).toBe(0);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("le mouvement réduit n'efface pas la page", async ({ browser }) => {
    const contexte = await browser.newContext({ reducedMotion: "reduce" });
    const page = await contexte.newPage();
    await page.goto("/");
    await page.waitForTimeout(400);

    const opacites = await page.evaluate(() =>
      [...document.querySelectorAll("main > section:first-of-type [data-apparait]")].map((e) =>
        Number(getComputedStyle(e).opacity),
      ),
    );

    expect(opacites.length).toBeGreaterThan(0);
    for (const o of opacites) expect(o, "qui demande le calme doit voir la page").toBe(1);

    await contexte.close();
  });
});
