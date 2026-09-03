/**
 * Aligne le catalogue sur le nom du document réellement délivré.
 *
 * ── Ce qu'il corrige ────────────────────────────────────────────────────────
 * Depuis le 3 septembre 2026, un parcours suivi jusqu'au bout donne un
 * **certificat professionnel**, composé depuis le dossier
 * (`inscription/[reference]/certificat`). Le catalogue, lui, promettait encore
 * une « Attestation de formation » sur la préparation PMP — un mot qui désigne
 * un autre document chez nous : l'attestation *d'admission*, délivrée au
 * début, quand rien n'a encore été suivi.
 *
 * Deux noms pour deux moments. Les confondre sur la fiche faisait promettre le
 * plus faible des deux à qui va jusqu'au bout.
 *
 *   npx payload run scripts/uniformiser-certificat.ts
 *
 * ⚠️ Il vise la base pointée par DATABASE_URL. Contre la production :
 *
 *   set -a && . ./.env.prod && set +a && npx payload run scripts/uniformiser-certificat.ts
 *
 * ⚠️ Et un script ne rafraîchit pas le site — `revalidatePath` exige le
 * contexte de requête de Next. Après un passage sur la production, redéployer,
 * sinon la page servie reste celle du build précédent.
 *
 * Rejouable : il ne touche que les libellés qui parlent encore d'attestation,
 * et se tait quand il n'y en a plus.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });

/** Ce qui doit disparaître des livrables, et ce qui le remplace. */
const REMPLACEMENT = "Certificat professionnel";
const CIBLE = /attestation/i;

const { docs } = await payload.find({
  collection: "programmes",
  limit: 100,
  depth: 0,
  locale: "fr",
  sort: "id",
  overrideAccess: true,
});

let touches = 0;

for (const p of docs as unknown as {
  id: number | string;
  slug?: string;
  livrables?: { valeur?: string | null }[] | null;
}[]) {
  const livrables = p.livrables ?? [];
  if (!livrables.some((l) => CIBLE.test(l.valeur ?? ""))) continue;

  const corriges = livrables.map((l) =>
    CIBLE.test(l.valeur ?? "") ? { ...l, valeur: REMPLACEMENT } : l,
  );

  await payload.update({
    collection: "programmes",
    id: p.id,
    locale: "fr",
    overrideAccess: true,
    data: { livrables: corriges } as never,
  });

  const avant = livrables.filter((l) => CIBLE.test(l.valeur ?? "")).map((l) => l.valeur);
  console.log(`  ✓ ${p.slug} — « ${avant.join(" », « ")} » → « ${REMPLACEMENT} »`);
  touches += 1;
}

console.log(
  touches === 0
    ? "\n  Rien à corriger : aucun parcours ne promet plus d'attestation en fin de course.\n"
    : `\n  ${touches} parcours aligné(s) sur le certificat.\n`,
);
