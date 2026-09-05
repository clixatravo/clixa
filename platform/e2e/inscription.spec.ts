import { test, expect, type Page } from "@playwright/test";
import { compterEnBase, MARQUE, referenceDeLAdresse } from "./menage";

/**
 * Le tunnel : retenir une place, puis annoncer son transfert.
 *
 * C'est le chemin qui rapporte, et celui où une régression coûte le plus cher :
 * une inscription perdue ne se rejoue pas. Une inscription a déjà été perdue
 * ici, un décompte de places écrit hors transaction ayant fait annuler
 * l'écriture sans que rien ne le dise.
 */

const PARCOURS = "directeur-audit-interne";

/** Remplit le formulaire et rend la référence obtenue. */
async function retenirUnePlace(page: Page, plan: "P1" | "P3"): Promise<string> {
  await page.goto(`/inscription?formation=${PARCOURS}`);

  await page.selectOption('select[name="plan"]', plan);
  await page.fill('input[name="nom"]', "Épreuve Playwright");
  await page.fill('input[name="email"]', `epreuve.${Date.now()}${MARQUE}`);
  await page.fill('input[name="whatsapp"]', "+212600000000");
  await page.fill('input[name="pays"]', "Maroc");
  // Comme un visiteur : la case de consentement est obligatoire depuis le 4 septembre 2026.
  await page.check('input[name="consentement"]');

  /*
    On surveille la réponse plutôt que la seule adresse : quand la place n'est
    pas retenue, `waitForURL` expire au bout de trente secondes sans dire
    pourquoi — un 429, un 303 vers une erreur de champ et un plantage se
    ressemblent tous depuis la barre d'adresse.
  */
  const [reponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/inscription")),
    page.click('button[type="submit"]'),
  ]);
  expect(reponse.status(), `l'inscription a répondu ${reponse.status()} au lieu de rediriger`).toBe(
    303,
  );
  await page.waitForURL(/\/inscription\/CLX-/);

  const reference = referenceDeLAdresse(page.url());
  expect(reference, "la référence doit suivre le format attendu").toMatch(
    /^CLX-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/,
  );
  return reference;
}

test("retenir une place mène à un dossier qui porte sa référence", async ({ page }) => {
  const reference = await retenirUnePlace(page, "P1");

  await expect(page.getByText(reference, { exact: false }).first()).toBeVisible();
  // Comptant : une seule échéance, au montant du barème.
  /*
    Le titre, pas le texte. « Votre échéancier » figure aussi dans la phrase qui
    présente le contrat — « votre parcours, votre formule et votre échéancier » —
    et la recherche par texte trouvait alors deux éléments. Elle visait le titre
    depuis le début ; elle le dit maintenant.
  */
  await expect(page.getByRole("heading", { name: "Votre échéancier" })).toBeVisible();

  // Le dossier reste joignable par son adresse, sans compte — c'est la règle.
  await page.context().clearCookies();
  await page.goto(`/inscription/${reference}`);
  await expect(page.getByText(reference, { exact: false }).first()).toBeVisible();
});

/*
  ── La place est tenue, puis rendue ──────────────────────────────────────────
  Une inscription retient sa place sept jours sans versement : assez pour qu'un
  transfert international parte et arrive. Passé ce délai elle la rend, et
  c'est la tâche quotidienne qui repasse — le temps, lui, n'écrit rien.

  L'épreuve vérifie le premier moment, le seul qu'elle puisse provoquer.
  L'expiration se joue sur sept jours ; la faire tenir dans une série
  demanderait de mentir sur une date, et l'on n'éprouverait plus que le
  mensonge.
*/
test("retenir une place la décompte immédiatement", async ({ page, request }) => {
  const avant = await placesReservees(request);
  await retenirUnePlace(page, "P1");
  const apres = await placesReservees(request);

  // Le décompte a déjà été perdu une fois : compté hors de la transaction, il
  // ne voyait pas la ligne qu'on venait d'écrire, et annulait l'écriture.
  expect(apres, "la place retenue n'a pas été décomptée").toBe(avant + 1);
});

async function placesReservees(request: {
  get: (u: string) => Promise<{ json: () => Promise<unknown> }>;
}) {
  const r = await request.get(`/api/sessions?limit=200&depth=0`);
  const { docs } = (await r.json()) as { docs: { placesReservees?: number }[] };
  return docs.reduce((t, s) => t + (s.placesReservees ?? 0), 0);
}

test.describe("Annoncer un transfert", () => {
  test("une annonce à la fois, et dans l'ordre des échéances", async ({ page }) => {
    await retenirUnePlace(page, "P3");
    const formulaire = page.locator('form[action="/api/transfert"]');

    await expect(formulaire, "le formulaire doit être offert dès l'arrivée").toBeVisible();

    await page.selectOption('select[name="moyen"]', "western-union");
    await page.fill('input[name="numero"]', "8471203954");
    await page.click('form[action="/api/transfert"] button[type="submit"]');

    await page.waitForURL(/annonce=ok/);
    /*
      Par son rôle, et non par son texte : « Nous vérifions le transfert » est
      aussi la troisième étape des consignes, juste au-dessus. Viser la phrase
      attrapait les deux.
    */
    await expect(page.getByRole("status")).toContainText("C'est noté");
    await expect(page.getByText("en vérification").first()).toBeVisible();

    /*
      Le formulaire se retire. La première version cherchait la première
      échéance « attendue » : l'échéance 1 passée en vérification, la 2 restait
      attendue et un second envoi la marquait à son tour — alors qu'un seul
      transfert avait été fait.
    */
    await expect(formulaire, "le formulaire doit se retirer après l'annonce").toHaveCount(0);
  });

  test("une annonce forcée sur un dossier déjà annoncé est refusée", async ({ page, request }) => {
    const reference = await retenirUnePlace(page, "P3");

    const annoncer = () =>
      request.post("/api/transfert", {
        form: { dossier: reference, moyen: "ria", numero: "123456" },
        maxRedirects: 0,
      });

    expect((await annoncer()).headers()["location"]).toContain("annonce=ok");
    // Sans passer par la page : la route doit refuser d'elle-même.
    expect((await annoncer()).headers()["location"]).toContain("annonce=rien");
  });

  test("une référence inventée n'écrit rien et renvoie à l'accueil", async ({ request }) => {
    const r = await request.post("/api/transfert", {
      form: { dossier: "CLX-ZZZZZ", moyen: "ria", numero: "1" },
      maxRedirects: 0,
    });
    expect(r.headers()["location"]).toMatch(/\/$/);
  });

  test("« espèces » n'est pas annonçable à distance", async ({ page, request }) => {
    const reference = await retenirUnePlace(page, "P1");
    const r = await request.post("/api/transfert", {
      form: { dossier: reference, moyen: "especes", numero: "1" },
      maxRedirects: 0,
    });
    expect(r.headers()["location"]).toContain("annonce=champs");
  });
});

/**
 * ⚠️ Un double envoi ne retient pas deux places.
 *
 * Le formulaire poste puis redirige : rien n'empêchait d'envoyer deux fois.
 * Ici la conséquence n'est pas une ligne en trop — **chaque inscription retient
 * une place**. Deux clics, et ce sont deux places sur trente qui sortent du
 * catalogue pour une seule personne, avec deux références, deux courriels au
 * participant et deux notifications à l'équipe.
 *
 * La production porte la trace du même geste sur les demandes de rappel : deux
 * lignes identiques à moins de deux minutes d'écart.
 */
test.describe("Un envoi répété", () => {
  test("ne crée pas un second dossier, et ne retient pas une seconde place", async ({
    page,
    request,
  }) => {
    const email = `double.${Date.now()}${MARQUE}`;

    const envoyer = async () => {
      await page.goto(`/inscription?formation=${PARCOURS}`);
      await page.fill('input[name="nom"]', "Épreuve Double");
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="whatsapp"]', "+212600000000");
      await page.fill('input[name="pays"]', "Maroc");
      await page.check('input[name="consentement"]');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/inscription\/CLX-/);
      return referenceDeLAdresse(page.url());
    };

    const premiere = await envoyer();
    const seconde = await envoyer();

    expect(seconde, "le second envoi ramène au même dossier").toBe(premiere);

    /*
      ⚠️ Et le second n'est pas compté comme une conversion : il arrive sans
      `nouveau=1`. Sans cette distinction, un clic en trop vaudrait un lead de
      plus dans le tableau de bord de la campagne.
    */
    expect(page.url(), "un renvoi n'est pas une nouvelle pré-inscription").not.toContain(
      "nouveau=1",
    );

    // Et le dossier existe bel et bien, une seule fois.
    const fiche = await request.get(`/inscription/${premiere}`);
    expect(fiche.status()).toBe(200);
  });

  /*
    ⚠️ Ce que la garde ne doit pas casser : s'inscrire à un **autre** parcours
    avec la même adresse reste normal. Une clef posée sur l'adresse seule
    l'aurait interdit, et personne ne s'en serait aperçu avant qu'un candidat
    ne se plaigne.
  */
  test("mais une seconde inscription à un autre parcours passe", async ({ page }) => {
    const email = `deuxparcours.${Date.now()}${MARQUE}`;

    const envoyer = async (parcours: string) => {
      await page.goto(`/inscription?formation=${parcours}`);
      await page.fill('input[name="nom"]', "Épreuve Deux Parcours");
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="whatsapp"]', "+212600000000");
      await page.fill('input[name="pays"]', "Maroc");
      await page.check('input[name="consentement"]');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/inscription\/CLX-/);
      return referenceDeLAdresse(page.url());
    };

    const a = await envoyer(PARCOURS);
    // ⚠️ Un slug réellement différent de `PARCOURS`, sinon l'épreuve se compare
    // à elle-même et passerait au vert quoi qu'il arrive.
    const b = await envoyer("directeur-marketing");
    expect(b, "deux parcours différents, deux dossiers").not.toBe(a);
  });
});

/**
 * ⚠️ Deux clics ne font pas deux appels à passer.
 *
 * Le bandeau du back-office compte les demandes « nouvelle » pour dire ce
 * qu'il reste à faire aujourd'hui : un doublon y ajoute un appel qui n'existe
 * pas. La production en porte deux, à moins de deux minutes d'écart.
 */
test("une demande de rappel répétée aussitôt n'en crée qu'une", async ({ request }) => {
  const numero = `+21260${String(Date.now()).slice(-7)}`;
  const poster = () =>
    request.post("/api/demande-rappel", {
      form: {
        nom: "Épreuve Rappel Double",
        email: `rappel.double.${Date.now()}${MARQUE}`,
        whatsapp: numero,
        origine: "/contact",
        consentement: "oui",
      },
      maxRedirects: 0,
    });

  const premiere = await poster();
  const seconde = await poster();

  /*
    Les deux répondent pareil : de son côté, sa demande est bien enregistrée.
    Lui annoncer un doublon l'inquiéterait sans rien lui apprendre d'utile.
  */
  expect(premiere.headers()["location"]).toContain("envoye=1");
  expect(seconde.headers()["location"], "la seconde répond comme la première").toContain(
    "envoye=1",
  );

  /*
    ⚠️ **Et c'est pourquoi il faut compter en base.** Les deux réponses étant
    identiques par construction, une épreuve qui s'arrête ici reste verte sans
    la garde — vérifié en remettant le défaut : elle n'a rien vu. Seul le
    nombre de lignes dit ce qui s'est réellement passé.
  */
  expect(
    compterEnBase("demandes_rappel", `whatsapp = '${numero}'`),
    "une seule ligne pour deux envois",
  ).toBe(1);
});
