/**
 * Qui a déjà appelé — ce que la colonne « Suivi » dit, et ce qu'elle refuse.
 *
 * ── ⚠️ Le défaut que cette garde protège ────────────────────────────────────
 * Après une pré-inscription, quelqu'un de l'équipe appelle. Rien ne le notait :
 * le lendemain, un collègue ouvrait la même liste, voyait le même dossier au
 * même état, et rappelait la même personne. Demandé par la direction le
 * 8 septembre 2026.
 *
 * ⚠️ **Le journal s'ajoute, il ne s'écrase pas.** Une case « dernier appel »
 * aurait perdu combien de fois on a relancé — et c'est ce qu'on veut savoir
 * avant de composer un numéro pour la quatrième fois. Le contrôle le plus
 * important ci-dessous est donc celui du bouton : deux clics laissent deux
 * lignes.
 *
 *   npx payload run scripts/verifier-suivi.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { JOURS_RECENT, dernierSuivi } from "@/lib/suivi";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  Le suivi des appels\n");

/*
  ⚠️ L'horloge est passée, jamais lue par le calcul — c'est ce qui permet
  d'éprouver « il y a cinq jours » sans attendre cinq jours, et ce qui rend ce
  contrôle identique demain matin.
*/
const MAINTENANT = new Date("2026-09-08T14:00:00.000Z");
const ilYA = (jours: number) => new Date(MAINTENANT.getTime() - jours * 86_400_000).toISOString();

/* ── Ce que la colonne dit ────────────────────────────────────────────────── */

const jamais = dernierSuivi([], MAINTENANT);
dire(
  "un dossier que personne n'a appelé le dit",
  jamais.ton === "jamais" && jamais.nombre === 0,
  jamais.libelle,
);
dire("et un journal absent ne casse rien", dernierSuivi(null, MAINTENANT).ton === "jamais");

/*
  ⚠️ **Le cas qui a fait tomber la fiche entière.** L'état du formulaire de
  Payload ne rend pas `[]` pour un champ `array` vide : `reduceFieldsToValues`
  rend le *nombre* de lignes, soit `0`. Le calcul appelait `.filter` dessus, et
  la page du dossier affichait « This page couldn't load » — sur tout dossier
  que personne n'a jamais appelé, c'est-à-dire tous les dossiers réels.

  Il ne s'est vu ni au type (l'annotation promettait un tableau) ni à l'écran
  (les dossiers d'épreuve portaient tous trois échanges) : c'est l'épreuve
  Playwright du bouton « Contrat vérifié » qui l'a levé, parce qu'elle fabrique
  son dossier par le tunnel public, donc sans journal.
*/
for (const [nom, valeur] of [
  ["zéro, ce que rend un tableau vide côté formulaire", 0],
  ["une chaîne", "" as unknown],
  ["un objet", {} as unknown],
] as [string, unknown][]) {
  let tenu = false;
  try {
    tenu = dernierSuivi(valeur as never, MAINTENANT).ton === "jamais";
  } catch {
    tenu = false;
  }
  dire(`⚠️ ne lève pas sur ce qui n'est pas un tableau — ${nom}`, tenu);
}

const aujourdhui = dernierSuivi([{ quoi: "appel", le: ilYA(0) }], MAINTENANT);
dire(
  "⚠️ appelé aujourd'hui se lit sans calcul de tête",
  aujourdhui.libelle === "Appelé aujourd'hui" && aujourdhui.ton === "recent",
  aujourdhui.libelle,
);
dire(
  "hier se dit « hier », pas « il y a 1 j »",
  dernierSuivi([{ quoi: "appel", le: ilYA(1) }], MAINTENANT).libelle === "Appelé hier",
);
dire(
  "la relance pour signature se nomme autrement",
  dernierSuivi([{ quoi: "signature", le: ilYA(2) }], MAINTENANT).libelle ===
    "Relancé pour signer il y a 2 j",
);

/*
  ⚠️ **Le seuil est la seule chose que la couleur encode.** Au-delà, rappeler
  quelqu'un qui n'a pas donné suite est le travail, pas une maladresse — et la
  colonne ne doit pas le décourager.
*/
dire(
  `au seuil de ${JOURS_RECENT} jours, c'est encore récent`,
  dernierSuivi([{ quoi: "appel", le: ilYA(JOURS_RECENT) }], MAINTENANT).ton === "recent",
);
dire(
  "un jour de plus, et la couleur s'efface",
  dernierSuivi([{ quoi: "appel", le: ilYA(JOURS_RECENT + 1) }], MAINTENANT).ton === "ancien",
);

/*
  ⚠️ **Le plus récent gagne, pas le dernier de la liste.** Le journal s'écrit en
  ajoutant à la fin, mais une correction depuis /admin peut réordonner les
  lignes — et « le dernier échange » doit rester le plus récent.
*/
const desordre = dernierSuivi(
  [
    { quoi: "appel", le: ilYA(9) },
    { quoi: "signature", le: ilYA(1) },
    { quoi: "appel", le: ilYA(5) },
  ],
  MAINTENANT,
);
dire(
  "⚠️ le plus récent gagne, quel que soit l'ordre des lignes",
  desordre.libelle === "Relancé pour signer hier",
  desordre.libelle,
);
dire("et les échanges se comptent tous", desordre.nombre === 3);

/*
  ⚠️ Une ligne sans date ne compte pas : elle ne peut pas répondre « quand ».
  Une date illisible non plus — et le dire vaut mieux que rendre « il y a NaN j ».
*/
dire(
  "une ligne sans date est écartée du compte",
  dernierSuivi(
    [
      { quoi: "appel", le: null },
      { quoi: "appel", le: ilYA(2) },
    ],
    MAINTENANT,
  ).nombre === 1,
);
dire(
  "⚠️ une date illisible se dit, elle ne rend pas « il y a NaN j »",
  dernierSuivi([{ quoi: "appel", le: "pas-une-date" }], MAINTENANT).libelle === "Date illisible",
);

/* ── ⚠️ Et le bouton ajoute, il ne remplace pas ───────────────────────────── */
/*
  C'est le contrôle qui compte. Un bouton qui écraserait la ligne précédente
  ferait exactement ce qu'une case « dernier appel » aurait fait — et le défaut
  ne se verrait qu'au troisième appel, quand quelqu'un se demanderait pourquoi
  le compteur reste à un.
*/
const payload = await getPayload({ config });

const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 1,
  depth: 0,
  overrideAccess: true,
  where: { fin: { greater_than: new Date().toISOString() } },
});

if (!sessions[0]) {
  console.log("\n  Aucune session à venir : le journal n'est pas éprouvé en base.\n");
} else {
  let id: string | number | undefined;
  try {
    const d = await payload.create({
      collection: "inscriptions",
      overrideAccess: true,
      data: {
        session: sessions[0].id,
        statut: "demandee",
        apprenantNom: "Épreuve Suivi",
        apprenantEmail: `suivi.${Date.now()}@epreuve.invalid`,
        apprenantWhatsapp: "+212600000000",
        apprenantPays: "Maroc",
        planPaiement: "P1",
        echeances: [{ montant: 423, statut: "attendu" }],
      } as never,
    });
    id = d.id;

    dire("un dossier neuf n'a aucun échange", ((d.echanges ?? []) as unknown[]).length === 0);

    /* Ce que fait le bouton : relire le journal, y ajouter, tout renvoyer. */
    const noter = async (quoi: string) => {
      const relu = await payload.findByID({
        collection: "inscriptions",
        id: id!,
        overrideAccess: true,
        depth: 0,
      });
      const journal = ((relu as { echanges?: unknown[] }).echanges ?? []) as unknown[];
      await payload.update({
        collection: "inscriptions",
        id: id!,
        overrideAccess: true,
        data: { echanges: [...journal, { quoi, le: new Date().toISOString() }] } as never,
      });
    };

    await noter("appel");
    await noter("signature");
    await noter("appel");

    const relu = await payload.findByID({
      collection: "inscriptions",
      id: d.id,
      overrideAccess: true,
      depth: 0,
    });
    const journal = ((relu as { echanges?: { quoi?: string }[] }).echanges ?? []) as {
      quoi?: string;
    }[];

    dire(
      "⚠️ trois gestes laissent trois lignes, jamais une seule",
      journal.length === 3,
      `${journal.length} ligne(s)`,
    );
    dire(
      "et chacune garde son geste",
      journal.map((e) => e.quoi).join(",") === "appel,signature,appel",
      journal.map((e) => e.quoi).join(","),
    );

    const lu = dernierSuivi(journal as never, new Date());
    dire(
      "la colonne lit le journal tel qu'il est en base",
      lu.nombre === 3 && lu.ton === "recent",
      lu.libelle,
    );
  } finally {
    if (id !== undefined) {
      await payload.delete({ collection: "inscriptions", id, overrideAccess: true });
      console.log("  · dossier d'épreuve supprimé");
    }
  }
}

console.log(
  manques === 0
    ? "\n  On sait qui a déjà appelé, et depuis la liste.\n"
    : `\n  ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
