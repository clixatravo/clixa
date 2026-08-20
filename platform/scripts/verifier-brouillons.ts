/**
 * BE-10 — Vérification des brouillons.
 *
 * Le point qui compte : un document non publié ne doit être visible ni de
 * l'API publique, ni du site. Tout est supprimé à la fin.
 *
 *   npx payload run scripts/verifier-brouillons.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";

const ok = (m: string) => console.log(`  ✓ ${m}`);
const ko = (m: string) => {
  console.log(`  ✗ ${m}`);
  echecs++;
};
let echecs = 0;

try {
  const payload = await getPayload({ config });
  const aNettoyer: { collection: string; id: number | string }[] = [];

  console.log("\n── Création en brouillon ────────────────────");

  const page = await payload.create({
    collection: "pages",
    locale: "fr",
    overrideAccess: true,
    draft: true,
    data: {
      titre: "Brouillons — Mentions légales",
      slug: "brouillons-verif",
      contenu: [{ blockType: "paragraphe", texte: "Texte non relu." }],
      _status: "draft",
    },
  });
  aNettoyer.push({ collection: "pages", id: page.id });
  page._status === "draft"
    ? ok("Page créée avec le statut « draft »")
    : ko(`Statut inattendu : ${page._status}`);

  console.log("\n── Ce que voit le public ────────────────────");

  const vuePublic = await payload.find({
    collection: "pages",
    where: { slug: { equals: "brouillons-verif" } },
    overrideAccess: false,
  });
  vuePublic.totalDocs === 0
    ? ok("Le brouillon est invisible de l'API publique")
    : ko("FUITE : le brouillon est exposé publiquement");

  console.log("\n── Ce que voit un rédacteur ─────────────────");

  const redacteur = await payload.create({
    collection: "utilisateurs",
    overrideAccess: true,
    data: {
      email: "brouillon-redac@verif.local",
      password: crypto.randomUUID(),
      nom: "Test rédaction",
      role: "redaction",
    },
  });
  aNettoyer.push({ collection: "utilisateurs", id: redacteur.id });

  const vueRedac = await payload.find({
    collection: "pages",
    where: { slug: { equals: "brouillons-verif" } },
    overrideAccess: false,
    user: redacteur as never,
    draft: true,
  });
  vueRedac.totalDocs === 1
    ? ok("Le rédacteur connecté voit son brouillon")
    : ko("Le brouillon est invisible même pour son auteur");

  console.log("\n── Publication ──────────────────────────────");

  await payload.update({
    collection: "pages",
    id: page.id,
    locale: "fr",
    overrideAccess: true,
    data: { _status: "published" },
  });

  const apresPublication = await payload.find({
    collection: "pages",
    where: { slug: { equals: "brouillons-verif" } },
    overrideAccess: false,
  });
  apresPublication.totalDocs === 1
    ? ok("Une fois publiée, la page devient visible du public")
    : ko("La page publiée reste invisible");

  console.log("\n── Modification après publication ───────────");

  await payload.update({
    collection: "pages",
    id: page.id,
    locale: "fr",
    overrideAccess: true,
    draft: true,
    data: { titre: "Brouillons — Version retravaillée", _status: "draft" },
  });

  const publiee = await payload.find({
    collection: "pages",
    where: { slug: { equals: "brouillons-verif" } },
    overrideAccess: false,
  });
  const titrePublic = publiee.docs[0]?.titre;
  titrePublic === "Brouillons — Mentions légales"
    ? ok("Le public continue de voir la version publiée, pas la retouche")
    : ko(`Le public voit « ${titrePublic} »`);

  console.log("\n── Historique des versions ──────────────────");

  const versions = await payload.findVersions({
    collection: "pages",
    where: { parent: { equals: page.id } },
    overrideAccess: true,
  });
  versions.totalDocs >= 2
    ? ok(`${versions.totalDocs} versions conservées — on peut revenir en arrière`)
    : ko(`Historique trop court : ${versions.totalDocs} version(s)`);

  console.log("\n── Nettoyage ────────────────────────────────");
  for (const { collection, id } of aNettoyer.reverse()) {
    await payload.delete({ collection: collection as never, id, overrideAccess: true });
  }
  ok(`${aNettoyer.length} documents supprimés`);

  console.log(
    echecs === 0 ? "\n✅ Toutes les vérifications passent.\n" : `\n❌ ${echecs} en échec.\n`,
  );
  process.exit(echecs === 0 ? 0 : 1);
} catch (e) {
  console.error("\n❌ Erreur :", e instanceof Error ? e.message : e);
  process.exit(1);
}
