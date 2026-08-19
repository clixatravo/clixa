# CLIXA — plateforme de formation

Deux choses vivent dans ce dépôt :

| Chemin | Quoi |
|---|---|
| `index.html`, `mentions-legales.html`, … | Le site vitrine actuel, statique. **Référence historique du design system.** Ne pas modifier sans raison. |
| `platform/` | La nouvelle plateforme Next.js. C'est ici que se fait le développement. |

## Démarrer

```bash
cd platform && npm run dev
```

**Ne jamais lancer `npm run build` pendant que `npm run dev` tourne** : les deux écrivent dans `.next` et corrompent le cache du serveur de dev (erreurs `Cannot find module './xxx.js'`). Pour builder :

```bash
pkill -f "next dev" && rm -rf .next && npm run build
```

## Vérifier avant de livrer

```bash
cd platform && npm run verify
```

Enchaîne types, lint et formatage. La CI (`.github/workflows/ci.yml`) fait la même chose plus le build, sur chaque push et chaque pull request.

| Commande | Rôle |
|---|---|
| `npm run typecheck` | TypeScript strict |
| `npm run lint` | ESLint, dont l'étanchéité `src/data` → `src/lib` |
| `npm run format` | Prettier, avec tri des classes Tailwind |
| `npm run verify` | Les trois d'un coup |

**Une règle ESLint sert de garde-fou d'architecture** : un import de `@/data/*` depuis `src/app/` ou `src/components/` est une erreur. C'est ce qui garantit que la bascule vers Payload (`INT-01`) ne touchera aucun composant. Si tu as besoin d'un type du domaine, ré-exporte-le depuis `src/lib/`.

## Architecture — quatre couches

Chaque couche ne connaît que celle en dessous.

```
src/app/          PAGES        les dossiers sont les URL
src/components/   COMPOSANTS   morceaux réutilisables
src/lib/          ACCÈS        catalogue.ts, blog.ts, seo.ts
src/data/         DONNÉES      factices aujourd'hui, Payload demain
```

**`src/lib/catalogue.ts` et `src/lib/blog.ts` sont la couture prévue par le plan.** Aucune page ne lit jamais `src/data/` directement. En phase 01 temps 4 (`INT-01`), le corps de ces fonctions passe sur Payload ; les signatures ne changent pas, donc aucun composant n'est touché.

Corollaire : **si tu ajoutes un accès aux données, passe par `src/lib/`.** Un import direct depuis `src/data/` dans un composant casse cette garantie.

## Le contrat d'extensibilité — non négociable

`src/lib/types.ts` porte huit décisions prises en phase 00. Elles existent pour que l'ajout du LMS soit un ajout, pas une réécriture. **Ne pas les défaire sous pression de planning.**

Les trois qui comptent le plus :

1. **Ne jamais fusionner `Programme` / `Session` / `Inscription`.** Un programme est intemporel, une session est une occurrence datée, une inscription lie une personne à une session.
2. **`Inscription` est le pivot.** La V1 y accroche paiement et convocation ; le LMS y accrochera progression, notes et certificat.
3. **Garder l'arbre `Module → Leçon`.** Même si en V1 il n'est qu'affiché comme plan de cours.

Les types `Utilisateur`, `Payeur`, `Inscription`, `Paiement` sont déclarés mais inutilisés en V1 : c'est voulu.

### Décision A — pas de e-learning cette année

Une `Lecon` ne porte que **titre + durée**. Les champs `objectif` et `contenuId` existent dans le schéma et restent vides. Ne pas demander d'objectifs par leçon à l'équipe pédagogique.

## Design system

Les tokens sont dans `src/app/globals.css`, sous `@theme`. Ils sont **extraits de `index.html`, pas réinventés**. Tailwind en dérive les classes : `bg-panel`, `text-gold`, `border-line`.

Trois signatures visuelles à respecter :

- Filets de **1 px** entre les cases (`.hairline-grid`)
- Rayon de **2 px** — jamais d'angles arrondis (`rounded-clixa`)
- Trame de grille à 5 % en fond (`.grain`)

**L'or est la couleur de marque. L'émeraude est sémantique** — places disponibles, confirmation, validation. Ne pas les intervertir.

Typographie : Fraunces (titres), Manrope (texte), IBM Plex Mono (étiquettes capitales). Auto-hébergées par `next/font`, jamais de CDN.

## Conventions

- **Le code et les commentaires sont en français**, comme le produit.
- `typedRoutes` est activé : un `<Link>` vers une route inexistante **casse le build**. C'est voulu — pas de 404 en production. Pour une URL construite dynamiquement, annoter `as Route`.
- Les filtres vivent **dans l'URL**, pas dans un état client : partageable, indexable, et le bouton retour fonctionne.
- Composants serveur par défaut. `"use client"` uniquement quand il faut réagir à l'utilisateur (`PlanDeCours`, `MobileMenu`).
- Toute liste doit avoir son **état vide** traité.

## SEO

- `src/lib/seo.ts` construit les données structurées. `FilAriane` émet son `BreadcrumbList` tout seul — le fil affiché et les données ne peuvent pas diverger.
- Chaque fiche formation expose un `Course` avec une `CourseInstance` par session (dates, prix, disponibilité). **C'est l'écart décisif avec le concurrent**, dont le contenu est enfermé dans des images.
- Les combinaisons de filtres se canonisent vers `/formations` et sont en `Disallow`. Ce sont les pages `/specialisations/[slug]` qui servent de pages d'atterrissage indexables.

## Points ouverts

| Sujet | Où | État |
|---|---|---|
| Affichage du nombre de places | `src/components/ui/Badge.tsx` → `AFFICHER_DECOMPTE_TOUJOURS` | Attend le jalon 1 |
| Polices des images de partage | `src/lib/og.tsx` | Attend `DES-02` (licences) |
| Pages légales | absentes | Attend `RIS-06` — les modèles portent encore des `[à compléter]` |
| Routage par langue | `SiteHeader` affiche « FR » sans effet | Attend `SOC-02` / `BE-06` |

## Ce qui n'est pas encore fait

Le front public est complet. La suite (`BE-01` → `BE-12` pour Payload, `INT-01`, `INT-02`, `INT-06` → `INT-11`) **ne démarre qu'après le jalon 1**, la validation formelle des maquettes — c'est la règle du projet : le design est validé avant toute ligne de backend.

## Attention — dépôt git

Le dépôt git est raciné sur `~` (le dossier personnel), pas sur ce projet, et sans `.gitignore`. Un `git add -A` embarquerait `.ssh/` et des identifiants. À corriger avant tout commit :

```bash
rm -rf ~/.git && cd ~/Desktop/clixa && git init
```

**Deux choses en dépendent :**

- Les **hooks de pré-commit** (`SOC-04`) ne sont pas installés. Husky écrit dans le dossier `.git` de la racine du dépôt — aujourd'hui ce serait `~/.git/hooks`, ce qui poserait des hooks sur ton dossier personnel. Une fois le dépôt raciné ici :

  ```bash
  cd platform && npm i -D husky lint-staged && npx husky init
  ```

- La **CI** (`.github/workflows/ci.yml`) est écrite mais ne s'exécutera qu'une fois le dépôt poussé sur GitHub.
