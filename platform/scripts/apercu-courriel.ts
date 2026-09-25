/**
 * Écrire les courriels sur disque, pour les regarder.
 *
 * Ce que reçoit un participant après avoir retenu sa place est la première
 * chose qu'il lit de nous, et la seule qu'il gardera. Elle ne se relit pas dans
 * le code : les clients de messagerie ne rendent pas le HTML comme un
 * navigateur, et un gabarit qui paraît juste à la lecture peut arriver de
 * travers.
 *
 *   npx payload run scripts/apercu-courriel.ts
 *
 * Les fichiers sortent dans `apercus/` (ignoré par git), à ouvrir dans un
 * navigateur — et, mieux, à s'envoyer pour les voir dans un vrai client.
 * `apercus/index.html` les liste tous.
 *
 * ── ⚠️ Il appelle les vraies fonctions, depuis le 7 septembre 2026 ──────────
 * Il recopiait les corps de message à la main, et s'en avertissait lui-même :
 * « une phrase ajoutée au vrai courriel et oubliée dans cet aperçu ferait
 * relire, rassuré, un message qui n'existe pas ». C'est exactement ce qui est
 * arrivé, en pire — il montrait **deux gabarits sur quatorze**, et le journal
 * du projet affirmait pendant ce temps qu'il rendait « les vrais gabarits, et
 * reste le seul chemin ». Les douze autres n'avaient jamais été regardés par
 * personne : le courriel du contrat vérifié, celui du certificat, celui du
 * versement reçu, celui qui annonce qu'une place va repartir.
 *
 * Il n'y a donc plus de second texte à tenir : un faux expéditeur recueille ce
 * que les vraies fonctions composent. Un gabarit ajouté sans sa ligne ici ne
 * s'affichera pas — mais rien de ce qui s'affiche ne peut plus mentir.
 */
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

/*
  ⚠️ **Avant l'import, et c'est indispensable.** `EMAIL_EQUIPE` est lu une fois,
  à l'évaluation du module ; les six notifications internes commencent par
  `if (!EQUIPE) return`. Sans cette ligne, la moitié des gabarits ne rendrait
  rien du tout — silencieusement, ce qui se lirait comme « il n'y en a que
  sept ».
*/
process.env.EMAIL_EQUIPE ??= "equipe@clixa.africa";

const c = await import("../src/lib/courriel.js");
const { annonceDuDemarrage } = await import("../src/lib/demarrage.js");
const { composerLaPresentation } = await import("../src/lib/presentation.js");

/*
  De quoi fabriquer les quatre états de l'annonce de démarrage, plus bas.
  ⚠️ Les échéances sont **dues** : un échéancier vide ferait rendre « tout est
  réglé » à `annonceDuDemarrage`, et les quatre aperçus montreraient le même
  message — celui qu'aucun des cent seize dossiers de production ne porte.
*/
const HIER = new Date(Date.now() - 86_400_000).toISOString();
const ECHEANCES_DUES = [
  { montantCentimes: 17_000, dateLimite: "2026-10-03T00:00:00.000Z", statut: "attendu" as const },
  { montantCentimes: 15_000, dateLimite: "2026-10-24T00:00:00.000Z", statut: "attendu" as const },
];

/** Ce que le faux expéditeur recueille, à la place de Resend. */
interface Message {
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
}

const recus: Message[] = [];

/*
  ⚠️ On remplace `sendEmail`, la méthode que `lib/courriel.ts` appelle — pas
  l'adaptateur. Sans adaptateur configuré, Payload journalise et rend la main
  sans erreur : on croirait composer des messages et l'on n'obtiendrait rien.
  Même piège que dans les scripts de vérification.
*/
const faux = {
  sendEmail: async (m: Message) => {
    recus.push(m);
    return {};
  },
  logger: { error: () => {}, info: () => {} },
} as never;

const JOUR = 86_400_000;
const dans = (jours: number) => new Date(Date.now() + jours * JOUR).toISOString();

const REFERENCE = "CLX-3SQJ3REG";
const DOSSIER_ID = 42;
const URL_DOSSIER = `https://www.clixa.africa/inscription/${REFERENCE}`;

/** Un dossier plausible : trois versements, un parcours réel du catalogue. */
const inscription = {
  reference: REFERENCE,
  apprenantNom: "Aïcha Benali",
  apprenantEmail: "aicha.benali@exemple.invalid",
  apprenantWhatsapp: "+212612345678",
  apprenantPays: "Maroc",
  programmeTitre: "Directeur Administratif et Financier",
  sessionLibelle: "Classe virtuelle — 3 octobre 2026",
  planLibelle: "En trois fois",
  montantTotal: 470,
  echeances: [
    { montant: 170, dateLimite: dans(3) },
    { montant: 150, dateLimite: dans(33) },
    { montant: 150, dateLimite: dans(47) },
  ],
  urlDossier: URL_DOSSIER,
  tenueJusquau: dans(7),
  moyenSouhaite: "transfert" as const,
  /*
    ⚠️ Sans code, l'aperçu du certificat montrait un message que personne ne
    reçoit : le bloc de vérification est conditionnel, et tout certificat réel
    porte un code — il est tiré dans le même écrit que la date d'émission. Un
    aperçu qui tait la moitié du message ferait relire, rassuré, un gabarit
    incomplet. C'est la faute que ce script existe pour éviter.
  */
  certificatCode: "CLIXA-7K4M-2XQD",
};

/**
 * Chaque gabarit, appelé pour de vrai.
 *
 * ⚠️ L'ordre suit le tunnel, pas l'ordre du fichier source : c'est ainsi qu'on
 * relit une suite de messages — en se demandant ce que la personne a reçu la
 * veille.
 */
const gabarits: { nom: string; produire: () => Promise<unknown> }[] = [
  {
    nom: "01-participant-place-retenue",
    produire: () => c.courrielParticipant(faux, inscription),
  },
  {
    nom: "03-equipe-contrat-demande",
    produire: () => c.courrielContrat(faux, { ...inscription, dossierId: DOSSIER_ID }),
  },
  {
    nom: "04-equipe-contrat-signe",
    produire: () =>
      c.courrielSignature(faux, {
        ...inscription,
        dossierId: DOSSIER_ID,
        signeLe: new Date().toISOString(),
        empreinte: "9f2c1e7a4b6d8035e1c9a7f4b2d6083ec5a19b7f4d2e6c8093a5b1d7e4f2c6a8",
      }),
  },
  {
    nom: "05-participant-contrat-verifie",
    produire: () => c.courrielContratVerifie(faux, inscription),
  },
  {
    nom: "06-participant-instructions-envoyees",
    produire: () =>
      c.courrielInstructionsEnvoyees(faux, {
        ...inscription,
        envoyeLe: new Date().toISOString(),
      }),
  },
  {
    nom: "07-equipe-transfert-annonce",
    produire: () =>
      c.courrielTransfert(faux, {
        ...inscription,
        dossierId: DOSSIER_ID,
        moyen: "Western Union",
        numero: "MTCN 8412 3390 77",
        montant: 170,
        avecRecu: true,
        rang: 2,
        total: 3,
        restantesApres: 1,
      }),
  },
  {
    /*
      ⚠️ Le paiement par carte, sans référence, se dit autrement — « a payé par
      carte », « non communiquée », et sa dernière tranche annonce le solde.
      Sans cet aperçu, ces trois phrases n'auraient jamais été regardées.
    */
    nom: "07b-equipe-paiement-carte",
    produire: () =>
      c.courrielTransfert(faux, {
        ...inscription,
        dossierId: DOSSIER_ID,
        moyen: "Carte bancaire",
        numero: "",
        montant: 157,
        avecRecu: true,
        parCarte: true,
        rang: 3,
        total: 3,
        restantesApres: 0,
      }),
  },
  {
    nom: "08-participant-versement-recu",
    produire: () => c.courrielVersementRecu(faux, { ...inscription, montant: 170, solde: false }),
  },
  {
    /* ⚠️ Le dernier versement le dit autrement — deux messages, pas un. */
    nom: "09-participant-formation-reglee",
    produire: () => c.courrielVersementRecu(faux, { ...inscription, montant: 150, solde: true }),
  },
  {
    nom: "10-participant-echeance-approche",
    produire: () =>
      c.courrielRelance(faux, {
        ...inscription,
        montant: 150,
        dateLimite: dans(3),
        enRetard: false,
      }),
  },
  {
    nom: "11-participant-echeance-en-retard",
    produire: () =>
      c.courrielRelance(faux, {
        ...inscription,
        montant: 150,
        dateLimite: dans(-4),
        enRetard: true,
      }),
  },
  {
    /*
      ⚠️ **Celui-ci part au terme, jamais avant** — la tâche de 8 h ne le
      compose qu'une fois le délai écoulé. `tenueJusquau` est donc dans le
      passé, et le message doit se lire comme tel. C'est le défaut trouvé le
      7 septembre 2026 : il annonçait « votre place est tenue jusqu'au
      6 septembre » dans un courriel envoyé le 7. L'aperçu le montre à la date
      où on le reçoit.
    */
    nom: "12-participant-place-bientot-rendue",
    produire: () =>
      c.courrielPlaceBientotRendue(faux, {
        ...inscription,
        sessionDetail: "Classe virtuelle — 3 octobre 2026",
        tenueJusquau: dans(-1),
      }),
  },
  {
    /*
      ⚠️ Le rappel qui part **avant** le terme, à trois jours de la fin. Il ne
      réclame aucun règlement : une pré-inscription n'a jamais reçu de
      coordonnées, et le seul geste possible est de demander son contrat.
      C'est ce que cet aperçu existe pour vérifier — la phrase, pas le code.
    */
    nom: "12b-participant-rappel-avant-terme",
    produire: () =>
      c.courrielRappelAvantTerme(faux, {
        ...inscription,
        sessionDetail: "Classe virtuelle — 3 octobre 2026",
        tenueJusquau: dans(3),
        jours: 3,
      }),
  },
  {
    nom: "13-participant-certificat-disponible",
    produire: () => c.courrielCertificatDisponible(faux, inscription),
  },
  {
    nom: "14-equipe-demande-de-rappel",
    produire: () =>
      c.courrielRappel(faux, {
        nom: "Kouamé N'Guessan",
        email: "kouame@exemple.invalid",
        whatsapp: "+2250712345678",
        pays: "Côte d'Ivoire",
        programme: "Directeur des Ressources Humaines",
        plan: "En deux fois",
      }),
  },
  {
    nom: "15-equipe-robot-passe-la-main",
    produire: () =>
      c.courrielMainPassee(faux, {
        id: "17",
        nom: "Fatou Sow",
        whatsapp: "+221770123456",
        dernier: "Je voudrais parler à quelqu'un avant de m'inscrire.",
      }),
  },
  {
    nom: "16-equipe-bilan-des-relances",
    produire: () =>
      c.courrielBilanRelances(faux, [
        `${REFERENCE} · Aïcha Benali — 150 € · échéance dépassée`,
        "CLX-BGXC8G5U · Kouamé N'Guessan — 170 € · échéance dans 3 jours",
      ]),
  },

  /*
    ── L'annonce du démarrage, dans ses quatre états réels ───────────────────
    ⚠️ **Quatre aperçus, pas un.** Ce message ne dit pas la même chose à tout
    le monde : c'est toute sa raison d'être, et sur cent seize dossiers de
    production, dix seulement s'entendent réclamer de l'argent. Un seul aperçu
    aurait montré un quart du gabarit et laissé relire, rassuré, un message
    dont les trois autres versions n'ont jamais été regardées — la faute
    exacte que ce script existe pour empêcher, déjà commise une fois sur le
    certificat sans code.

    Les quatre correspondent au décompte du 23 septembre 2026 : 44 à demander,
    58 à signer, 4 chez nous, 10 à régler.
  */
  ...(
    [
      ["17-demarrage-a-demander", { statut: "demandee", echeances: ECHEANCES_DUES }],
      [
        "18-demarrage-a-signer",
        { statut: "demandee", contratDemandeLe: HIER, echeances: ECHEANCES_DUES },
      ],
      [
        "19-demarrage-chez-nous",
        {
          statut: "demandee",
          contratDemandeLe: HIER,
          contratSigneLe: HIER,
          contratVerifieLe: HIER,
          echeances: ECHEANCES_DUES,
        },
      ],
      [
        "20-demarrage-a-regler",
        {
          statut: "demandee",
          contratDemandeLe: HIER,
          contratSigneLe: HIER,
          contratVerifieLe: HIER,
          coordonneesEnvoyeesLe: HIER,
          echeances: ECHEANCES_DUES,
        },
      ],
    ] as const
  ).map(([nom, faits]) => ({
    nom,
    produire: () =>
      c.courrielDemarrageCohorte(faux, {
        reference: REFERENCE,
        apprenantNom: inscription.apprenantNom,
        apprenantEmail: inscription.apprenantEmail,
        programmeTitre: "Directeur Administratif et Financier",
        cadence: "8 samedis · 9h00–13h00",
        debut: "2026-10-03T09:00:00.000Z",
        fin: "2026-11-21T13:00:00.000Z",
        urlDossier: inscription.urlDossier,
        annonce: annonceDuDemarrage(faits as never),
      }),
  })),

  /*
    ⚠️ **Le catalogue de l'aperçu est celui de la production, recopié ici.**
    Un jeu d'essai à trois parcours aurait montré un message deux fois plus
    court que le vrai, et c'est la longueur qui décide si celui-ci se lit
    jusqu'au bout — c'est le plus long des dix-sept. Les douze titres, leurs
    durées et les cinq filières sont donc ceux du 23 septembre 2026.
  */
  {
    nom: "21-presentation-de-l-institut",
    produire: () =>
      c.courrielPresentation(faux, {
        email: inscription.apprenantEmail,
        nom: inscription.apprenantNom,
        presentation: composerLaPresentation({
          specialisations: [
            { slug: "finance-controle", nom: "Finance & Contrôle" },
            { slug: "management-projet", nom: "Management & Projet" },
            { slug: "industrie-operations", nom: "Industrie & Opérations" },
            { slug: "commercial-marketing", nom: "Commercial & Marketing" },
            { slug: "capital-humain", nom: "Capital humain" },
          ] as never,
          programmes: [
            ["Directeur Administratif et Financier", 32, "finance-controle"],
            ["Directeur Contrôle de Gestion", 32, "finance-controle"],
            ["Directeur Audit Interne", 32, "finance-controle"],
            ["Directeur de Projets", 32, "management-projet"],
            ["Préparation à la certification PMP®", 35, "management-projet"],
            ["Directeur de Production", 32, "industrie-operations"],
            ["Directeur de Maintenance", 32, "industrie-operations"],
            ["Directeur Industriel", 32, "industrie-operations"],
            ["Directeur QHSE", 32, "industrie-operations"],
            ["Directeur Commercial", 32, "commercial-marketing"],
            ["Directeur Marketing", 32, "commercial-marketing"],
            ["Directeur des Ressources Humaines", 32, "capital-humain"],
          ].map(([titre, h, spec]) => ({
            slug: String(titre)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-"),
            titre: String(titre),
            dureeHeures: Number(h),
            specialisation: spec,
            ...(String(titre).includes("PMP")
              ? { certification: "PMP® — Project Management Institute" }
              : {}),
            ...(String(titre).includes("Administratif")
              ? {
                  accroche: "Parcours exécutif • 32 heures • 8 séances live • 100 % en ligne",
                  modules: [
                    { titre: "S1 — Mode DAF activé" },
                    { titre: "S2 — Contrôle interne & anti-fraude" },
                    { titre: "S3 — Closing & reporting" },
                    { titre: "S4 — Budget & forecast" },
                    { titre: "S5 — Cash & BFR" },
                    { titre: "S6 — Banque & financement" },
                    { titre: "S7 — Conformité & risques" },
                    { titre: "S8 — Dashboard DAF & soutenance CODIR" },
                  ],
                  publicVise: [
                    "Responsables financiers et RAF",
                    "Chefs comptables souhaitant évoluer",
                    "Contrôleurs de gestion",
                    "DAF en prise de poste",
                    "Dirigeants structurant la fonction finance",
                  ],
                  objectifs:
                    "Piloter le cash et le BFR avec une logique de trésorerie à 13 semaines. Construire un budget et un forecast driver-based réellement actionnables. Produire un reporting CODIR clair, synthétique et orienté décision. Renforcer le contrôle interne et la qualité du closing.",
                  debouches: [
                    "Piloter cash, budget et reporting avec plus de maîtrise",
                    "Structurer un management pack utile à la direction",
                    "Renforcer contrôle interne et gestion des risques",
                    "Mieux dialoguer avec banques et financeurs",
                  ],
                  competences: [
                    "rôle DAF et organisation de la fonction finance",
                    "contrôle interne, anti-fraude et séparation des tâches",
                    "closing rapide et management pack mensuel",
                  ],
                  livrables: [
                    "Support de formation complet",
                    "Template cash 13 semaines",
                    "Budget / forecast driver-based",
                    "Management pack mensuel",
                    "Matrice risques-contrôles",
                    "Dashboard et playbook DAF",
                  ],
                }
              : {}),
          })) as never,
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
                code: "deux",
                libelle: "2 tranches",
                totalCentimes: 44_800,
                echeancesCentimes: [22_400, 22_400],
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
          misEnAvant: "directeur-administratif-et-financier",
          cadenceEnAvant: "8 samedis · 9h00–13h00",
        }),
      }),
  },
];

/*
  ⚠️ **Le dossier est vidé d'abord**, et ce n'est pas de la propreté. Les
  aperçus de la version précédente portaient d'autres noms : ils sont restés à
  côté des nouveaux, avec leur texte recopié à la main que le site n'envoie
  plus. Qui ouvre `apercus/` pour relire un message y trouvait deux fichiers
  plausibles pour le même courriel, et rien pour dire lequel est vrai — le
  défaut même que cette réécriture existe pour fermer.
*/
const DOSSIER = join(process.cwd(), "apercus");
await rm(DOSSIER, { recursive: true, force: true });
await mkdir(DOSSIER, { recursive: true });

const ecrits: { nom: string; sujet: string; pour: string }[] = [];

for (const g of gabarits) {
  recus.length = 0;
  await g.produire();

  const m = recus[0];
  if (!m) {
    console.log(`  ✗ ${g.nom} — rien produit`);
    continue;
  }

  /*
    ⚠️ Le bilan des relances n'a pas de corps HTML : c'est une liste que
    l'équipe lit en texte. Écrire un fichier vide donnerait à croire qu'il est
    cassé — on écrit alors le texte, dans un bloc préformaté.
  */
  const html =
    m.html ??
    `<pre style="font: 14px ui-monospace, monospace; white-space: pre-wrap; padding: 24px;">${(m.text ?? "").replace(/</g, "&lt;")}</pre>`;

  await writeFile(join(DOSSIER, `${g.nom}.html`), html, "utf8");
  ecrits.push({
    nom: g.nom,
    sujet: m.subject ?? "(sans sujet)",
    pour: m.to ?? "(sans destinataire)",
  });
  console.log(`  ✓ ${g.nom} — « ${m.subject} »`);
}

/*
  ⚠️ **Un sommaire, sinon on ne regarde que le premier.** Seize fichiers dans un
  dossier se relisent mal ; c'est déjà la raison pour laquelle douze gabarits
  n'avaient jamais été ouverts. La page porte le sujet et le destinataire, qui
  sont ce qu'on vérifie d'abord.
*/
const index = `<!doctype html><html lang="fr"><meta charset="utf-8">
<title>Aperçus des courriels CLIXA</title>
<style>
  body { font: 15px/1.6 system-ui, sans-serif; max-width: 60rem; margin: 3rem auto; padding: 0 1.5rem; background: #0b1120; color: #e2e8f0; }
  h1 { font-size: 1.4rem; color: #e9cd84; }
  a { color: #e9cd84; }
  li { margin: .7rem 0; }
  .pour { color: #94a3b8; font-size: .85em; }
</style>
<h1>Les ${ecrits.length} courriels que le site envoie</h1>
<p class="pour">Composés par les vraies fonctions de <code>src/lib/courriel.ts</code>.</p>
<ol>
${ecrits
  .map(
    (e) =>
      `  <li><a href="${e.nom}.html">${e.sujet}</a><br><span class="pour">→ ${e.pour}</span></li>`,
  )
  .join("\n")}
</ol>
</html>`;

await writeFile(join(DOSSIER, "index.html"), index, "utf8");

console.log(`\n  ${ecrits.length} aperçu(s) dans apercus/ — ouvrir apercus/index.html\n`);
