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
  { nom: "02-equipe-nouvelle-inscription", produire: () => c.courrielEquipe(faux, inscription) },
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
