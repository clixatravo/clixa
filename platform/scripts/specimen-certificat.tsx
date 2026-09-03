/**
 * Fabrique le spécimen du certificat, pour la brochure et les publicités.
 *
 * ── Pourquoi un script, et pas un fichier déposé ────────────────────────────
 * Un spécimen dessiné à part finit toujours par mentir. Il y en avait un dans
 * `public/images/marketing/` : refait à la main, jamais suivi par git, jamais
 * référencé par la moindre page — et il aurait vieilli au premier changement
 * du document réel, sans que personne s'en aperçoive.
 *
 * Celui-ci **est** le certificat : le même composant que celui servi au
 * participant (`lib/certificat.tsx`), avec un nom de remplacement et un
 * bandeau « SPÉCIMEN » en travers. Le jour où le document change, il suffit
 * de rejouer ce script.
 *
 *   npx payload run scripts/specimen-certificat.ts
 *   npx payload run scripts/specimen-certificat.ts directeur-marketing
 *
 * Sans argument, il prend le premier parcours du catalogue. Il n'écrit rien en
 * base : les données du spécimen sont fabriquées ici, et le fichier sort dans
 * `public/images/marketing/`.
 *
 * ⚠️ Le PDF sert à l'impression ; pour une publicité Facebook, convertir en
 * image d'abord :
 *
 *   qlmanage -t -s 1800 -o /tmp public/images/marketing/certificat-specimen.pdf
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { renderToBuffer } from "@react-pdf/renderer";
import { CertificatPDF } from "../src/lib/certificat.js";
import type { Dossier } from "../src/lib/inscriptions.js";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

const payload = await getPayload({ config });

const slugVoulu = process.argv[2];

const { docs } = await payload.find({
  collection: "programmes",
  limit: 1,
  depth: 0,
  locale: "fr",
  overrideAccess: true,
  sort: "id",
  ...(slugVoulu ? { where: { slug: { equals: slugVoulu } } } : {}),
});

const programme = docs[0] as
  | {
      slug?: string;
      titre?: string;
      dureeHeures?: number | null;
      modules?: { titre?: string | null }[] | null;
    }
  | undefined;

if (!programme) {
  console.error(`  Aucun parcours trouvé${slugVoulu ? ` pour « ${slugVoulu} »` : ""}.`);
  process.exit(1);
}

/*
  Les dates de la cohorte en cours, pour que le spécimen ressemble à ce qu'on
  délivre vraiment — et non à un document daté d'une année qui n'existe pas.
*/
const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 1,
  depth: 0,
  overrideAccess: true,
  sort: "debut",
  where: { fin: { exists: true } },
});
const session = sessions[0] as { debut?: string; fin?: string } | undefined;

/*
  ⚠️ Un nom de remplacement, jamais celui d'une vraie personne. Le premier
  spécimen de la maison portait le nom d'un participant réel, sur un document
  qui circulait ensuite en pièce jointe.
*/
const specimen: Dossier = {
  reference: "CLX-SPECIMEN",
  statut: "terminee",
  programmeTitre: programme.titre ?? "Parcours exécutif",
  sessionLibelle: "Session",
  sessionDetail: "Classe virtuelle",
  apprenantNom: "Prénom NOM",
  echeances: [],
  ...(session?.debut ? { sessionDebut: session.debut } : {}),
  ...(session?.fin ? { sessionFin: session.fin } : {}),
  ...(programme.dureeHeures ? { programmeDureeHeures: programme.dureeHeures } : {}),
  ...(programme.modules && programme.modules.length > 0
    ? {
        programmeModules: programme.modules
          .map((m) => m.titre)
          .filter((t): t is string => Boolean(t)),
      }
    : {}),
  certificatEmisLe: new Date().toISOString(),
};

const buffer = await renderToBuffer(<CertificatPDF dossier={specimen} specimen />);

const dossierSortie = path.resolve("public/images/marketing");
mkdirSync(dossierSortie, { recursive: true });
const fichier = path.join(dossierSortie, "certificat-specimen.pdf");
writeFileSync(fichier, buffer);

console.log(`\n  ✓ ${fichier}`);
console.log(`     parcours : ${programme.titre}`);
console.log(`     ${Math.round(buffer.length / 1024)} Ko · marqué SPÉCIMEN\n`);
