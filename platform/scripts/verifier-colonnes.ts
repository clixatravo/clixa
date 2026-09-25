/**
 * Une colonne ajoutée à une collection paraît chez tout le monde, sans script.
 *
 *   npx payload run scripts/verifier-colonnes.ts
 *
 * Deux temps. Le calcul d'abord (`lib/colonnes.ts`), sans base. Puis les deux
 * crochets posés sur `payload-preferences` par `brancherLesColonnes`, éprouvés
 * pour de vrai : un compte d'épreuve reçoit une préférence figée d'avant,
 * écrite **directement en base** comme l'aurait laissée une ancienne version,
 * puis on la lit par l'API — et on la réécrit comme le ferait un favori.
 *
 * ⚠️ **La moitié qui réécrit l'adresse (`ColonnesAJour`) ne s'éprouve pas ici** :
 * elle vit dans le navigateur. Elle lit la même fonction, éprouvée ci-dessous ;
 * son effet a été regardé dans un vrai navigateur, sur une adresse d'avant.
 *
 * Crée puis supprime un compte en `@epreuve.invalid` et sa préférence.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { sql } from "drizzle-orm";
import { completerLesColonnes, completerLesColonnesDeLAdresse } from "@/lib/colonnes";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  Les colonnes d'une liste\n");

/* ── 1. Le calcul ────────────────────────────────────────────────────────── */
const attendues = ["reference", "nom", "poste", "courriel", "statut"];

const figee = [
  { accessor: "reference", active: true },
  { accessor: "nom", active: true },
  { accessor: "courriel", active: false },
  { accessor: "statut", active: true },
];
const complete = completerLesColonnes(figee, attendues);
dire("la colonne absente est ajoutée", complete.ajoutees.join() === "poste");
dire(
  "derrière son voisin de gauche, pas à la fin",
  complete.colonnes.map((c) => c.accessor).join() === "reference,nom,poste,courriel,statut",
  complete.colonnes.map((c) => c.accessor).join(),
);
dire("et visible", complete.colonnes.find((c) => c.accessor === "poste")?.active === true);
dire(
  "⚠️ une colonne décochée reste décochée",
  complete.colonnes.find((c) => c.accessor === "courriel")?.active === false,
);
const rien = completerLesColonnes(complete.colonnes, attendues);
dire("témoin : rien ne manque, rien n'est ajouté", rien.ajoutees.length === 0);
dire(
  "une colonne propre au compte, hors de la collection, n'est pas retirée",
  completerLesColonnes([{ accessor: "createdAt", active: true }], attendues).colonnes.some(
    (c) => c.accessor === "createdAt",
  ),
);

const adresse = completerLesColonnesDeLAdresse(
  ["reference", "nom", "-courriel", "statut"],
  attendues,
);
dire(
  "dans l'adresse aussi, à sa place",
  adresse.colonnes.join() === "reference,nom,poste,-courriel,statut",
  adresse.colonnes.join(),
);
dire(
  "⚠️ « -courriel » compte comme présent : il n'est pas rajouté en double",
  adresse.colonnes.filter((c) => c.replace(/^-/, "") === "courriel").length === 1,
);

/* ── 2. Les crochets, pour de vrai ───────────────────────────────────────── */
const payload = await getPayload({ config });

const branche = payload.collections["payload-preferences"]?.config.hooks;
dire(
  "les crochets sont posés sur la collection des préférences",
  (branche?.afterRead?.length ?? 0) > 0 && (branche?.beforeChange?.length ?? 0) > 0,
);

const declarees =
  (payload.collections.inscriptions.config.admin?.defaultColumns as string[] | undefined) ?? [];
const retiree =
  declarees.find((c) => c === "apprenantProfession") ?? declarees[declarees.length - 1];
/* Une liste d'avant : tout ce que la collection déclare, sauf une colonne. */
const avant = declarees
  .filter((c) => c !== retiree)
  .map((accessor, i) => ({ accessor, active: i !== 1 }));

/*
  ⚠️ **Le champ `user` d'une préférence ne se donne pas, il se déduit.** Un
  crochet de Payload l'écrase avec `req.user` — sans utilisateur dans la
  requête, il vaut `null` et l'écriture est refusée en « Le champ suivant n'est
  pas valide : User ». Les appels passent donc `user`, comme le fait
  `upsertPreferences` quand /admin enregistre une liste.
*/
const marque = Date.now();
const compte = await payload.create({
  collection: "utilisateurs",
  data: {
    email: `colonnes.${marque}@epreuve.invalid`,
    password: `epreuve-${marque}`,
    nom: "Épreuve colonnes",
    role: "pedagogie",
  } as never,
  overrideAccess: true,
});

const auteur = { ...compte, collection: "utilisateurs" } as never;

let prefId: number | string | undefined;
try {
  const cree = await payload.create({
    collection: "payload-preferences",
    data: {
      key: "collection-inscriptions",
      user: { relationTo: "utilisateurs", value: compte.id },
      value: { sort: "statut", limit: 10 },
    },
    overrideAccess: true,
    user: auteur,
  });
  prefId = cree.id;

  /*
    La préférence d'avant est posée **en SQL**, sans passer par les crochets :
    c'est l'état exact dans lequel une ancienne version l'a laissée en base.
  */
  const figer = () =>
    payload.db.drizzle.execute(
      sql`UPDATE payload_preferences SET value = ${JSON.stringify({ sort: "statut", limit: 10, columns: avant })}::jsonb WHERE id = ${prefId}`,
    );
  await figer();

  const lue = await payload.findByID({
    collection: "payload-preferences",
    id: prefId,
    depth: 0,
    overrideAccess: true,
  });
  const colonnesLues = ((lue.value as { columns?: { accessor: string; active?: boolean }[] })
    ?.columns ?? []) as { accessor: string; active?: boolean }[];
  dire(
    `à la lecture, « ${retiree} » reparaît`,
    colonnesLues.some((c) => c.accessor === retiree && c.active),
  );
  dire(
    "⚠️ et la colonne décochée du compte le reste",
    colonnesLues.find((c) => c.accessor === avant[1]?.accessor)?.active === false,
  );
  dire(
    "le tri et la pagination du compte sont intacts",
    (lue.value as { sort?: string; limit?: number }).sort === "statut" &&
      (lue.value as { limit?: number }).limit === 10,
  );

  /* Un favori d'avant réécrit la liste figée : l'écriture la complète. */
  await payload.update({
    collection: "payload-preferences",
    id: prefId,
    data: {
      key: "collection-inscriptions",
      user: { relationTo: "utilisateurs", value: compte.id },
      value: { sort: "statut", limit: 10, columns: avant },
    },
    overrideAccess: true,
    user: auteur,
  });
  const brut = await payload.db.drizzle.execute(
    sql`SELECT value FROM payload_preferences WHERE id = ${prefId}`,
  );
  const enBase = (brut.rows?.[0] as { value?: { columns?: { accessor: string }[] } } | undefined)
    ?.value?.columns;
  dire(
    `⚠️ une liste d'avant réécrite ne retire plus « ${retiree} » en base`,
    !!enBase?.some((c) => c.accessor === retiree),
  );

  /* Témoin : une préférence qui n'est pas celle d'une liste n'est pas touchée. */
  const autre = await payload.create({
    collection: "payload-preferences",
    data: {
      key: "nav",
      user: { relationTo: "utilisateurs", value: compte.id },
      value: { columns: [{ accessor: "x", active: true }] },
    },
    overrideAccess: true,
    user: auteur,
  });
  dire(
    "témoin : une préférence hors liste n'est pas complétée",
    ((autre.value as { columns?: unknown[] }).columns ?? []).length === 1,
  );
} finally {
  await payload.delete({
    collection: "payload-preferences",
    where: { "user.value": { equals: compte.id } },
    overrideAccess: true,
  });
  await payload.delete({ collection: "utilisateurs", id: compte.id, overrideAccess: true });
}

console.log(
  manques === 0
    ? "\n  Une colonne ajoutée paraît chez tout le monde.\n"
    : `\n  ${manques} contrôle(s) au rouge.\n`,
);
process.exit(manques > 0 ? 1 : 0);
