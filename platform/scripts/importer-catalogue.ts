/**
 * Importe le catalogue réel dans la base, à partir des fiches Word.
 *
 * L'extraction elle-même vit hors du dépôt : ce script consomme le JSON qu'elle
 * produit. Le format Word n'est pas une source de vérité durable — l'équipe
 * saisira la suite depuis /admin.
 *
 *   npx payload run scripts/importer-catalogue.ts <chemin-du-json>
 *
 * Les parcours sont créés en BROUILLON : rien n'apparaît sur le site tant que
 * quelqu'un ne les publie pas depuis le back-office.
 *
 * ⚠️ Il vise la base pointée par .env.local.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { readFileSync } from "node:fs";

interface Seance {
  numero: number;
  titre: string;
  objectif: string;
  points: string[];
}

interface ParcoursExtrait {
  titre: string;
  slug: string;
  accroche: string;
  publicVise: string[];
  prerequis: string[];
  livrables: string[];
  outils: string[];
  competences: string[];
  debouches: string[];
  _objectifs: string[];
  _positionnement: string[];
  _format: string[];
  seances: Seance[];
}

/**
 * Les quatre catégories d'origine avaient été inventées pour les exemples. Le
 * catalogue réel s'organise par direction d'entreprise : on suit le catalogue.
 */
const SPECIALISATIONS = [
  {
    slug: "finance-controle",
    nom: "Finance & Contrôle",
    accroche: "Piloter la performance financière et sécuriser les comptes.",
    description:
      "Les parcours qui structurent la fonction finance : direction administrative et financière, contrôle de gestion, audit interne. Pilotage du cash, budget, reporting de direction et maîtrise des risques.",
  },
  {
    slug: "industrie-operations",
    nom: "Industrie & Opérations",
    accroche: "Tenir la production, la maintenance et la conformité.",
    description:
      "Les parcours des directions industrielles : production, maintenance, direction industrielle multisites et QHSE. Performance opérationnelle, fiabilité des équipements et prévention.",
  },
  {
    slug: "commercial-marketing",
    nom: "Commercial & Marketing",
    accroche: "Construire la demande et tenir le plan de vente.",
    description:
      "Les parcours qui pilotent la croissance : direction commerciale et direction marketing. Plan commercial, management des équipes de vente, parcours client et fidélisation.",
  },
  {
    slug: "capital-humain",
    nom: "Capital humain",
    accroche: "Faire de la fonction RH un levier de direction.",
    description:
      "Le parcours de la direction des ressources humaines : organisation, développement des compétences, dialogue social et pilotage par les indicateurs.",
  },
];

/** Chaque parcours rejoint la direction dont il porte le nom. */
const RATTACHEMENT: Record<string, string> = {
  "directeur-administratif-et-financier": "finance-controle",
  "directeur-controle-de-gestion": "finance-controle",
  "directeur-audit-interne": "finance-controle",
  "directeur-qhse": "industrie-operations",
  "directeur-de-production": "industrie-operations",
  "directeur-de-maintenance": "industrie-operations",
  "directeur-industriel": "industrie-operations",
  "directeur-commercial": "commercial-marketing",
  "directeur-marketing": "commercial-marketing",
  "directeur-des-ressources-humaines": "capital-humain",
  "directeur-de-projets": "management-projet",
  "preparation-a-la-certification-pmp": "management-projet",
};

const MENTION_PMI =
  "Cette formation constitue un accompagnement à la préparation PMP®. Les frais d'examen international du PMI ne sont pas inclus. PMP® est une marque du Project Management Institute (PMI).";

const chemin = process.argv.find((a) => a.endsWith(".json"));
if (!chemin) {
  console.error("Usage : npx payload run scripts/importer-catalogue.ts <chemin-du-json>");
  process.exit(1);
}

const parcours: ParcoursExtrait[] = JSON.parse(readFileSync(chemin, "utf-8"));
const payload = await getPayload({ config });

const liste = (v: string[]) => v.map((valeur) => ({ valeur }));

/* ── Les spécialisations ──────────────────────────────────────────────── */

const idParSlug = new Map<string, number>();

for (const s of SPECIALISATIONS) {
  const { docs } = await payload.find({
    collection: "specialisations",
    where: { slug: { equals: s.slug } },
    limit: 1,
    overrideAccess: true,
  });
  if (docs[0]) {
    idParSlug.set(s.slug, Number(docs[0].id));
    console.log(`  = ${s.nom} (existait déjà)`);
    continue;
  }
  const cree = await payload.create({
    collection: "specialisations",
    locale: "fr",
    overrideAccess: true,
    data: { ...s, _status: "published" },
  });
  idParSlug.set(s.slug, Number(cree.id));
  console.log(`  + ${s.nom}`);
}

// « Management de projet » préexiste : on le retrouve plutôt que le recréer.
{
  const { docs } = await payload.find({
    collection: "specialisations",
    where: { slug: { equals: "management-projet" } },
    limit: 1,
    overrideAccess: true,
  });
  if (docs[0]) idParSlug.set("management-projet", Number(docs[0].id));
}

/* ── Les parcours ─────────────────────────────────────────────────────── */

console.log("");
let crees = 0;
let ignores = 0;

for (const p of parcours) {
  const specSlug = RATTACHEMENT[p.slug];
  const specId = specSlug ? idParSlug.get(specSlug) : undefined;
  if (!specId) {
    console.log(`  ! ${p.titre} — pas de rattachement, ignoré`);
    ignores++;
    continue;
  }

  const existe = await payload.find({
    collection: "programmes",
    where: { slug: { equals: p.slug } },
    limit: 1,
    overrideAccess: true,
  });
  if (existe.docs[0]) {
    console.log(`  = ${p.titre} (déjà en base)`);
    ignores++;
    continue;
  }

  const pmp = p.slug.includes("pmp");
  // Le volume est annoncé dans l'accroche : « 32 heures », « 35 heures ».
  const heures = Number(p.accroche.match(/(\d{2})\s*heures?/)?.[1] ?? 32);

  // Une séance devient un module ; ses points, autant de leçons. Les quatre
  // heures de la séance sont réparties entre elles, faute de découpage plus fin.
  const modules = p.seances.map((s) => {
    const part = Math.round(240 / Math.max(s.points.length, 1));
    return {
      titre: `S${s.numero} — ${s.titre}`,
      objectif: s.objectif || undefined,
      lecons: s.points.map((titre) => ({ titre, dureeMinutes: part })),
    };
  });

  await payload.create({
    collection: "programmes",
    locale: "fr",
    overrideAccess: true,
    data: {
      titre: p.titre,
      slug: p.slug,
      specialisation: specId,
      type: pmp ? "certification" : "parcours-executif",
      niveau: "avance",
      accroche: p.accroche,
      objectifs: p._objectifs.join(" "),
      dureeHeures: heures,
      rythme: p._format.join(" · ") || "8 séances live de 4 h",
      langue: "Français",
      publicVise: liste(p.publicVise),
      competences: liste(p.competences),
      prerequis: p.prerequis.join(" "),
      debouches: liste(p.debouches),
      livrables: liste(p.livrables),
      outils: liste(p.outils),
      modules,
      ...(pmp ? { certification: "PMP® — Project Management Institute" } : {}),
      ...(pmp ? { mentionsLegales: MENTION_PMI } : {}),
      // Brouillon : l'équipe relit, puis publie.
      _status: "draft",
    },
  });
  console.log(`  + ${p.titre}  (${modules.length} séances, ${heures} h)`);
  crees++;
}

console.log(`\n  ${crees} parcours créés en brouillon, ${ignores} ignoré(s).`);
process.exit(0);
