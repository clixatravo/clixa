# CLIXA Institute — plateforme de formation

Plateforme web de CLIXA Institute : catalogue de formations certifiantes, fiches
programme, calendrier des sessions et, à terme, réservation et paiement en ligne.

---

> ### ⚠️ Contenu de démonstration
>
> Ce dépôt est en cours de développement. **Les prix, les dates de sessions, les
> disponibilités et les articles de blog sont des données de démonstration**,
> écrites pour valider la conception de l'interface.
>
> Ils ne représentent pas l'offre commerciale réelle de CLIXA Institute. Pour les
> tarifs et le calendrier réels, écrire à **contact@clixa-institute.org**.
>
> Les préversions déployées sont volontairement interdites aux moteurs de
> recherche (`robots.txt` renvoie `Disallow: /` tant que
> `NEXT_PUBLIC_SITE_ENV` ne vaut pas `production`).

---

## Contenu du dépôt

| Chemin | Description |
|---|---|
| `platform/` | L'application Next.js 15. Le développement se fait ici. |
| `index.html`, `*.html` | Le site vitrine actuel, statique. Référence historique du design system. |
| `CLAUDE.md` | Architecture, conventions et points ouverts. **À lire avant de contribuer.** |

## Démarrer

```bash
cd platform
npm install
npm run dev
```

L'application démarre sur http://localhost:3000 sans aucune variable
d'environnement : le front public n'a besoin d'aucune clé pour fonctionner.
Voir `platform/.env.example` pour les options.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run verify` | Types + lint + formatage |

**Ne jamais lancer `npm run build` pendant que `npm run dev` tourne** : les deux
écrivent dans `.next` et corrompent le cache du serveur de développement.

## Stack

Next.js 15 (App Router, React Server Components) · TypeScript strict ·
Tailwind CSS v4 · ESLint · Prettier

À venir : Payload CMS sur PostgreSQL, puis paiement (Stripe et Mobile Money).

## État

Le front public est complet — catalogue, recherche, filtres, fiches programme,
spécialisations, blog, pages institutionnelles, responsive, accessibilité AA,
données structurées et images de partage générées.

Les données proviennent de `platform/src/data/`. La bascule vers le CMS est
isolée dans `platform/src/lib/` : une règle ESLint interdit aux pages et
composants d'accéder directement aux données, ce qui permettra de brancher
Payload sans modifier un seul composant.

Voir `CLAUDE.md` pour le détail.
