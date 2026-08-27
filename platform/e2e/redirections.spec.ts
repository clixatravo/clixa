import { expect, test } from "@playwright/test";

/**
 * INT-06 — Les redirections tiennent-elles ?
 *
 * Une redirection ne se voit pas : elle ne casse aucune compilation, aucun
 * type, et son absence ressemble à un 404 ordinaire. Elle ne se constate qu'en
 * la suivant — d'où ces épreuves.
 */
test.describe("Redirections", () => {
  /*
    Le dépôt porte encore les fichiers que la vitrine statique publiait. Ces
    adresses circulent dans des signets et des documents ; elles doivent
    aboutir, et durablement (308).
  */
  const heritage = [
    ["/index.html", "/"],
    ["/mentions-legales.html", "/mentions-legales"],
    ["/politique-confidentialite.html", "/confidentialite"],
  ] as const;

  for (const [depuis, vers] of heritage) {
    test(`${depuis} mène à ${vers}, définitivement`, async ({ request }) => {
      const r = await request.get(depuis, { maxRedirects: 0 });
      expect(r.status()).toBe(308);
      expect(new URL(r.headers()["location"]!, "http://localhost:3000").pathname).toBe(vers);
    });
  }

  /*
    Le menu affiche « Mon espace » et « Nous contacter » ; les pages vivent
    ailleurs. Qui dicte une adresse de mémoire écrit l'intitulé qu'il a lu.
  */
  const intitules = [
    ["/mon-espace", "/compte"],
    ["/nous-contacter", "/contact"],
  ] as const;

  for (const [depuis, vers] of intitules) {
    test(`${depuis} mène à ${vers}`, async ({ request }) => {
      const r = await request.get(depuis, { maxRedirects: 0 });
      expect(r.status()).toBe(308);
      expect(r.headers()["location"]).toContain(vers);
    });
  }

  /*
    Le singulier est une faute de frappe, pas une ancienne adresse : temporaire,
    pour ne pas l'inscrire durablement chez les moteurs.
  */
  test("le singulier renvoie au pluriel, sans s'y installer", async ({ request }) => {
    const r = await request.get("/formation/directeur-marketing", { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(r.headers()["location"]).toContain("/formations/directeur-marketing");
  });

  /*
    ── Le cas qui distingue une bonne redirection d'une mauvaise ────────────
    Sans formation choisie, la page n'a rien à inscrire et mène au catalogue.
    Mais une formation *nommée et inconnue* doit rester un 404 : l'adresse
    désigne quelque chose qui n'existe pas, et le dire vaut mieux que de faire
    atterrir ailleurs sans explication. Une redirection trop large avalerait
    les deux cas.
  */
  test("/inscription sans formation mène au catalogue", async ({ request }) => {
    const r = await request.get("/inscription", { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(r.headers()["location"]).toContain("/formations");
  });

  test("/inscription avec une formation réelle ne redirige pas", async ({ request }) => {
    const r = await request.get("/inscription?formation=directeur-marketing", {
      maxRedirects: 0,
    });
    expect(r.status()).toBe(200);
  });

  test("/inscription avec une formation inconnue reste un 404", async ({ request }) => {
    const r = await request.get("/inscription?formation=cette-formation-nexiste-pas", {
      maxRedirects: 0,
    });
    expect(r.status()).toBe(404);
  });
});
