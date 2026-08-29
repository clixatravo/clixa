/**
 * Éprouver le dépôt et la lecture d'un justificatif.
 *
 * Le magasin est privé, et c'est justement ce qui ne se voit pas : un dépôt
 * réussi et un dépôt public se ressemblent, jusqu'au jour où quelqu'un trouve
 * l'adresse. On dépose donc pour de vrai, puis on essaie de relire le fichier
 * *sans* jeton — ce que ferait un tiers qui aurait l'adresse.
 *
 *   npx payload run scripts/verifier-recus.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { deposerRecu, lireRecu, retirerRecu, stockageConfigure } from "@/lib/recus";
import { readFile } from "node:fs/promises";

let manques = 0;
const dire = (quoi: string, ok: boolean) => {
  console.log(`  ${ok ? "✓" : "✗"} ${quoi}`);
  if (!ok) manques += 1;
};

if (!stockageConfigure()) {
  console.log("  · BLOB_READ_WRITE_TOKEN absent — rien à éprouver ici.");
  process.exit(0);
}

const payload = await getPayload({ config });
const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 1,
  sort: "id",
  overrideAccess: true,
});

const dossier = await payload.create({
  collection: "inscriptions",
  overrideAccess: true,
  data: {
    session: sessions[0]!.id,
    apprenantNom: "Épreuve Reçu",
    apprenantEmail: "recu@epreuve.invalid",
    apprenantWhatsapp: "+212600000000",
    apprenantPays: "Maroc",
    statut: "demandee",
    echeances: [{ montant: 423, statut: "attendu" }],
  } as never,
});

let chemin: string | undefined;

try {
  const octets = await readFile("public/images/marketing/catalogue-executive-clixa.jpg");
  const fichier = new File([new Uint8Array(octets)], "recu.jpg", { type: "image/jpeg" });

  const depose = await deposerRecu("CLX-EPREUVE", fichier);
  chemin = depose.chemin;
  dire("le justificatif est déposé dans le magasin", Boolean(chemin));

  const relu = await lireRecu(chemin);
  dire("l'équipe le relit avec le jeton du projet", relu !== null);

  /*
    Le point de l'épreuve. On demande au magasin l'URL publique qu'aurait le
    fichier s'il était public, et on la tire sans jeton. Un magasin privé doit
    refuser ; un magasin public rendrait le fichier.
  */
  const base = process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3];
  const urlNue = `https://${base}.public.blob.vercel-storage.com/${chemin}`;
  const reponse = await fetch(urlNue).catch(() => undefined);
  dire(
    `un tiers sans jeton ne l'obtient pas (reçu ${reponse?.status ?? "aucune réponse"})`,
    !reponse || !reponse.ok,
  );

  const fiche = await payload.create({
    collection: "recus",
    overrideAccess: true,
    data: {
      dossier: dossier.id,
      echeance: 1,
      nomOriginal: "recu.jpg",
      chemin,
      typeFichier: "image/jpeg",
      taille: depose.taille,
    },
  });
  dire("la fiche est créée et rattachée au dossier", Boolean(fiche.id));

  await payload.delete({ collection: "recus", id: fiche.id, overrideAccess: true });
  const apres = await lireRecu(chemin).catch(() => null);
  dire("supprimer la fiche retire aussi le fichier du magasin", apres === null);
  chemin = undefined;
} finally {
  if (chemin) await retirerRecu(chemin).catch(() => undefined);
  await payload.delete({ collection: "inscriptions", id: dossier.id, overrideAccess: true });
  console.log("  · dossier d'épreuve supprimé");
}

console.log(manques === 0 ? "\nReçus : tout tient." : `\nReçus : ${manques} manque(s).`);
process.exit(manques === 0 ? 0 : 1);
