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
