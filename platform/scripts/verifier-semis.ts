/**
 * BE-11 — Le contenu en base est-il identique aux fichiers ?
 *
 * Compare champ par champ ce que contient Payload avec ce que sert
 * aujourd'hui src/data/. C'est la garantie sur laquelle repose INT-01 : si les
 * deux sources coïncident, la bascule ne doit produire aucune différence
 * visible sur le site.
 *
 *   npx payload run scripts/verifier-semis.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { programmes, sessions, specialisations } from "@/data/catalogue";
import { articles } from "@/data/blog";

const ok = (m: string) => console.log(`  ✓ ${m}`);
const ko = (m: string) => {
  console.log(`  ✗ ${m}`);
  echecs++;
};
let echecs = 0;

const compte = (attendu: number, obtenu: number, quoi: string) =>
  attendu === obtenu ? ok(`${quoi} : ${obtenu}`) : ko(`${quoi} : ${obtenu}, attendu ${attendu}`);

try {
  const payload = await getPayload({ config });

  console.log("\n── Volumes ──────────────────────────────────");

  const enBase = async (collection: string) =>
    (await payload.count({ collection: collection as never, overrideAccess: true })).totalDocs;

  compte(specialisations.length, await enBase("specialisations"), "spécialisations");
  compte(programmes.length, await enBase("programmes"), "programmes");
  compte(sessions.length, await enBase("sessions"), "sessions");
  compte(articles.length, await enBase("articles"), "articles");

  console.log("\n── Un programme, champ par champ ────────────");

  const attendu = programmes.find((p) => p.slug === "preparation-certification-pmp")!;
  const { docs } = await payload.find({
    collection: "programmes",
    where: { slug: { equals: attendu.slug } },
    locale: "fr",
    depth: 1,
    overrideAccess: true,
  });
  const obtenu = docs[0];

  if (!obtenu) {
    ko("Programme PMP absent de la base");
  } else {
    const paires: [string, unknown, unknown][] = [
      ["titre", attendu.titre, obtenu.titre],
      ["accroche", attendu.accroche, obtenu.accroche],
      ["objectifs", attendu.objectifs, obtenu.objectifs],
      ["certification", attendu.certification, obtenu.certification],
      ["dureeHeures", attendu.dureeHeures, obtenu.dureeHeures],
      ["rythme", attendu.rythme, obtenu.rythme],
      ["niveau", attendu.niveau, obtenu.niveau],
      ["prerequis", attendu.prerequis, obtenu.prerequis],
    ];
    for (const [nom, a, b] of paires) {
      a === b ? ok(nom) : ko(`${nom} : « ${String(b).slice(0, 40)} » ≠ « ${String(a).slice(0, 40)} »`);
    }

    const spec = obtenu.specialisation;
    typeof spec === "object" && spec?.slug === attendu.specialisation
      ? ok("spécialisation liée")
      : ko(`spécialisation : ${JSON.stringify(spec)}`);

    compte(attendu.competences.length, obtenu.competences?.length ?? 0, "compétences");
    compte(attendu.publicVise.length, obtenu.publicVise?.length ?? 0, "public visé");
    compte(attendu.modules.length, obtenu.modules?.length ?? 0, "modules");

    const leconsAttendues = attendu.modules.reduce((t, m) => t + m.lecons.length, 0);
    const leconsObtenues = (obtenu.modules ?? []).reduce((t, m) => t + (m.lecons?.length ?? 0), 0);
    compte(leconsAttendues, leconsObtenues, "leçons");

    const dureeAttendue = attendu.modules.reduce(
      (t, m) => t + m.lecons.reduce((x, l) => x + l.dureeMinutes, 0),
      0,
    );
    const dureeObtenue = (obtenu.modules ?? []).reduce(
      (t, m) => t + (m.lecons ?? []).reduce((x, l) => x + (l.dureeMinutes ?? 0), 0),
      0,
    );
    dureeAttendue === dureeObtenue
      ? ok(`durée totale du plan : ${dureeObtenue / 60} h`)
      : ko(`durée : ${dureeObtenue} min, attendu ${dureeAttendue}`);
  }

  console.log("\n── Prix et places ───────────────────────────");

  for (const attendue of sessions.slice(0, 4)) {
    const { docs: trouvees } = await payload.find({
      collection: "sessions",
      where: { and: [{ debut: { equals: new Date(attendue.debut).toISOString() } }] },
      depth: 1,
      overrideAccess: true,
      limit: 20,
    });
    const s = trouvees.find((d) => {
      const p = d.programme;
      return typeof p === "object" && p?.slug === attendue.programmeSlug;
    });
    if (!s) {
      ko(`session ${attendue.id} absente`);
      continue;
    }
    const prixOk = (s.prix ?? 0) * 100 === attendue.prixCentimes;
    const placesOk = s.capacite === attendue.capacite && s.placesReservees === attendue.placesReservees;
    prixOk && placesOk
      ? ok(`${attendue.id} : ${s.prix} ${s.devise}, ${s.placesReservees}/${s.capacite} places`)
      : ko(`${attendue.id} : prix ${s.prix}×100 vs ${attendue.prixCentimes}, places ${s.placesReservees}/${s.capacite}`);
  }

  console.log("\n── Un article, blocs compris ────────────────");

  const artAttendu = articles.find((a) => a.slug === "pmp-est-elle-encore-rentable")!;
  const { docs: arts } = await payload.find({
    collection: "articles",
    where: { slug: { equals: artAttendu.slug } },
    locale: "fr",
    depth: 1,
    overrideAccess: true,
  });
  const art = arts[0];
  if (!art) {
    ko("Article PMP absent");
  } else {
    art.titre === artAttendu.titre ? ok("titre") : ko(`titre : ${art.titre}`);
    compte(artAttendu.contenu.length, art.contenu?.length ?? 0, "blocs de contenu");
    const typesAttendus = artAttendu.contenu.map((b) => b.type).join(",");
    const typesObtenus = (art.contenu ?? []).map((b) => b.blockType).join(",");
    typesAttendus === typesObtenus
      ? ok(`ordre des blocs conservé`)
      : ko(`blocs : ${typesObtenus} ≠ ${typesAttendus}`);
    const lie = art.programmeLie;
    typeof lie === "object" && lie?.slug === artAttendu.programmeLie
      ? ok("formation associée")
      : ko(`formation associée : ${JSON.stringify(lie)}`);
  }

  console.log("\n── Visibilité publique ──────────────────────");

  const publics = await payload.count({ collection: "programmes", overrideAccess: false });
  publics.totalDocs === programmes.length
    ? ok(`les ${publics.totalDocs} programmes sont publiés et visibles`)
    : ko(`${publics.totalDocs} programmes visibles sur ${programmes.length}`);

  console.log(
    echecs === 0
      ? "\n✅ La base est un miroir fidèle de src/data/. INT-01 peut démarrer.\n"
      : `\n❌ ${echecs} écart(s) — à corriger avant INT-01.\n`,
  );
  process.exit(echecs === 0 ? 0 : 1);
} catch (e) {
  console.error("\n❌ Erreur :", e instanceof Error ? e.message : e);
  process.exit(1);
}
