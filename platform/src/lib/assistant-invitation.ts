/**
 * L'assistant qui vient au-devant du visiteur.
 *
 * Demandé par la direction le 5 octobre 2026 : « i probose 3la nass » — que
 * l'assistant propose lui-même son aide, au lieu d'attendre qu'on clique sur un
 * rond doré dans un coin. Quelques secondes après l'arrivée, une bulle dit ce
 * qu'il peut faire sur **cette** page, avec trois questions prêtes : un clic, et
 * la conversation commence.
 *
 * ── ⚠️ Ce qui le retient d'être envahissant ─────────────────────────────────
 * - **Une fois par visite** (`sessionStorage`), qu'on ait répondu ou fermé. Une
 *   bulle qui revient à chaque page se lit comme une publicité, et la suivante
 *   n'est plus lue.
 * - **Avant la fenêtre « Gardez votre place »**, qui s'ouvre dans le même coin
 *   au bout de vingt-cinq secondes : huit secondes, puis la bulle s'efface
 *   d'elle-même avant que l'autre paraisse. Deux propositions empilées au même
 *   endroit ne se lisent ni l'une ni l'autre.
 * - **Jamais pendant que le bandeau de consentement attend une réponse** : on
 *   ne pose pas une seconde question par-dessus.
 * - **Pas là où elle répondrait à côté.** Sur `/entreprises`, l'assistant ne
 *   connaît que le catalogue des formations en ligne : il ne sait rien des
 *   séminaires. Sur les pages qui servent à autre chose qu'à choisir une
 *   formation — candidater, témoigner, vérifier un certificat, regarder un
 *   extrait — elle interromprait un geste qui n'a rien à voir.
 *
 * Ce fichier est pur : `verifier-assistant.ts` l'éprouve sans navigateur.
 */

export const CLEF_INVITATION = "clixa.assistant.invitation.v1";

/** Le délai avant la bulle, et sa durée de vie. */
export const SECONDES_AVANT_INVITATION = 8;
export const SECONDES_DE_VIE_INVITATION = 15;

export interface Invitation {
  texte: string;
  questions: string[];
}

const SANS_INVITATION = [
  "/entreprises",
  "/devenir-formateur",
  "/laisser-un-temoignage",
  "/verifier",
  "/v",
  "/contact",
  "/mentions-legales",
  "/confidentialite",
];

/** Ce que la bulle dit sur cette page, ou rien. */
export function invitationPour(chemin: string): Invitation | undefined {
  if (SANS_INVITATION.some((p) => chemin === p || chemin.startsWith(`${p}/`))) return undefined;

  if (/^\/formations\/[a-z0-9-]+\/?$/.test(chemin)) {
    return {
      texte:
        "Bonjour 👋 Une question sur cette formation ? Programme, horaires, tarifs : je vous réponds tout de suite.",
      questions: [
        "Quel est le programme ?",
        "Comment se déroule la formation ?",
        "Quels sont les prix ?",
      ],
    };
  }
  if (chemin === "/formations") {
    return {
      texte:
        "Bonjour 👋 Vous hésitez entre plusieurs formations ? Dites-moi votre poste et votre objectif, je vous oriente.",
      questions: [
        "Quelle formation pour un poste en finance ?",
        "Comment se déroulent les formations ?",
        "Quels sont les prix ?",
      ],
    };
  }
  return {
    texte:
      "Bonjour 👋 Je suis l'assistant IA de CLIXA Institute. Je peux vous aider à choisir votre formation.",
    questions: [
      "Quelles formations proposez-vous ?",
      "Comment se déroule la formation ?",
      "Quels sont les prix ?",
    ],
  };
}

/** Les questions prêtes à l'ouverture de la fenêtre, quand rien n'a encore été dit. */
export function questionsDAccueil(chemin: string): string[] {
  if (/^\/formations\/[a-z0-9-]+\/?$/.test(chemin)) {
    return [
      "Quel est le programme ?",
      "Comment se déroule la formation ?",
      "Quels sont les prix ?",
      "Comment accéder à Classroom ?",
    ];
  }
  return [
    "Quelles formations proposez-vous ?",
    "Comment se déroule la formation ?",
    "Quels sont les prix ?",
    "Wach kayn khlas b tranches ?",
  ];
}
