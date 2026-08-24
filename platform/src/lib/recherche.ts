import { sql } from "drizzle-orm";
import { payloadClient } from "@/lib/payload";

/**
 * BE-09 — La recherche du catalogue, confiée à PostgreSQL.
 *
 * ── Pourquoi ne plus comparer des chaînes ───────────────────────────────────
 * Le filtrage précédent cherchait une sous-chaîne dans un texte mis à plat.
 * Il tenait tant qu'on tapait exactement le mot de la fiche, et lâchait dès
 * qu'on employait une autre forme du même mot :
 *
 *     « financière »  →  0 résultat, alors que « Directeur Administratif et
 *                        Financier » est au catalogue
 *     « auditer »     →  0 résultat, alors que « Directeur Audit Interne » l'est
 *
 * Ce n'est pas un cas tordu : « direction financière » est la façon la plus
 * naturelle de nommer le poste en français. PostgreSQL sait ramener un mot à
 * sa racine — `financière` et `financier` donnent tous deux `financi` — et
 * c'est exactement le travail qui manquait.
 *
 * ── Pourquoi les accents partent APRÈS, jamais avant ────────────────────────
 * Le réflexe est de retirer les accents d'abord, pour que « controle » trouve
 * « contrôle ». Mesuré, cela casse le reste : le radicaliseur français a
 * besoin des accents.
 *
 *     financière → financi   |   financiere → financier   ← ne se rejoignent plus
 *     contrôle   → contrôl   |   controle   → control     ← ne se rejoignent plus
 *
 * On indexe donc les deux formes — accentuée pour le radical, aplatie pour le
 * visiteur qui tape sans accents — et on interroge les deux de même. Un terme
 * qui se retrouve dans l'une ou l'autre suffit.
 *
 * ── Pourquoi le radical ne suffit pas ───────────────────────────────────────
 * Ramener au radical fait perdre ce que la comparaison de chaînes savait faire :
 * reconnaître un début de mot. Deux cas mesurés sur le catalogue réel —
 *
 *     « prépa »   ne rejoint pas « Préparation »  (prep / prépar)
 *     « partner » ne rejoint pas « partnering »   (le radicaliseur français
 *                                                  n'a pas de prise sur l'anglais)
 *
 * — et ce sont précisément les abréviations et les mots empruntés, c'est-à-dire
 * ce qu'un visiteur tape le plus volontiers. On interroge donc aussi par
 * préfixe, sur la forme aplatie. Les deux mécanismes se complètent : le radical
 * rapproche les formes d'un même mot, le préfixe rattrape ce qu'on tape à
 * moitié.
 *
 * ── Pourquoi le texte est envoyé plutôt que stocké ──────────────────────────
 * Le catalogue tient en douze parcours. Une colonne `tsvector` indexée en GIN
 * ne se justifie qu'à partir de quelques milliers de lignes ; en dessous,
 * PostgreSQL lit la table de toute façon. Surtout, elle imposerait une
 * migration de schéma avant chaque déploiement (voir « La base passe avant le
 * code »), pour ne rien accélérer de mesurable.
 *
 * Ce qu'on gagne ici est la qualité linguistique, pas la vitesse — et elle
 * s'obtient sans toucher au schéma, ni à une extension à installer.
 *
 * Le jour où le catalogue dépassera le millier d'entrées, la bascule consiste
 * à stocker `vecteur` dans une colonne et à poser un index GIN dessus : la
 * requête ci-dessous ne change pas, seule sa source change.
 */

/** Minuscules et accents retirés — la forme « aplatie » de l'index. */
export function aplatir(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export interface DocumentIndexe {
  slug: string;
  /** Pesé plus lourd que le corps : un mot dans le titre prime sur une mention. */
  titre: string;
  corps: string;
}

interface Ligne {
  slug: string;
}

/**
 * Rend les slugs qui répondent à `q`, du plus pertinent au moins pertinent.
 *
 * À score égal, l'ordre d'entrée est conservé : sans cela, deux visiteurs
 * tapant la même chose verraient deux classements — le même piège que le tri
 * implicite de Payload.
 */
export async function rechercher(documents: DocumentIndexe[], q: string): Promise<string[]> {
  const brut = q.trim();
  if (!brut || documents.length === 0) return [];

  const plat = aplatir(brut);

  const charge = documents.map((d) => ({
    slug: d.slug,
    titre: d.titre,
    titre_plat: aplatir(d.titre),
    corps: d.corps,
    corps_plat: aplatir(d.corps),
  }));

  /*
    Les guillemets et le tiret de `websearch_to_tsquery` disent une intention
    précise — cette expression-là, sans ce mot-là. Élargir par préfixe la
    contredirait : on s'en abstient dès que la syntaxe est employée.
  */
  const explicite = /["-]/.test(brut);

  /*
    `to_tsquery` — le seul qui accepte `:*` — refuse une saisie malformée en
    levant une erreur. On ne lui passe donc que des termes réduits aux lettres
    et aux chiffres, jamais la frappe brute.
  */
  const termes = explicite ? [] : plat.split(/[^a-z0-9]+/).filter(Boolean);

  /*
    Le fragment est omis plutôt que neutralisé. Une tsquery vide fait bien
    l'affaire — `q || ''` vaut `q` — mais PostgreSQL émet un NOTICE à chaque
    lecture d'un littéral vide, et un NULL, lui, annulerait la requête entière :
    `vecteur @@ NULL` ne rend aucune ligne, sans erreur.
  */
  const parPrefixe =
    termes.length > 0 ? sql` || ${termes.map((t) => `${t}:*`).join(" & ")}::text::tsquery` : sql``;

  const payload = await payloadClient();
  const drizzle = (
    payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }
  ).drizzle;

  /*
    `websearch_to_tsquery` plutôt que `to_tsquery` : il accepte n'importe quelle
    saisie sans jamais lever d'erreur, et comprend les guillemets pour une
    expression exacte — « "contrôle de gestion" » — ainsi que le tiret pour
    exclure. C'est le seul des trois qu'on puisse brancher sur un champ public.
  */
  const resultat = await drizzle.execute(sql`
    WITH doc AS (
      SELECT
        d.valeur->>'slug' AS slug,
        d.rang,
        setweight(to_tsvector('french', d.valeur->>'titre'),      'A')
     || setweight(to_tsvector('simple', d.valeur->>'titre_plat'), 'A')
     || setweight(to_tsvector('french', d.valeur->>'titre_plat'), 'A')
     || setweight(to_tsvector('french', d.valeur->>'corps'),      'B')
     || setweight(to_tsvector('simple', d.valeur->>'corps_plat'), 'B')
     || setweight(to_tsvector('french', d.valeur->>'corps_plat'), 'B') AS vecteur
      FROM jsonb_array_elements(${JSON.stringify(charge)}::jsonb)
        WITH ORDINALITY AS d(valeur, rang)
    ),
    requete AS (
      SELECT websearch_to_tsquery('french', ${brut})
          || websearch_to_tsquery('simple', ${plat})
          || websearch_to_tsquery('french', ${plat})${parPrefixe} AS q
    )
    SELECT doc.slug
    FROM doc, requete
    WHERE doc.vecteur @@ requete.q
    ORDER BY ts_rank(doc.vecteur, requete.q) DESC, doc.rang
  `);

  const lignes = (
    Array.isArray(resultat) ? resultat : (resultat as { rows: Ligne[] }).rows
  ) as Ligne[];
  return lignes.map((l) => l.slug);
}
