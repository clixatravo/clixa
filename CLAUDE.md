# CLIXA — plateforme de formation

| Chemin | Quoi |
|---|---|
| `platform/` | L'application Next.js 16 + Payload CMS. **Tout le développement est ici.** |
| `index.html`, `*.html` | Le site vitrine actuel, statique. Référence historique du design system. |

## Démarrer

```bash
cd platform && npm run dev
```

Prérequis : PostgreSQL local avec une base `clixa`, et `platform/.env.local`
(voir `.env.example`). Le site tourne sur `/`, le back-office sur `/admin`.

**Ne jamais lancer `npm run build` pendant que `npm run dev` tourne** : les deux
écrivent dans `.next`. Pour builder :

```bash
pkill -f "next dev" && rm -rf .next && npm run build
```

## Vérifier

```bash
cd platform && npm run verify        # types + lint + formatage
```

Cinq suites vérifient le back-office de bout en bout, via l'API locale de
Payload (aucun mot de passe requis). Elles créent puis suppriment leurs données :

```bash
npx payload run scripts/verifier-collections.ts   # champs, arbre, relations
npx payload run scripts/verifier-roles.ts         # permissions, élévation
npx payload run scripts/verifier-medias.ts        # variantes d'images
npx payload run scripts/verifier-brouillons.ts    # visibilité des brouillons
npx payload run scripts/verifier-semis.ts         # base ≡ src/data/
```

Deux scripts servent l'accès au back-office. Aucun adaptateur d'e-mail n'est
configuré : le lien « Mot de passe oublié » de `/admin` ne mène nulle part, et
ces scripts sont le seul recours quand quelqu'un perd son mot de passe.

```bash
npx payload run scripts/reinitialiser-mot-de-passe.ts <email>  # lien de réinit.
npx payload run scripts/supprimer-compte.ts <email>            # supprime un compte
```

Quand plus aucun compte n'existe, `/admin` affiche « Créer le premier
utilisateur » : c'est la sortie de secours si le dernier mot de passe est perdu.

⚠️ Payload met **près d'une minute** à démarrer un script (`Pulling schema from
database` contre Neon). Un script qui semble figé n'a probablement pas fini.

⚠️ `scripts/semer.ts` **vide les collections** avant de les remplir. Ne pas le
lancer une fois que l'équipe aura saisi du vrai contenu.

## Architecture

```
src/app/(frontend)/   PAGES        le site public
src/app/(payload)/    BACK-OFFICE  /admin et les API
src/collections/      CONTENU      la forme des données, côté CMS
src/lib/              ACCÈS        catalogue.ts, blog.ts, payload.ts, seo.ts
src/data/             HÉRITAGE     ne sert plus qu'au seed et aux catégories
```

**Deux racines de layout**, pas de layout partagé : Payload rend son propre
`<html>`. Les mettre sous un même layout provoquait une erreur d'hydratation.

**Une règle ESLint interdit d'importer `@/data/*` depuis `src/app/` ou
`src/components/`.** C'est ce qui a permis de basculer vers Payload (INT-01) en
ne touchant que deux fichiers.

**`src/lib/format.ts` est séparé de `catalogue.ts`** parce que `PlanDeCours` est
un composant client : tant que le formatage vivait avec l'accès aux données,
l'import entraînait Payload dans le paquet navigateur et le build échouait.

## Le contrat d'extensibilité

`src/lib/types.ts` porte huit décisions. Les trois qui comptent :

1. **Ne jamais fusionner `Programme` / `Session` / `Inscription`.**
2. **`Inscription` est le pivot** — le LMS y accrochera progression et certificat.
3. **Garder l'arbre `Module → Leçon`**, même si la V1 ne l'affiche qu'en plan de cours.

**Décision A — pas de e-learning cette année.** Une `Lecon` ne porte que titre et
durée. `objectif` et `contenuId` existent dans le schéma et restent vides.

## Conventions

- **Code et commentaires en français.**
- `typedRoutes` actif : un lien vers une route inexistante casse le build. Pour
  une URL construite à l'exécution, annoter `as Route`.
- **`robots.ts` doit rester à la racine de `src/app/`** : dans un groupe de
  routes, Next 16 ne l'enregistre pas et `/robots.txt` renvoie 404 sans erreur.
- Filtres dans l'URL, pas dans un état client.
- Composants serveur par défaut.
- **Le français est la langue de référence.** `required` est remplacé par
  `requisEnFrancais` sur les champs traduisibles (`src/collections/champs.ts`) :
  sinon traduire impose de tout remplir d'un coup dans la langue visée.

## Pièges rencontrés

- **`sharp` doit être passé à `buildConfig`**, sinon Payload accepte les images
  mais saute redimensionnement et WebP, sans la moindre erreur.
- **`payload run` termine dès que le module est évalué** : utiliser un `await`
  racine, jamais un `main().catch()`.
- Payload attend une confirmation sur stdin pour toute migration destructrice —
  un script qui semble figé attend souvent une réponse.
- **Trier explicitement** (`sort: "id"`) : sans cela Payload renvoie du plus
  récent au plus ancien et l'ordre du catalogue change à chaque ajout.

## Où en est le projet

**61 tâches sur 86.** Le front public et le back-office sont complets, le site
lit ses données depuis PostgreSQL, et l'ensemble tourne en production.

Fait : `MAQ-01→10`, `FE-01→14`, `DES` (sauf Storybook), `SOC` (sauf monorepo),
`MOD-01→07`, `BE-01,02,03,05,06,07,08,10,11,12`, `INT-03,04,05`, **`INT-01`**.

Reste côté développement : `INT-02` (cache et invalidation), `BE-04` (tables LMS
déclarées), `BE-09` (recherche PostgreSQL), `INT-06` (redirections), `INT-07`
(perf 3G), `INT-10` (Playwright), `INT-11` (recette), `DES-07` (Storybook).

Reste côté client : `CAD-01→08`, `RIS-01→08`, `MOD-08`, `INT-08` (le contenu réel).

## Points ouverts

| Sujet | Où | Attend |
|---|---|---|
| Affichage du nombre de places | `ui/Badge.tsx` → `AFFICHER_DECOMPTE_TOUJOURS` | décision client |
| Deux tarifs ou tarif + supplément | fiche formation | décision client |
| Polices des images de partage | `src/lib/og.tsx` | fichiers `.ttf` |
| Pages légales | collection `pages`, vide | `RIS-06` |
| Témoignages et partenaires | en base, **pas encore affichés** | travail front |
| Routage par langue | `SiteHeader` affiche « FR » sans effet | `SOC-02` |

## Déploiement

- GitHub : `clixatravo/clixa` — CI verte sur chaque push. Les secrets
  `DATABASE_URL` et `PAYLOAD_SECRET` sont nécessaires à l'étape Build, qui
  interroge la base pour pré-générer les pages.
- Vercel : `clixa-institute.vercel.app`, **désindexé** tant que
  `NEXT_PUBLIC_SITE_ENV` ne vaut pas `production`. Le back-office public est
  sur `/admin`.
- Base : **Neon, région Frankfurt**, peuplée par `scripts/semer.ts`.

⚠️ **Une seule base pour le développement et la production.** Modifier le
contenu en local modifie le site public. Avant que l'équipe ne saisisse du vrai
contenu, créer une branche Neon dédiée au développement (10 branches offertes)
et pointer `.env.local` dessus.

⚠️ La chaîne de connexion a circulé en clair dans une conversation. Le mot de
passe devrait être régénéré depuis Neon (Roles → Reset password), puis mis à
jour aux trois endroits : `.env.local`, secrets Vercel, secrets GitHub.

## Dépôt git

Raciné sur `~/Desktop/clixa`, avec `.gitignore` à la racine et un second dans
`platform/`. Seul `platform/.env.example` est suivi ; aucun `.env` réel ne l'est.

Le danger décrit ici auparavant — dépôt raciné sur `~`, un `git add -A`
embarquant `.ssh/` — n'existe plus. Les hooks de pré-commit (`SOC-04`) peuvent
donc être installés.
