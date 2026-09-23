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

console.log("\n── 4. Le collage d'adresses ──");
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

console.log("\n── 5. La porte, et l'en-tête de désabonnement ──");

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
