/**
 * BE-08 — Vérification des médias.
 *
 * Verse une image réelle, contrôle les variantes produites et l'obligation de
 * texte alternatif. Tout est supprimé à la fin.
 *
 *   npx payload run scripts/verifier-medias.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import sharp from "sharp";

const ok = (m: string) => console.log(`  ✓ ${m}`);
const ko = (m: string) => {
  console.log(`  ✗ ${m}`);
  echecs++;
};
let echecs = 0;

try {
  const payload = await getPayload({ config });
  const aNettoyer: { collection: string; id: number | string }[] = [];

  console.log("\n── Envoi d'une image ────────────────────────");

  // Une image large et lourde, comme celles qui sortent d'un téléphone.
  const original = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: "#111A33" },
  })
    .png()
    .toBuffer();
  ok(`Image d'origine : 2400×1600, ${Math.round(original.length / 1024)} Ko en PNG`);

  const media = await payload.create({
    collection: "medias",
    locale: "fr",
    overrideAccess: true,
    data: { alt: "Aplat bleu de test" },
    file: {
      data: original,
      mimetype: "image/png",
      name: "verif-media.png",
      size: original.length,
    },
  });
  aNettoyer.push({ collection: "medias", id: media.id });
  ok(`Média créé (id ${media.id})`);

  console.log("\n── Conversion et variantes ──────────────────");

  media.mimeType === "image/webp"
    ? ok(`Converti en WebP (${Math.round((media.filesize ?? 0) / 1024)} Ko)`)
    : ko(`Format inattendu : ${media.mimeType}`);

  const tailles = media.sizes ?? {};
  for (const [nom, largeurAttendue] of [
    ["vignette", 400],
    ["carte", 800],
    ["large", 1600],
  ] as const) {
    const t = tailles[nom as keyof typeof tailles] as { width?: number; filesize?: number } | undefined;
    t?.width === largeurAttendue
      ? ok(`${nom} : ${t.width} px, ${Math.round((t.filesize ?? 0) / 1024)} Ko`)
      : ko(`${nom} : largeur ${t?.width ?? "absente"}, attendu ${largeurAttendue}`);
  }

  const poidsVignette = (tailles.vignette as { filesize?: number } | undefined)?.filesize ?? 0;
  poidsVignette > 0 && poidsVignette < original.length
    ? ok(
        `La vignette pèse ${Math.round((poidsVignette / original.length) * 100)} % de l'original`,
      )
    : ko("La vignette n'allège pas l'original");

  console.log("\n── Texte alternatif obligatoire ─────────────");

  let refuse = false;
  try {
    await payload.create({
      collection: "medias",
      locale: "fr",
      overrideAccess: true,
      data: {} as never,
      file: { data: original, mimetype: "image/png", name: "sans-alt.png", size: original.length },
    });
  } catch {
    refuse = true;
  }
  refuse
    ? ok("Une image sans texte alternatif est refusée")
    : ko("Une image sans texte alternatif a été acceptée");

  console.log("\n── Rattachement à un partenaire ─────────────");

  const partenaire = await payload.create({
    collection: "partenaires",
    locale: "fr",
    overrideAccess: true,
    data: { nom: "Médias — Test", nature: "referentiel", ordre: 999, logo: media.id },
  });
  aNettoyer.push({ collection: "partenaires", id: partenaire.id });

  const relu = await payload.findByID({
    collection: "partenaires",
    id: partenaire.id,
    locale: "fr",
    depth: 1,
    overrideAccess: true,
  });
  const logo = relu.logo;
  typeof logo === "object" && logo?.alt === "Aplat bleu de test"
    ? ok("Le logo est bien résolu, avec son texte alternatif")
    : ko(`Logo non résolu : ${JSON.stringify(logo)}`);

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
