import { test, expect, type Page } from "@playwright/test";
import {
  MARQUE,
  choisirPays,
  remplirProfil,
  compterEnBase,
  referenceDeLAdresse,
  remplirWhatsapp,
  sqlUneValeur,
} from "./menage";

/**
 * Le tunnel : retenir une place, puis annoncer son transfert.
 *
 * C'est le chemin qui rapporte, et celui où une régression coûte le plus cher :
 * une inscription perdue ne se rejoue pas. Une inscription a déjà été perdue
 * ici, un décompte de places écrit hors transaction ayant fait annuler
 * l'écriture sans que rien ne le dise.
 */

const PARCOURS = "directeur-audit-interne";

/*
  ── Ce que le formulaire exige de plus depuis le 18 septembre 2026 ───────────
  Le poste et l'expérience. Ils ne servent pas à nous : ils servent à ce que
  l'équipe sache à qui elle parle avant d'appeler, dans une liste où plus rien
  ne distinguait un directeur financier en poste de quelqu'un qui remplit pour
  voir.

  ⚠️ **Le `required` du navigateur ne prouve rien**, et c'est tout l'objet de
  ces deux contrôles : la route reste atteignable par un onglet resté ouvert,
  un script, ou ce formulaire-ci recopié. Les deux moitiés sont gardées
  séparément, comme pour l'indicatif et le consentement.
*/
test("le poste et l'expérience sont exigés par la route, pas seulement par la page", async ({
  request,
}) => {
  const base = {
    formation: PARCOURS,
    nom: "Épreuve Profil",
    whatsapp: "+212600000000",
    pays: "Maroc",
    plan: "P1",
    moyen: "virement",
    payeur: "particulier",
    consentement: "oui",
    provenance: "linkedin",
  };

  const sansPoste = await request.post("/api/inscription", {
    form: {
      ...base,
      email: `profil.a.${Date.now()}${MARQUE}`,
      domaine: "controle-gestion",
      provenance: "linkedin",
      experience: "2-5",
    },
    maxRedirects: 0,
  });
  expect(sansPoste.headers()["location"], "sans poste, la route refuse").toContain("erreur=profil");

  /*
    ⚠️ Le domaine est exigé comme les deux autres (20 septembre 2026). C'est le
    seul des trois qui se **compte** — « combien de dossiers viennent de la
    finance ? » ne se répond pas sur du texte libre — et un dossier sans domaine
    manquerait à chaque total sans que rien ne le dise.
  */
  const sansDomaine = await request.post("/api/inscription", {
    form: {
      ...base,
      email: `profil.c.${Date.now()}${MARQUE}`,
      profession: "Contrôleur de gestion",
      experience: "2-5",
    },
    maxRedirects: 0,
  });
  expect(sansDomaine.headers()["location"], "sans domaine, la route refuse").toContain(
    "erreur=profil",
  );

  const domaineInvente = await request.post("/api/inscription", {
    form: {
      ...base,
      email: `profil.d.${Date.now()}${MARQUE}`,
      profession: "Contrôleur de gestion",
      domaine: "astrophysique",
      experience: "2-5",
    },
    maxRedirects: 0,
  });
  expect(
    domaineInvente.headers()["location"],
    "⚠️ un domaine hors liste ne se rattrape pas non plus",
  ).toContain("erreur=profil");

  /*
    ⚠️ Une tranche inventée, pas seulement une tranche absente. Le moyen de
    paiement, lui, retombe sur « transfert » quand il est inconnu — sans
    conséquence. Une ancienneté que personne n'a déclarée irait dans le dossier
    et déciderait qui l'équipe rappelle en premier.
  */
  const trancheInventee = await request.post("/api/inscription", {
    form: {
      ...base,
      email: `profil.b.${Date.now()}${MARQUE}`,
      profession: "Contrôleur de gestion",
      domaine: "controle-gestion",
      provenance: "linkedin",
      experience: "30-ans",
    },
    maxRedirects: 0,
  });
  expect(
    trancheInventee.headers()["location"],
    "⚠️ une tranche hors liste ne se rattrape pas, elle se refuse",
  ).toContain("erreur=profil");

  expect(
    compterEnBase("inscriptions", `apprenant_nom = 'Épreuve Profil'`),
    "et aucun des deux n'a rien écrit",
  ).toBe(0);
});

/*
  Par où l'on nous a connus (26 septembre 2026, `lib/provenance.ts`). Même
  exigence que le domaine, et pour la même raison : c'est une question qui se
  compte. ⚠️ Une valeur inventée ne se range pas dans « Autre », elle se refuse
  — sans quoi le chiffre qui décide de la prochaine campagne compterait des
  réponses que personne n'a données.
*/
test("la provenance est exigée par la route, et une valeur inventée se refuse", async ({
  request,
}) => {
  const base = {
    formation: PARCOURS,
    nom: "Épreuve Provenance",
    whatsapp: "+212600000000",
    pays: "Maroc",
    plan: "P1",
    moyen: "virement",
    payeur: "particulier",
    consentement: "oui",
    profession: "Contrôleur de gestion",
    domaine: "controle-gestion",
    experience: "2-5",
  };

  const sans = await request.post("/api/inscription", {
    form: { ...base, email: `provenance.a.${Date.now()}${MARQUE}` },
    maxRedirects: 0,
  });
  expect(sans.headers()["location"], "sans provenance, la route refuse").toContain(
    "erreur=provenance",
  );

  const inventee = await request.post("/api/inscription", {
    form: { ...base, email: `provenance.b.${Date.now()}${MARQUE}`, provenance: "tiktok" },
    maxRedirects: 0,
  });
  expect(inventee.headers()["location"], "⚠️ une provenance hors liste se refuse").toContain(
    "erreur=provenance",
  );

  expect(
    compterEnBase("inscriptions", `apprenant_nom = 'Épreuve Provenance'`),
    "et aucun des deux n'a rien écrit",
  ).toBe(0);

  /* Le témoin : la même demande, avec une provenance offerte, passe et l'écrit. */
  const email = `provenance.c.${Date.now()}${MARQUE}`;
  const valide = await request.post("/api/inscription", {
    form: { ...base, email, provenance: "entourage" },
    maxRedirects: 0,
  });
  expect(valide.headers()["location"], "avec une provenance offerte, le dossier part").toContain(
    "/inscription/CLX-",
  );
  expect(
    compterEnBase(
      "inscriptions",
      `apprenant_email = '${email}' AND apprenant_provenance = 'entourage'`,
    ),
    "et la provenance est bien en base",
  ).toBe(1);
});

/** Remplit le formulaire et rend la référence obtenue. */
async function retenirUnePlace(page: Page, plan: "P1" | "P3"): Promise<string> {
  await page.goto(`/inscription?formation=${PARCOURS}`);

  await page.selectOption('select[name="plan"]', plan);
  await page.fill('input[name="nom"]', "Épreuve Playwright");
  await page.fill('input[name="email"]', `epreuve.${Date.now()}${MARQUE}`);
  await remplirWhatsapp(page, "+212600000000");
  await choisirPays(page);
  await remplirProfil(page);
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

/**
 * Ce que l'équipe fait depuis /admin : « J'ai envoyé les instructions de
 * paiement ».
 *
 * ⚠️ **Sans ce geste, aucune annonce n'est possible — et c'est voulu.** Les
 * coordonnées de règlement ne figurent nulle part sur le site : elles partent
 * par courriel, après signature. Tant qu'elles ne sont pas parties, le
 * participant n'a aucun moyen d'avoir versé quoi que ce soit.
 *
 * Les deux épreuves ci-dessous annonçaient sur un dossier tout neuf. Elles
 * passaient parce que le défaut existait : la page offrait le formulaire, et
 * la route l'acceptait. Un vrai prospect s'y est laissé prendre le 5 septembre
 * 2026, et l'équipe a cherché un versement qui n'existait pas.
 */
function envoyerLesCoordonnees(reference: string): void {
  sqlUneValeur(
    `UPDATE inscriptions SET coordonnees_envoyees_le = now() WHERE reference = '${reference}';`,
  );
}

test.describe("Annoncer un transfert", () => {
  test("une annonce à la fois, et dans l'ordre des échéances", async ({ page }) => {
    const reference = await retenirUnePlace(page, "P3");
    const formulaire = page.locator('form[action="/api/transfert"]');

    /*
      ⚠️ Rien à annoncer tant que rien n'est parti de chez nous : le formulaire
      ne doit pas être là. C'est la moitié de la garde qui manquait.
    */
    await expect(
      formulaire,
      "aucun formulaire tant que les coordonnées ne sont pas envoyées",
    ).toHaveCount(0);

    envoyerLesCoordonnees(reference);
    await page.reload();
    await expect(formulaire, "le formulaire paraît une fois les coordonnées parties").toBeVisible();

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
    envoyerLesCoordonnees(reference);

    const annoncer = () =>
      request.post("/api/transfert", {
        form: { dossier: reference, moyen: "ria", numero: "123456" },
        maxRedirects: 0,
      });

    expect((await annoncer()).headers()["location"]).toContain("annonce=ok");
    // Sans passer par la page : la route doit refuser d'elle-même.
    expect((await annoncer()).headers()["location"]).toContain("annonce=rien");
  });

  /*
    ⚠️ **La route refuse aussi, et cette moitié-là compte double.** Le
    formulaire ne paraît plus avant l'envoi des coordonnées, mais
    `api/transfert` reste atteignable — par un onglet resté ouvert, ou par un
    script. Sans cette garde, une annonce prématurée continuerait de passer et
    l'équipe irait chercher un versement qui n'existe pas.
  */
  test("annoncer avant que les coordonnées soient parties est refusé", async ({
    page,
    request,
  }) => {
    const reference = await retenirUnePlace(page, "P1");

    const r = await request.post("/api/transfert", {
      form: { dossier: reference, moyen: "ria", numero: "999888" },
      maxRedirects: 0,
    });
    expect(r.headers()["location"], "la route doit refuser").toContain("annonce=trop-tot");

    /*
      Et le message dit ce qui manque **de notre côté**. Lui reprocher son geste
      le laisserait chercher une faute qui n'est pas la sienne.
    */
    await page.goto(`/inscription/${reference}?annonce=trop-tot`);
    await expect(page.getByRole("status")).toContainText("pas encore envoyé de quoi régler");

    // Et rien n'a bougé sur l'échéance.
    expect(
      compterEnBase(
        "inscriptions_echeances",
        `_parent_id = (SELECT id FROM inscriptions WHERE reference = '${reference}') AND statut = 'annonce'`,
      ),
      "aucune échéance ne passe en vérification",
    ).toBe(0);
  });

  /*
    ⚠️ **Qui paie par carte n'a pas de numéro de transfert** (demandé par la
    direction le 25 septembre 2026). Il recevait un lien de paiement, payait,
    puis trouvait ici un formulaire qui exigeait un MTCN : aucun moyen de nous
    dire qu'il avait payé. Le formulaire suit maintenant le moyen choisi à
    l'inscription, et la route n'exige plus le numéro pour la carte.

    ⚠️ Sans pièce jointe, exprès : le magasin des justificatifs est partagé, et
    le ménage de fin de série supprime les dossiers en SQL — sans crochet, donc
    sans retirer le fichier. Le dépôt lui-même n'a pas changé ; il est éprouvé
    par `verifier-recus.ts`.
  */
  test("qui paie par carte confirme sans numéro de transfert", async ({ page }) => {
    const reference = await retenirUnePlace(page, "P1");
    sqlUneValeur(
      `UPDATE inscriptions SET moyen_souhaite = 'carte' WHERE reference = '${reference}';`,
    );
    envoyerLesCoordonnees(reference);
    await page.reload();

    const formulaire = page.locator('form[action="/api/transfert"]');
    await expect(formulaire, "le formulaire paraît pour la carte aussi").toBeVisible();
    await expect(page.getByText("Paiement effectué ?")).toBeVisible();
    await expect(
      page.locator('select[name="moyen"]'),
      "présélectionné sur ce qu'il a choisi à l'inscription",
    ).toHaveValue("carte");
    await expect(
      page.locator('input[name="numero"]'),
      "la référence n'est pas exigée pour une carte",
    ).not.toHaveAttribute("required");

    await page.click('form[action="/api/transfert"] button[type="submit"]');
    await page.waitForURL(/annonce=ok/);
    await expect(page.getByRole("status")).toContainText("C'est noté");

    expect(
      compterEnBase(
        "inscriptions_echeances",
        `_parent_id = (SELECT id FROM inscriptions WHERE reference = '${reference}') AND statut = 'annonce' AND moyen = 'carte'`,
      ),
      "l'échéance passe en vérification, par carte",
    ).toBe(1);
  });

  /*
    Le témoin : la règle ne s'est relâchée que pour la carte. Sans lui, une route
    qui n'exigerait plus aucun numéro passerait au vert sur l'épreuve d'au-dessus
    — et un transfert annoncé sans MTCN ne se retrouve pas au guichet.
  */
  test("un transfert sans numéro reste refusé", async ({ page, request }) => {
    const reference = await retenirUnePlace(page, "P1");
    envoyerLesCoordonnees(reference);

    const r = await request.post("/api/transfert", {
      form: { dossier: reference, moyen: "western-union", numero: "" },
      maxRedirects: 0,
    });
    expect(r.headers()["location"], "le numéro reste exigé").toContain("annonce=champs");
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
    /*
      ⚠️ Elle parcourt le tunnel **deux fois** — c'est tout son objet — et
      depuis que le numéro se saisit en deux champs, cela fait quatre
      interactions de plus. Neuf secondes seule, mais la série entière charge
      la base : le défaut par trente secondes tombait sous la charge, avec
      pour tout symptôme un contexte de requête déjà fermé. Le temps accordé
      dit ce que l'épreuve fait, il ne masque rien.
    */
    test.setTimeout(90_000);

    const email = `double.${Date.now()}${MARQUE}`;

    const envoyer = async () => {
      await page.goto(`/inscription?formation=${PARCOURS}`);
      await page.fill('input[name="nom"]', "Épreuve Double");
      await page.fill('input[name="email"]', email);
      await remplirWhatsapp(page, "+212600000000");
      await choisirPays(page);
      await remplirProfil(page);
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
    ── ⚠️ Et une vraie course, pas seulement deux clics l'un après l'autre ────
    Le test précédent attend chaque réponse avant d'envoyer la suivante : il
    éprouve `dejaLa`, le contrôle rapide qui lit puis écrit, mais jamais la
    fenêtre entre les deux. Trouvé en production le 7 septembre 2026 — deux
    dossiers pour la même personne, la même session, créés à 257 ms d'écart :
    deux requêtes assez proches pour que chacune trouve la table vide avant
    que l'autre n'y ait rien écrit.

    On envoie donc plusieurs requêtes **en même temps** (`Promise.all`),
    directement à la route, sans passer par un navigateur qui les
    sérialiserait malgré lui. Une seule doit gagner ; toutes les autres
    doivent renvoyer vers elle sans avoir laissé de dossier actif derrière —
    c'est `lib/interblocage.ts` qui rejoue déjà l'inverse de cette panne pour
    le décompte de places, ici c'est l'inscription elle-même qui se dédouble.
  */
  test("une vraie course ne retient qu'une seule place", async ({ request }) => {
    const email = `course.${Date.now()}${MARQUE}`;
    /*
      ⚠️ **Deux, pas davantage — c'est le cas réel.** `lib/interblocage.ts`
      documente lui-même sa limite : trois tentatives, pensées pour « deux
      personnes et une annonce qui circule ». Monter à six révèle une chose
      différente — le budget de réessai qui sature, un défaut de capacité
      distinct de celui qu'on éprouve ici. Deux reste le nombre qui a coûté une
      place en production le 7 septembre 2026, et le nombre que la garde existe
      pour couvrir.
    */
    const CONCURRENTES = 2;

    const debut = sqlUneValeur(
      `SELECT to_char(min(s.debut), 'YYYY-MM-DD') FROM sessions s
       JOIN programmes p ON p.id = s.programme_id WHERE p.slug = '${PARCOURS}';`,
    );

    const reponses = await Promise.all(
      Array.from({ length: CONCURRENTES }, () =>
        request.post("/api/inscription", {
          form: {
            formation: PARCOURS,
            debut,
            nom: "Épreuve Course",
            email,
            whatsapp: "+212600000000",
            profession: "Contrôleur de gestion",
            experience: "2-5",
            domaine: "controle-gestion",
            provenance: "linkedin",
            pays: "Maroc",
            plan: "P1",
            moyen: "virement",
            payeur: "particulier",
            consentement: "oui",
          },
          maxRedirects: 0,
        }),
      ),
    );

    /*
      ⚠️ **L'en-tête `location` est relatif**, et `referenceDeLAdresse` attend
      une adresse complète — c'est `new URL(page.url())` qu'elle résout
      d'ordinaire. On la complète ici avec l'origine de la requête elle-même,
      sans toucher au helper : son contrat reste celui qu'attendent les autres
      épreuves.
    */
    const references = reponses.map((r) => {
      const loc = r.headers()["location"];
      return loc ? referenceDeLAdresse(new URL(loc, r.url()).toString()) : undefined;
    });

    /*
      ⚠️ Toutes les réponses désignent le même dossier — même la ou les
      requêtes qui ont perdu la course et créé un dossier voué à s'annuler :
      c'est tout l'objet de la reconciliation, elles renvoient vers le
      gagnant plutôt que vers elles-mêmes.
    */
    const distinctes = new Set(references);
    expect(
      distinctes.size,
      `toutes les réponses pointent vers le même dossier — reçu ${[...distinctes].join(", ")}`,
    ).toBe(1);

    /*
      ⚠️ Et un seul dossier reste actif en base — les autres existent peut-être
      encore, mais `annulee`, ce qui les retire du décompte de places
      (`occupeUnePlace`). C'est la preuve qui compte : un compteur juste, pas
      seulement une redirection qui a l'air juste.
    */
    expect(
      compterEnBase("inscriptions", `apprenant_email = '${email}' AND statut != 'annulee'`),
      "un seul dossier actif, quel que soit le nombre de requêtes parties en même temps",
    ).toBe(1);

    sqlUneValeur(`DELETE FROM inscriptions WHERE apprenant_email = '${email}';`);
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
      await remplirWhatsapp(page, "+212600000000");
      await choisirPays(page);
      await remplirProfil(page);
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
 * ⚠️ Le rappel se demande depuis un dossier, et de nulle part ailleurs.
 *
 * Décision de la direction le 18 septembre 2026. L'épreuve garde les deux bords
 * du changement :
 *
 *  - **sans dossier, rien ne s'écrit.** La route ne recopie plus aucun champ de
 *    saisie ; une référence inventée ne doit donc pas pouvoir fabriquer une
 *    demande portant un numéro que l'on aurait choisi ;
 *  - **et une demande en attente suffit.** Le bandeau du back-office compte les
 *    demandes « nouvelle » pour dire ce qu'il reste à faire aujourd'hui : un
 *    doublon y ajoute un appel qui n'existe pas. La production en portait déjà
 *    deux, à moins de deux minutes d'écart, du temps du formulaire public.
 */
test("le rappel se demande depuis un dossier, et une seule fois à la fois", async ({
  page,
  request,
}) => {
  /* ── Une référence qui n'existe pas n'écrit rien ── */
  const inventee = "CLX-ZZZZZZZZ";
  const forgee = await request.post("/api/demande-rappel", {
    form: { reference: inventee },
    maxRedirects: 0,
  });
  /*
    ⚠️ Elle répond comme la page du dossier, pas par un refus : distinguer
    « ce dossier n'existe pas » de « ce dossier existe » apprendrait à qui
    essaie des références lesquelles sont bonnes — et une référence ouvre nom,
    adresse, téléphone et échéancier.
  */
  expect(forgee.headers()["location"], "on renvoie vers le dossier, sans rien apprendre").toContain(
    inventee,
  );
  expect(
    compterEnBase("demandes_rappel", `origine = '/inscription/${inventee}'`),
    "et surtout : aucune demande n'est née d'une référence inventée",
  ).toBe(0);

  /* ── Depuis un vrai dossier, elle part — et une seule fois ── */
  const reference = await retenirUnePlace(page, "P1");

  const demander = () =>
    request.post("/api/demande-rappel", { form: { reference }, maxRedirects: 0 });

  const premiere = await demander();
  expect(premiere.headers()["location"], "la demande est prise").toContain("rappel=ok");

  const seconde = await demander();
  /*
    ⚠️ **Ici on le lui dit**, contrairement à l'ancienne route qui répondait
    « c'est enregistré » à un doublon. Elle parlait à un inconnu ; celui-ci
    ouvre son propre dossier avec sa propre référence, et lui taire que sa
    demande est déjà passée le ferait recliquer — ou appeler pour vérifier.
  */
  expect(seconde.headers()["location"], "la seconde dit qu'elle est déjà là").toContain(
    "rappel=deja",
  );

  expect(
    compterEnBase("demandes_rappel", `origine = '/inscription/${reference}'`),
    "une seule ligne pour deux clics",
  ).toBe(1);

  sqlUneValeur(`DELETE FROM demandes_rappel WHERE origine = '/inscription/${reference}';`);
});

/**
 * ⚠️ Une session complète le dit, et n'accepte plus personne.
 *
 * C'est le moment le plus conséquent d'une campagne — celui où les trente
 * places sont prises — et il n'était exercé nulle part.
 *
 * Deux choses distinctes s'y jouent, et l'épreuve garde les deux :
 *
 *  - **ce que le visiteur lit.** La liste des sessions était filtrée avant
 *    d'être regardée, si bien qu'une cohorte pleine se lisait « aucune session
 *    n'est ouverte pour ce parcours ». Quelqu'un qui arrive d'une annonce
 *    promettant le 3 octobre en conclut que l'annonce ment ;
 *  - **ce que la route accepte.** Le formulaire n'est plus affiché, mais la
 *    route reste atteignable — par quelqu'un dont l'onglet est resté ouvert
 *    pendant que la dernière place partait, ou par un script.
 *
 * ⚠️ **On remplit les places, on ne met pas la capacité à zéro.** Une session
 * de capacité nulle n'est pas complète, elle n'existe pas commercialement — et
 * la page renvoie alors vers la fiche, ce qui n'éprouve rien.
 */
test("une session complète le dit, et n'accepte plus personne", async ({ page, request }) => {
  const slug = "directeur-qhse";
  const idsBruts = sqlUneValeur(
    // ⚠️ `programme_id`, pas `programme` : Payload suffixe ses clefs étrangères.
    `SELECT string_agg(s.id::text, ',') FROM sessions s
     JOIN programmes p ON p.id = s.programme_id WHERE p.slug = '${slug}';`,
  );
  expect(idsBruts, "le parcours doit avoir au moins une session").toMatch(/\d/);

  const avant = sqlUneValeur(
    `SELECT string_agg(id || ':' || places_reservees, ',') FROM sessions WHERE id IN (${idsBruts});`,
  );
  const debut = sqlUneValeur(
    `SELECT to_char(min(debut), 'YYYY-MM-DD') FROM sessions WHERE id IN (${idsBruts});`,
  );

  try {
    sqlUneValeur(`UPDATE sessions SET places_reservees = capacite WHERE id IN (${idsBruts});`);

    /*
      ── ⚠️ La mise en place SQL ne suffit pas, et ne suffisait pas avant ────
      La fiche et la page d'inscription lisent le catalogue par
      `unstable_cache` (étiquette `catalogue`, une heure). L'`UPDATE` ci-dessus
      ne déclenche aucun crochet Payload : il ne lève donc aucune étiquette, et
      les deux pages continuent de servir l'ancien décompte. Mesuré : session
      remplie en base, et la fiche rend six fois « Me pré-inscrire ».

      ⚠️ **Cette épreuve passait quand même, par accident.** Une inscription
      créée plus haut dans le même fichier levait l'étiquette entre-temps.
      Lancée seule — `-g "complète"` — elle échouait ; lancée dans un autre
      ordre, elle serait passée au vert sans rien éprouver. Un contrôle vert
      parce qu'un autre l'a réveillé est pire qu'un contrôle absent : il
      inspire une confiance que rien ne soutient.

      On lève donc l'étiquette pour de bon, et par le seul chemin qu'un
      visiteur emprunte : une inscription sur **un autre parcours**. Elle passe
      par Payload, son crochet `recompter` écrit la session, et
      `revaliderSession` vide l'étiquette du catalogue entier. Le dossier créé
      porte la marque des épreuves et repart avec le ménage.
    */
    const reveil = await request.post("/api/inscription", {
      form: {
        formation: "directeur-marketing",
        nom: "Épreuve Réveil Cache",
        email: `reveil.${Date.now()}${MARQUE}`,
        whatsapp: "+212600000000",
        profession: "Contrôleur de gestion",
        experience: "2-5",
        domaine: "controle-gestion",
        provenance: "linkedin",
        pays: "Maroc",
        plan: "P1",
        moyen: "virement",
        payeur: "particulier",
        consentement: "oui",
      },
      maxRedirects: 0,
    });
    expect(
      reveil.headers()["location"],
      "le réveil du cache doit lui-même aboutir, sinon la suite n'éprouve rien",
    ).toMatch(/\/inscription\/CLX-/);

    /*
      ── ⚠️ D'abord la fiche : c'est là qu'atterrit le trafic acheté ─────────
      Le premier écran porte l'action principale depuis le 6 septembre 2026.
      Quand la cohorte se remplit, `getProchaineSession` ne rend plus rien —
      exactement comme un parcours sans aucune date — et le bouton doré
      disparaissait, laissant le premier écran sans rien à faire. Le visiteur
      arrive d'une annonce qui promet le 3 octobre : il doit trouver la liste
      d'attente là où il trouvait l'inscription, pas huit écrans plus bas.
    */
    await page.goto(`/formations/${slug}`);
    const action = page
      .locator("main a")
      .filter({ hasText: /liste d'attente/i })
      .first();
    await expect(action, "le premier écran doit garder une action").toBeVisible();
    const haut = await action.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    expect(haut, `l'action est à ${Math.round(haut)} px, hors du premier écran`).toBeLessThan(
      page.viewportSize()!.height,
    );
    await expect(
      page.getByText("Être prévenu de la prochaine session"),
      "⚠️ complet n'est pas « pas de date » : l'annonce en promet une",
    ).toHaveCount(0);

    // ── Ce que le visiteur lit
    await page.goto(`/inscription?formation=${slug}`);
    await expect(page.getByText("Cette session est complète")).toBeVisible();
    await expect(
      page.getByText(/liste d'attente/i),
      "on doit lui dire quoi faire, pas seulement qu'il ne peut rien faire",
    ).toBeVisible();
    await expect(
      page.getByText("Aucune session n'est ouverte"),
      "⚠️ et surtout pas qu'aucune date n'existe : l'annonce en promet une",
    ).toHaveCount(0);

    // ── Ce que la route accepte
    const poste = await request.post("/api/inscription", {
      form: {
        formation: slug,
        debut,
        nom: "Épreuve Complet",
        email: `complet.${Date.now()}${MARQUE}`,
        whatsapp: "+212600000000",
        profession: "Contrôleur de gestion",
        experience: "2-5",
        domaine: "controle-gestion",
        provenance: "linkedin",
        pays: "Maroc",
        plan: "P1",
        moyen: "virement",
        payeur: "particulier",
        consentement: "oui",
      },
      maxRedirects: 0,
    });
    expect(poste.headers()["location"], "la route refuse une place qui n'existe pas").toContain(
      "erreur=complet",
    );
    expect(
      compterEnBase("inscriptions", `apprenant_nom = 'Épreuve Complet'`),
      "et rien n'est écrit",
    ).toBe(0);

    /*
      ── ⚠️ Et la liste d'attente doit exister quelque part ──────────────────
      Trois endroits proposent de la rejoindre quand la cohorte est pleine — le
      héros de la fiche, sa colonne latérale, et cette page, qui promet même
      « nous vous **plaçons** sur la liste d'attente ». Les trois menaient à
      `/contact` **nu** : la demande arrivait dans la liste de l'équipe sans
      rien qui dise quel parcours, ni qu'il s'agissait d'une liste d'attente.

      Une demande de rappel ordinaire, parmi quatorze autres. Personne ne
      pouvait tenir la promesse, faute de savoir qui rappeler pour quoi — et
      c'est le chemin que **tout le trafic acheté** empruntera le jour où la
      cohorte de l'annonce se fermera.

      ⚠️ **L'épreuve va jusqu'à la base**, pas jusqu'à la page de confirmation :
      celle-ci dit « votre demande est bien enregistrée » quoi qu'il arrive —
      elle le disait déjà quand le parcours se perdait. La même leçon que la
      garde du double envoi, restée verte parce qu'elle ne regardait que la
      redirection.
    */
    await page.goto(`/inscription?formation=${slug}`);
    const versAttente = page.getByRole("link", { name: /Écrivez-nous/i });
    await expect(versAttente).toBeVisible();
    await versAttente.click();
    await page.waitForURL(/\/contact\?/);

    await expect(
      page.getByRole("heading", { name: /liste d'attente/i }),
      "⚠️ qui clique « rejoindre la liste d'attente » doit arriver sur ce qu'il a demandé",
    ).toBeVisible();

    /*
      ⚠️ **Ce que cette épreuve gardait, et ce qu'elle garde maintenant.**

      Elle remplissait le formulaire de `/contact` et comptait la ligne écrite en
      base : la demande devait porter **le parcours** dont la cohorte est pleine,
      et **dire qu'il s'agit d'une liste d'attente** — sans quoi elle se noyait
      parmi les demandes ordinaires, « je me renseigne » n'étant pas « je voulais
      m'inscrire et je n'ai pas pu ».

      Ce formulaire a été retiré le 18 septembre 2026, et la liste d'attente est
      le seul cas qui ne peut pas passer par la pré-inscription : il n'y a plus
      de place à retenir, c'est tout le problème. Elle passe donc par WhatsApp.

      ⚠️ **Il n'y a plus de ligne en base à compter — c'est le prix, et il est
      assumé.** Ce qui reste vérifiable est ce qui décidait déjà : que le message
      proposé **nomme le parcours**. Un lien qui ouvrirait une conversation vide
      ferait retomber l'équipe dans « de quel parcours me parle-t-on ? », le
      défaut exact que le champ caché corrigeait.
    */
    const versWhatsapp = page.getByRole("link", { name: /WhatsApp/i }).first();
    await expect(versWhatsapp, "la porte de la liste d'attente reste ouverte").toBeVisible();

    const lien = await versWhatsapp.getAttribute("href");
    expect(lien, "elle mène bien à WhatsApp").toContain("wa.me");

    const message = decodeURIComponent(new URL(lien!).searchParams.get("text") ?? "");
    expect(
      message.toLowerCase(),
      "⚠️ le message doit nommer le parcours dont la cohorte est pleine",
    ).toContain(slug.replace(/-/g, " ").toLowerCase());
    expect(
      message.toLowerCase(),
      "⚠️ et dire de quoi il s'agit — une place qui se libère, pas un renseignement",
    ).toMatch(/place se lib|date s'ouvre/);
  } finally {
    // Chaque session retrouve son décompte, même si l'épreuve a échoué.
    for (const paire of avant.split(",")) {
      const [id, places] = paire.split(":");
      sqlUneValeur(`UPDATE sessions SET places_reservees = ${places} WHERE id = ${id};`);
    }
  }
});
