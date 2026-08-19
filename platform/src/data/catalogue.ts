/**
 * FE-01 — Jeu de données factices, typé sur le modèle de domaine.
 *
 * Ce fichier est volontairement un miroir exact du schéma (src/lib/types.ts).
 * En phase 01 temps 4 (INT-01), il est remplacé par des requêtes Payload :
 * les composants ne changent pas, seule la source des données change.
 */

import type { Programme, Session, Specialisation } from "@/lib/types";

export const specialisations: Specialisation[] = [
  {
    slug: "finance-comptabilite",
    nom: "Finance & Comptabilité",
    accroche: "Piloter la performance financière d'une organisation.",
    description:
      "Des certifications internationales et des parcours métier pour piloter la performance financière d'une organisation, en normes locales comme en normes IFRS.",
    debouches: [
      {
        titre: "Contrôleur de gestion",
        description: "Pilotage budgétaire, analyse des écarts, reporting de direction.",
      },
      {
        titre: "Consolideur groupe",
        description: "Comptes consolidés en normes IFRS, liasses et retraitements.",
      },
      {
        titre: "Directeur financier",
        description: "Stratégie financière, relation bancaire, pilotage de la trésorerie.",
      },
      {
        titre: "Auditeur interne",
        description: "Cartographie des risques, missions d'audit, plans de remédiation.",
      },
    ],
  },
  {
    slug: "management-projet",
    nom: "Management & Projet",
    accroche: "Conduire des projets et des équipes.",
    description:
      "Certifications et parcours exécutifs pour cadrer, piloter et livrer des projets complexes, et faire grandir les équipes qui les portent.",
    debouches: [
      {
        titre: "Chef de projet certifié",
        description: "Cadrage, échéancier, budget et risques sur des projets structurants.",
      },
      {
        titre: "Responsable PMO",
        description: "Standardisation des méthodes et pilotage de portefeuille.",
      },
      {
        titre: "Manager d'équipe",
        description: "Animation, délégation, entretiens et développement des collaborateurs.",
      },
      {
        titre: "Consultant en organisation",
        description: "Diagnostic, conduite du changement et refonte des processus.",
      },
    ],
  },
  {
    slug: "digital-data",
    nom: "Digital & Data",
    accroche: "Décider avec la donnée.",
    description:
      "Des parcours pour cadrer une transformation digitale et exploiter la donnée dans la décision, sans devenir ingénieur.",
    debouches: [
      {
        titre: "Chief Digital Officer",
        description: "Feuille de route digitale et pilotage de la transformation.",
      },
      {
        titre: "Responsable data",
        description: "Gouvernance, qualité et valorisation des données de l'entreprise.",
      },
      {
        titre: "Chef de projet SI",
        description: "Cadrage fonctionnel et déploiement d'outils métier.",
      },
      {
        titre: "Analyste décisionnel",
        description: "Tableaux de bord, indicateurs et aide à la décision.",
      },
    ],
  },
  {
    slug: "sur-mesure",
    nom: "Sur mesure",
    accroche: "Une académie interne conçue avec vos équipes.",
    description:
      "Des dispositifs bâtis à partir de vos référentiels métier, de vos cas réels et de vos objectifs de montée en compétences.",
    debouches: [
      {
        titre: "Académie interne",
        description: "Un parcours propre à votre organisation, animé sur vos cas.",
      },
      {
        titre: "Parcours d'intégration",
        description: "Montée en compétence accélérée des nouveaux arrivants.",
      },
      {
        titre: "Certification interne",
        description: "Validation des acquis sur votre propre référentiel.",
      },
      {
        titre: "Accompagnement dirigeants",
        description: "Séminaires et coaching de comités de direction.",
      },
    ],
  },
];

export const programmes: Programme[] = [
  {
    slug: "preparation-certification-pmp",
    titre: "Management de projet — Préparation à la certification PMP",
    accroche:
      "Un parcours intensif pour préparer et réussir la certification PMP du Project Management Institute, et piloter des projets complexes avec les méthodes prédictives, agiles et hybrides.",
    objectifs:
      "Maîtriser le référentiel du Project Management Institute et se présenter à l'examen PMP avec un taux de réussite maximal. À l'issue du parcours, vous savez cadrer un projet, construire un échéancier fiable, piloter les coûts et les risques, et arbitrer entre approches prédictive, agile et hybride.",
    specialisation: "management-projet",
    type: "certification",
    niveau: "intermediaire",
    langue: "Français",
    dureeHeures: 40,
    rythme: "8 semaines",
    certification: "Certification PMI",
    publicVise: [
      "Chefs de projet en poste souhaitant certifier leur pratique",
      "Managers pilotant des portefeuilles de projets",
      "Ingénieurs et consultants en transition vers le pilotage",
      "Responsables PMO et coordinateurs de programmes",
    ],
    competences: [
      "Cadrer un projet et formaliser sa charte",
      "Construire et tenir un échéancier réaliste",
      "Piloter les coûts et la valeur acquise",
      "Identifier, coter et traiter les risques",
      "Animer les parties prenantes et la communication",
      "Choisir et combiner les approches agiles",
    ],
    prerequis:
      "Une expérience d'au moins deux ans en conduite de projet est recommandée. Un diplôme de niveau bac+3 et 36 mois d'expérience projet sont exigés par le PMI pour se présenter à l'examen — nous vérifions votre éligibilité avant l'inscription.",
    debouches: [
      "Chef de projet certifié",
      "Responsable de portefeuille de projets",
      "Consultant en organisation",
      "Responsable PMO",
    ],
    modules: [
      {
        id: "pmp-m1",
        titre: "Cadre de la gestion de projet",
        lecons: [
          { id: "pmp-m1-l1", titre: "Rôle et responsabilités du chef de projet", dureeMinutes: 60 },
          { id: "pmp-m1-l2", titre: "Cycles de vie et choix d'approche", dureeMinutes: 90 },
          { id: "pmp-m1-l3", titre: "Cartographie des parties prenantes", dureeMinutes: 90 },
        ],
      },
      {
        id: "pmp-m2",
        titre: "Domaines de connaissance",
        lecons: [
          { id: "pmp-m2-l1", titre: "Gestion du périmètre", dureeMinutes: 120 },
          { id: "pmp-m2-l2", titre: "Gestion des délais et chemin critique", dureeMinutes: 150 },
          { id: "pmp-m2-l3", titre: "Gestion des coûts et valeur acquise", dureeMinutes: 150 },
          { id: "pmp-m2-l4", titre: "Gestion de la qualité", dureeMinutes: 120 },
          { id: "pmp-m2-l5", titre: "Gestion des risques", dureeMinutes: 180 },
        ],
      },
      {
        id: "pmp-m3",
        titre: "Approches agiles et hybrides",
        lecons: [
          { id: "pmp-m3-l1", titre: "Fondamentaux Scrum", dureeMinutes: 180 },
          { id: "pmp-m3-l2", titre: "Kanban et flux tiré", dureeMinutes: 120 },
          { id: "pmp-m3-l3", titre: "Construire un modèle hybride", dureeMinutes: 180 },
        ],
      },
      {
        id: "pmp-m4",
        titre: "Outillage — MS Project",
        lecons: [
          { id: "pmp-m4-l1", titre: "Prise en main et planification", dureeMinutes: 300 },
          { id: "pmp-m4-l2", titre: "Tableaux de bord et reporting", dureeMinutes: 180 },
        ],
      },
      {
        id: "pmp-m5",
        titre: "Préparation à l'examen",
        lecons: [
          { id: "pmp-m5-l1", titre: "Examens blancs commentés", dureeMinutes: 300 },
          {
            id: "pmp-m5-l2",
            titre: "Stratégies de passage et gestion du temps",
            dureeMinutes: 180,
          },
        ],
      },
    ],
  },
  {
    slug: "ifrs-comptable-international",
    titre: "IFRS — Comptable international & consolideur",
    accroche:
      "Maîtriser les normes IFRS et produire des comptes consolidés fiables dans un groupe multi-entités.",
    objectifs:
      "Comprendre la logique des normes IFRS, savoir les appliquer aux opérations courantes et complexes, et produire une consolidation complète avec ses retraitements et son annexe.",
    specialisation: "finance-comptabilite",
    type: "certification",
    niveau: "avance",
    langue: "Français",
    dureeHeures: 35,
    rythme: "7 semaines",
    certification: "Attestation CLIXA + préparation DipIFR",
    publicVise: [
      "Comptables et chefs comptables en groupe",
      "Consolideurs et responsables reporting",
      "Auditeurs financiers",
      "Contrôleurs de gestion en environnement international",
    ],
    competences: [
      "Appliquer le référentiel IFRS aux opérations courantes",
      "Traiter les immobilisations et les contrats de location",
      "Reconnaître le chiffre d'affaires selon IFRS 15",
      "Construire un périmètre de consolidation",
      "Produire les retraitements et l'annexe",
    ],
    prerequis:
      "Une pratique confirmée de la comptabilité générale est nécessaire. La connaissance d'un référentiel local (plan comptable marocain, SYSCOHADA ou équivalent) est un plus.",
    debouches: [
      "Consolideur groupe",
      "Responsable reporting",
      "Auditeur financier",
      "Directeur comptable",
    ],
    modules: [
      {
        id: "ifrs-m1",
        titre: "Cadre conceptuel et première application",
        lecons: [
          { id: "ifrs-m1-l1", titre: "Architecture du référentiel IFRS", dureeMinutes: 90 },
          { id: "ifrs-m1-l2", titre: "IFRS 1 — première adoption", dureeMinutes: 120 },
        ],
      },
      {
        id: "ifrs-m2",
        titre: "Normes structurantes",
        lecons: [
          { id: "ifrs-m2-l1", titre: "IAS 16 et IAS 38 — immobilisations", dureeMinutes: 180 },
          { id: "ifrs-m2-l2", titre: "IFRS 16 — contrats de location", dureeMinutes: 180 },
          {
            id: "ifrs-m2-l3",
            titre: "IFRS 15 — produits des activités ordinaires",
            dureeMinutes: 180,
          },
          { id: "ifrs-m2-l4", titre: "IAS 36 — dépréciation d'actifs", dureeMinutes: 120 },
        ],
      },
      {
        id: "ifrs-m3",
        titre: "Consolidation",
        lecons: [
          { id: "ifrs-m3-l1", titre: "Périmètre et méthodes", dureeMinutes: 180 },
          { id: "ifrs-m3-l2", titre: "Retraitements et éliminations", dureeMinutes: 240 },
          { id: "ifrs-m3-l3", titre: "Annexe et information sectorielle", dureeMinutes: 120 },
        ],
      },
    ],
  },
  {
    slug: "cma-certified-management-accountant",
    titre: "CMA — Certified Management Accountant",
    accroche:
      "La certification de référence en comptabilité de management et pilotage de la performance.",
    objectifs:
      "Préparer les deux parties de l'examen CMA de l'IMA et acquérir une vision complète du pilotage financier : planification, analyse de performance, contrôle interne, décision d'investissement et éthique professionnelle.",
    specialisation: "finance-comptabilite",
    type: "certification",
    niveau: "avance",
    langue: "Français",
    dureeHeures: 60,
    rythme: "12 semaines",
    certification: "Certification IMA (CMA)",
    publicVise: [
      "Contrôleurs de gestion expérimentés",
      "Responsables financiers",
      "Analystes financiers",
      "Candidats à une carrière internationale en finance",
    ],
    competences: [
      "Construire un processus budgétaire complet",
      "Analyser la performance par les écarts",
      "Évaluer un projet d'investissement",
      "Concevoir un dispositif de contrôle interne",
      "Appliquer les règles d'éthique professionnelle",
    ],
    prerequis:
      "Diplôme de niveau bac+3 et deux ans d'expérience en finance ou contrôle de gestion, conformément aux exigences de l'IMA.",
    debouches: [
      "Directeur financier",
      "Contrôleur de gestion groupe",
      "Analyste financier senior",
      "Consultant en performance",
    ],
    modules: [
      {
        id: "cma-m1",
        titre: "Partie 1 — Planification et analyse de performance",
        lecons: [
          { id: "cma-m1-l1", titre: "Décisions de planification et budget", dureeMinutes: 360 },
          { id: "cma-m1-l2", titre: "Gestion de la performance et écarts", dureeMinutes: 360 },
          { id: "cma-m1-l3", titre: "Contrôle interne et systèmes", dureeMinutes: 300 },
        ],
      },
      {
        id: "cma-m2",
        titre: "Partie 2 — Finance stratégique",
        lecons: [
          { id: "cma-m2-l1", titre: "Analyse des états financiers", dureeMinutes: 360 },
          { id: "cma-m2-l2", titre: "Finance d'entreprise et investissement", dureeMinutes: 360 },
          { id: "cma-m2-l3", titre: "Décision, risque et éthique", dureeMinutes: 300 },
        ],
      },
      {
        id: "cma-m3",
        titre: "Préparation à l'examen",
        lecons: [
          { id: "cma-m3-l1", titre: "Examens blancs des deux parties", dureeMinutes: 360 },
          { id: "cma-m3-l2", titre: "Méthodologie et gestion du temps", dureeMinutes: 200 },
        ],
      },
    ],
  },
  {
    slug: "controle-de-gestion-performance",
    titre: "Contrôle de gestion & pilotage de la performance",
    accroche: "Construire les tableaux de bord qui font vraiment décider une direction générale.",
    objectifs:
      "Mettre en place un dispositif de contrôle de gestion complet : processus budgétaire, calcul des coûts, indicateurs et reporting de direction, jusqu'à l'animation du dialogue de gestion.",
    specialisation: "finance-comptabilite",
    type: "metier",
    niveau: "intermediaire",
    langue: "Français",
    dureeHeures: 32,
    rythme: "6 semaines",
    publicVise: [
      "Contrôleurs de gestion débutants ou en poste",
      "Comptables évoluant vers le pilotage",
      "Responsables d'activité et chefs de service",
      "Dirigeants de PME",
    ],
    competences: [
      "Construire et animer un processus budgétaire",
      "Calculer un coût de revient pertinent",
      "Concevoir un tableau de bord de direction",
      "Analyser les écarts et proposer des actions",
      "Animer le dialogue de gestion",
    ],
    prerequis:
      "Des bases en comptabilité générale sont suffisantes. Aucun prérequis en contrôle de gestion.",
    debouches: [
      "Contrôleur de gestion",
      "Responsable du pilotage",
      "Business partner finance",
      "Directeur administratif et financier",
    ],
    modules: [
      {
        id: "cdg-m1",
        titre: "Fondamentaux et coûts",
        lecons: [
          { id: "cdg-m1-l1", titre: "Rôle du contrôle de gestion", dureeMinutes: 90 },
          { id: "cdg-m1-l2", titre: "Méthodes de calcul de coûts", dureeMinutes: 180 },
          { id: "cdg-m1-l3", titre: "Coûts complets et coûts partiels", dureeMinutes: 150 },
        ],
      },
      {
        id: "cdg-m2",
        titre: "Budget et prévision",
        lecons: [
          { id: "cdg-m2-l1", titre: "Construction budgétaire", dureeMinutes: 180 },
          { id: "cdg-m2-l2", titre: "Analyse des écarts", dureeMinutes: 180 },
          { id: "cdg-m2-l3", titre: "Prévision glissante", dureeMinutes: 120 },
        ],
      },
      {
        id: "cdg-m3",
        titre: "Tableaux de bord",
        lecons: [
          { id: "cdg-m3-l1", titre: "Choix des indicateurs", dureeMinutes: 150 },
          { id: "cdg-m3-l2", titre: "Reporting de direction", dureeMinutes: 150 },
          { id: "cdg-m3-l3", titre: "Animation du dialogue de gestion", dureeMinutes: 120 },
        ],
      },
    ],
  },
  {
    slug: "finance-entreprise-non-financiers",
    titre: "Finance d'entreprise pour non-financiers",
    accroche:
      "Lire un bilan, comprendre un compte de résultat et défendre un budget, sans être financier.",
    objectifs:
      "Acquérir le vocabulaire et les réflexes financiers indispensables pour dialoguer avec une direction financière, comprendre l'impact de ses décisions et construire un dossier d'investissement crédible.",
    specialisation: "finance-comptabilite",
    type: "metier",
    niveau: "debutant",
    langue: "Français",
    dureeHeures: 24,
    rythme: "4 semaines",
    publicVise: [
      "Managers opérationnels",
      "Ingénieurs et responsables techniques",
      "Créateurs et dirigeants de TPE",
      "Responsables RH, marketing et achats",
    ],
    competences: [
      "Lire et interpréter un bilan",
      "Analyser un compte de résultat",
      "Comprendre le besoin en fonds de roulement",
      "Construire et défendre un budget",
      "Évaluer la rentabilité d'un projet",
    ],
    prerequis: "Aucun prérequis. Le parcours part des bases.",
    debouches: [
      "Manager opérationnel",
      "Chef de service",
      "Dirigeant de TPE",
      "Responsable d'activité",
    ],
    modules: [
      {
        id: "fnf-m1",
        titre: "Lire les états financiers",
        lecons: [
          { id: "fnf-m1-l1", titre: "Le bilan expliqué simplement", dureeMinutes: 120 },
          { id: "fnf-m1-l2", titre: "Le compte de résultat", dureeMinutes: 120 },
          { id: "fnf-m1-l3", titre: "Les grands équilibres financiers", dureeMinutes: 120 },
        ],
      },
      {
        id: "fnf-m2",
        titre: "Piloter au quotidien",
        lecons: [
          {
            id: "fnf-m2-l1",
            titre: "Trésorerie et besoin en fonds de roulement",
            dureeMinutes: 150,
          },
          { id: "fnf-m2-l2", titre: "Construire et défendre son budget", dureeMinutes: 180 },
        ],
      },
      {
        id: "fnf-m3",
        titre: "Décider",
        lecons: [
          { id: "fnf-m3-l1", titre: "Rentabilité d'un investissement", dureeMinutes: 180 },
          { id: "fnf-m3-l2", titre: "Construire un business case", dureeMinutes: 150 },
        ],
      },
    ],
  },
  {
    slug: "leadership-management-equipe",
    titre: "Leadership & management d'équipe",
    accroche: "Passer de bon technicien à manager qui fait grandir son équipe.",
    objectifs:
      "Installer une posture managériale claire, savoir déléguer, mener les entretiens difficiles, et construire un collectif qui tient dans la durée.",
    specialisation: "management-projet",
    type: "parcours-executif",
    niveau: "intermediaire",
    langue: "Français",
    dureeHeures: 28,
    rythme: "5 jours",
    publicVise: [
      "Managers nouvellement nommés",
      "Experts techniques prenant une équipe",
      "Chefs de service et responsables d'agence",
      "Dirigeants de PME",
    ],
    competences: [
      "Adapter son style de management au contexte",
      "Déléguer et responsabiliser",
      "Conduire un entretien difficile",
      "Fixer des objectifs et donner du feedback",
      "Gérer un conflit d'équipe",
    ],
    prerequis: "Encadrer une équipe, ou être sur le point de le faire.",
    debouches: [
      "Manager d'équipe",
      "Responsable de service",
      "Directeur opérationnel",
      "Chef d'agence",
    ],
    modules: [
      {
        id: "lead-m1",
        titre: "Posture et styles",
        lecons: [
          { id: "lead-m1-l1", titre: "Du technicien au manager", dureeMinutes: 180 },
          { id: "lead-m1-l2", titre: "Styles de management situationnel", dureeMinutes: 180 },
        ],
      },
      {
        id: "lead-m2",
        titre: "Animer au quotidien",
        lecons: [
          { id: "lead-m2-l1", titre: "Déléguer sans se démettre", dureeMinutes: 180 },
          { id: "lead-m2-l2", titre: "Objectifs et feedback", dureeMinutes: 180 },
          { id: "lead-m2-l3", titre: "Rituels d'équipe efficaces", dureeMinutes: 120 },
        ],
      },
      {
        id: "lead-m3",
        titre: "Situations difficiles",
        lecons: [
          { id: "lead-m3-l1", titre: "Conduire un entretien difficile", dureeMinutes: 180 },
          { id: "lead-m3-l2", titre: "Désamorcer un conflit", dureeMinutes: 180 },
          { id: "lead-m3-l3", titre: "Accompagner le changement", dureeMinutes: 120 },
        ],
      },
    ],
  },
  {
    slug: "audit-interne-maitrise-risques",
    titre: "Audit interne & maîtrise des risques",
    accroche:
      "Bâtir une fonction d'audit interne crédible et des plans de remédiation qui aboutissent.",
    objectifs:
      "Savoir cartographier les risques d'une organisation, construire un plan d'audit, mener une mission de bout en bout et suivre la mise en œuvre des recommandations.",
    specialisation: "finance-comptabilite",
    type: "metier",
    niveau: "intermediaire",
    langue: "Français",
    dureeHeures: 30,
    rythme: "5 jours",
    publicVise: [
      "Auditeurs internes débutants",
      "Contrôleurs internes et risk managers",
      "Comptables et contrôleurs de gestion en évolution",
      "Responsables conformité",
    ],
    competences: [
      "Cartographier les risques par processus",
      "Construire un plan d'audit annuel",
      "Conduire une mission d'audit",
      "Rédiger un rapport et des recommandations",
      "Suivre les plans de remédiation",
    ],
    prerequis: "Une connaissance des processus d'entreprise est recommandée.",
    debouches: [
      "Auditeur interne",
      "Risk manager",
      "Responsable conformité",
      "Responsable contrôle interne",
    ],
    modules: [
      {
        id: "aud-m1",
        titre: "Risques et référentiels",
        lecons: [
          { id: "aud-m1-l1", titre: "Cadre de référence et normes", dureeMinutes: 150 },
          { id: "aud-m1-l2", titre: "Cartographie des risques", dureeMinutes: 210 },
        ],
      },
      {
        id: "aud-m2",
        titre: "Conduire une mission",
        lecons: [
          { id: "aud-m2-l1", titre: "Plan d'audit et lettre de mission", dureeMinutes: 150 },
          { id: "aud-m2-l2", titre: "Techniques de collecte de preuves", dureeMinutes: 210 },
          { id: "aud-m2-l3", titre: "Entretiens et tests de conformité", dureeMinutes: 180 },
        ],
      },
      {
        id: "aud-m3",
        titre: "Restituer et suivre",
        lecons: [
          { id: "aud-m3-l1", titre: "Rédaction du rapport d'audit", dureeMinutes: 180 },
          { id: "aud-m3-l2", titre: "Suivi des recommandations", dureeMinutes: 120 },
        ],
      },
    ],
  },
  {
    slug: "transformation-digitale",
    titre: "Transformation digitale — cadrer et piloter",
    accroche:
      "Construire une feuille de route digitale réaliste et la faire adopter par les métiers.",
    objectifs:
      "Cadrer une transformation digitale : diagnostic de maturité, priorisation des chantiers, choix des outils, conduite du changement et pilotage par la valeur.",
    specialisation: "digital-data",
    type: "metier",
    niveau: "intermediaire",
    langue: "Français",
    dureeHeures: 26,
    rythme: "5 semaines",
    publicVise: [
      "Directeurs et responsables de la transformation",
      "Responsables SI et chefs de projet digitaux",
      "Dirigeants de PME et ETI",
      "Responsables métier porteurs de projets",
    ],
    competences: [
      "Évaluer la maturité digitale d'une organisation",
      "Prioriser un portefeuille de chantiers",
      "Cadrer un projet d'outillage métier",
      "Piloter la conduite du changement",
      "Mesurer la valeur créée",
    ],
    prerequis: "Aucun prérequis technique. Une expérience de pilotage de projet est utile.",
    debouches: [
      "Chief Digital Officer",
      "Responsable transformation",
      "Chef de projet SI",
      "Consultant digital",
    ],
    modules: [
      {
        id: "dig-m1",
        titre: "Diagnostic et cadrage",
        lecons: [
          { id: "dig-m1-l1", titre: "Maturité digitale et diagnostic", dureeMinutes: 180 },
          { id: "dig-m1-l2", titre: "Construire la feuille de route", dureeMinutes: 180 },
        ],
      },
      {
        id: "dig-m2",
        titre: "Outillage et données",
        lecons: [
          { id: "dig-m2-l1", titre: "Cartographie applicative", dureeMinutes: 150 },
          { id: "dig-m2-l2", titre: "Gouvernance de la donnée", dureeMinutes: 180 },
          { id: "dig-m2-l3", titre: "Choisir et cadrer un outil métier", dureeMinutes: 150 },
        ],
      },
      {
        id: "dig-m3",
        titre: "Adoption",
        lecons: [
          { id: "dig-m3-l1", titre: "Conduite du changement", dureeMinutes: 180 },
          { id: "dig-m3-l2", titre: "Piloter par la valeur", dureeMinutes: 150 },
        ],
      },
    ],
  },
];

export const sessions: Session[] = [
  // PMP
  {
    id: "s-pmp-1",
    programmeSlug: "preparation-certification-pmp",
    mode: "presentiel",
    ville: "Agadir",
    pays: "Maroc",
    debut: "2026-11-09",
    fin: "2026-11-13",
    cadence: "5 jours",
    capacite: 18,
    placesReservees: 15,
    prixCentimes: 125000,
    devise: "EUR",
  },
  {
    id: "s-pmp-2",
    programmeSlug: "preparation-certification-pmp",
    mode: "visio",
    debut: "2026-12-01",
    fin: "2027-01-26",
    cadence: "8 semaines · mardi soir",
    capacite: 25,
    placesReservees: 13,
    prixCentimes: 79000,
    devise: "EUR",
  },
  {
    id: "s-pmp-3",
    programmeSlug: "preparation-certification-pmp",
    mode: "presentiel",
    ville: "Abidjan",
    pays: "Côte d'Ivoire",
    debut: "2027-01-18",
    fin: "2027-01-22",
    cadence: "5 jours",
    capacite: 20,
    placesReservees: 4,
    prixCentimes: 125000,
    devise: "EUR",
  },
  {
    id: "s-pmp-4",
    programmeSlug: "preparation-certification-pmp",
    mode: "presentiel",
    ville: "Dakar",
    pays: "Sénégal",
    debut: "2027-02-15",
    fin: "2027-02-19",
    cadence: "5 jours",
    capacite: 18,
    placesReservees: 18,
    prixCentimes: 125000,
    devise: "EUR",
  },

  // IFRS
  {
    id: "s-ifrs-1",
    programmeSlug: "ifrs-comptable-international",
    mode: "visio",
    debut: "2026-10-06",
    fin: "2026-11-24",
    cadence: "7 semaines · jeudi soir",
    capacite: 25,
    placesReservees: 16,
    prixCentimes: 85000,
    devise: "EUR",
  },
  {
    id: "s-ifrs-2",
    programmeSlug: "ifrs-comptable-international",
    mode: "presentiel",
    ville: "Agadir",
    pays: "Maroc",
    debut: "2027-01-11",
    fin: "2027-01-15",
    cadence: "5 jours",
    capacite: 16,
    placesReservees: 6,
    prixCentimes: 135000,
    devise: "EUR",
  },

  // CMA
  {
    id: "s-cma-1",
    programmeSlug: "cma-certified-management-accountant",
    mode: "visio",
    debut: "2026-12-07",
    fin: "2027-03-01",
    cadence: "12 semaines · lundi soir",
    capacite: 20,
    placesReservees: 20,
    prixCentimes: 145000,
    devise: "EUR",
  },
  {
    id: "s-cma-2",
    programmeSlug: "cma-certified-management-accountant",
    mode: "visio",
    debut: "2027-03-15",
    fin: "2027-06-07",
    cadence: "12 semaines · lundi soir",
    capacite: 20,
    placesReservees: 3,
    prixCentimes: 145000,
    devise: "EUR",
  },

  // Contrôle de gestion
  {
    id: "s-cdg-1",
    programmeSlug: "controle-de-gestion-performance",
    mode: "presentiel",
    ville: "Abidjan",
    pays: "Côte d'Ivoire",
    debut: "2026-11-23",
    fin: "2026-11-27",
    cadence: "5 jours",
    capacite: 22,
    placesReservees: 8,
    prixCentimes: 98000,
    devise: "EUR",
  },
  {
    id: "s-cdg-2",
    programmeSlug: "controle-de-gestion-performance",
    mode: "visio",
    debut: "2027-01-19",
    fin: "2027-02-23",
    cadence: "6 semaines · mardi soir",
    capacite: 25,
    placesReservees: 5,
    prixCentimes: 68000,
    devise: "EUR",
  },

  // Finance non-financiers
  {
    id: "s-fnf-1",
    programmeSlug: "finance-entreprise-non-financiers",
    mode: "visio",
    debut: "2027-01-12",
    fin: "2027-02-09",
    cadence: "4 semaines · mardi soir",
    capacite: 30,
    placesReservees: 11,
    prixCentimes: 54000,
    devise: "EUR",
  },

  // Leadership
  {
    id: "s-lead-1",
    programmeSlug: "leadership-management-equipe",
    mode: "presentiel",
    ville: "Dakar",
    pays: "Sénégal",
    debut: "2027-02-02",
    fin: "2027-02-06",
    cadence: "5 jours",
    capacite: 16,
    placesReservees: 9,
    prixCentimes: 92000,
    devise: "EUR",
  },
  {
    id: "s-lead-2",
    programmeSlug: "leadership-management-equipe",
    mode: "presentiel",
    ville: "Agadir",
    pays: "Maroc",
    debut: "2026-12-14",
    fin: "2026-12-18",
    cadence: "5 jours",
    capacite: 16,
    placesReservees: 14,
    prixCentimes: 92000,
    devise: "EUR",
  },

  // Audit interne
  {
    id: "s-aud-1",
    programmeSlug: "audit-interne-maitrise-risques",
    mode: "presentiel",
    ville: "Dakar",
    pays: "Sénégal",
    debut: "2027-03-09",
    fin: "2027-03-13",
    cadence: "5 jours",
    capacite: 18,
    placesReservees: 2,
    prixCentimes: 89000,
    devise: "EUR",
  },

  // Transformation digitale
  {
    id: "s-dig-1",
    programmeSlug: "transformation-digitale",
    mode: "visio",
    debut: "2026-10-20",
    fin: "2026-11-24",
    cadence: "5 semaines · jeudi soir",
    capacite: 25,
    placesReservees: 19,
    prixCentimes: 74000,
    devise: "EUR",
  },
  {
    id: "s-dig-2",
    programmeSlug: "transformation-digitale",
    mode: "presentiel",
    ville: "Abidjan",
    pays: "Côte d'Ivoire",
    debut: "2027-02-22",
    fin: "2027-02-26",
    cadence: "5 jours",
    capacite: 20,
    placesReservees: 7,
    prixCentimes: 110000,
    devise: "EUR",
  },
];
