/**
 * Vérification de bout en bout des collections (BE-02, BE-03, BE-05).
 *
 * Passe par l'API locale de Payload : aucun mot de passe n'est nécessaire, et
 * l'on teste exactement le chemin qu'empruntera l'application.
 *
 * Tout ce qui est créé ici est supprimé à la fin — la base doit rester propre.
 *
 *   npx payload run scripts/verifier-collections.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";

// Attention : `payload run` termine dès que le corps du module est évalué.
// Un `main().catch()` laisse la promesse flotter et le script sort sans rien
// exécuter — d'où l'attente au niveau racine plus bas.

const ok = (m: string) => console.log(`  ✓ ${m}`);
const ko = (m: string) => {
  console.log(`  ✗ ${m}`);
  echecs++;
};
let echecs = 0;

const creees: { collection: string; id: number | string }[] = [];

try {
  const payload = await getPayload({ config });

  console.log("\n── Catalogue ────────────────────────────────");

  const spec = await payload.create({
    collection: "specialisations",
    locale: "fr",
    data: {
      nom: "Test — Filière",
      slug: "test-filiere-verif",
      accroche: "Accroche de test.",
      description: "Description de test.",
      debouches: [{ titre: "Métier test", description: "Description du métier." }],
    },
  });
  creees.push({ collection: "specialisations", id: spec.id });
  ok(`Spécialisation créée (id ${spec.id})`);

  const prog = await payload.create({
    collection: "programmes",
    locale: "fr",
    data: {
      titre: "Test — Programme",
      slug: "test-programme-verif",
      specialisation: spec.id,
      type: "certification",
      niveau: "intermediaire",
      accroche: "Accroche du programme.",
      objectifs: "Objectifs du programme.",
      dureeHeures: 40,
      rythme: "8 semaines",
      langue: "Français",
      publicVise: [{ valeur: "Chefs de projet" }],
      competences: [{ valeur: "Cadrer un projet" }, { valeur: "Piloter les risques" }],
      prerequis: "Deux ans d'expérience.",
      debouches: [{ valeur: "Chef de projet" }],
      modules: [
        {
          titre: "Module 1",
          lecons: [
            { titre: "Leçon 1.1", dureeMinutes: 60 },
            { titre: "Leçon 1.2", dureeMinutes: 90 },
          ],
        },
        { titre: "Module 2", lecons: [{ titre: "Leçon 2.1", dureeMinutes: 120 }] },
      ],
    },
  });
  creees.push({ collection: "programmes", id: prog.id });
  ok(`Programme créé (id ${prog.id})`);

  // L'arbre Module → Leçon a-t-il bien été conservé ?
  const relu = await payload.findByID({
    collection: "programmes",
    id: prog.id,
    locale: "fr",
    depth: 1,
  });
  const modules = relu.modules ?? [];
  const nbLecons = modules.reduce((t, m) => t + (m.lecons?.length ?? 0), 0);
  modules.length === 2 && nbLecons === 3
    ? ok(`Arbre conservé : ${modules.length} modules, ${nbLecons} leçons`)
    : ko(`Arbre perdu : ${modules.length} modules, ${nbLecons} leçons`);

  // Les leçons ont-elles un identifiant stable ? (contrat : le LMS s'y rattachera)
  const idsLecons = modules.flatMap((m) => (m.lecons ?? []).map((l) => l.id)).filter(Boolean);
  idsLecons.length === 3
    ? ok(`Identifiants de leçon présents (${idsLecons.length}/3)`)
    : ko(`Identifiants de leçon manquants (${idsLecons.length}/3)`);

  // La relation vers la spécialisation est-elle résolue ?
  const specLiee = relu.specialisation;
  typeof specLiee === "object" && specLiee?.nom === "Test — Filière"
    ? ok("Relation Programme → Spécialisation résolue")
    : ko(`Relation non résolue : ${JSON.stringify(specLiee)}`);

  console.log("\n── Sessions ─────────────────────────────────");

  const sess = await payload.create({
    collection: "sessions",
    locale: "fr",
    data: {
      programme: prog.id,
      mode: "presentiel",
      ville: "Agadir",
      pays: "Maroc",
      debut: "2026-11-09T00:00:00.000Z",
      fin: "2026-11-13T00:00:00.000Z",
      cadence: "5 jours",
      capacite: 18,
      placesReservees: 15,
      prix: 1250,
      devise: "EUR",
    },
  });
  creees.push({ collection: "sessions", id: sess.id });
  ok(`Session créée (id ${sess.id})`);

  sess.reference?.includes("Agadir") && sess.reference?.includes("Test — Programme")
    ? ok(`Intitulé composé : « ${sess.reference} »`)
    : ko(`Intitulé incorrect : « ${sess.reference} »`);

  // La date de fin antérieure au début doit être refusée.
  try {
    await payload.create({
      collection: "sessions",
      locale: "fr",
      data: {
        programme: prog.id,
        mode: "visio",
        debut: "2026-12-10T00:00:00.000Z",
        fin: "2026-12-01T00:00:00.000Z",
        capacite: 10,
        placesReservees: 0,
        prix: 790,
        devise: "EUR",
      },
    });
    ko("Une session finissant avant son début a été acceptée");
  } catch {
    ok("Session incohérente (fin < début) refusée");
  }

  console.log("\n── Éditorial ────────────────────────────────");

  const art = await payload.create({
    collection: "articles",
    locale: "fr",
    data: {
      titre: "Test — Article",
      slug: "test-article-verif",
      categorie: "finance",
      publieLe: "2026-08-01T00:00:00.000Z",
      auteur: "Direction pédagogique CLIXA",
      lectureMinutes: 5,
      programmeLie: prog.id,
      chapo: "Chapô de test.",
      contenu: [
        { blockType: "paragraphe", texte: "Un paragraphe." },
        { blockType: "intertitre", texte: "Un intertitre" },
        { blockType: "liste", items: [{ valeur: "Premier" }, { valeur: "Second" }] },
        { blockType: "citation", texte: "Une citation.", auteur: "Quelqu'un" },
      ],
    },
  });
  creees.push({ collection: "articles", id: art.id });
  ok(`Article créé (id ${art.id})`);

  const types = (art.contenu ?? []).map((b) => b.blockType);
  JSON.stringify(types) === JSON.stringify(["paragraphe", "intertitre", "liste", "citation"])
    ? ok(`Les 4 types de blocs sont conservés : ${types.join(", ")}`)
    : ko(`Blocs incorrects : ${types.join(", ")}`);

  for (const [collection, data] of [
    ["temoignages", { texte: "Un témoignage.", auteur: "Test", fonction: "Fonction test" }],
    ["partenaires", { nom: "Test — Référentiel", nature: "referentiel", ordre: 999 }],
    [
      "pages",
      {
        titre: "Test — Page",
        slug: "test-page-verif",
        contenu: [{ blockType: "paragraphe", texte: "Texte." }],
      },
    ],
  ] as const) {
    const doc = await payload.create({ collection, locale: "fr", data: data as never });
    creees.push({ collection, id: doc.id });
    ok(`${collection} : création réussie`);
  }

  console.log("\n── Traduction ───────────────────────────────");

  // Constat : une mise à jour partielle en « en » est refusée — Payload exige
  // que TOUS les champs obligatoires localisés soient renseignés dans la locale
  // visée. Traduire impose donc une passe complète, champ par champ.
  let partielleRefusee = false;
  try {
    await payload.update({
      collection: "programmes",
      id: prog.id,
      locale: "en",
      data: { titre: "Test — Programme (EN)" },
    });
  } catch {
    partielleRefusee = true;
  }
  partielleRefusee
    ? ko("Traduction partielle encore refusée")
    : ok("Traduction partielle acceptée : on peut traduire champ par champ");

  // Le repli doit combler ce qui n'est pas traduit.
  const partiel = await payload.findByID({ collection: "programmes", id: prog.id, locale: "en" });
  partiel.accroche === "Accroche du programme."
    ? ok("Repli sur le français pour les champs non traduits")
    : ko(`Repli absent : accroche EN = « ${partiel.accroche} »`);

  // Le français ne doit toujours pas accepter un champ vide.
  let videRefuse = false;
  try {
    await payload.update({
      collection: "programmes",
      id: prog.id,
      locale: "fr",
      data: { accroche: "" },
    });
  } catch {
    videRefuse = true;
  }
  videRefuse
    ? ok("Champ vide toujours refusé en français")
    : ko("Un champ obligatoire a été vidé en français");

  // Passe complète : c'est le seul chemin possible aujourd'hui.
  await payload.update({
    collection: "programmes",
    id: prog.id,
    locale: "en",
    data: {
      titre: "Test — Programme (EN)",
      accroche: "Programme summary.",
      objectifs: "Programme objectives.",
      rythme: "8 weeks",
      prerequis: "Two years of experience.",
      publicVise: [{ valeur: "Project managers" }],
      competences: [{ valeur: "Frame a project" }, { valeur: "Manage risk" }],
      debouches: [{ valeur: "Certified project manager" }],
      modules: [
        {
          titre: "Module 1",
          lecons: [
            { titre: "Lesson 1.1", dureeMinutes: 60 },
            { titre: "Lesson 1.2", dureeMinutes: 90 },
          ],
        },
        { titre: "Module 2", lecons: [{ titre: "Lesson 2.1", dureeMinutes: 120 }] },
      ],
    },
  });
  const enDoc = await payload.findByID({ collection: "programmes", id: prog.id, locale: "en" });
  const frDoc = await payload.findByID({ collection: "programmes", id: prog.id, locale: "fr" });
  enDoc.titre === "Test — Programme (EN)" && frDoc.titre === "Test — Programme"
    ? ok("Les deux langues coexistent sans s'écraser")
    : ko(`FR=« ${frDoc.titre} »  EN=« ${enDoc.titre} »`);

  console.log("\n── Unicité des identifiants d'URL ───────────");
  try {
    await payload.create({
      collection: "specialisations",
      locale: "fr",
      data: {
        nom: "Doublon",
        slug: "test-filiere-verif", // déjà pris plus haut
        accroche: "x",
        description: "x",
        debouches: [{ titre: "x", description: "x" }],
      },
    });
    ko("Un slug déjà pris a été accepté");
  } catch {
    ok("Slug en double refusé");
  }

  /* ── Nettoyage ─────────────────────────────────────── */
  console.log("\n── Nettoyage ────────────────────────────────");
  for (const { collection, id } of creees.reverse()) {
    await payload.delete({ collection: collection as never, id });
  }
  ok(`${creees.length} documents de test supprimés`);

  console.log(
    echecs === 0
      ? "\n✅ Toutes les vérifications passent.\n"
      : `\n❌ ${echecs} vérification(s) en échec.\n`,
  );
  process.exit(echecs === 0 ? 0 : 1);
} catch (e) {
  console.error("\n❌ Erreur :", e instanceof Error ? e.message : e);
  process.exit(1);
}
