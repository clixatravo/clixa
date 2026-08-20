/**
 * BE-11 — Jeu de données de démonstration.
 *
 * Recopie dans Payload exactement le contenu servi aujourd'hui par
 * src/data/. C'est la condition posée dans le plan : si la base contient les
 * mêmes données que les fichiers, alors INT-01 — la bascule de src/lib/ vers
 * Payload — doit produire un site rigoureusement identique. Toute différence
 * visible après la bascule sera un défaut de branchement, pas de contenu.
 *
 * Les témoignages et les partenaires viennent de index.html : ils existent sur
 * le site actuel et n'avaient pas été repris.
 *
 * ⚠️ Le script VIDE les collections de contenu avant de les remplir.
 *
 *   npx payload run scripts/semer.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { programmes, sessions, specialisations } from "@/data/catalogue";
import { articles } from "@/data/blog";

const info = (m: string) => console.log(`  ${m}`);

/** Les prix sont stockés en centimes côté domaine, saisis en unité côté CMS. */
const enUnites = (centimes: number) => Math.round(centimes / 100);

const temoignages = [
  { texte: "Une formation structurée, claire et directement applicable.", auteur: "Directrice financière", fonction: "Abidjan" },
  { texte: "Une vraie montée en compétence, au-delà du simple contenu théorique.", auteur: "Chef de projet", fonction: "Dakar" },
  { texte: "Un accompagnement sérieux, humain et exigeant.", auteur: "Responsable RH", fonction: "Casablanca" },
  { texte: "Une expérience premium, très utile pour ma progression.", auteur: "Consultant senior", fonction: "Rabat" },
  { texte: "Un niveau d'exigence rare dans une formation à distance.", auteur: "Chef comptable", fonction: "Douala" },
  { texte: "J'ai pu appliquer les outils dès la semaine suivante.", auteur: "Manager opérations", fonction: "Tunis" },
];

/** Repris de index.html, sous la mention « Référentiels, standards et
 *  certifications visés par nos parcours ». */
const partenaires = [
  { nom: "IFC", nature: "institution", ordre: 10 },
  { nom: "World Bank Group", nature: "institution", ordre: 20 },
  { nom: "EC-Council", nature: "certificateur", ordre: 30 },
  { nom: "PMI Aligned", nature: "referentiel", ordre: 40 },
  { nom: "ISO 21001", nature: "referentiel", ordre: 50 },
] as const;

try {
  const payload = await getPayload({ config });

  console.log("\n── Nettoyage ────────────────────────────────");
  for (const c of ["sessions", "articles", "programmes", "specialisations", "temoignages", "partenaires"] as const) {
    const { docs } = await payload.find({ collection: c, limit: 500, overrideAccess: true, depth: 0 });
    for (const d of docs) {
      await payload.delete({ collection: c, id: d.id, overrideAccess: true });
    }
    info(`${c} vidée (${docs.length})`);
  }

  console.log("\n── Catalogue ────────────────────────────────");

  const idSpec = new Map<string, number>();
  for (const s of specialisations) {
    const doc = await payload.create({
      collection: "specialisations",
      locale: "fr",
      overrideAccess: true,
      data: {
        nom: s.nom,
        slug: s.slug,
        accroche: s.accroche,
        description: s.description,
        debouches: s.debouches.map((d) => ({ titre: d.titre, description: d.description })),
        _status: "published",
      },
    });
    idSpec.set(s.slug, doc.id as number);
  }
  info(`${specialisations.length} spécialisations`);

  const idProg = new Map<string, number>();
  for (const p of programmes) {
    const doc = await payload.create({
      collection: "programmes",
      locale: "fr",
      overrideAccess: true,
      data: {
        titre: p.titre,
        slug: p.slug,
        specialisation: idSpec.get(p.specialisation)!,
        type: p.type,
        niveau: p.niveau,
        accroche: p.accroche,
        objectifs: p.objectifs,
        certification: p.certification,
        dureeHeures: p.dureeHeures,
        rythme: p.rythme,
        langue: p.langue,
        publicVise: p.publicVise.map((v) => ({ valeur: v })),
        competences: p.competences.map((v) => ({ valeur: v })),
        prerequis: p.prerequis,
        debouches: p.debouches.map((v) => ({ valeur: v })),
        modules: p.modules.map((m) => ({
          titre: m.titre,
          lecons: m.lecons.map((l) => ({ titre: l.titre, dureeMinutes: l.dureeMinutes })),
        })),
        _status: "published",
      },
    });
    idProg.set(p.slug, doc.id as number);
  }
  info(`${programmes.length} programmes`);

  for (const s of sessions) {
    await payload.create({
      collection: "sessions",
      locale: "fr",
      overrideAccess: true,
      data: {
        programme: idProg.get(s.programmeSlug)!,
        mode: s.mode,
        ville: s.ville,
        pays: s.pays,
        debut: new Date(s.debut).toISOString(),
        fin: new Date(s.fin).toISOString(),
        cadence: s.cadence,
        capacite: s.capacite,
        placesReservees: s.placesReservees,
        prix: enUnites(s.prixCentimes),
        devise: s.devise,
      },
    });
  }
  info(`${sessions.length} sessions`);

  console.log("\n── Éditorial ────────────────────────────────");

  for (const a of articles) {
    await payload.create({
      collection: "articles",
      locale: "fr",
      overrideAccess: true,
      data: {
        titre: a.titre,
        slug: a.slug,
        categorie: a.categorie,
        publieLe: new Date(a.publieLe).toISOString(),
        auteur: a.auteur,
        lectureMinutes: a.lectureMinutes,
        programmeLie: a.programmeLie ? idProg.get(a.programmeLie) : undefined,
        chapo: a.chapo,
        contenu: a.contenu.map((b) =>
          b.type === "liste"
            ? { blockType: "liste", items: b.items.map((v) => ({ valeur: v })) }
            : b.type === "citation"
              ? { blockType: "citation", texte: b.texte, auteur: b.auteur }
              : { blockType: b.type, texte: b.texte },
        ),
        _status: "published",
      },
    });
  }
  info(`${articles.length} articles`);

  for (const t of temoignages) {
    await payload.create({
      collection: "temoignages",
      locale: "fr",
      overrideAccess: true,
      data: { ...t, _status: "published" },
    });
  }
  info(`${temoignages.length} témoignages`);

  for (const p of partenaires) {
    await payload.create({
      collection: "partenaires",
      locale: "fr",
      overrideAccess: true,
      data: { ...p, _status: "published" },
    });
  }
  info(`${partenaires.length} partenaires`);

  console.log("\n✅ Base peuplée. Le contenu est identique à src/data/.\n");
  process.exit(0);
} catch (e) {
  console.error("\n❌ Erreur :", e instanceof Error ? e.message : e);
  process.exit(1);
}
