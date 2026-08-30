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
npx payload run scripts/verifier-session.ts       # la connexion sans mot de passe
npx payload run scripts/verifier-google.ts        # une personne, un compte
npx payload run scripts/verifier-places.ts        # la place tenue puis rendue
npx payload run scripts/verifier-signature.ts     # l'empreinte du contrat
npx payload run scripts/verifier-confirmation.ts  # l'adresse confirmée
npx payload run scripts/verifier-relances.ts      # la relance qui ne part pas
npx payload run scripts/verifier-courriel.ts      # la réponse qui ne rebondit pas
npx payload run scripts/verifier-etapes.ts        # ce que la page réclame, et quand
                                                  # et le contrat vérifié
```

**La production se contrôle en une commande** (`INT-11`). Les épreuves
Playwright regardent le code en développement ; la recette regarde le site en
ligne tel qu'il répond — avec son domaine, ses redirections, son cache et ses
en-têtes. Deux questions différentes : « le code est-il juste » et « le site en
ligne est-il celui qu'on croit ».

```bash
cd platform && npm run recette                    # la production
cd platform && npm run recette http://localhost:3000
```

Elle suit les 31 adresses du plan du site, les sept redirections, ce qu'un
moteur lit (indexabilité, canonique, fourchette de prix), les douze plaquettes,
et neuf gardes — jeton des relances, retour Google forgé, destination interne,
cadence, et les cinq du second temps du tunnel : un justificatif ne se lit pas
sans session d'équipe, la collection ne se liste ni ne s'écrit, un contrat sans
dossier répond 404, une signature sur un dossier inventé n'aboutit pas. Elle
sort en 1 au moindre manque.

⚠️ **Les deux identifiants de reçu doivent répondre pareil.** La recette en
demande un qui existe et un qui n'existe pas : un 404 sur l'un et un 401 sur
l'autre apprendrait à qui essaie quels justificatifs existent.

**Les parcours du site sont éprouvés par Playwright** (`INT-10`). Une série
tient en une minute et remplace ce qu'on vérifiait à la main après chaque
changement :

```bash
cd platform && npm run epreuves        # la série entière
cd platform && npm run epreuves:voir   # la même, avec l'interface
```

- **Elles écrivent en base.** Les inscriptions créées portent une adresse en
  `@epreuve.invalid` — domaine réservé, qui ne peut appartenir à personne — et
  sont retirées en fin de série, avec les comptes participants du même domaine
  qu'ouvre `espace.spec.ts` (`/compte` réclame une session : il n'y a pas
  d'autre façon d'y entrer). `e2e/garde.ts` refuse de démarrer si
  `DATABASE_URL` désigne l'hôte de production ; éprouvé en l'y pointant.
- **Le ménage refait à la main ce que fait le crochet `recompter`** : une
  suppression en SQL ne le déclenche pas, et le décompte de places resterait
  gonflé. Les deux règles doivent rester identiques.
- **Elles courent contre `next dev`**, pas contre un build — les deux écrivent
  dans `.next`. `e2e/chauffe.ts` visite chaque page avant la première épreuve :
  sans cela la compilation tombait dans le temps imparti, et la machine occupée
  à compiler n'arrivait plus à lancer un navigateur. La première série a duré
  une heure et demie et perdu douze épreuves ainsi.
- **Elles tournent en intégration continue** depuis le 27 août 2026, dans une
  tâche à part du build : un parcours cassé et une compilation cassée ne se
  lisent pas de la même manière. Le secret `DATABASE_URL` de GitHub désigne la
  branche `dev` — vérifié le jour où il a été posé. Le rapport n'est conservé
  qu'en cas d'échec.

⚠️ **L'intégration continue ne voit pas le retard de schéma sur la production.**
Elle construit contre `dev`, où le champ vient d'être ajouté ; Vercel construit
contre la production, où il manque. Le 27 août, CI était verte pendant que sept
déploiements échouaient. C'est pourquoi il faut regarder l'état du déploiement,
et pas celui de la CI, après un changement de modèle.

**Le back-office porte la marque de la maison** (`src/app/(payload)/clixa.css`,
`components/admin/`). L'équipe s'y connecte tous les matins ; elle arrivait sur
une page au nom de Payload. Trois choses seulement sont retouchées :

- **L'accent passe à l'or**, et la marque remplace celle de l'outil.
- **Le thème de Payload n'est pas refait.** Son échelle d'« élévation » porte le
  contraste de dizaines de composants qu'on ne peut pas tous éprouver ; la
  renverser pour obtenir un back-office sombre se paierait en textes illisibles
  trouvés un par un. Les deux thèmes de Payload restent offerts, et l'équipe
  choisit.
- **Les boutons passent par les variables de Payload.** Chaque style expose
  `--color`, `--bg-color`, `--btn-border` et leurs variantes de survol : les
  poser laisse la mise en page, l'état désactivé et la mise au point à l'outil.
  Forcer `background` faisait échapper le survol et le désactivé à la règle.
  Le principal est or sur encre, mesuré à 8,14:1 ; le secondaire reste neutre
  et ne prend l'or qu'au survol — deux boutons dorés côte à côte ne diraient
  plus lequel est l'action principale.
- ⚠️ **`--theme-success-*` n'est pas l'accent de la marque.** Chez Payload il
  veut dire « réussi » : bandeaux « enregistré », pastilles d'état, anneau de
  mise au point, zones de dépôt. Le teindre en or disait « attention » là où
  l'interface dit « c'est fait » — et l'échelle compte une dizaine de crans,
  dont deux seulement avaient été repeints : les pastilles restaient bleues à
  côté de bandeaux dorés.

**Le tableau de bord dit ce qui attend** (`components/admin/Veille.tsx`). Celui
de Payload est un sommaire : douze rectangles portant chacun le nom d'une
collection, qui disent où aller mais jamais s'il faut y aller. Le bandeau
au-dessus compte les transferts annoncés à vérifier, les échéances dépassées et
les dossiers sans premier versement — et se tait, en toutes lettres, quand il
n'y a rien.

⚠️ **Un dossier n'y compte qu'une fois.** Ces trois états se chevauchent : un
dossier peut être en retard *et* sans premier versement, annoncé *et* encore
« demandé ». Trois filtres indépendants faisaient additionner quatre choses à
faire pour trois dossiers, et l'une des lignes menait à relancer quelqu'un qui
venait de payer. C'est une partition, par ordre d'urgence — ce qui attend de
nous, puis ce qui est en retard, puis ce qui suit son cours.

⚠️ Un sélecteur inventé ne casse rien et ne fait rien — il ne correspond
simplement à aucun élément. Vérifier qu'une classe existe avant de s'y fier :

```bash
grep -c "btn--style-primary" node_modules/@payloadcms/ui/dist/styles.css
```

Deux scripts servent l'accès au back-office. Ils étaient le seul recours tant
qu'aucun expéditeur n'existait ; depuis le 26 août 2026 l'adaptateur Resend est
configuré et le lien « Mot de passe oublié » de `/admin` devrait aboutir. Ce
chemin-là n'a pas été éprouvé — le vérifier suppose de déclencher une
réinitialisation sur un compte réel.

```bash
npx payload run scripts/reinitialiser-mot-de-passe.ts <email>  # lien de réinit.
npx payload run scripts/supprimer-compte.ts <email>            # supprime un compte
npx payload run scripts/supprimer-dossier.ts <CLX-…> [CLX-…]   # supprime des dossiers
npx payload run scripts/pousser-schema.ts                      # aligne le schéma, n'écrit rien
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

**78 tâches sur 86.** Le front public et le back-office sont complets, le site
lit ses données depuis PostgreSQL, et l'ensemble tourne en production sur
`www.clixa.africa`, ouvert aux moteurs depuis le 26 août 2026.

⚠️ **Ce qui reste n'est pas surtout du code.** Le tunnel d'inscription est
complet jusqu'au moment où il faut dire *où envoyer l'argent* — et cette
donnée-là n'existe pas encore. Voir « Points ouverts » avant d'ouvrir un
chantier technique : le premier de ces points vaut plus que les quatre tâches
de développement restantes.

**Le catalogue en ligne est le vrai** depuis le 22 août 2026 : douze parcours
transmis par la direction — onze directions d'entreprise et la préparation PMP —
rangés en cinq spécialisations calquées sur ce qu'ils contiennent. Les huit
formations d'exemple ont été retirées ; leurs adresses répondent 404.

Le barème vit dans un document à part (`Tarifs`) : les douze parcours partagent
423 € comptant, 448 € en deux fois, 470 € en trois. Payer en plusieurs fois
coûte plus cher, et l'écart est affiché sur la fiche plutôt que découvert au
paiement. Chaque rythme est un lien vers le formulaire, choix déjà rempli.

⚠️ **Le prix annoncé est le plus élevé des trois** (`prixAffiche`), pas le plus
bas. Annoncer 423 € puis demander 470 € à qui règle en trois fois ferait
découvrir l'écart au paiement — exactement ce que le tableau des rythmes existe
pour éviter. Les trois montants restent affichés côte à côte sur la fiche ;
c'est la vignette, la carte et l'image de partage qui portent le maximum.

**La cohorte de septembre est ouverte** : douze sessions, samedi 19 septembre
pour les parcours exécutifs et dimanche 20 pour la préparation PMP, huit
séances hebdomadaires jusqu'au 7 et 8 novembre. Mode « visio » — les séances
sont live à heure fixe ; « en ligne » afficherait « Accès permanent » et
promettrait au visiteur de suivre à son rythme.

La capacité vaut 30 depuis le 26 août 2026, fixée par la direction
(`scripts/definir-capacite.ts`, rejouable). C'est elle qui produit le décompte
de places montré au visiteur.

**Une place est tenue sept jours, puis rendue** (`src/lib/places.ts`, depuis le
28 août 2026). Une inscription la retient aussitôt — assez pour qu'un transfert
international parte et arrive, week-end compris — et la rend si rien n'est
versé. Un versement reçu (`confirmee`, `payee`, `terminee`) la retient sans
limite.

Sans ce délai, une session affichait complet en comptant des gens qui
n'avaient rien versé et ne viendraient jamais ; sans la tenue initiale, deux
personnes pouvaient régler la même dernière place pendant que leurs virements
voyageaient.

⚠️ **Sept jours à partir de quoi — c'est là que tout se joue** (depuis le
30 août 2026). Le compte à rebours partait du dépôt du dossier. Depuis que le
tunnel a deux temps, le participant **ne peut rien verser** avant que l'équipe
lui envoie les coordonnées — ce qui vient après la consultation, la demande de
contrat et la signature. Le délai pouvait donc s'épuiser avant qu'il ait eu le
droit d'agir, et sa place partait pendant qu'il attendait de nos nouvelles.

Le départ est maintenant le dernier moment qui compte :

| État du dossier | La place est tenue |
|---|---|
| un versement reçu | sans limite |
| contrat signé, coordonnées pas encore envoyées | sans limite — la balle est chez nous |
| coordonnées envoyées | sept jours à partir de cet envoi |
| pré-inscription seule | sept jours à partir du dépôt |

⚠️ **Un contrat signé qui attend nos coordonnées tient sa place sans terme.**
Rendre au catalogue la place de quelqu'un qui s'est engagé par écrit, parce que
*nous* n'avons pas envoyé un courriel, serait lui faire payer notre retard. Le
bandeau du tableau de bord compte ces dossiers : c'est là que le rattrapage se
fait, pas en leur reprenant leur place.

⚠️ **La durée exacte reste une décision de la direction.** Sept jours à partir
de l'envoi des coordonnées est ce qui se défend le mieux aujourd'hui ; c'est un
réglage, pas une vérité. La page du dossier se tait quand il n'y a pas de terme,
plutôt que d'afficher une date que le participant n'aurait aucun moyen de tenir.

Trouvé en regardant les dossiers réels : le 30 août 2026, les deux seuls
dossiers de production étaient **signés**, coordonnées non envoyées, et leur
délai courait depuis le dépôt. Aucun n'avait encore expiré — le défaut aurait
mordu sept jours plus tard, sans que rien ne le signale.

⚠️ **Un acompte reçu confirme le dossier**, et c'est ce qui protège la place.
Le statut du dossier et celui de ses échéances vivaient séparément : on pouvait
marquer un acompte « réglé » et laisser le dossier « demandée ». Sans
conséquence tant qu'une inscription retenait sa place indéfiniment ; depuis les
sept jours, cela rendait au catalogue la place de quelqu'un qui avait payé. La
tâche quotidienne ne lit que le statut du dossier — et jusque-là elle avait
raison de s'en contenter. Le crochet fait donc deux passages, dans cet ordre :
un acompte confirme, tout régler solde.

⚠️ **Une trace d'envoi ne s'écrit qu'après l'envoi** (`api/relances`, depuis le
30 août 2026). La route posait `relanceeLe` sur l'échéance **sans savoir si le
courriel était parti** : l'envoi était lancé sans être attendu (`void`), et
`envoyer()` avale ses erreurs. Un quota épuisé — ce qui est arrivé le 29 août —
et l'échéance passait pour relancée : plus rien pendant sept jours. Le
participant en retard n'entendait jamais parler de son retard, et l'équipe
lisait « 1 relance » dans le journal.

- **`void` n'attend pas, et sur une fonction serverless cela peut vouloir dire
  « ne s'exécute jamais »** : le processus est gelé dès que la réponse part.
- **L'échéance reste intacte quand l'envoi échoue**, et le passage du lendemain
  la reprend : la relance est retardée d'un jour, pas perdue.
- **Le bilan de l'équipe porte les envois manqués.** Une tâche qui échoue à
  moitié en silence est pire qu'une tâche qui échoue.
- ⚠️ **`envoyer()` rend maintenant un booléen.** Il reste permissif — refuser
  d'enregistrer une inscription parce qu'un courriel n'est pas parti serait
  pire — mais qui écrit une trace de cet envoi doit pouvoir la conditionner.

⚠️ **Pour simuler une panne d'expédition, remplacer `payload.sendEmail`, pas
`payload.email`.** Sans adaptateur configuré — le cas en développement —
Payload ne délègue pas à l'adaptateur : il journalise « Email attempted without
being configured » et rend la main sans erreur. Le premier jet de
`verifier-relances.ts` passait ainsi au vert en mesurant le chemin nominal,
persuadé d'éprouver la panne. ⚠️ Et Postgres rend `null` pour une colonne vide,
jamais `undefined` : comparer à `undefined` déclarait « pas de relance » quelle
que soit la valeur.

⚠️ **Le temps n'écrit rien.** Une place qui vient d'expirer ne le sait pas :
aucun crochet ne se déclenche parce qu'un délai s'est écoulé. C'est la tâche
quotidienne (`api/relances`, 8 h) qui repasse et recompte — le seul endroit du
système où quelque chose change sans que personne ait agi. Le décompte peut
donc être en retard d'au plus une journée, ce qui est sans conséquence pour des
places réservées à des semaines de distance.

⚠️ **Le terme se lit, il ne se devine pas.** « Place retenue » sans durée
promet plus que le système ne tient. Trois endroits l'annoncent : le formulaire
d'inscription (avant), la page du dossier (après, avec la date), et le courriel
de confirmation — dont l'objet est justement « Place retenue ». Passé le délai,
la page change de ton plutôt que de se taire : elle dit que la place est
repartie et invite à écrire, au lieu d'afficher une date périmée.

⚠️ La règle est écrite trois fois : le crochet `recompter`, la tâche
quotidienne, et le SQL de `e2e/menage.ts` — une suppression directe ne
déclenchant aucun crochet. Les deux premières partagent `lib/places.ts` ; la
troisième doit être changée à la main, en même temps.

`scripts/verifier-places.ts` éprouve la dawra entière : la place est prise, elle
reste prise après vieillissement, la tâche la rend, le décompte revient juste.

⚠️ Le rythme des dix parcours autres que DAF et PMP reste une hypothèse — le
catalogue Word ne documente que ces deux-là.

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

**Le catalogue est lu une fois, pas à chaque affichage** (`src/lib/etiquettes.ts`).
`/formations` se rend à la demande — ses filtres vivent dans l'URL — et lisait
donc la base à chaque visite : trois requêtes pour le catalogue, une quatrième
pour le barème, que chaque carte réclame. Elles sont désormais dans le cache de
données de Next, sous les étiquettes `catalogue` et `tarifs`.

Trois points valent d'être connus :

- **`cache()` de React et `unstable_cache` de Next ne font pas le même travail.**
  Le premier vaut pour une requête — il évite que douze cartes relisent la même
  chose. Le second vaut d'une requête à l'autre. Retirer l'un laisse la moitié
  du travail.
- **Les crochets lèvent l'étiquette avec `{ expire: 0 }`, pas avec le profil
  « max ».** « max » sert le contenu périmé pendant qu'il rafraîchit derrière :
  qui vient d'enregistrer dans /admin verrait encore l'ancien. C'est ce
  qu'`INT-02` existe pour empêcher. (`updateTag` dirait cela plus clairement,
  mais ne s'appelle que depuis une action serveur ; un crochet Payload n'en est
  pas une.)
- **La recherche n'est pas mise en cache, exprès.** Sa clé serait ce que tape le
  visiteur : chaque terme inédit laisserait une entrée, et rien n'empêcherait
  d'en fabriquer autant qu'on veut.

Un plafond d'une heure (`PEREMPTION`) rattrape les écritures faites par script,
qui ne peuvent lever aucune étiquette — même limite que `revalidatePath`.

**Les pages se rafraîchissent seules** depuis `INT-02` : chaque collection
prévient Next de ce qu'elle change. Une session ajoutée depuis `/admin` apparaît
sur la fiche sans déploiement. Vérifié en conditions réelles le 22 août 2026.
L'effet ne s'observe pas en développement, où chaque page est recalculée à
chaque requête.

Fait : `MAQ-01→10`, `FE-01→14`, `DES` (sauf Storybook), `SOC` (sauf monorepo),
`MOD-01→07`, `BE-01,02,03,05,06,07,08,09,10,11,12,13,20`,
`INT-02` (cache et invalidation), `INT-03,04,05,06`, `INT-10` (les épreuves),
`INT-11` (la recette),
**`INT-01`**, **`INT-08`** (le contenu réel).

**La phase 02 est ouverte.** Un visiteur retient sa place depuis la fiche,
choisit son rythme de paiement et repart avec une référence de dossier. Deux
courriels partent — au participant et à l'équipe. Aucune passerelle de
paiement : les règlements passent par Western Union, Ria et MoneyGram, qui sont
des services de transfert, pas des passerelles. L'équipe rapproche le versement
depuis le back-office, et le décompte de places se recalcule à chaque écriture.

**Le participant choisit comment régler, et rien ne se paie sur le site**
(`moyenSouhaite`, depuis le 28 août 2026). Trois choix au formulaire — carte
bancaire, virement, transfert — et l'équipe lui envoie **par courriel** ce qui
correspond : un lien de paiement bancaire, le RIB, ou les coordonnées du
bénéficiaire. Décision de la direction, motivée par la sécurité : aucune
passerelle, aucune donnée bancaire ne traverse le site.

Le choix est demandé à l'inscription parce que l'aller-retour coûtait le plus
de temps — sans lui, l'équipe envoyait des coordonnées de transfert à quelqu'un
qui voulait payer par carte, et l'apprenait à la réponse.

⚠️ **Un lien bancaire dans un courriel ressemble à un hameçonnage**, et le
participant n'a aucun moyen de distinguer le nôtre d'un autre. Le lien ne peut
pas vivre sur le site — c'est la décision, et elle tient. Mais la *date*
d'envoi ne donne rien à personne : `coordonneesEnvoyeesLe`, renseigné par
l'équipe, s'affiche sur la page du dossier, qu'il ouvre avec sa propre
référence. Un message qui ne correspond à aucune date affichée n'est pas de
nous, et les deux courriels le disent.

⚠️ **`moyenSouhaite` n'est pas le `moyen` d'une échéance.** Le second dit par
quoi l'argent est arrivé, renseigné après coup ; le premier dit ce que le
participant a demandé, avant qu'aucun argent n'existe. Les confondre ferait
écraser sa demande par le premier versement.

Le bouton WhatsApp de la page disait « Demander les coordonnées sur WhatsApp » :
il contredisait la phrase au-dessus et invitait à faire circuler un RIB par
messagerie. Il dit « Nous écrire ».

**Le tunnel a deux temps** (depuis le 29 août 2026). Le formulaire retient une
place et n'engage à rien : c'est la **pré-inscription**. Le participant peut
s'arrêter là, poser ses questions au Responsable Orientation, et ne jamais aller
plus loin. Demander son **contrat de formation** est le geste qui change de
nature — et c'est lui qui prévient l'équipe qu'il faut appeler.

Le contrat (`inscription/[reference]/contrat`) est **composé depuis le dossier**,
comme la plaquette : formule, échéancier, dates et moyen choisi y sont déjà. Un
contrat rédigé à la main vieillit dès que le barème change, et se recopie de
travers.

**Le contrat se signe en ligne** (`api/signature`, `lib/signature.ts`, depuis le
29 août 2026). Trois choses : le nom du dossier recopié, la mention « Lu et
approuvé » que le contrat exige, et le **tracé** apposé au doigt sur téléphone
ou à la souris sur ordinateur (`components/SignatureTracee.tsx`).

⚠️ **Le tracé n'ajoute pas de force juridique** — c'est l'empreinte des termes
qui défend la signature. Il apporte autre chose, qui compte tout autant : un
contrat portant une signature se lit comme un contrat, et un document qu'on
n'ose pas montrer ne sert à rien. Son empreinte est gardée elle aussi, pour
qu'il ne puisse pas être remplacé après coup.

⚠️ **`touch-action: none` est indispensable sur la toile.** Sans lui, le doigt
fait défiler la page au lieu de tracer, et le cadre paraît simplement inerte sur
mobile. La toile est aussi dimensionnée en pixels réels et non CSS : sur un
écran à densité double, un trait tracé aux dimensions CSS ressort flou dans le
PDF, où il est agrandi.

⚠️ **La page ne réclame rien qu'on n'ait rendu possible** (`prochaineEtape`,
depuis le 30 août 2026). Dès la signature, elle annonçait « Nous attendons votre
premier transfert de 423 € ». Le participant ne pouvait pas l'effectuer : les
coordonnées lui parviennent après, dans un courriel que l'équipe compose. On lui
réclamait un geste qu'il n'avait aucun moyen de faire, au moment précis où il
venait de s'engager par écrit.

| Moment | Ce que la page dit |
|---|---|
| pré-inscription | « rien ne vous engage encore » |
| contrat demandé | « il reste à le signer » |
| **signé** | « nous relisons — **rien à faire de votre côté** » |
| **vérifié** | « vérifié, de quoi régler vous parvient » |
| coordonnées envoyées | « nous attendons votre premier transfert » |

C'est le même défaut que le compte à rebours des places, trouvé le même jour :
le site réclamait une action avant d'en avoir donné les moyens. Il ne se voit ni
au type ni à la compilation — la phrase est juste, c'est le moment qui ne l'est
pas. `verifier-etapes.ts` éprouve les sept moments ; `prochaineEtape` est pure,
l'épreuve ne touche ni base ni réseau.

**Le contrat se vérifie avant qu'on envoie de quoi payer**
(`components/admin/VerifierContrat.tsx`, `contratVerifieLe`, depuis le 30 août
2026). Signer est le geste du participant ; relire est le nôtre. Entre les deux
il n'avait aucune nouvelle — au moment précis où il venait de s'engager par
écrit. Le bouton mène d'abord au contrat, puis pose la date et lui annonce que
son contrat est accepté.

- **Le courriel part du crochet `afterChange`, pas du bouton.** Une date saisie
  à la main dans le champ doit produire le même effet qu'un clic ; deux chemins
  pour un même fait finissent toujours par diverger.
- ⚠️ **La condition est « vide avant, rempli maintenant ».** Sans elle, chaque
  enregistrement du dossier renverrait l'annonce — une échéance corrigée, une
  note ajoutée, et le participant reçoit deux fois la même nouvelle.
  `verifier-courriel.ts` garde cette porte.
- ⚠️ **Ce message ne porte aucune coordonnée de règlement, et le dit.** Elles
  partent séparément — rien de bancaire ne traverse le site. Il rappelle aussi
  que la date d'envoi s'affichera sur le dossier : un message qui n'y correspond
  pas n'est pas de nous.

⚠️ **Les dates que le participant voit ne vont jamais dans le futur**
(`pasDansLeFutur`, depuis le 30 août 2026). `coordonneesEnvoyeesLe` s'affiche
sur la page de son dossier, et c'est **la seule vérification qu'on lui offre**
contre un faux message réclamant un paiement : comparer deux dates est tout ce
qu'il a.

Une date au lendemain casse cette garantie **dans le mauvais sens** — le
courriel part aujourd'hui, la page annonce demain, et *notre* message ne
correspond à rien. Le participant qui fait exactement ce qu'on lui demande
conclut qu'on l'escroque. Arrivé sur un dossier réel : un jour de trop au
calendrier. Le bouton pose toujours le jour même ; c'est la saisie à la main qui
glisse, et elle est maintenant bornée.

⚠️ **La comparaison porte sur des jours, pas des instants.** Avec
`pickerAppearance: "dayOnly"`, Payload enregistre **midi UTC** : à neuf heures
du matin, une comparaison à la seconde ferait refuser le bouton par lui-même.

⚠️ **Le tracé de la signature se regarde, il ne se lit pas**
(`components/admin/SignatureVue.tsx`). Le champ était une zone de texte : elle
affichait le PNG encodé en base64, une centaine de milliers de caractères.
Ouvrir le dossier depuis le courriel « Contrat signé » donnait un mur de
charabia, et la signature — la seule chose qu'on venait voir — n'était nulle
part. Le composant la rend en image et mène au contrat signé ; le courriel de
l'équipe porte le même lien. ⚠️ Son cadre est sombre parce que le tracé est
dessiné en ivoire : sur le thème clair de Payload, une signature ivoire sur
blanc est invisible, et l'on ne recolore pas un PNG déjà tracé.

**Le bouton « J'ai envoyé les instructions de paiement »**
(`components/admin/PasserAuPaiement.tsx`) pose la date du jour et enregistre.
Le champ existait ; il demandait cinq gestes, et ce qui demande cinq gestes
finit par ne plus être fait. ⚠️ Cette date n'est pas une trace interne : le
participant la voit, et c'est elle qui lui permet de distinguer notre courriel
d'un hameçonnage. Le bouton ne paraît qu'une fois le contrat signé.

⚠️ **C'est une signature électronique *simple*** : recevable, mais contestable.
Une signature qualifiée, qui bénéficie d'une présomption de fiabilité, demande
un tiers de confiance et un abonnement. Pour des montants de quelques centaines
d'euros, c'est proportionné ; pour un engagement plus lourd, il faudrait le
tiers.

⚠️ **Ce qui la défend n'est pas le geste, c'est l'empreinte.** On garde la date,
l'adresse IP, le navigateur, et surtout un SHA-256 des *termes* — pas du PDF,
dont deux rendus diffèrent d'un octet. Sans elle, la première objection serait
« le document a changé depuis », et elle serait imparable. Le participant reçoit
la même empreinte par courriel : elle est datée, dans sa boîte, hors de notre
portée.

`scripts/verifier-signature.ts` éprouve les trois propriétés qui la portent :
les mêmes termes rendent la même empreinte, chaque terme changé seul en rend une
autre, et l'ordre des échéances compte. Une empreinte se casse en silence — elle
continue de se calculer, elle a toujours la bonne longueur — et l'on ne s'en
aperçoit qu'au moment de la produire.

⚠️ **L'ordre des parties de l'empreinte est écrit à la main.** `JSON.stringify`
suivrait l'ordre d'insertion : une refonte qui déplacerait un champ changerait
l'empreinte de tous les contrats déjà signés, et les ferait tous paraître
falsifiés.

⚠️ **Les coordonnées de paiement n'y figurent pas**, et l'article 3 le dit :
elles sont communiquées après signature. Le contrat s'accorde ainsi avec la
décision de la direction.

La juridiction est celle d'**Agadir**, où la société a son siège — tranché par
la direction le 29 août 2026. Le modèle transmis désignait Casablanca, quand les
mentions légales du site renvoyaient déjà aux tribunaux du siège : deux
documents de la même maison ne pouvaient pas se contredire là-dessus.

**Le participant joint son justificatif** (`lib/recus.ts`, collection `Recus`,
`api/recu/[id]`, depuis le 29 août 2026). Une photo du reçu du guichet ou le PDF
de la banque, déposé au moment où il annonce son transfert. Facultatif, exprès :
beaucoup annoncent depuis un téléphone, le reçu encore dans la poche, et exiger
la pièce ferait perdre le numéro — qui est ce qui permet de retrouver l'argent.

⚠️ **Le greffon `@payloadcms/storage-vercel-blob` ne sait écrire qu'en accès
public** — son propre type le dit, et un magasin privé refuse net (« Cannot use
public access on a private store »). Un reçu porte un nom, un montant et parfois
un numéro de compte ; le protéger par une adresse qu'on espère introuvable, ce
n'est pas le protéger. Le SDK `@vercel/blob`, lui, sait faire du privé : les
trois fonctions de `lib/recus.ts` sont tout ce qu'il fallait, et la collection
n'a pas d'`upload`.

⚠️ **Les médias attendent un second magasin, public** (depuis le 30 août 2026).
Le greffon `@payloadcms/storage-vercel-blob` est installé et branché dans
`payload.config.ts`, mais **conditionné à `BLOB_MEDIAS_TOKEN`** — une variable
qui n'existe pas encore. Tant qu'elle manque, rien ne change : le dépôt retombe
sur le disque, ce qui marche en développement et **perd le fichier en
production**.

Il faut un magasin **distinct** de celui des justificatifs : celui-là est
*privé*, et le greffon refuse net (« Cannot use public access on a private
store »). Les deux besoins sont opposés — des images faites pour être vues, des
reçus faits pour ne pas l'être — et un magasin ne porte qu'un seul régime.

```bash
npx vercel blob store add medias-public --scope cl-95af
```

⚠️ **C'est cette commande qui, le 29 août, a déclenché un `vercel env pull` en
sous-main** et écrasé `.env.local`. Sauvegarder le fichier avant, le relire
après. Poser ensuite le jeton du nouveau magasin sous le nom
`BLOB_MEDIAS_TOKEN`.

`verifier-medias.ts` **échoue tant que ce n'est pas fait**, et le dit en toutes
lettres. C'est voulu : un vert qui cache une perte de fichiers vaut moins qu'un
rouge qui nomme ce qui manque. Le script éprouve maintenant ce qu'aucune de ses
vérifications ne touchait — il va **chercher le fichier à l'adresse rendue**,
parce qu'une adresse n'est pas un fichier.

⚠️ **`numeric` ne se lit pas pareil selon la porte.** `places_reservees` est de
type `numeric` : le pilote `pg` le rend en **texte**, quand Payload le rend en
**nombre**. Un script de diagnostic écrit en SQL brut compare donc `"1"` à `1`
et conclut que tout a changé. Vérifié : le code applicatif passe par Payload et
ne connaît pas ce piège — mais les scripts d'inspection, eux, doivent convertir.

⚠️ **Le disque de Vercel ne s'écrit pas.** `staticDir` pointe dans le paquet
déployé, en lecture seule à l'exécution : un dépôt écrit là disparaît sans
erreur. C'est pourquoi `Medias` n'a **jamais reçu un seul fichier en
production** — et que personne ne s'en était aperçu, faute d'avoir essayé.

⚠️ **Un dossier accompagné d'un reçu était indestructible.** La clef étrangère
de `recus.dossier_id` est en « SET NULL » et la colonne est obligatoire :
Postgres refusait de vider le lien, et c'est la suppression entière qui
échouait — ni par script, ni depuis /admin, avec un message parlant de
contrainte et jamais de reçu. Le crochet `beforeDelete` d'`Inscriptions` retire
donc les reçus d'abord, par l'API, pour que le fichier quitte aussi le magasin.

`scripts/verifier-recus.ts` éprouve les six moments, dont le seul qui compte :
on demande au magasin l'adresse publique qu'aurait le fichier, et on la tire
sans jeton. Un **403** est la preuve ; un 200 dirait que le magasin est public.

⚠️ **Ne pas le lancer pendant que `next dev` tourne.** Les deux écrivent sur la
même session — le crochet `recompter` la met à jour à chaque écriture — et
Postgres finit par signaler un interblocage. Ce n'est pas un défaut du code,
c'est deux processus qui se disputent la même ligne.

**Le participant annonce son transfert depuis sa fiche de dossier** (`BE-20`,
`api/transfert`). L'état « Annoncé par le participant » existait au modèle et
rien ne l'écrivait : la page demandait d'envoyer le numéro « par WhatsApp »,
sans qu'aucun numéro ne figure nulle part sur le site. Le numéro arrive
maintenant attaché à sa référence — c'est le rapprochement qui coûtait le plus
de temps.

- **Annoncer n'est pas payer.** L'échéance passe « en vérification » ; la
  marquer réglée demande d'avoir vu l'argent et reste un geste d'équipe. Une
  route publique qui pourrait marquer une échéance réglée offrirait une place à
  qui connaît une référence.
- **Une seule annonce à la fois, dans l'ordre.** On n'annonce que la première
  échéance non réglée, et seulement si elle attend encore. Chercher la première
  « attendue » ne suffit pas : l'échéance 1 passée en vérification, une seconde
  annonce marquait la 2 alors qu'un seul transfert avait été fait.
- La clef reste la référence du dossier, comme pour le consulter. Annoncer
  n'ouvre donc rien de plus que lire.

⚠️ **Une adresse saisie n'est pas une adresse prouvée.** Créer un compte
rattachait tous les dossiers portant la même adresse : il suffisait de connaître
l'adresse de quelqu'un pour voir son nom, son téléphone, son échéancier et la
référence de son dossier — laquelle ouvre l'annonce de transfert. Le
rattachement exige désormais **l'adresse et la référence**, celle que le
participant a déjà reçue.

**`auth.verify` est activé depuis le 27 août 2026.** Un compte ouvert par le
formulaire naît inutilisable : Payload envoie un lien, et rien ne s'ouvre avant
qu'il soit suivi. C'est ce qui arrête un robot — remplir le formulaire ne donne
plus rien, il faut relever une boîte aux lettres — et c'est enfin une preuve
d'adresse à la source.

- ⚠️ **`disableVerificationEmail: true` est obligatoire à la création.** Payload
  envoie le courriel de confirmation dès que `auth.verify` est configuré, **sans
  regarder `_verified`** : ce drapeau est le seul moyen de l'en empêcher. Et
  l'envoi n'est pas rattrapé — s'il échoue, la création du compte échoue avec
  lui. Le 29 août 2026, un quota d'envoi épuisé a suffi à fermer la connexion
  Google : le compte ne naissait pas, et rien ne disait pourquoi. Un service de
  courriel indisponible fermait une porte qui n'a rien à lui demander.
- ⚠️ **Les comptes Google naissent `_verified: true`.** Google atteste déjà que
  la personne contrôle l'adresse ; lui redemander la preuve qu'elle vient de
  fournir bloquerait sa connexion. Les deux comptes qui existaient avant
  l'activation ont été confirmés à la main, pour la même raison — sans quoi ils
  se seraient retrouvés dehors.
- **La double exigence reste** pour le rattachement par formulaire : elle ne
  coûte rien, et une confirmation prouve l'adresse, pas la possession du
  dossier.
- ⚠️ **La connexion échoue de la même façon qu'un mauvais mot de passe**, et
  c'est voulu : distinguer apprendrait à qui essaie quelles adresses existent.
  La page de connexion porte donc une phrase visible de tous — « vous venez de
  créer un accès ? confirmez d'abord » — qui remet le bon visiteur sur la voie
  sans rien dire à personne.

⚠️ **Un script ou `curl` ne peut pas éprouver une session** depuis que `csrf`
est réglé : l'extraction de jeton refuse une requête sans `Origin` **et** sans
`Sec-Fetch-Site`, ce qu'aucun navigateur ne produit mais que tout script fait.
Les scripts de vérification posent donc `Sec-Fetch-Site: same-origin`. Sans
cela, on conclut qu'une session valide n'authentifie pas — j'y ai perdu une
heure, en cherchant le défaut dans la confirmation d'adresse qui venait d'être
activée.

**Les relances sont une route publique fermée par un jeton** (`api/relances`,
`CRON_SECRET`, comparé en temps constant). Elle refusait le service *quand le
secret était absent* — c'est-à-dire qu'un oubli de configuration l'ouvrait à
tout le monde. Elle répond maintenant 503 sans secret et 401 sans jeton valide :
une garde qui s'efface quand on oublie de la régler n'est pas une garde.

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

**Trois choses ajoutées le 26 août 2026**, autour du tunnel qui existait déjà :

- **Chaque parcours a une plaquette PDF**
  (`formations/[slug]/plaquette`, `@react-pdf/renderer`). Elle est *calculée à
  partir du catalogue*, pas déposée en média : un tarif corrigé dans /admin
  change le PDF sans que personne pense à le régénérer. C'est ce qu'un
  prospect fait suivre à qui décide du budget.
- **Un bouton WhatsApp dans la liste des inscriptions**
  (`components/admin/BoutonWhatsapp.tsx`). ⚠️ Il refuse de construire un lien
  quand le numéro n'a pas d'indicatif : `0689324243` est marocain pour qui le
  lit, mais `wa.me` sans indicatif ouvre une conversation avec un inconnu —
  ou avec personne. Un tiret affiché vaut mieux qu'un mauvais numéro composé.
- **Le bandeau du tableau de bord compte les inscriptions de la semaine.**
  Cinquième vignette, à côté des trois choses à faire — celles-là appellent un
  geste, celle-ci dit seulement si le mois se remplit.

**Le site entre en scène** (`components/Apparitions.tsx`). Le premier écran
monte par morceaux — mention, titre, promesse, boutons — échelonnés de 90 ms ;
les sections suivantes montent de 24 px en fondu quand le défilement les
atteint. L'effet vient du site statique, avec deux différences qui comptent :

- ⚠️ **L'état masqué dépend d'une classe posée par le script**, jamais de la
  feuille de style seule. C'est le défaut de l'original : `opacity: 0` écrit en
  dur, et le jour où le script échoue il ne reste rien à lire. Ici, pas de
  script, pas de masquage — la page est simplement entière.
- **Une animation, pas une transition.** Une transition ne démarre que depuis
  une valeur que le navigateur a déjà arrêtée. En navigation interne, huit
  millisecondes séparaient le masquage de la levée : il fondait les deux en un
  seul changement et rien ne bougeait. Une animation part de sa première image,
  quoi qu'il arrive avant. Deux attributs, donc : `data-attente` masque sans
  animer, `data-apparait` anime.
- ⚠️ **Le mouvement réduit est traité dans le même bloc**, pas laissé à la règle
  générale de fin de fichier — mesuré, celle-ci ne l'emportait pas, et les blocs
  les plus retardés restaient transparents le temps de leur délai. Sur une page
  entière, cela s'appelle une page blanche.
- **L'effet se rejoue à chaque page** (`usePathname`), et le masquage se fait
  avant la peinture (`useLayoutEffect`) : sinon la page suivante paraîtrait en
  entier avant de s'effacer pour remonter — un clignotement à chaque lien.
- **Deux régimes.** Le premier écran est l'arrivée : 18 px de course, 620 ms,
  échelonnés de 70 ms — tout est posé à 900 ms. Les sections suivantes
  accompagnent un défilement déjà lancé : 14 px, 460 ms, sans échelon. Leur
  donner la durée du titre d'accueil donnait l'impression d'un site qui traîne.
- **Le déclenchement précède l'entrée dans l'écran** (`rootMargin` de 10 %,
  seuil zéro). Avec un seuil en pourcentage du bloc, une section haute de deux
  écrans n'atteignait jamais 12 % d'elle-même avant d'occuper la moitié du
  champ : elle montait alors qu'on l'avait déjà lue, ce qui trahit une
  animation ajoutée après coup.

`e2e/apparitions.spec.ts` garde la porte : cinq épreuves, dont une sans
JavaScript et une en mouvement réduit, parce qu'une animation ratée ne casse
rien — elle laisse la page vide.

**Les pages du CMS se rendent à la racine** (`[slug]/page.tsx`, `lib/pages.ts`,
`components/BlocRendu.tsx` extrait de la page d'article). Le pied de page liste
celles qui sont publiées : y ajouter une page suffit à la faire apparaître.
`scripts/creer-pages-legales.ts` les a déposées **en brouillon** ;
`completer-pages-legales.ts` les remplit à mesure, et se rejoue sans dommage.

L'identité de la société vient d'une facture officielle, pas d'une déduction :
**CLIXA SARLAU**, RC d'Agadir **67759**, ICE **003917718000017**, IF
**71921918**, siège N° 1525, Bureau n° 5, Hay Essalam, Agadir.

⚠️ La facture porte encore `clixa-institute.org` — c'est l'ancien domaine. Le
site vit sur `clixa.africa`, et c'est celui-là qui est écrit.

Trois mentions manquent encore, et aucune ne s'invente : le **capital social**,
le **directeur de la publication** (nom et qualité), le **récépissé CNDP**.
Publier avant de les avoir mettrait en ligne un document juridique à trous.

**Les redirections vivent dans `next.config.ts`**, pas dans `vercel.json` :
le fichier de la plateforme ne s'applique pas en développement, et une
redirection qu'on ne peut pas éprouver localement se découvre cassée en
production. `e2e/redirections.spec.ts` les suit une par une — une redirection
absente ne casse ni type ni compilation, elle ressemble à un 404 ordinaire.

Deux familles, chacune tirée d'un fait constaté. L'héritage du site statique
(`index.html`, `mentions-legales.html`, `politique-confidentialite.html` sont
encore à la racine du dépôt) part en 308 : ces adresses ne reviendront pas.
Les intitulés du menu qui ne sont pas leur adresse — « Mon espace » pour
`/compte`, « Nous contacter » pour `/contact` — aussi, parce qu'on dicte de
mémoire ce qu'on a lu. Le singulier `/formation` part en 307 : c'est une faute
de frappe, pas une ancienne adresse, et rien ne justifie de l'inscrire chez les
moteurs.

⚠️ **Les deux cibles légales répondent 404 aujourd'hui** — les pages sont en
brouillon. La redirection est écrite d'avance et servira le jour de leur
publication ; l'inverse aurait voulu qu'on y repense ce jour-là.

⚠️ **`/inscription` sans formation mène au catalogue, mais une formation
nommée et inconnue reste un 404.** Le premier cas est quelqu'un qui veut
s'inscrire et n'a pas encore choisi ; le second est une adresse qui désigne
ce qui n'existe pas. Une redirection trop large avalerait les deux.

**Les images de partage portent les polices de la marque** (`src/lib/og.tsx`).
C'est la seule chose que voient les gens qui n'ont pas encore cliqué — un lien
posé dans WhatsApp ou LinkedIn — et elle paraissait dans la police par défaut du
moteur.

⚠️ **Des instances statiques, jamais les fichiers variables.** Satori ne sait
pas lire une police à axes : nourri du Fraunces variable comme du Manrope
variable, il échoue sur une table qu'il croit trouver et l'image revient en 500.
Les instances servies par Google pour un navigateur ancien font 39 Ko chacune,
contre 360 et 165 — dix fois moins, et elles se lisent. Elles sont lues au
serveur et ne partent jamais chez le visiteur.

⚠️ **Le Buffer de `readFile` est détaché avant d'être passé.** C'est une vue sur
un tampon partagé, souvent plus grand que le fichier.

**Le site a été passé au crible de l'accessibilité** le 27 août 2026 — titres,
repères, noms accessibles, navigation au clavier, contrastes. Un seul défaut :
le catalogue passait du `h1` aux douze cartes en `h3`, sans rien entre les
deux. Qui parcourt une page en sautant de titre en titre ne savait pas qu'une
liste commençait. Un `h2` invisible l'annonce désormais — le `h1` dit déjà le
compte, le répéter à l'écran n'apprendrait rien.

⚠️ **Les épreuves du catalogue visaient « h2 ou h3 »**, ce qui marchait tant
qu'aucun `h2` n'existait. Elles visent les cartes (`main h3`), ce qu'elles
voulaient dire depuis le début.

Le reste tenait déjà : un `h1` par page, les quatre repères, le saut au contenu
à la première tabulation, une mise au point visible partout, et aucun contraste
sous le seuil. `e2e/acces.spec.ts` garde ces acquis.

⚠️ Un contraste mesuré à 1:1 sur le bouton doré est un faux positif : le fond
est un dégradé, et une mesure qui ne lit que `background-color` remonte au
panneau. Le rapport réel est de l'ordre de 8:1.

**L'atelier des composants** (`DES-07`, `.storybook/`). Il ne remplace pas les
épreuves : celles-ci suivent des parcours entiers, l'atelier montre une pièce
isolée dans ses états — dont ceux qu'aucune page n'affiche aujourd'hui, comme
une session complète ou une dernière place.

```bash
cd platform && npm run atelier            # sur le port 6006
cd platform && npm run atelier:construire
```

Les histoires vivent à côté de ce qu'elles montrent (`*.stories.tsx`) : une
pièce déplacée emporte sa démonstration.

⚠️ **Il n'est pas branché à l'intégration continue.** Le construire ajoute une
minute à chaque poussée pour vérifier ce qu'aucune épreuve ne vérifie : que
l'atelier compile. Le jour où l'on y comparera des états d'une version à
l'autre, il aura sa place dans la chaîne — pas avant.

Reste côté développement : rien. `BE-04`, `INT-07` et `DES-07` sont traités ;
ce que `INT-07` laisse ouvert est une décision de dessin, notée plus haut.

`INT-07` a été mesuré sur 3G lente (400 kbit/s, 400 ms de latence), pas
seulement en conditions de bureau. Le premier affichage arrive à 4,2 s sur
l'accueil, 2,7 s sur une fiche — au-dessus des 2,5 s qui font une bonne note.

⚠️ **Ce sont les polices, et rien d'autre** : 80 Ko sur 86 transférés. 36 Ko
pour Fraunces, 24 pour Manrope, 2 × 10 pour la chasse fixe. Le HTML pèse moins
de 1 Ko compressé et le JavaScript ne bloque pas le premier rendu.

⚠️ **Retirer une graisse n'allège rien.** Fraunces et Manrope sont des polices
variables : un seul fichier porte tout l'intervalle, et demander trois graisses
ou onze télécharge le même octet. Mesuré avant et après — identique. La liste
déclarée ne dit donc que ce qu'on emploie, elle ne pèse pas.

Le seul retrait qui se mesurerait est une famille de moins : la chasse fixe
coûte 20 Ko pour des étiquettes en petites capitales. C'est une décision de
dessin.

⚠️ Ces étiquettes emploient `font-semibold` et `font-bold` alors que seules les
graisses 400 et 500 sont chargées : le navigateur épaissit lui-même, ce qui se
voit. Trois issues — charger la 600 (+10 Ko), ramener ces classes à 500, ou
l'accepter. Aucune n'est neutre, aucune n'a été tranchée.

Reste côté client : `CAD-01→08`, `RIS-01→08`, `MOD-08`, et les dates des
prochaines cohortes.

## Ce qu'un audit a corrigé

Quatre défauts réels, trouvés en relisant le code contre une liste de contrôle
classique. `e2e/securite.spec.ts` les garde.

⚠️ **La référence de dossier est une clef, pas un numéro d'ordre.** Elle ouvre
la fiche du participant — nom, adresse, téléphone, échéancier — et l'annonce de
transfert. Elle était tirée par `Math.random()` sur cinq caractères en base 36 :
un générateur non cryptographique, dont l'état interne se reconstitue à partir
de quelques sorties, pour soixante millions de combinaisons. Elle vient
maintenant de `randomBytes`, sur huit symboles d'un alphabet de trente-deux
sans I, O, 0 ni 1 — quarante bits, et une référence qui se dicte au téléphone.
Les références déjà émises restent valables.

⚠️ **L'attestation servait du HTML non échappé.** Le nom vient du formulaire
public et était interpolé tel quel dans un document `text/html` : une balise
dans le nom s'exécutait chez qui ouvrait l'attestation, avec l'origine du site
— l'équipe, la plupart du temps, puisque c'est elle qui les consulte.

⚠️ **Les dépôts acceptaient le SVG**, qui est un document XML et accepte
`<script>`. Servi depuis `/medias/`, il s'exécuterait avec les droits du site.
Les trois formats matriciels restent ; un plafond de 5 Mo est vérifié en
crochet, parce que la limite de 4,5 Mo de Vercel n'existe pas en développement
et n'appartient pas au logiciel.

**Les routes publiques ont un frein** (`lib/cadence.ts`) : inscription 40 par
minute et par adresse, compte 30, transfert et attestation 20, rappel 10.

- ⚠️ **Le compte est tenu en mémoire, dans l'instance qui répond.** Vercel en
  démarre plusieurs : un assaillant réparti verra un plafond plus haut. Ce frein
  arrête une boucle, pas une attaque distribuée — qui se traite au réseau.
- ⚠️ **Les plafonds sont larges exprès.** Beaucoup de visiteurs partagent une
  adresse — un bureau, une école, l'essentiel du trafic mobile derrière le NAT
  d'un opérateur. La série d'épreuves, qui n'est qu'un visiteur très pressé, en
  consomme une quinzaine par passage : une limite qu'un usage légitime frôle est
  une limite mal réglée.

⚠️ **Sans `csrf`, la garde de Payload s'efface au lieu de refuser.** Son
extraction de jeton dit : « si la liste est vide **ou** si l'origine y figure,
on accepte le cookie ». Liste vide voulait donc dire *n'importe quelle origine*
— une page tierce pouvait faire une requête créditée et Payload honorait la
session. Le `SameSite: Lax` du cookie l'empêchait côté navigateur, mais une
protection qui ne tient qu'au défaut d'une autre couche est une chance, pas une
garde. `csrf`, `cors` et `serverURL` sont maintenant posés sur
`NEXT_PUBLIC_SITE_URL`. Vérifié : le même cookie passe depuis l'origine du site
et est refusé depuis une autre.

⚠️ **L'indicatif du pays est obligatoire, aux deux portes** (`lib/indicatifs.ts`,
depuis le 29 août 2026). Sans lui, le numéro ne désigne personne hors de son
pays : le bouton WhatsApp du back-office refuse de composer, et l'équipe se
retrouve à deviner. Un dossier était déjà arrivé avec `0689324243` — marocain
pour qui le lit, injoignable pour qui appelle.

On exige la forme, pas l'appartenance à la table : refuser un pays qu'on n'a pas
listé écarterait un inscrit pour une lacune qui est la nôtre. Le pays de la
demande de rappel s'en déduit — deux saisies pour un même fait laissaient écrire
« Maroc » sous un numéro ivoirien.

⚠️ **Le repli ne devine pas.** Un premier essai rendait « Indicatif +346 » pour
un numéro espagnol : les trois premiers chiffres d'un code à deux. La longueur
d'un indicatif ne se déduit pas sans la table ; hors table, la fiche porte « À
préciser ».

**Les champs libres ont des bornes** (`lib/saisie.ts`). Ils n'étaient vérifiés
que sur un point : ne pas être vides. On refuse plutôt que de tronquer — un nom
coupé donnerait un dossier au nom de quelqu'un d'autre. L'adresse est vérifiée
grossièrement, exprès : la seule vérification qui prouve une adresse est d'y
écrire, et toute expression plus fine se met à refuser des adresses valides.

⚠️ **`sslmode=verify-full`, pas `require`.** Le pilote `pg` traite aujourd'hui
`require` comme `verify-full` — le certificat est donc vérifié — mais il
prévient que sa prochaine version majeure adoptera les sémantiques libpq, plus
faibles : le chiffrement resterait, la vérification tomberait, sans qu'une
ligne change chez nous. Écrire `verify-full` ne change rien aujourd'hui et
protège de cette bascule. ⚠️ `psql` cherche alors son autorité dans
`~/.postgresql/`, qui n'existe sur aucune machine : `PGSSLROOTCERT=system` le
renvoie au magasin du système (`e2e/menage.ts` le pose).

⚠️ **Ce durcissement se pose partout où la chaîne est écrite, pas seulement
dans `.env.local`.** Le 30 août 2026, `platform/.env.prod` portait encore
`require` : tout script lancé contre la production émettait l'avertissement du
pilote, et aurait perdu la vérification du certificat à la prochaine version
majeure. Corrigé, et la connexion vérifiée après coup. **Reste à faire la même
chose sur les variables Vercel**, qui sont ce que le site en ligne utilise —
elles n'ont pas été relues, `vercel env pull` ne rendant qu'un substitut pour
une valeur chiffrée.

**Deux colonnes ont reçu un index** — `inscriptions.apprenant_email`, que la
connexion Google interroge à chaque rattachement, et `inscriptions.statut`, que
le recompte des places lit à chaque écriture.

Ce que l'audit a trouvé sain : l'injection (le SQL de la recherche passe par les
paramètres liés de drizzle, et les termes de préfixe sont réduits à `[a-z0-9]`
avant), les accès par collection, les clefs étrangères et leurs règles de
suppression, le chiffrement imposé côté serveur par Neon, les secrets hors du
dépôt, l'absence de trace d'erreur ou de secret renvoyée au client, et
`/api/apercu`, qui demande une session.

## Le courriel

**Les gabarits se regardent, ils ne se relisent pas.** Un client de messagerie
ne rend pas le HTML comme un navigateur, et ce qu'un participant reçoit après
avoir retenu sa place est la première chose qu'il lit de nous.

```bash
cd platform && npx payload run scripts/apercu-courriel.ts   # écrit dans apercus/
```

Ce que ce coup d'œil a trouvé, et qu'aucune épreuve ne pouvait voir :

- ⚠️ **Le numéro d'admissions était faux** — un numéro d'attente, dans chaque
  courriel envoyé. Il vient maintenant de `lib/reseaux.ts`, comme partout
  ailleurs : deux copies finissent toujours par diverger.
- **Six adresses pointaient sur l'apex**, qui redirige. Le canonique est `www`.
- **La référence se coupait en deux dans l'en-tête** — « CLX- » d'un côté, le
  reste de l'autre — depuis qu'elle compte huit symboles. Une référence à
  moitié lisible se recopie de travers.

⚠️ Deux mentions restent à trancher par la direction : « Présence
panafricaine : Agadir · Abidjan · Dakar », et « Institut Panafricain », dont
l'équivalent a été retiré du site faute de pouvoir l'étayer.


**Les notifications internes ne vont pas toutes au même endroit** (depuis le
30 août 2026). Cinq d'entre elles — inscription, contrat demandé, contrat signé,
transfert annoncé, bilan des relances — vont à `EMAIL_EQUIPE`, le groupe Zoho
que relève toute l'équipe. La **demande de rappel** va à l'adresse affichée sur
le site, et elle la tient de `lib/reseaux.ts`.

C'est une décision, pas un oubli : une demande de rappel n'est pas un événement
à constater, c'est **un appel à passer**. Elle appelle une personne, pas une
équipe — et qui écrit à l'adresse publique et qui remplit le formulaire
aboutissent ainsi au même endroit, par construction. L'écrire en toutes lettres
dans `courriel.ts` en ferait une seconde copie ; c'est ce genre de copie qui
avait laissé un faux numéro d'admissions dans chaque courriel envoyé.

⚠️ **Le risque assumé** : si personne ne relève cette adresse un jour donné, la
demande y reste seule. C'est le premier contact de quelqu'un qui n'a pas encore
décidé — le message qui supporte le moins de rester sans réponse. Si cela se
produit, la remettre sur `EMAIL_EQUIPE` est une ligne.

⚠️ **Un envoi réussi laisse une trace, lui aussi** (depuis le 30 août 2026).
Seul l'échec en laissait une. Le jour où quelqu'un dit « je n'ai rien reçu »,
les deux seules réponses qui comptent — *parti et perdu en route* (boîte pleine,
filtre anti-spam, adresse mal saisie) ou *jamais tenté*, qui serait un défaut
chez nous — étaient **indiscernables**. On cherchait un bogue là où il n'y avait
peut-être qu'un dossier « indésirables ».

```bash
npx vercel logs <déploiement> --scope cl-95af | grep "\[courriel\]"
```

Le journal porte le destinataire, le sujet, et **l'identifiant rendu par
Resend** — le fil qui mène à son tableau de bord, où l'on voit si le serveur
d'en face a accepté, refusé ou mis en attente. ⚠️ Jamais le corps : ces messages
portent des montants, des références de dossier et des liens de règlement, et un
journal se consulte à plusieurs.

⚠️ **Le sous-domaine d'envoi ne sait pas recevoir, et c'est voulu** —
`envoi.clixa.africa` n'a ni MX ni A. Sans `replyTo`, la réponse du participant
partait donc vers `contact@envoi.clixa.africa` et **rebondissait** : elle lui
revenait, et de notre côté rien n'arrivait. Un silence des deux bords, sur le
geste le plus naturel devant un courriel — et que rien ne signale.

Tous les envois portent désormais `replyTo` — `EMAIL_REPONSE`, par défaut
l'adresse de `lib/reseaux.ts`, sur le domaine dont les MX pointent vers Zoho.
`verifier-courriel.ts` ne se contente pas de vérifier que la variable est
remplie : il **interroge les MX du domaine de réponse**. Une adresse sur un
domaine muet a l'air juste et reste indélivrable — c'est exactement le défaut
d'origine.

Deux services, deux rôles, et il faut savoir lequel on touche :

| | Sert à | Domaine | Réglé chez |
|---|---|---|---|
| **Zoho Mail** | le courrier que des humains lisent et écrivent | `clixa.africa` (MX) | Namecheap, « Custom MX » |
| **Resend** | ce que le site envoie tout seul | `envoi.clixa.africa` | Namecheap, sous-domaine |

**L'expédition automatique vit sur un sous-domaine, exprès.** Une inscription
qui part en masse, un dossier signalé comme indésirable, et c'est la réputation
de `envoi.clixa.africa` qui tombe — pas celle de `clixa.africa`, avec laquelle
la direction écrit à ses clients. Les deux réputations sont séparées à la
source ; les rassembler demanderait de tout refaire.

⚠️ **Un domaine ne porte qu'un seul enregistrement SPF.** En ajouter un second
n'additionne pas les expéditeurs autorisés : la vérification devient
`permerror` et *les deux* services cessent de passer. C'est la raison d'être du
sous-domaine — `clixa.africa` garde le SPF de Zoho, `envoi.clixa.africa` a le
sien. Le jour où il faudra qu'un même domaine serve les deux, on fusionne les
`include:` dans une seule ligne, jamais deux lignes.

⚠️ **Ne jamais poser `RESEND_API_KEY` dans `platform/.env.local`.** Elle y est
arrivée le 29 août 2026 par un `vercel env pull` déclenché en sous-main par
`vercel blob create-store` — et, dès lors, **chaque série d'épreuves a envoyé de
vrais courriels** à des adresses en `@epreuve.invalid`. Elles rebondissent,
consomment le quota et abîment la réputation d'envoi. Le quota journalier a fini
par tomber, et avec lui la création de comptes : `auth.verify` lève quand
l'envoi échoue, et la route ne peut que répondre « impossible ».

⚠️ **Aucune porte d'entrée ne dépend plus de l'expéditeur.** Payload envoie le
lien de confirmation dès que `auth.verify` est configuré, **sans regarder
`_verified`**, et cet envoi n'est pas rattrapé : s'il échoue, la création du
compte échoue avec lui. Un quota épuisé fermait donc l'inscription *et* la
connexion Google, sans que rien ne le dise.

Les deux routes créent maintenant avec `disableVerificationEmail: true`, puis
envoient elles-mêmes par `envoyer()`, qui attrape. La page dit alors la vérité —
« votre compte existe, mais nous n'avons pas pu vous envoyer le lien » — et
`api/confirmation` permet de le redemander.

⚠️ **Sans ce renvoi, un envoi manqué enferme dehors** : l'adresse est prise,
donc on ne peut pas recommencer, et le compte ne s'ouvre pas. La route répond la
même chose que l'adresse existe, soit déjà confirmée, ou n'existe pas — elle n'a
rien à apprendre à qui essaie des adresses — et ne régénère pas le jeton, sans
quoi elle invaliderait un premier message encore en route.

**Sans `RESEND_API_KEY`, l'adaptateur n'est pas branché du tout**
(`payload.config.ts`) et Payload écrit les messages dans la console. C'est
voulu à deux titres : le tunnel d'inscription tourne en développement sans
qu'aucun message ne parte pour de vrai, et une clé absente en production
n'empêche pas le site de démarrer. Trois variables vont ensemble —
`RESEND_API_KEY`, `EMAIL_EXPEDITEUR` (qui doit appartenir au domaine vérifié)
et `EMAIL_EQUIPE` (qui reçoit la copie interne).

Le lien « Mot de passe oublié » de `/admin` passe par ce même adaptateur.

## La connexion Google

Un participant revient sur son dossier trois fois dans l'année. Il a oublié le
mot de passe qu'il s'était inventé, et l'espace participant n'offrait aucun lien
pour le retrouver : l'équipe finissait par rechercher la référence à la main.
Un compte Google, il l'a déjà.

Deux variables l'activent — `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`. Sans
elles **aucun bouton ne s'affiche** et les deux routes redirigent vers la
connexion ordinaire avec un message : un bouton qui mène à une erreur vaut moins
que pas de bouton.

L'adresse de retour déclarée chez Google doit être exacte au caractère près :

```
https://www.clixa.africa/api/auth/google/retour
http://localhost:3000/api/auth/google/retour
```

- **C'est `sub` qui identifie le compte, pas l'adresse.** Une adresse change, se
  cède, se récupère après abandon ; l'identifiant Google ne se réattribue
  jamais. L'adresse ne sert qu'une fois : reconnaître un compte ouvert plus tôt
  au mot de passe et le rejoindre, plutôt que d'en créer un second. Deux comptes
  pour une personne, c'est un dossier visible depuis l'un et invisible depuis
  l'autre.
- ⚠️ **`email_verified` est vérifié, et un faux fait refuser la connexion.** Un
  compte Workspace mal configuré peut porter une adresse non confirmée ; lui
  accorder ce que la référence de dossier protège reviendrait à rouvrir le trou
  qu'on venait de fermer.
- **Le rattachement est ici plus large qu'ailleurs, et c'est justifié.** Le
  formulaire exige l'adresse *et* la référence, parce qu'une adresse saisie ne
  prouve rien. Google atteste que la personne contrôle l'adresse : c'est
  exactement la preuve qui manquait, et l'adresse seule suffit alors.
- **La signature du jeton n'est pas vérifiée**, exprès. Il arrive de Google
  directement, sur un canal TLS que nous ouvrons ; Google documente ce cas. La
  vérification par clé publique sert à qui reçoit le jeton d'un tiers.
- **L'état (`state`) n'est pas décoratif.** Sans lui, un tiers fabrique une
  adresse de retour portant *son* code et fait atterrir le visiteur dans le
  compte de l'attaquant, où il déposera ensuite ses informations.

⚠️ **La dernière étape est une page, pas une redirection** (`pageDeContinuation`
dans `lib/session.ts`, depuis le 30 août 2026). Un cookie `SameSite=Lax` posé au
retour d'un site tiers **ne repart pas** sur le saut de redirection qui suit :
le navigateur juge la chaîne entière de la navigation, et celle-ci a commencé
chez Google. La session existait bien dans le navigateur — elle n'était
simplement pas présentée. `/compte` se rendait donc déconnecté, et il fallait
recharger pour voir son compte.

La route de retour rend donc une vraie page en 200 qui porte le cookie ; c'est
elle qui mène à destination, et ce saut-là part de notre site.

- **Reproduit avant d'être corrigé, et c'est ce qui a tout changé.** Un premier
  essai concluait « rien à signaler » : il partait de notre propre origine,
  quand le retour de Google part d'ailleurs. C'est le seul ingrédient qui
  compte. Refait depuis une autre origine, le défaut est apparu du premier coup.
- ⚠️ **`SameSite=None` réglerait cela en une ligne, et il ne faut pas.** Le
  cookie de session partirait alors sur *toutes* les requêtes tierces. `Lax` est
  ce qui protège aujourd'hui les routes de formulaire — inscription, transfert,
  signature. On ne défait pas une garde pour rattraper une redirection.
- **La page marche sans JavaScript** (balise `refresh`), le script la double
  pour que la transition ne se voie pas, et un lien reste si les deux échouent.
- ⚠️ **Aucune épreuve ne voyait ce défaut, et aucune ne le verrait revenir** :
  les parcours Playwright partent tous de notre site, donc du bon côté de la
  règle. Six épreuves de `verifier-session.ts` gardent la porte — la route
  répond 200 et jamais une redirection, elle mène à destination sans
  JavaScript, et une destination piégée est échappée.
- **Le drapeau `Secure` du cookie n'était pas la cause.** Il a été posé au
  passage (`Apprenants.ts`, conditionné à la production : en développement il
  fermerait `http://localhost`), et c'est un vrai défaut — mais le défaut
  reproduit tourne en `http://` et échoue quand même.

⚠️ **`lib/session.ts` refait à la main ce que fait `payload.login()`.** Celui-ci
exige un mot de passe — c'est tout son objet — et quand Google a prouvé
l'identité il n'y en a pas. On écrit donc la session, on signe le jeton, on pose
le cookie, avec `getFieldsToSign`, `jwtSign` et `generatePayloadCookie`. Ces
fonctions sont exportées mais rarement appelées de l'extérieur : une montée de
version qui changerait la forme du jeton casserait la connexion **sans casser
une seule compilation**. D'où `scripts/verifier-session.ts`, qui va jusqu'à
demander à `payload.auth()` si le cookie authentifie vraiment.

La session en base n'est pas décorative non plus : `useSessions` est actif sur
`apprenants` (table `apprenants_sessions`), et un jeton dont le `sid` ne
correspond à aucune ligne est rejeté. Signer sans écrire donnerait un cookie
accepté par le navigateur et refusé à chaque requête.

**La règle « une personne, un compte » tient à deux choses**, pas une seule :
la route cherche par `sub` puis par adresse avant de créer, et la base porte un
index unique sur `google_id` comme sur `email`. `verifier-google.ts` éprouve les
deux, y compris qu'un compte lié à Google garde son mot de passe d'origine —
lier ne doit fermer aucune porte. Le cas ne s'est pas encore présenté en
production : personne n'avait de compte avant l'arrivée de Google.

⚠️ **`vercel env pull` n'écrit pas les valeurs chiffrées**, il met un
substitut de onze caractères. Les lire pour vérifier une clé mène à conclure
que toutes les clés du projet sont fausses — y compris celles qui font tourner
le site. La seule vérification qui vaille est fonctionnelle : redéployer, puis
regarder si le service accepte.

## Points ouverts

| Sujet | Où | Attend |
|---|---|---|
| Pages légales | brouillon, 3 mentions manquantes | **la direction** |
| Témoignages et partenaires réels | 0 publié sur 6 et 5 ; les exemples sont dépubliés | la direction |
| Affichage du nombre de places | `ui/Badge.tsx` → `AFFICHER_DECOMPTE_TOUJOURS` | décision client |
| Routage par langue | `SiteHeader` affiche « FR » sans effet | `SOC-02` |

⚠️ **Les coordonnées de règlement ne paraissent jamais sur le site**, et ce
n'est plus un point ouvert : c'est la décision de la direction, prise le 29 août
2026. RIB, lien de paiement bancaire et coordonnées de transfert partent **par
courriel**, après la demande du participant — qui a choisi son moyen à
l'inscription.

Les champs `beneficiaire*` du global `tarifs` sont donc masqués dans /admin, et
la page du dossier ne sait plus les afficher. Elle les affichait dès qu'ils
étaient renseignés, et elle s'ouvre avec la seule référence : il aurait suffi de
remplir ces cases pour publier un RIB sur une adresse qui circule par WhatsApp.
Les colonnes restent en base — les retirer demanderait une migration, et elles
ne coûtent rien.

⚠️ Un article publié — « CLIXA ouvre un rythme régulier de sessions à Abidjan »,
daté de novembre 2026 — annonce du présentiel dans trois villes où aucune
session n'est ouverte. Signalé à la direction le 26 août 2026, maintenu par
décision explicite. C'est la quatrième fois que ces villes reviennent sur le
site sans qu'une session s'y donne ; les épreuves ne savent pas attraper cela.

## Déploiement

- GitHub : `clixatravo/clixa` — CI verte sur chaque push. Les secrets
  `DATABASE_URL` et `PAYLOAD_SECRET` sont nécessaires à l'étape Build, qui
  interroge la base pour pré-générer les pages.
- Vercel : projet `clixa`. Le back-office public est sur `/admin`.
  **Root Directory : `platform`** — le dépôt a le site statique à sa racine ;
  sans ce réglage, le build ne trouve pas de `package.json`.
- **Le site est ouvert aux moteurs** depuis le 26 août 2026 :
  `NEXT_PUBLIC_SITE_ENV` vaut `production`, `robots.txt` autorise, et les pages
  portent `index, follow`. Le remettre à autre chose referme tout — c'est le
  seul interrupteur.
- **`www.clixa.africa` fait foi.** L'apex y redirige (308), la balise canonique
  et le plan du site l'annoncent. Les deux doivent rester d'accord : la balise
  canonique désignait l'apex pendant que l'apex redirigeait vers `www`, et
  Google se voyait renvoyé d'une adresse à l'autre.
  `clixa-institute.vercel.app` et `clixa-zeta.vercel.app` restent des alias ;
  `clixa-<hash>-cl-95af…` change à chaque build et ne doit pas être partagée.
- **Les fonctions tournent à Francfort** (`regions` dans `platform/vercel.json`),
  parce que la base y est. Par défaut Vercel les place à Washington : chaque
  requête SQL traversait alors l'Atlantique deux fois, et `/formations` — qui
  lit le catalogue à chaque affichage, les filtres vivant dans l'URL — répondait
  en 985 ms au lieu de 364, avec des pointes à 3,6 s. Les pages statiques, elles,
  n'y gagnent rien : elles ne parlent pas à la base. **Déplacer la base sans
  déplacer ce réglage annulerait le gain.**
- Base : **Neon, région Frankfurt**. Le catalogue y a été importé depuis les
  fiches Word de la direction ; l'équipe le tient depuis `/admin`.

Jusqu'au 21 août 2026, le dépôt n'était pas relié à Vercel : chaque mise en
ligne passait par `vercel --prod` à la main, et la production a fini par
accuser trois commits de retard sans que rien ne le signale. Le dépôt est
désormais connecté — un push sur `main` déploie.

Les variables existent dans les trois environnements — Development, Preview et
Production — de sorte qu'un aperçu de branche construise sans réglage
supplémentaire.

| Variable | Sans elle |
|---|---|
| `DATABASE_URL` | rien ne démarre |
| `PAYLOAD_SECRET` | rien ne démarre |
| `NEXT_PUBLIC_SITE_URL` | liens absolus et balise canonique faux |
| `NEXT_PUBLIC_SITE_ENV` | le site se referme aux moteurs |
| `RESEND_API_KEY` | les courriels vont dans la console |
| `EMAIL_EXPEDITEUR` · `EMAIL_EQUIPE` | expéditeur et copie interne manquants |
| `CRON_SECRET` | `/api/relances` répond 503 |
| `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` | aucun bouton Google n'est offert |

⚠️ **`NEXT_PUBLIC_*` ne peut pas être « sensible » en Preview ni en Production.**
Un `vercel env rm` qui réussit suivi d'un `add` qui échoue sur
`invalid_visibility` laisse la variable *absente* — c'est ainsi que
`NEXT_PUBLIC_SITE_URL` a disparu un moment. Poser `--no-sensitive --force`.

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

⚠️ **La réserve de connexions a des délais, et ils ne sont pas décoratifs.**
Neon suspend le calcul après quelques minutes sans requête ; la socket reste
dans la réserve, le serveur ne répond plus, et le pilote attend — sans limite,
faute d'en avoir une. Mesuré : une page a mis onze minutes et quarante-huit
secondes à ne pas se charger, et une série d'épreuves est passée de deux
minutes à une heure avec sept échecs. `idleTimeoutMillis` ferme la socket avant
que Neon ne la coupe, `connectionTimeoutMillis` renonce plutôt que d'attendre.
En production, la durée maximale d'une fonction masquait le problème sans le
régler.

⚠️ **Pas de `statement_timeout`** : Payload interroge le schéma au démarrage,
ce qui prend près d'une minute contre Neon. Une limite par requête tuerait
chaque script au lancement.

⚠️ Utiliser l'adresse **directe**, pas celle en `-pooler` : Payload interroge
le schéma au démarrage, ce que le pooler gère mal.

### La base passe avant le code

⚠️ **`push: false` est posé sur l'adaptateur depuis le 29 août 2026.** Payload
ne pousse donc plus le schéma nulle part, pas même en développement : un champ
ajouté au modèle n'existe dans aucune base tant que personne ne l'y met. Le
build de production interroge la base pour pré-générer les pages, et
**échouera** en cherchant la colonne manquante — sans que le site tombe, sans
que la CI le voie.

Pour aligner une base, `PAYLOAD_PUSH=1` le temps d'une commande — la variable
a remplacé le va-et-vient qu'on faisait dans `payload.config.ts` (`push: true`,
pousser, remettre `false`). ⚠️ Un interrupteur qu'on rouvre à chaque fois finit
par rester ouvert ; celui-ci ne vaut que pour la commande qui le porte.

```bash
cd platform && PAYLOAD_PUSH=1 npx payload run scripts/pousser-schema.ts   # dev
cd platform && set -a && . ./.env.prod && set +a && PAYLOAD_PUSH=1 \
  npx payload run scripts/pousser-schema.ts                              # production
```

Sans la variable, le script ne pousse rien : il prouve seulement que la base
répond. Comparer les deux schémas après coup vaut mieux que d'y croire —
`information_schema.columns` des deux côtés, et l'écart doit être nul dans les
deux sens.

Payload ne poussait le schéma qu'en dehors de la production. Tant que les deux
environnements partageaient une base, une modification faite en local arrivait
seule sur le site public ; ce n'est plus le cas.

Un champ ajouté au modèle veut donc dire : **d'abord la base, ensuite le
push**. Dans l'autre sens le build échoue — il interroge la base pour
pré-générer les pages, et cherche une colonne qui n'existe pas encore. Deux
déploiements ont été perdus ainsi le 22 août 2026, sept autres le 27.

⚠️ **La panne est silencieuse.** Un déploiement qui échoue ne remplace pas
celui qui sert : le site reste debout, répond 200 partout, et la recette elle
aussi passe — elle interroge le dernier build valide. Rien ne signale que les
poussées ne sortent plus. Le 27 août, deux heures de travail sont restées à
quai avant qu'on s'en aperçoive, et l'indice n'est venu ni du site ni des
épreuves mais d'un fichier de `public/` qui répondait 404.

La recette pose désormais la question à la place du lecteur : `/api/version`
dit quel commit la production sert, et elle le compare à celui du dépôt. Un
décalage n'est pas toujours une panne — on peut avoir poussé il y a trente
secondes — d'où un avertissement et non un échec. Il dit où regarder.

```bash
cd platform && npm run recette          # la première ligne répond
npx vercel ls clixa --scope cl-95af | head -6
```

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
laisse `production` intacte. Celui de `dev` a été régénéré le 27 août 2026,
après qu'il eut paru dans une sortie de terminal.

⚠️ **Une rotation se propage à quatre endroits**, et le quatrième s'oublie :
`platform/.env.local`, les variables Vercel *Development* et *Preview*, et le
secret GitHub `DATABASE_URL` — que l'intégration continue lit à chaque build.
Un commit vide suffit à l'éprouver ; sans lui, une rotation qui casse la
compilation ne se découvre qu'au prochain push, trop tard pour en connaître la
cause.

⚠️ **Ne jamais faire transiter le nouveau mot de passe par une capture d'écran
ni par un message.** Le télécharger depuis Neon, le laisser dans un fichier, et
ne désigner que le fichier : un script le recopie sans que sa valeur paraisse
nulle part. Une régénération se répercute à la main sur
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
