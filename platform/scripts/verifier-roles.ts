/**
 * BE-07 — Vérification des rôles et permissions.
 *
 * Crée trois comptes, un par rôle, et vérifie ce que chacun peut réellement
 * faire. Tout est supprimé à la fin.
 *
 *   npx payload run scripts/verifier-roles.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";

const ok = (m: string) => console.log(`  ✓ ${m}`);
const ko = (m: string) => {
  console.log(`  ✗ ${m}`);
  echecs++;
};
let echecs = 0;

/** Exécute une action et dit si elle a été autorisée. */
async function autorise(action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action();
    return true;
  } catch {
    return false;
  }
}

try {
  const payload = await getPayload({ config });
  const aNettoyer: { collection: string; id: number | string }[] = [];

  console.log("\n── Comptes de test ──────────────────────────");

  const comptes: Record<string, { id: number | string; user: unknown }> = {};
  for (const role of ["direction", "pedagogie", "redaction"] as const) {
    const u = await payload.create({
      collection: "utilisateurs",
      data: {
        email: `test-${role}@verif.local`,
        password: crypto.randomUUID(),
        nom: `Test ${role}`,
        role,
      },
      overrideAccess: true,
    });
    aNettoyer.push({ collection: "utilisateurs", id: u.id });
    comptes[role] = { id: u.id, user: u };
    ok(`compte « ${role} » créé`);
  }

  const spec = await payload.create({
    collection: "specialisations",
    locale: "fr",
    overrideAccess: true,
    data: {
      nom: "Rôles — Filière",
      slug: "roles-filiere-verif",
      accroche: "x",
      description: "x",
      debouches: [{ titre: "x", description: "x" }],
    },
  });
  aNettoyer.push({ collection: "specialisations", id: spec.id });

  const comme = (role: string) => ({
    overrideAccess: false,
    user: comptes[role]!.user as never,
  });

  console.log("\n── Catalogue (réservé à la pédagogie) ───────");

  for (const [role, attendu] of [
    ["pedagogie", true],
    ["direction", true],
    ["redaction", false],
  ] as const) {
    const permis = await autorise(() =>
      payload.update({
        collection: "specialisations",
        id: spec.id,
        locale: "fr",
        data: { accroche: `modifié par ${role}` },
        ...comme(role),
      }),
    );
    permis === attendu
      ? ok(`${role} ${attendu ? "peut" : "ne peut pas"} modifier le catalogue`)
      : ko(`${role} : attendu ${attendu}, obtenu ${permis}`);
  }

  console.log("\n── Éditorial (réservé à la rédaction) ───────");

  for (const [role, attendu] of [
    ["redaction", true],
    ["direction", true],
    ["pedagogie", false],
  ] as const) {
    const permis = await autorise(() =>
      payload.create({
        collection: "partenaires",
        locale: "fr",
        data: { nom: `Rôles — ${role}`, nature: "referentiel", ordre: 999 },
        ...comme(role),
      }),
    );
    permis === attendu
      ? ok(`${role} ${attendu ? "peut" : "ne peut pas"} créer un partenaire`)
      : ko(`${role} : attendu ${attendu}, obtenu ${permis}`);
  }

  console.log("\n── Comptes (réservés à la direction) ────────");

  for (const [role, attendu] of [
    ["direction", true],
    ["pedagogie", false],
    ["redaction", false],
  ] as const) {
    const permis = await autorise(async () => {
      const cree = await payload.create({
        collection: "utilisateurs",
        data: {
          email: `intrus-${role}@verif.local`,
          password: crypto.randomUUID(),
          nom: "Intrus",
          role: "redaction",
        },
        ...comme(role),
      });
      // Le compte créé par la direction doit lui aussi être nettoyé, sinon il
      // survit au test — c'est arrivé au premier passage.
      aNettoyer.push({ collection: "utilisateurs", id: cree.id });
      return cree;
    });
    permis === attendu
      ? ok(`${role} ${attendu ? "peut" : "ne peut pas"} créer un compte`)
      : ko(`${role} : attendu ${attendu}, obtenu ${permis}`);
  }

  console.log("\n── Élévation de privilège ───────────────────");

  await payload.update({
    collection: "utilisateurs",
    id: comptes.redaction!.id,
    data: { role: "direction" },
    ...comme("redaction"),
  });
  const apres = await payload.findByID({
    collection: "utilisateurs",
    id: comptes.redaction!.id,
    overrideAccess: true,
  });
  apres.role === "redaction"
    ? ok("un rédacteur ne peut pas s'attribuer « direction »")
    : ko(`ÉLÉVATION POSSIBLE : le rôle est devenu « ${apres.role} »`);

  console.log("\n── Lecture publique ─────────────────────────");

  const page = await payload.create({
    collection: "pages",
    locale: "fr",
    overrideAccess: true,
    draft: true,
    data: {
      titre: "Rôles — Page non publiée",
      slug: "roles-page-verif",
      contenu: [{ blockType: "paragraphe", texte: "Brouillon." }],
      _status: "draft",
    },
  });
  aNettoyer.push({ collection: "pages", id: page.id });

  const vuePublic = await payload.find({
    collection: "pages",
    where: { slug: { equals: "roles-page-verif" } },
    overrideAccess: false,
  });
  vuePublic.totalDocs === 0
    ? ok("une page non publiée reste invisible du public")
    : ko("une page non publiée est exposée publiquement");

  const vueConnecte = await payload.find({
    collection: "pages",
    where: { slug: { equals: "roles-page-verif" } },
    draft: true,
    ...comme("redaction"),
  });
  vueConnecte.totalDocs === 1
    ? ok("un rédacteur connecté voit bien le brouillon")
    : ko("le brouillon est invisible même pour un rédacteur");

  console.log("\n── Nettoyage ────────────────────────────────");
  const partenaires = await payload.find({
    collection: "partenaires",
    where: { nom: { like: "Rôles —" } },
    overrideAccess: true,
    limit: 50,
  });
  for (const p of partenaires.docs) {
    await payload.delete({ collection: "partenaires", id: p.id, overrideAccess: true });
  }
  for (const { collection, id } of aNettoyer.reverse()) {
    await payload.delete({ collection: collection as never, id, overrideAccess: true });
  }
  ok(`${aNettoyer.length + partenaires.docs.length} documents supprimés`);

  console.log(
    echecs === 0 ? "\n✅ Toutes les vérifications passent.\n" : `\n❌ ${echecs} en échec.\n`,
  );
  process.exit(echecs === 0 ? 0 : 1);
} catch (e) {
  console.error("\n❌ Erreur :", e instanceof Error ? e.message : e);
  process.exit(1);
}
