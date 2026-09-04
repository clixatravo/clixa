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

  /**
   * Connexion par le vrai formulaire — c'est aussi une épreuve de la page.
   *
   * ⚠️ Une page de connexion vide ne veut pas dire « trop lente ». Le 1er
   * septembre 2026, cette attente a expiré parce que le back-office **entier**
   * ne se rendait plus : le greffon des médias apporte un composant client, et
   * la carte des imports n'avait pas été régénérée. Payload ne le trouvait pas
   * et abandonnait le rendu — sans erreur serveur, sans échec de build, sans
   * type fautif.
   *
   * J'ai d'abord cru à un délai de compilation et rallongé l'attente : c'était
   * faux, et cela n'a fait que retarder le diagnostic. La cause tenait en une
   * ligne de la console du navigateur. Devant une page vide ici, **regarder la
   * console avant de toucher aux délais**.
   */
  async function entrer(page: Page): Promise<void> {
    await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[name="email"]').waitFor({ timeout: 90_000 });
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
    // Comme un visiteur : la case de consentement est obligatoire depuis le 4 septembre 2026.
    await page.check('input[name="consentement"]');
    await page.selectOption('select[name="moyen"]', "carte");
    await Promise.all([
      page.waitForURL(/\/inscription\/CLX-/, { timeout: 60_000 }),
      page.click('button[type="submit"]'),
    ]);
    const reference = new URL(page.url()).pathname.split("/").pop()!;

    // Demander le contrat, puis le signer.
    await page.click('button:has-text("Demander mon contrat")');
    await page.waitForURL(/contrat=/, { timeout: 60_000 });

    await page.fill('input[name="nom"]', "Épreuve Bouton");
    await page.fill('input[name="mention"]', "Lu et approuvé");

    /*
      Le tracé se fait par événements de pointeur — la même manière que
      `contrat.spec.ts`, seule éprouvée. Les mouvements de souris de Playwright
      ne suffisaient pas : le composant écoute `onPointerDown` et compte les
      points, et le tracé repartait refusé (`?signature=trace`).

      ⚠️ On attend d'abord que la toile ait une largeur : mesurée avant la mise
      en page, elle fait zéro pixel et le trait part dans le vide.
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
    test.setTimeout(240_000);

    const reference = await dossierSigne(page);
    await entrer(page);

    /*
      On demande l'identifiant à l'API plutôt que de cliquer dans le tableau :
      la session est déjà ouverte, et l'épreuve ne dépend alors ni de l'ordre
      des lignes, ni du balisage de la liste, qui changent avec les versions.
    */
    const id = await page.evaluate(async (ref) => {
      const r = await fetch(
        `/api/inscriptions?where[reference][equals]=${encodeURIComponent(ref)}&limit=1&depth=0`,
      );
      const j = (await r.json()) as { docs?: { id: number }[] };
      return j.docs?.[0]?.id;
    }, reference);

    expect(id, `le dossier ${reference} doit être lisible depuis le back-office`).toBeTruthy();

    await page.goto(`/admin/collections/inscriptions/${id}`, { waitUntil: "domcontentloaded" });

    const bouton = page.getByRole("button", { name: /Contrat vérifié/ });
    await bouton.waitFor({ timeout: 60_000 });

    const [requete] = await Promise.all([
      page.waitForRequest(
        (r) => r.method() === "PATCH" && /\/api\/inscriptions\/\d+/.test(r.url()),
        { timeout: 60_000 },
      ),
      bouton.click(),
    ]);

    /*
      ⚠️ On exige une **valeur**, pas seulement le nom du champ. Le formulaire
      sérialise tous ses champs : `contratVerifieLe` figure dans le corps même
      quand il est vide, et une assertion `toContain("contratVerifieLe")`
      passait donc avec le défaut qu'elle prétendait guetter. Vérifié en
      remettant l'ancien code : l'épreuve restait verte.
    */
    const corps = requete.postData() ?? "";
    const pose = /"contratVerifieLe"\s*:\s*"(\d{4}-\d{2}-\d{2}[^"]*)"/.exec(corps);
    expect(
      pose,
      `la requête doit porter une date, pas un champ vide. Corps : ${corps.slice(0, 300)}`,
    ).not.toBeNull();

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
