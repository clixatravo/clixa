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
npx payload run scripts/verifier-catalogue.ts     # le catalogue se tient
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

`scripts/semer.ts` et `verifier-semis.ts` ont été retirés le 22 août 2026 :
le premier vidait les collections pour les remplir d'exemples, le second
mesurait l'écart entre la base et ces exemples. Depuis que le catalogue réel a
pris la place, l'un détruirait le contenu de la direction et l'autre échouait
sans rien signaler d'utile. `verifier-catalogue.ts` les remplace.

Quatre scripts ont porté cette bascule, le 22 août 2026. Ils sont rejouables et
gardés pour la prochaine :

```bash
npx payload run scripts/importer-catalogue.ts <fichier.json>  # les douze parcours
npx payload run scripts/definir-bareme.ts                     # 423 / 448 / 470 €
npx payload run scripts/retirer-demonstration.ts              # publie, puis retire les exemples
npx payload run scripts/retirer-specialisations-vides.ts      # les catégories sans parcours
```

L'extraction des fiches Word vit hors du dépôt : Word n'est pas une source de
vérité durable, et l'équipe saisit la suite depuis `/admin`.

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

**70 tâches sur 86.** Le front public et le back-office sont complets, le site
lit ses données depuis PostgreSQL, et l'ensemble tourne en production.

**Le catalogue en ligne est le vrai** depuis le 22 août 2026 : douze parcours
transmis par la direction — onze directions d'entreprise et la préparation PMP —
rangés en cinq spécialisations calquées sur ce qu'ils contiennent. Les huit
formations d'exemple ont été retirées ; leurs adresses répondent 404.

Le barème vit dans un document à part (`Tarifs`) : les douze parcours partagent
423 € comptant, 448 € en deux fois, 470 € en trois. Payer en plusieurs fois
coûte plus cher, et l'écart est affiché sur la fiche plutôt que découvert au
paiement. Chaque rythme est un lien vers le formulaire, choix déjà rempli.

**La cohorte de septembre est ouverte** : douze sessions, samedi 19 septembre
pour les parcours exécutifs et dimanche 20 pour la préparation PMP, huit
séances hebdomadaires jusqu'au 7 et 8 novembre. Mode « visio » — les séances
sont live à heure fixe ; « en ligne » afficherait « Accès permanent » et
promettrait au visiteur de suivre à son rythme.

⚠️ La capacité vaut 20, faute de chiffre dans les fiches. C'est elle qui produit
le décompte de places montré au visiteur : premier réglage à revoir avec la
direction. Le rythme des dix parcours autres que DAF et PMP est également une
hypothèse — le catalogue Word ne documente que ces deux-là.

**Le présentiel reste en place, sans contenu pour l'instant.** Les douze
parcours se donnent tous à distance, et le filtre par ville, la page `/campus`
et les trois villes du pied de page ne ramènent donc rien. C'est voulu : la
direction prévoit d'ouvrir des sessions en présentiel. Ne pas les retirer en
croyant nettoyer du code mort.

⚠️ **Un script ne rafraîchit pas le site.** `revalidatePath` exige le contexte
de requête de Next ; sous `payload run`, l'appel échoue et les crochets le
taisent — refuser d'écrire en base parce qu'un cache n'a pas pu être vidé serait
pire. Après un script qui touche du contenu publié, redéployer :

```bash
npx vercel redeploy $(npx vercel ls clixa --scope cl-95af | grep -oE 'https://clixa-[a-z0-9]+-cl-95af\.vercel\.app' | head -1) --scope cl-95af
```

Le 22 août 2026, onze documents dépubliés par script restaient affichés :
l'API répondait bien « aucun », la page servie datait du build précédent.

**Les pages se rafraîchissent seules** depuis `INT-02` : chaque collection
prévient Next de ce qu'elle change. Une session ajoutée depuis `/admin` apparaît
sur la fiche sans déploiement. Vérifié en conditions réelles le 22 août 2026.
L'effet ne s'observe pas en développement, où chaque page est recalculée à
chaque requête.

Fait : `MAQ-01→10`, `FE-01→14`, `DES` (sauf Storybook), `SOC` (sauf monorepo),
`MOD-01→07`, `BE-01,02,03,05,06,07,08,10,11,12,13`, `INT-02` (cache et invalidation), `INT-03,04,05`, **`INT-01`**,
**`INT-08`** (le contenu réel).

**La phase 02 est ouverte.** Un visiteur retient sa place depuis la fiche,
choisit son rythme de paiement et repart avec une référence de dossier. Deux
courriels partent — au participant et à l'équipe. Aucune passerelle de
paiement : les règlements passent par Western Union, Ria et MoneyGram, qui sont
des services de transfert, pas des passerelles. L'équipe rapproche le versement
depuis le back-office, et le décompte de places se recalcule à chaque écriture.

**La recherche du catalogue passe par PostgreSQL** depuis `BE-09`
(`src/lib/recherche.ts`). Elle ne compare plus des chaînes : elle ramène les
mots à leur racine, ce qui répare des recherches qui rendaient zéro alors que
la fiche existait — « financière » ne trouvait pas « Directeur Administratif et
Financier », « auditer » ne trouvait pas « Directeur Audit Interne ».

Trois choses à savoir avant d'y toucher :

- **Les accents partent après, jamais avant.** Le réflexe est de les retirer
  d'abord ; mesuré, cela casse le radicaliseur français (`financiere` → radical
  `financier`, quand `financière` → `financi`). Les deux formes sont donc
  indexées, et interrogées toutes les deux.
- **Le radical seul ne suffit pas** : il ne reconnaît pas un début de mot.
  Sans interrogation par préfixe, « prépa » perdait « Préparation » et
  « partner » perdait « partnering ». C'est-à-dire les abréviations et les mots
  anglais — ce qu'on tape le plus volontiers.
- **Aucune colonne, aucune extension.** Le texte est envoyé à chaque requête
  plutôt que stocké : douze parcours ne justifient pas un index GIN, et une
  colonne imposerait une migration avant chaque déploiement. Le jour où le
  catalogue dépassera le millier d'entrées, il suffira de stocker le vecteur —
  la requête, elle, ne change pas.

Une requête qui échoue retombe sur l'ancienne comparaison de chaînes et le
journalise : la recherche est un raffinement du catalogue, pas le catalogue.

Reste côté développement : `BE-04` (tables LMS déclarées), `INT-06`
(redirections), `INT-07` (perf 3G), `INT-10` (Playwright), `INT-11` (recette),
`DES-07` (Storybook).

Reste côté client : `CAD-01→08`, `RIS-01→08`, `MOD-08`, et les dates des
prochaines cohortes.

## Points ouverts

| Sujet | Où | Attend |
|---|---|---|
| Capacité réelle d'une cohorte | 20 par défaut, inventé | **la direction** |
| Coordonnées du bénéficiaire | global `tarifs`, vides | **la direction** |
| Domaine et clé Resend | aucun courriel ne part sans eux | **la direction** |
| Affichage du nombre de places | `ui/Badge.tsx` → `AFFICHER_DECOMPTE_TOUJOURS` | décision client |
| Polices des images de partage | `src/lib/og.tsx` | fichiers `.ttf` |
| Pages légales | collection `pages`, vide | `RIS-06` |
| Témoignages et partenaires réels | affichés dès qu'ils sont publiés ; les exemples sont dépubliés | la direction |
| Routage par langue | `SiteHeader` affiche « FR » sans effet | `SOC-02` |

## Déploiement

- GitHub : `clixatravo/clixa` — CI verte sur chaque push. Les secrets
  `DATABASE_URL` et `PAYLOAD_SECRET` sont nécessaires à l'étape Build, qui
  interroge la base pour pré-générer les pages.
- Vercel : projet `clixa`, **désindexé** tant que `NEXT_PUBLIC_SITE_ENV` ne
  vaut pas `production`. Le back-office public est sur `/admin`.
  **Root Directory : `platform`** — le dépôt a le site statique à sa racine ;
  sans ce réglage, le build ne trouve pas de `package.json`.
  Trois URL mènent au même site : `clixa-institute.vercel.app` et
  `clixa-zeta.vercel.app` sont des alias stables, `clixa-<hash>-cl-95af…`
  change à chaque build et ne doit pas être partagée.
- Base : **Neon, région Frankfurt**. Le catalogue y a été importé depuis les
  fiches Word de la direction ; l'équipe le tient depuis `/admin`.

Jusqu'au 21 août 2026, le dépôt n'était pas relié à Vercel : chaque mise en
ligne passait par `vercel --prod` à la main, et la production a fini par
accuser trois commits de retard sans que rien ne le signale. Le dépôt est
désormais connecté — un push sur `main` déploie.

Les quatre variables d'environnement existent dans les trois environnements —
Development, Preview et Production. Les aperçus de branche construisent donc
sans réglage supplémentaire.

**Deux branches Neon, depuis le 21 août 2026.** `production` sert le site
public ; `dev` sert le poste de travail et les aperçus de branche. Modifier le
contenu en local ne touche plus au site public.

| Où | Branche Neon | Réglé dans |
|---|---|---|
| Poste de travail | `dev` | `platform/.env.local` |
| Aperçus de branche | `dev` | variable Preview sur Vercel |
| Site public | `production` | variable Production sur Vercel |

`dev` est une copie sur écriture de `production` prise à sa création : les
données y étaient complètes dès la première seconde, sans réimporter quoi que
ce soit. Elle ne se resynchronise pas toute seule — quand `production` aura du
vrai contenu, il faudra recréer `dev` pour la remettre à niveau.

⚠️ Utiliser l'adresse **directe**, pas celle en `-pooler` : Payload interroge
le schéma au démarrage, ce que le pooler gère mal.

### La base passe avant le code

Payload ne pousse le schéma qu'en dehors de la production. Tant que les deux
environnements partageaient une base, une modification faite en local arrivait
seule sur le site public ; ce n'est plus le cas.

Un champ ajouté au modèle veut donc dire : **d'abord la base, ensuite le
push**. Dans l'autre sens le build échoue — il interroge la base pour
pré-générer les pages, et cherche une colonne qui n'existe pas encore. Deux
déploiements ont été perdus ainsi le 22 août 2026.

Pousser le schéma sur la production revient à faire tourner n'importe quel
script en pointant `DATABASE_URL` sur elle : hors production, Payload pousse
le schéma à l'initialisation.

```bash
cd platform && set -a && . ./.env.prod && set +a && npx payload run scripts/<script>.ts
```

`platform/.env.prod` contient la chaîne de production et n'est pas suivi par
git. Avant toute poussée, comparer les deux schémas — une colonne présente en
production et absente en local serait supprimée :

```sql
SELECT table_name||'.'||column_name FROM information_schema.columns
WHERE table_schema='public' ORDER BY 1;
```

⚠️ Payload met **près d'une minute** à démarrer contre Neon. Un `Ctrl+C` pendant
`Pulling schema` n'annule pas ce qui a déjà été écrit : lors de l'import du
catalogue, onze parcours sur douze étaient déjà en base au moment de
l'interruption. Les scripts d'import sont donc écrits pour être rejouables.

Les mots de passe des deux branches ont été régénérés le 21 août 2026, après
que la chaîne de connexion eut circulé en clair. Les anciens ne donnent plus
accès — vérifié.

Chaque branche Neon porte son propre mot de passe : régénérer celui de `dev`
laisse `production` intacte. Une régénération se répercute à la main sur
`.env.local`, les variables Vercel (Development, Preview, Production) et le
secret GitHub `DATABASE_URL`.

⚠️ Régénérer celui de `production` coupe le site jusqu'au redéploiement :
Vercel fige les variables au build, changer la valeur ne suffit pas.

## Dépôt git

Raciné sur `~/Desktop/clixa`, avec `.gitignore` à la racine et un second dans
`platform/`. Seul `platform/.env.example` est suivi ; aucun `.env` réel ne l'est.

Le danger décrit ici auparavant — dépôt raciné sur `~`, un `git add -A`
embarquant `.ssh/` — n'existe plus. Les hooks de pré-commit (`SOC-04`) peuvent
donc être installés.
