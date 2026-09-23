/**
 * Le message de présentation promet-il seulement ce que la maison tient ?
 *
 * C'est le message le plus exposé de tous : il part à des gens qui ne nous
 * connaissent pas, choisis à la main, et qui **vérifieront** sur le site. Une
 * phrase de trop y est une phrase qu'un prospect découvrira fausse au moment
 * de payer — sur le message même qui l'a fait venir.
 *
 * La garde travaille dans les deux sens, comme `verifier-faq.ts` :
 *
 *  - **ce qu'on lui donne ressort** — changer un prix dans la source change le
 *    message, sans quoi il porterait une copie qui vieillirait toute seule ;
 *  - **ce qu'on ne lui donne pas n'apparaît jamais** — pas de taux de réussite,
 *    pas de replay, pas de campus, pas de certification que nous délivrerions.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { composerLaPresentation, type FaitsDePresentation } from "@/lib/presentation";
import { lireLesAdresses, POST } from "../src/app/(payload)/api/admin/presenter/route.js";
import { ouvrirSession } from "../src/lib/session.js";

const payload = await getPayload({ config });

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const SOURCE: FaitsDePresentation = {
  specialisations: [
    { slug: "finance-controle", nom: "Finance & Contrôle" },
    { slug: "capital-humain", nom: "Capital humain" },
  ] as never,
  programmes: [
    {
      slug: "daf",
      titre: "Directeur Administratif et Financier",
      dureeHeures: 32,
      specialisation: "finance-controle",
    },
    {
      slug: "pmp",
      titre: "Préparation à la certification PMP®",
      dureeHeures: 35,
      specialisation: "finance-controle",
      certification: "PMP® — Project Management Institute",
    },
    {
      slug: "drh",
      titre: "Directeur des Ressources Humaines",
      dureeHeures: 32,
      specialisation: "capital-humain",
    },
  ] as never,
  tarifs: {
    prixComptantCentimes: 42_300,
    devise: "EUR",
    moyensPaiement: [],
    plans: [
      {
        code: "comptant",
        libelle: "Paiement comptant (1 tranche)",
        totalCentimes: 42_300,
        echeancesCentimes: [42_300],
        conditions: "",
      },
      {
        code: "trois",
        libelle: "3 tranches",
        totalCentimes: 47_000,
        echeancesCentimes: [17_000, 15_000, 15_000],
        conditions: "",
      },
    ],
  } as never,
  prochaineRentree: new Date("2026-10-03T09:00:00.000Z"),
  finDeCohorte: new Date("2026-11-21T13:00:00.000Z"),
  site: "https://www.clixa.africa",
};

const aplatir = (p: ReturnType<typeof composerLaPresentation>) =>
  [
    p.objet,
    p.accroche,
    ...p.familles.flatMap((f) => [f.nom, ...f.parcours.map((c) => `${c.titre} ${c.heures}`)]),
    ...p.deroule,
    ...p.certificat,
    ...p.formules.map((f) => `${f.libelle} ${f.total} ${f.detail}`),
    p.rentree ?? "",
  ].join(" | ");

console.log("\n── 1. Ce qu'on lui donne ressort ──");

const base = composerLaPresentation(SOURCE);
const texte = aplatir(base);

dire("les trois parcours y sont", base.combien === 3 && /Directeur Administratif/.test(texte));
dire("les durées viennent du catalogue", /32/.test(texte) && /35/.test(texte));
dire("les montants viennent du barème", /423/.test(texte) && /470/.test(texte));
dire("l'échéancier est détaillé", /170.*150.*150/.test(texte.replace(/\s+/g, " ")));
dire("la rentrée est annoncée", /3 octobre 2026/.test(texte));
dire("les filières groupent les parcours", base.familles.length === 2);

/*
  ⚠️ **Le témoin : on change la source, le message doit changer.** Sans lui,
  une fonction qui rendrait un texte écrit en dur passerait tous les contrôles
  ci-dessus — et c'est exactement le défaut qu'on veut empêcher, puisque c'est
  celui qui a coûté au site six copies divergentes du numéro d'admissions.
*/
const autre = composerLaPresentation({
  ...SOURCE,
  tarifs: {
    ...SOURCE.tarifs,
    plans: [
      {
        code: "comptant",
        libelle: "Paiement comptant (1 tranche)",
        totalCentimes: 99_900,
        echeancesCentimes: [99_900],
        conditions: "",
      },
    ],
  } as never,
});
const texteAutre = aplatir(autre);
dire(
  "témoin : un barème changé change le message",
  /999/.test(texteAutre) && !/423/.test(texteAutre),
);

const sansRentree = composerLaPresentation({
  ...SOURCE,
  prochaineRentree: undefined,
  finDeCohorte: undefined,
});
dire(
  "témoin : sans session publiée, aucune rentrée n'est annoncée",
  sansRentree.rentree === undefined,
);

console.log("\n── 2. Ce qu'il ne promet jamais ──");

const INTERDITS: [string, RegExp][] = [
  /*
    ⚠️ **Aucun pourcentage, quel qu'il soit** — et le motif a dû être élargi
    après coup. Le premier jet cherchait « taux de réussite » et « N % de
    réussite » : remis à l'essai avec « 92 % de nos participants décrochent une
    promotion dans l'année », il est **resté vert**. Il gardait la formulation
    que j'avais imaginée, pas la classe de promesse.

    Rien dans ce message n'a de raison légitime de porter un pourcentage : les
    prix sont en euros, les durées en heures. Tout « % » y est donc un chiffre
    que rien ne mesure. C'est la leçon déjà écrite pour le filtre du champ
    « Pays » — une garde écrite sur une supposition vaut moins qu'une garde
    mesurée.
  */
  ["aucun pourcentage, rien ne les mesure", /%|pour cent|taux de r[ée]ussite|garanti/i],
  ["aucune promesse de résultat", /d[ée]crochent? un|obtiendrez|vous serez promu|assure un poste/i],
  ["aucun replay", /replay|rediffusion|à votre rythme|accès permanent/i],
  ["aucun campus hors d'Agadir", /campus|Abidjan|Dakar|Casablanca/i],
  ["aucune rareté inventée", /derni[èe]res places|plus que \d+|d[ée]p[êe]chez|offre limit[ée]e/i],
  [
    "aucune promesse de diplôme d'État",
    /dipl[ôo]me d'[ÉE]tat|reconnu par l'[ÉE]tat|[ée]quivalence/i,
  ],
];
for (const [quoi, motif] of INTERDITS) dire(quoi, !motif.test(texte), motif.source.slice(0, 28));

/*
  ⚠️ **Préparer n'est pas délivrer**, et c'est la phrase qu'un candidat lit
  avant de choisir sa préparation. Le trailer a dû retirer « formateurs
  certifiés PMP » et « réussir dès le 1er passage » pour la même raison.
*/
dire(
  "le PMP® est dit comme une préparation, l'examen chez PMI",
  /nous ne le d[ée]livrons pas/i.test(texte) && /PMI/.test(texte),
);

/*
  Et le témoin de ce refus : sans parcours certifiant, la phrase ne doit pas
  apparaître — sinon elle serait écrite en dur, et vraie par accident.
*/
const sansPMP = composerLaPresentation({
  ...SOURCE,
  programmes: SOURCE.programmes.filter((p) => !p.certification) as never,
});
dire("témoin : sans parcours certifiant, la mention PMI disparaît", !/PMI/.test(aplatir(sansPMP)));

console.log("\n── 3. Un parcours n'est jamais perdu en route ──");
const orphelin = composerLaPresentation({
  ...SOURCE,
  specialisations: [{ slug: "finance-controle", nom: "Finance & Contrôle" }] as never,
});
dire(
  "un parcours sans filière connue reste affiché",
  /Directeur des Ressources Humaines/.test(aplatir(orphelin)),
  `${orphelin.combien} parcours annoncés`,
);
dire("et le compte reste juste", orphelin.combien === 3);

const filiereVide = composerLaPresentation({
  ...SOURCE,
  specialisations: [
    ...SOURCE.specialisations,
    { slug: "vide", nom: "Filière sans parcours" },
  ] as never,
});
dire(
  "une filière vide ne s'affiche pas",
  !filiereVide.familles.some((f) => f.nom === "Filière sans parcours"),
);

console.log("\n── 4. Le parcours mis en avant ──");

const avecDaf = composerLaPresentation({ ...SOURCE, misEnAvant: "daf" });
dire("le parcours demandé est mis en avant", avecDaf.enAvant?.slug === "daf");
dire("l'objet le nomme", /Directeur Administratif/.test(avecDaf.objet), avecDaf.objet);
dire("il reste aussi dans la liste des douze", /Directeur Administratif/.test(aplatir(avecDaf)));

/*
  ⚠️ **Un slug inconnu ne met rien en avant, et ne casse rien.** Le réglage
  vient de la route, donc d'un corps de requête : une faute de frappe ne doit
  ni vider le message, ni — pire — mettre en avant un autre parcours que celui
  qu'on croit. Le message se rend alors en liste, comme avant.
*/
const inconnu = composerLaPresentation({ ...SOURCE, misEnAvant: "parcours-qui-nexiste-pas" });
dire("un slug inconnu ne met rien en avant", inconnu.enAvant === undefined);
dire(
  "et le message reste entier",
  inconnu.combien === 3 && /Directeur Administratif/.test(aplatir(inconnu)),
);
dire(
  "et l'objet revient à la formule générale",
  /3 parcours de direction/.test(inconnu.objet),
  inconnu.objet,
);

/*
  ⚠️ **Les séances et les publics sont bornés.** Tout déplier ferait, pour le
  seul parcours mis en avant, la longueur du reste du message — qui en présente
  déjà douze.
*/
const large = composerLaPresentation({
  ...SOURCE,
  misEnAvant: "daf",
  programmes: SOURCE.programmes.map((x) =>
    x.slug === "daf" ? { ...x, publicVise: ["a", "b", "c", "d", "e", "f", "g"], modules: [] } : x,
  ) as never,
});
dire("au plus quatre publics", (large.enAvant?.pourQui.length ?? 0) === 4);
dire("un parcours sans plan de cours ne casse rien", Array.isArray(large.enAvant?.seances));

console.log("\n── 4bis. Les couleurs des filières ──");

/*
  ⚠️ **Elles viennent du back-office, et la correspondance se vérifie.**
  `clixa.css` teinte les cinq filières dans le tableau de supervision, que
  l'équipe voit tous les matins ; `COULEURS_FILIERE` les reprend en
  hexadécimal, parce qu'un courriel n'a ni variables CSS ni feuille de style.
  Deux tables qui décrivent la même chose finissent par diverger — celle-ci ne
  peut pas dériver sans qu'un contrôle le dise.
*/
const { COULEURS_FILIERE, COULEUR_PAR_DEFAUT } = await import("../src/lib/presentation.js");

const catalogue = await payload.find({
  collection: "specialisations",
  limit: 50,
  depth: 0,
  overrideAccess: true,
  locale: "fr",
});
const slugs = catalogue.docs.map((x) => String((x as { slug?: unknown }).slug));

dire("le catalogue a des filières", slugs.length > 0, `${slugs.length} filières`);
for (const slug of slugs) {
  dire(
    `« ${slug} » a sa couleur`,
    Boolean(COULEURS_FILIERE[slug]),
    COULEURS_FILIERE[slug]?.trait ?? "aucune",
  );
}

/*
  ⚠️ **Le repli existe et il est neutre**, pas une teinte au hasard : une
  filière ajoutée demain sort en ivoire, ce qui se remarque, plutôt que dans
  une couleur qui voudrait dire quelque chose qu'elle ne veut pas dire.
*/
/*
  ⚠️ **Les deux lectures du catalogue doivent rendre le même ordre.** La
  version cachée trie par `id` ; `catalogueSansCache` ne triait pas du tout, et
  Postgres rendait les lignes dans l'ordre qui l'arrangeait — le courriel
  sortait ses cinq filières, et les parcours dans chacune, dans un ordre qui
  pouvait changer d'un envoi à l'autre. Trouvé en comparant la sortie réelle de
  la production au jeu d'essai.
*/
{
  const { catalogueSansCache } = await import("../src/lib/catalogue.js");
  const un = await catalogueSansCache();
  const deux = await catalogueSansCache();
  const ordre = (x: { specialisations: { slug: string }[]; programmes: { slug: string }[] }) =>
    [...x.specialisations.map((s) => s.slug), "|", ...x.programmes.map((p) => p.slug)].join(",");
  dire("deux lectures du catalogue rendent le même ordre", ordre(un) === ordre(deux));
  dire(
    "et les filières sont triées, pas rendues au hasard",
    un.specialisations.length > 0 && ordre(un) === ordre(deux),
    `${un.specialisations.length} filières · ${un.programmes.length} parcours`,
  );
}

dire(
  "le repli est neutre, pas une teinte prise au hasard",
  COULEUR_PAR_DEFAUT.texte === "#cbd5e1",
  COULEUR_PAR_DEFAUT.texte,
);

/*
  ⚠️ **Et chaque famille rendue porte la sienne.** Sans ce contrôle, une
  couleur pourrait exister dans la table sans jamais atteindre le message.
*/
const teintes = new Set(base.familles.map((f) => f.couleur.trait));
dire(
  "chaque filière rendue porte une couleur distincte",
  teintes.size === base.familles.length,
  [...teintes].join(" "),
);

console.log("\n── 5. Le collage d'adresses ──");
const colle = lireLesAdresses(
  `aicha@exemple.ma, Kouamé N'Guessan <kouame@exemple.ci>
   fatou@exemple.sn ; aicha@exemple.ma
   pas-une-adresse
   "Moussa Diop" <moussa@exemple.ml>`,
);
dire(
  "les trois séparateurs sont acceptés",
  colle.length === 4,
  colle.map((c) => c.email).join(" "),
);
dire(
  "le nom entre chevrons est lu",
  colle.some((c) => c.nom === "Kouamé N'Guessan"),
);
dire(
  "les guillemets du nom sont retirés",
  colle.some((c) => c.nom === "Moussa Diop"),
);
dire(
  "un doublon est écarté une seule fois",
  colle.filter((c) => c.email === "aicha@exemple.ma").length === 1,
);
dire("ce qui n'est pas une adresse est ignoré", !colle.some((c) => c.email.includes("pas-une")));

console.log("\n── 6. La porte, les images, et le désabonnement ──");

const marque = Date.now();
const aSupprimer: { collection: "utilisateurs" | "apprenants"; id: string | number }[] = [];
const COMME_UN_NAVIGATEUR = {
  origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  "sec-fetch-site": "same-origin",
  "content-type": "application/json",
};
const appeler = async (cookie: string | undefined, corps: Record<string, unknown>) =>
  POST(
    new Request("http://localhost:3000/api/admin/presenter", {
      method: "POST",
      headers: new Headers({
        ...COMME_UN_NAVIGATEUR,
        ...(cookie ? { cookie: cookie.split(";")[0] ?? "" } : {}),
      }),
      body: JSON.stringify(corps),
    }),
  );

try {
  const membre = await payload.create({
    collection: "utilisateurs",
    data: {
      email: `presentation-${marque}@epreuve.invalid`,
      password: `Ep-${marque}-xY`,
      nom: "Épreuve présentation",
      role: "direction",
    },
    overrideAccess: true,
  });
  aSupprimer.push({ collection: "utilisateurs", id: membre.id });

  const participant = await payload.create({
    collection: "apprenants",
    data: {
      email: `p-presentation-${marque}@epreuve.invalid`,
      password: `Ep-${marque}-zW`,
      nom: "Participant",
      _verified: true,
    } as never,
    overrideAccess: true,
  });
  aSupprimer.push({ collection: "apprenants", id: participant.id });

  const cookieEquipe = await ouvrirSession(payload, "utilisateurs", membre.id);
  const cookieParticipant = await ouvrirSession(payload, "apprenants", participant.id);
  const liste = "a@epreuve.invalid, b@epreuve.invalid";

  dire(
    "sans session : refusé",
    (await appeler(undefined, { destinataires: liste, essai: true })).status === 401,
  );
  dire(
    "avec un compte participant : refusé",
    (await appeler(cookieParticipant, { destinataires: liste, essai: true })).status === 401,
  );

  const vu = await appeler(cookieEquipe, { destinataires: liste, essai: true });
  dire("l'équipe passe la garde", vu.status === 200);
  const corpsVu = (await vu.json()) as { destinataires: string[]; objet: string };
  dire(
    "le mode essai rend les adresses lues, pas leur nombre",
    Array.isArray(corpsVu.destinataires) && corpsVu.destinataires.length === 2,
  );

  dire(
    "un collage sans adresse est refusé, et le dit",
    (await appeler(cookieEquipe, { destinataires: "bonjour", essai: true })).status === 400,
  );

  /*
    ⚠️ **L'en-tête de désabonnement, mesuré sur le message réel.** Sans lui,
    celui que le message agace n'a qu'un bouton : « indésirable ». Quelques
    signalements emportent la réputation de `envoi.clixa.africa` — donc la
    confirmation d'inscription, le contrat et le certificat.
  */
  const vus: { headers?: Record<string, string>; html?: string }[] = [];
  const vrai = payload.sendEmail.bind(payload);
  payload.sendEmail = (async (m: Record<string, unknown>) => {
    vus.push(m as never);
    return { id: "epreuve" };
  }) as typeof payload.sendEmail;
  await appeler(cookieEquipe, { destinataires: "c@epreuve.invalid" });
  payload.sendEmail = vrai;

  const envoye = vus[0];
  dire("un message est bien parti", vus.length === 1);
  dire("il porte List-Unsubscribe", Boolean(envoye?.headers?.["List-Unsubscribe"]));
  dire(
    "et List-Unsubscribe-Post, pour le bouton de Gmail",
    envoye?.headers?.["List-Unsubscribe-Post"] === "List-Unsubscribe=One-Click",
  );
  dire(
    "le désabonnement se lit aussi dans le corps",
    /ne vous [ée]crirons plus/i.test(envoye?.html ?? ""),
  );

  /*
    ── ⚠️ Les images : ce qu'elles portent, et ce qu'elles ne portent pas ────
    La direction a demandé des messages « fihom des photo », du niveau de ceux
    d'Accor ou de Lyca. Ceux-là incrustent leur titre dans le visuel — et
    arrivent **vides** chez qui bloque les images, ce que font la plupart des
    clients pour un expéditeur inconnu, c'est-à-dire exactement le destinataire
    de ce message.
  */
  const html = envoye?.html ?? "";
  const balises = [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]);

  dire("le message porte bien des images", balises.length >= 3, `${balises.length} images`);
  /*
    ⚠️ **Le logo n'est pas une image de contenu**, et cette garde l'a d'abord
    accusé : elle exigeait vingt caractères d'`alt` de toute image, et le logo
    porte « CLIXA Institute » — quinze, et c'est exactement ce qu'un logo doit
    annoncer. Une description plus longue y serait du bruit lu à voix haute.

    C'est la garde qui avait tort, pas le gabarit. La règle se dit donc en
    deux temps : **aucune image sans alt**, et **un alt qui décrit** pour
    celles qui portent le propos.
  */
  dire(
    "aucune image sans alt",
    balises.every((b) => /alt="[^"]+"/.test(b)),
  );
  dire(
    "les images de contenu ont un alt qui décrit ce qu'elles montrent",
    balises.filter((b) => !/logo\.png/.test(b)).every((b) => /alt="[^"]{20,}"/.test(b)),
  );
  dire(
    "chacune porte sa largeur en attribut — Outlook ignore le CSS des images",
    balises.every((b) => /width="\d+"/.test(b)),
  );

  /*
    ⚠️ **Le message sans ses images dit encore tout.** On les retire, et l'on
    redemande ce que les contrôles précédents exigeaient. C'est la garde qui
    prouve que rien d'essentiel n'a migré dans un visuel.
  */
  const nu = html.replace(/<img[^>]*>/g, "");
  for (const [quoi, motif] of [
    ["les montants", /423|470/],
    ["la rentrée", /3 octobre 2026/],
    ["le désabonnement", /ne vous [ée]crirons plus/i],
    ["le parcours mis en avant", /Directeur Administratif/],
  ] as [string, RegExp][]) {
    dire(`images bloquées : ${quoi} se lit encore`, motif.test(nu));
  }

  /*
    ⚠️ **La photo de séminaire porte sa légende, et la légende est du texte.**
    Muette, elle promet du présentiel là où les douze parcours se donnent en
    classe virtuelle — la correction imposée au trailer officiel le
    13 septembre 2026. Une légende incrustée dans l'image disparaîtrait avec
    elle, et la promesse resterait chez qui l'a vue une fois.
  */
  dire(
    "la photo de séminaire est légendée, en texte",
    /classe virtuelle/i.test(nu) && /S[ée]minaire dirigeants/i.test(nu),
  );

  /*
    ── ⚠️ Les treize affirmations d'un gabarit reçu, et pourquoi elles sont
    gardées une par une ──────────────────────────────────────────────────────
    La direction a transmis le 23 septembre 2026 un gabarit composé ailleurs,
    à reprendre. Sa structure était bonne ; ses faits, non — et **aucun n'était
    attrapable par un type, un build ou une relecture rapide**, parce que
    chacun était parfaitement plausible. Chacun aurait été découvert par le
    premier prospect qui vérifie, sur le message même qui sert à le faire
    venir.

    Mesuré en production ce jour-là : `/programmes/<slug>` rendait **404** (la
    vraie adresse est `/formations/<slug>`), les quatre images `email_*.jpg`
    rendaient 404, `/conditions` et `/desinscription` aussi, le numéro WhatsApp
    était un numéro d'attente, la cohorte annoncée « limitée à 20 participants »
    en comptait **109 de prises** et se tient ouverte, et les séances annoncées
    « du soir » se donnent le **samedi de 9h00 à 13h00**.

    On ne garde pas « ce gabarit-là » : on garde la **classe** de chaque faute,
    pour qu'elle ne revienne pas par une autre porte.
  */
  const INTERDITS_DU_GABARIT: [string, RegExp][] = [
    ["aucune adresse en /programmes/ — elles rendent 404", /\/programmes\//],
    ["aucune séance « du soir » — l'horaire vient de la cadence", /du soir|en soir[ée]e/i],
    ["aucune promotion « limitée à N »", /limit[ée]e? à \d+|plus que \d+ places?/i],
    [
      "aucune sélection inventée",
      /s[ée]lection sur dossier|comit[ée] des admissions|entretien d'alignement/i,
    ],
    ["aucun accès promis avant le règlement", /acc[èe]s imm[ée]diat/i],
    ["aucune échéance présentée comme mensuelle", /mensualit[ée]s?|\/\s?mois|par mois/i],
    ["aucune attestation dite « officielle »", /attestation officielle/i],
    ["aucune convention de formation inventée", /convention de formation/i],
  ];
  for (const [quoi, motif] of INTERDITS_DU_GABARIT) dire(quoi, !motif.test(html));

  /*
    ⚠️ **Le numéro WhatsApp se lit dans `lib/reseaux.ts`, jamais recopié.** Le
    gabarit reçu portait `212660000000` — un numéro d'attente, qui ouvre une
    conversation avec un inconnu. C'est la faute que la règle ESLint sur
    `reseaux.ts` existe pour empêcher dans le code ; ici on vérifie le rendu.
  */
  const { RESEAUX_CLIXA } = await import("../src/lib/reseaux.js");
  dire(
    "le numéro WhatsApp est celui de la maison",
    html.includes(RESEAUX_CLIXA.whatsapp.numeroAffiche),
    RESEAUX_CLIXA.whatsapp.numeroAffiche,
  );

  /*
    ⚠️ **Toutes les adresses du message mènent quelque part.** Un lien mort
    dans un message de prospection coûte le prospect : il a cliqué, il est
    tombé sur un 404, il ne reviendra pas. On ne tire pas le réseau ici — la
    recette le fait sur la production — mais on vérifie que le message ne
    fabrique que des adresses dont la forme existe.
  */
  const liens = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]!);
  const formesConnues =
    /\/(formations|inscription|verifier|temoignages|faq|contact|compte|blog|campus|v)\b|^https:\/\/(www\.)?clixa\.africa\/?$|wa\.me/;
  const douteux = liens.filter((l) => l.includes("clixa.africa") && !formesConnues.test(l));
  dire("aucune adresse inventée", douteux.length === 0, douteux.join(" ") || "toutes connues");
} finally {
  for (const quoi of aSupprimer.reverse()) {
    await payload
      .delete({ collection: quoi.collection, id: quoi.id, overrideAccess: true })
      .catch(() => undefined);
  }
}

console.log(
  manques === 0
    ? "\n✅ La présentation ne promet que ce que le catalogue tient.\n"
    : `\n❌ ${manques} point(s) à regarder.\n`,
);
process.exit(manques === 0 ? 0 : 1);
