/**
 * FE-09 — Contenu éditorial (données factices).
 *
 * Même logique que le catalogue : ce fichier est un miroir du schéma et disparaît
 * en INT-01, quand la collection « Article » de Payload prend le relais (BE-05).
 */

export type CategorieArticle =
  "certifications" | "finance" | "management" | "carriere" | "institut";

export const categories: { slug: CategorieArticle; nom: string }[] = [
  { slug: "certifications", nom: "Certifications" },
  { slug: "finance", nom: "Finance" },
  { slug: "management", nom: "Management" },
  { slug: "carriere", nom: "Carrière" },
  { slug: "institut", nom: "Vie de l'institut" },
];

export type Bloc =
  | { type: "paragraphe"; texte: string }
  | { type: "intertitre"; texte: string }
  | { type: "liste"; items: string[] }
  | { type: "citation"; texte: string; auteur: string };

export interface Article {
  slug: string;
  titre: string;
  chapo: string;
  categorie: CategorieArticle;
  auteur: string;
  publieLe: string; // ISO
  lectureMinutes: number;
  /** Programme mis en avant en fin d'article, le cas échéant. */
  programmeLie?: string;
  contenu: Bloc[];
}

export const articles: Article[] = [
  {
    slug: "pmp-est-elle-encore-rentable",
    titre: "La certification PMP est-elle encore rentable en 2026 ?",
    chapo:
      "Entre l'essor de l'agilité et la multiplication des certifications concurrentes, beaucoup de chefs de projet hésitent. Voici ce que disent réellement les chiffres et le terrain.",
    categorie: "certifications",
    auteur: "Direction pédagogique CLIXA",
    publieLe: "2026-07-28",
    lectureMinutes: 6,
    programmeLie: "preparation-certification-pmp",
    contenu: [
      {
        type: "paragraphe",
        texte:
          "La question revient à chaque session : investir 40 heures et plusieurs centaines d'euros dans une certification créée il y a plus de trente ans a-t-il encore du sens quand les organisations parlent surtout d'agilité ? La réponse tient moins au contenu de l'examen qu'à ce que la certification signale sur un marché du travail donné.",
      },
      { type: "intertitre", texte: "Ce que la PMP signale à un recruteur" },
      {
        type: "paragraphe",
        texte:
          "Sur les marchés d'Afrique de l'Ouest et du Nord, la PMP reste l'un des rares standards reconnus sans discussion par les bailleurs internationaux, les grands groupes et les administrations. Pour un appel d'offres financé par une institution multilatérale, la présence de chefs de projet certifiés est souvent une condition d'éligibilité, pas un argument de vente.",
      },
      {
        type: "paragraphe",
        texte:
          "C'est là que se joue la rentabilité réelle : la certification n'augmente pas mécaniquement un salaire, elle ouvre l'accès à des projets auxquels on ne pouvait pas candidater.",
      },
      { type: "intertitre", texte: "Trois situations où elle change vraiment la donne" },
      {
        type: "liste",
        items: [
          "Vous visez des projets financés par des bailleurs internationaux, où la certification est exigée dans le dossier.",
          "Vous êtes technicien ou ingénieur et vous voulez basculer vers le pilotage : la PMP structure une expérience déjà acquise.",
          "Vous travaillez dans un groupe présent sur plusieurs pays et vous avez besoin d'un vocabulaire commun avec des équipes que vous ne rencontrez jamais.",
        ],
      },
      { type: "intertitre", texte: "Et les situations où elle n'apporte pas grand-chose" },
      {
        type: "paragraphe",
        texte:
          "Si vous pilotez exclusivement des produits numériques dans une structure qui fonctionne en Scrum depuis des années, une certification agile sera plus lisible pour vos interlocuteurs. La PMP couvre désormais l'hybride, mais elle reste lue comme un signal de rigueur processus plutôt que d'adaptabilité.",
      },
      {
        type: "citation",
        texte:
          "La bonne question n'est pas « la PMP est-elle utile ». C'est « à qui je dois prouver quelque chose, et qu'est-ce que cette personne sait lire ».",
        auteur: "Responsable pédagogique, filière Management & Projet",
      },
      {
        type: "paragraphe",
        texte:
          "Avant de vous engager, vérifiez votre éligibilité : le PMI exige un diplôme de niveau bac+3 et 36 mois d'expérience en conduite de projet. C'est le premier filtre, et il élimine plus de candidats que l'examen lui-même.",
      },
    ],
  },
  {
    slug: "ifrs-16-pieges-premiere-application",
    titre: "IFRS 16 : les cinq pièges de la première application",
    chapo:
      "Le passage des contrats de location au bilan reste l'un des chantiers les plus sous-estimés. Retour sur les erreurs que nous voyons le plus souvent en formation.",
    categorie: "finance",
    auteur: "Direction pédagogique CLIXA",
    publieLe: "2026-07-14",
    lectureMinutes: 8,
    programmeLie: "ifrs-comptable-international",
    contenu: [
      {
        type: "paragraphe",
        texte:
          "IFRS 16 a supprimé la distinction entre location simple et location financement côté preneur. Sur le papier, la règle est simple : presque tous les contrats de location remontent au bilan. Dans les faits, la première application révèle des problèmes qui n'ont rien de comptable.",
      },
      { type: "intertitre", texte: "1. Personne ne sait où sont les contrats" },
      {
        type: "paragraphe",
        texte:
          "Le premier obstacle est documentaire. Les baux immobiliers sont chez le juridique, les locations de véhicules aux moyens généraux, les contrats d'équipement dans les filiales. Constituer l'inventaire exhaustif prend systématiquement plus de temps que le traitement comptable lui-même.",
      },
      { type: "intertitre", texte: "2. La durée retenue est traitée trop vite" },
      {
        type: "paragraphe",
        texte:
          "La durée du contrat inclut les options de renouvellement raisonnablement certaines d'être exercées. « Raisonnablement certain » est un jugement, pas une donnée. Deux entités du même groupe aboutissent souvent à des durées différentes pour des baux comparables, ce qui rend la consolidation incohérente.",
      },
      { type: "intertitre", texte: "3. Le taux d'actualisation est choisi par défaut" },
      {
        type: "paragraphe",
        texte:
          "À défaut de taux implicite, on retient le taux d'emprunt marginal. Beaucoup d'équipes appliquent un taux unique groupe, alors que le taux dépend de la devise, de la durée et du profil de l'entité. L'écart sur la dette de loyers peut être significatif.",
      },
      { type: "intertitre", texte: "4. Les impacts sur les ratios sont découverts trop tard" },
      {
        type: "liste",
        items: [
          "L'endettement augmente mécaniquement, ce qui peut heurter des covenants bancaires.",
          "L'EBITDA s'améliore, la charge passant en amortissement et en intérêts.",
          "Les ratios de rentabilité des actifs se dégradent.",
        ],
      },
      {
        type: "paragraphe",
        texte:
          "Ces effets doivent être annoncés aux banques et au conseil avant la clôture, pas expliqués après coup.",
      },
      { type: "intertitre", texte: "5. Le dispositif n'est pas pérennisé" },
      {
        type: "paragraphe",
        texte:
          "La première application est un projet ; le suivi est un processus. Sans procédure de remontée des nouveaux contrats et des avenants, le fichier de suivi diverge de la réalité en deux exercices.",
      },
    ],
  },
  {
    slug: "premier-poste-de-manager",
    titre: "Premier poste de manager : les trois mois qui décident de tout",
    chapo:
      "On promeut le meilleur technicien, puis on le laisse seul. Ce qui se joue au début, et comment ne pas installer les mauvais réflexes.",
    categorie: "management",
    auteur: "Direction pédagogique CLIXA",
    publieLe: "2026-06-30",
    lectureMinutes: 5,
    programmeLie: "leadership-management-equipe",
    contenu: [
      {
        type: "paragraphe",
        texte:
          "La promotion au management est presque toujours une récompense pour une excellence technique. Le problème est que le nouveau métier n'a que peu de rapport avec l'ancien : on cesse d'être évalué sur ce qu'on produit pour l'être sur ce que produisent les autres.",
      },
      { type: "intertitre", texte: "Le réflexe qui coûte le plus cher" },
      {
        type: "paragraphe",
        texte:
          "Reprendre le travail mal fait. C'est rapide, c'est rassurant, et cela installe durablement l'idée que l'équipe n'a pas besoin de progresser puisque le manager rattrapera. Au bout de six mois, le manager est saturé et l'équipe n'a rien appris.",
      },
      { type: "intertitre", texte: "Ce qui fonctionne mieux" },
      {
        type: "liste",
        items: [
          "Clarifier ce qui est attendu avant de déléguer, pas après avoir constaté l'écart.",
          "Accepter un résultat à 80 % quand l'enjeu le permet, et dire explicitement que c'est suffisant.",
          "Donner le retour dans les jours qui suivent, pas à l'entretien annuel.",
          "Distinguer ce qui relève du désaccord de méthode et ce qui relève de l'erreur.",
        ],
      },
      {
        type: "citation",
        texte:
          "Un manager qui fait à la place de son équipe n'est pas un bon manager surchargé. C'est un bon technicien qui n'a pas encore changé de métier.",
        auteur: "Intervenant, parcours Leadership & management",
      },
    ],
  },
  {
    slug: "financer-sa-formation-en-afrique",
    titre: "Financer sa formation : les options réelles en Afrique de l'Ouest et au Maroc",
    chapo:
      "Entre financement employeur, dispositifs publics et paiement échelonné, un panorama concret des solutions qui existent vraiment.",
    categorie: "carriere",
    auteur: "Service admissions CLIXA",
    publieLe: "2026-06-12",
    lectureMinutes: 7,
    contenu: [
      {
        type: "paragraphe",
        texte:
          "Le frein principal à l'inscription n'est presque jamais l'intérêt pour le programme : c'est le financement. Voici les voies que nous voyons aboutir, classées par fréquence réelle.",
      },
      { type: "intertitre", texte: "Le financement par l'employeur" },
      {
        type: "paragraphe",
        texte:
          "C'est de loin la voie la plus fréquente pour les certifications professionnelles. Ce qui fait la différence dans un dossier accepté : un lien explicite entre les compétences visées et un projet identifié de l'entreprise, et un engagement de restitution auprès des collègues.",
      },
      { type: "intertitre", texte: "Les dispositifs publics" },
      {
        type: "paragraphe",
        texte:
          "Au Maroc, les contrats spéciaux de formation permettent une prise en charge partielle pour les entreprises affiliées. Les conditions et les plafonds évoluent : faites vérifier l'éligibilité par votre service RH avant de construire votre plan de financement dessus.",
      },
      { type: "intertitre", texte: "Le paiement échelonné" },
      {
        type: "paragraphe",
        texte:
          "Pour les candidats individuels, l'échelonnement reste la solution la plus simple. Nos programmes sont accessibles en trois versements sans frais, avec un acompte à la réservation qui garantit la place, et le solde réparti avant la fin de la formation.",
      },
      {
        type: "liste",
        items: [
          "Acompte à la réservation : la place est bloquée.",
          "Deux versements suivants avant la fin du parcours.",
          "Carte bancaire, Mobile Money ou virement.",
        ],
      },
      {
        type: "paragraphe",
        texte:
          "Si aucune de ces voies ne correspond à votre situation, parlez-en à un conseiller avant de renoncer : les cas particuliers se règlent presque toujours.",
      },
    ],
  },
  {
    slug: "ouverture-campus-abidjan",
    titre: "CLIXA ouvre un rythme régulier de sessions à Abidjan",
    chapo:
      "À partir de novembre 2026, les formations en présentiel s'installent durablement en Côte d'Ivoire, en complément d'Agadir et de Dakar.",
    categorie: "institut",
    auteur: "CLIXA Institute",
    publieLe: "2026-05-20",
    lectureMinutes: 3,
    contenu: [
      {
        type: "paragraphe",
        texte:
          "Après plusieurs sessions ponctuelles, nous ouvrons un calendrier régulier à Abidjan. L'objectif est simple : permettre de suivre un parcours certifiant sans avoir à financer un déplacement international.",
      },
      { type: "intertitre", texte: "Ce qui est programmé" },
      {
        type: "liste",
        items: [
          "Contrôle de gestion & pilotage de la performance — novembre 2026",
          "Préparation à la certification PMP — janvier 2027",
          "Transformation digitale — février 2027",
        ],
      },
      {
        type: "paragraphe",
        texte:
          "Les sessions se tiennent en format intensif sur cinq jours, avec les mêmes intervenants et le même référentiel que dans nos autres campus. Les places sont limitées à une vingtaine de participants pour préserver le travail en atelier.",
      },
    ],
  },
  {
    slug: "controle-de-gestion-tableau-de-bord",
    titre: "Un tableau de bord que la direction lit vraiment",
    chapo:
      "La plupart des reportings ne sont pas lus. Ce n'est pas un problème d'outil, c'est un problème de conception.",
    categorie: "finance",
    auteur: "Direction pédagogique CLIXA",
    publieLe: "2026-04-08",
    lectureMinutes: 5,
    programmeLie: "controle-de-gestion-performance",
    contenu: [
      {
        type: "paragraphe",
        texte:
          "Un tableau de bord de direction qui compte quarante indicateurs n'est pas un tableau de bord : c'est une base de données mise en page. Le symptôme est toujours le même — on le produit tous les mois, personne ne le commente jamais.",
      },
      { type: "intertitre", texte: "Partir de la décision, pas de la donnée" },
      {
        type: "paragraphe",
        texte:
          "La bonne méthode consiste à lister d'abord les décisions que la direction doit prendre dans le mois, puis à ne retenir que les indicateurs qui changent ces décisions. Un indicateur qui ne déclenche aucune action, quel que soit son niveau, n'a pas sa place.",
      },
      { type: "intertitre", texte: "Trois règles simples" },
      {
        type: "liste",
        items: [
          "Un écart affiché sans explication ni action associée est du bruit.",
          "Une valeur sans point de comparaison — budget, mois précédent, année passée — ne veut rien dire.",
          "Si le commentaire tient en une phrase, il doit être sur la même page que le chiffre.",
        ],
      },
      {
        type: "paragraphe",
        texte:
          "Le test final est simple : demandez à un membre du comité de direction ce qu'il a décidé le mois dernier grâce au tableau de bord. Si la réponse tarde, le document est à refaire.",
      },
    ],
  },
];
