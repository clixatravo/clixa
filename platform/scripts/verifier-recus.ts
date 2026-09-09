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
import { ouvrirSession } from "@/lib/session";
import { GET as REST } from "../src/app/(payload)/api/[...slug]/route.js";
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
let dossierSupprime = false;
const comptesAsupprimer: (string | number)[] = [];

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

  /*
    ── ⚠️ Et le dossier retrouve sa pièce ────────────────────────────────────
    C'est le chemin que le bloc « Justificatifs de versement » emprunte depuis
    la fiche d'un dossier. Il manquait entièrement jusqu'au 9 septembre 2026 :
    le fichier arrivait en base, et rien sur le dossier n'y menait — la
    direction, essayant le parcours de bout en bout, a conclu qu'il n'y avait
    « pas d'endroit pour vérifier le reçu ».

    ⚠️ Le contrôle passe par la route HTTP avec un vrai cookie, comme
    `verifier-portes.ts` : c'est là que vit la garde d'accès, et l'API locale
    la contournerait avec `overrideAccess`.
  */
  const membre = await payload.create({
    collection: "utilisateurs",
    overrideAccess: true,
    data: {
      email: `recus.${Date.now()}@epreuve.invalid`,
      password: `R${Math.random().toString(36).slice(2)}!7`,
      nom: "Épreuve Reçus",
      role: "direction",
    } as never,
  });
  comptesAsupprimer.push(membre.id);
  const cookie = await ouvrirSession(payload, "utilisateurs", membre.id);

  const interroger = async (entetes: Record<string, string>) => {
    const reponse = await REST(
      new Request(
        `http://localhost/api/recus?limit=20&depth=0&where[dossier][equals]=${dossier.id}`,
        { headers: entetes },
      ),
      { params: Promise.resolve({ slug: ["recus"] }) } as never,
    );
    const corps = (await reponse.json()) as { docs?: { id: unknown }[] };
    return { code: reponse.status, docs: corps.docs ?? [] };
  };

  const COMME_UN_NAVIGATEUR = {
    origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "sec-fetch-site": "same-origin",
  };

  const vueEquipe = await interroger({
    ...COMME_UN_NAVIGATEUR,
    cookie: cookie.split(";")[0] ?? "",
  });
  dire(
    "⚠️ le dossier retrouve son justificatif, depuis sa fiche",
    vueEquipe.code === 200 && vueEquipe.docs.some((d) => String(d.id) === String(fiche.id)),
  );

  /*
    ⚠️ Le témoin : sans session d'équipe, la même requête ne rend rien. Sans
    lui, un contrôle vert ne dirait pas si c'est la garde ou la requête qui
    fonctionne — et `recus` porte des montants et des numéros de compte.
  */
  const vueAnonyme = await interroger(COMME_UN_NAVIGATEUR);
  dire(
    "et un anonyme n'obtient rien de cette requête",
    vueAnonyme.code !== 200 || vueAnonyme.docs.length === 0,
  );

  /*
    ── Supprimer le dossier, et non la fiche ────────────────────────────────
    La clef étrangère de `recus.dossier_id` est en « SET NULL » et la colonne
    est obligatoire : sans le crochet `beforeDelete` d'`Inscriptions`, Postgres
    refuse de vider le lien et c'est la suppression du dossier entier qui
    échoue. Un dossier accompagné d'un justificatif devenait indestructible,
    et le message parlait de contrainte, jamais de reçu.
  */
  await payload.delete({ collection: "inscriptions", id: dossier.id, overrideAccess: true });
  dossierSupprime = true;

  const resteLaFiche = await payload
    .findByID({ collection: "recus", id: fiche.id, overrideAccess: true })
    .catch(() => null);
  dire("supprimer le dossier emporte le reçu", resteLaFiche === null);

  const apres = await lireRecu(chemin).catch(() => null);
  dire("et le fichier quitte le magasin avec lui", apres === null);
  chemin = undefined;
} finally {
  if (chemin) await retirerRecu(chemin).catch(() => undefined);
  if (!dossierSupprime) {
    await payload
      .delete({ collection: "inscriptions", id: dossier.id, overrideAccess: true })
      .catch(() => undefined);
  }
  for (const c of comptesAsupprimer) {
    await payload
      .delete({ collection: "utilisateurs", id: c, overrideAccess: true })
      .catch(() => undefined);
  }
  console.log("  · dossier d'épreuve supprimé");
}

console.log(manques === 0 ? "\nReçus : tout tient." : `\nReçus : ${manques} manque(s).`);
process.exit(manques === 0 ? 0 : 1);
