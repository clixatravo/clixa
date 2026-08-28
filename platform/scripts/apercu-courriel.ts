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
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { gabaritHtmlEmail } from "../src/lib/courriel.js";

const DOSSIER = join(process.cwd(), "apercus");
await mkdir(DOSSIER, { recursive: true });

const exemples = [
  {
    nom: "participant-place-retenue",
    html: gabaritHtmlEmail({
      titre: "Votre place est retenue",
      soustitre: "Directeur Administratif et Financier — 19 septembre 2026",
      badgeRef: "CLX-3SQJ3REG",
      corpsHtml: `
        <p style="margin: 0 0 16px 0;">Bonjour Aïcha Benali,</p>
        <p style="margin: 0 0 16px 0;">
          Votre place est retenue pour le parcours <strong>Directeur Administratif et
          Financier</strong>, session du 19 septembre 2026.
        </p>
        <p style="margin: 0 0 16px 0;">
          Vous avez choisi le règlement en trois fois : 170 € avant le 19 septembre,
          puis 150 € avant le 17 octobre et 150 € avant le 31 octobre.
        </p>
      `,
      boutonTexte: "Voir mon dossier",
      boutonLien: "https://www.clixa.africa/inscription/CLX-3SQJ3REG",
    }),
  },
  {
    nom: "participant-relance",
    html: gabaritHtmlEmail({
      titre: "Une échéance approche",
      soustitre: "170 € avant le 19 septembre 2026",
      badgeRef: "CLX-3SQJ3REG",
      corpsHtml: `
        <p style="margin: 0 0 16px 0;">Bonjour Aïcha Benali,</p>
        <p style="margin: 0 0 16px 0;">
          Votre première échéance de <strong>170 €</strong> arrive à échéance dans trois jours.
        </p>
      `,
      boutonTexte: "Voir mon échéancier",
      boutonLien: "https://www.clixa.africa/inscription/CLX-3SQJ3REG",
    }),
  },
];

for (const e of exemples) {
  const chemin = join(DOSSIER, `${e.nom}.html`);
  await writeFile(chemin, e.html, "utf8");
  console.log(`  ${e.nom.padEnd(28)} ${e.html.length} octets`);
}
console.log(`\n  Écrits dans ${DOSSIER}`);
