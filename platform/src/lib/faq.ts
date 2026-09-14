import { formatPrix, libelleFuseau } from "@/lib/format";
import type { Session, Tarifs } from "@/lib/types";

/**
 * Les questions fréquentes, composées à partir de ce que le site sait déjà.
 *
 * ── ⚠️ Pourquoi une fonction, et pas un texte ───────────────────────────────
 * Une FAQ est la page qui vieillit le plus vite d'un site : on y recopie un prix,
 * un délai, une date de rentrée, et chacun reste vrai jusqu'au jour où la fiche
 * change sans elle. Le journal compte assez de copies qui ont divergé — le
 * numéro d'admissions, les moyens de paiement de la fiche, les heures de
 * session — pour ne pas en ouvrir une de plus.
 *
 * Chaque réponse chiffrée vient donc **de la même source que la page qui fait
 * foi** : le barème de `getTarifs`, les moyens de `lib/moyens.ts`, la tenue de
 * `lib/places.ts`, les dates et les modes des sessions publiées. Le texte ne
 * porte que ce qui ne se compte pas : comment le tunnel se déroule.
 *
 * ── ⚠️ Ce qu'elle ne dit pas ────────────────────────────────────────────────
 * Rien de ce que le système ne tient pas : pas de replays (un seul parcours les
 * mentionne, et rien ne les produit), pas de taux de réussite, pas de campus
 * ouverts ailleurs qu'à Agadir. `verifier-faq.ts` garde ces refus.
 *
 * La fonction est pure — l'horloge est passée, jamais lue — pour s'éprouver sans
 * base, sans réseau et sans navigateur.
 */

export interface EntreeFaq {
  programmes: { titre: string; dureeHeures: number; certification?: string }[];
  sessions: Pick<Session, "mode" | "debut" | "fuseau" | "ville" | "pays">[];
  tarifs: Tarifs;
  moyens: readonly string[];
  joursTenue: number;
  whatsapp: { url: string; numeroAffiche: string };
  email: string;
  maintenant: Date;
}

/** Un morceau de réponse : un paragraphe, une liste, ou des liens à suivre. */
export type BlocFaq =
  | { type: "texte"; texte: string }
  | { type: "liste"; items: string[] }
  | { type: "liens"; liens: { libelle: string; href: string }[] };

export interface QuestionFaq {
  id: string;
  question: string;
  reponse: BlocFaq[];
}

const JOUR = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const texte = (t: string): BlocFaq => ({ type: "texte", texte: t });

/*
  « sept jours », en lettres : c'est ainsi que la fiche et le formulaire le
  disent. Le même fait écrit « 7 » ici et « sept » là se lit comme deux
  délais, pour qui passe d'une page à l'autre.
*/
const EN_LETTRES = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
];
export const enLettres = (n: number) => EN_LETTRES[n] ?? String(n);

export function questionsFrequentes(e: EntreeFaq): QuestionFaq[] {
  const maintenant = e.maintenant.toISOString();
  const aVenir = e.sessions.filter((s) => s.debut > maintenant);
  const questions: QuestionFaq[] = [];

  /* ── Le format ─────────────────────────────────────────────────────────── */

  const modes = new Set(aVenir.map((s) => s.mode));
  const durees = [...new Set(e.programmes.map((p) => p.dureeHeures))].sort((a, b) => a - b);
  const duree =
    durees.length === 0
      ? undefined
      : durees.length === 1
        ? `Un parcours compte ${durees[0]} heures de formation.`
        : `Un parcours compte entre ${durees[0]} et ${durees.at(-1)} heures de formation, selon le programme.`;

  const format: BlocFaq[] = [];
  if (modes.size === 1 && modes.has("visio")) {
    /*
      ⚠️ « En direct, à heure fixe » : c'est ce que « visio » veut dire ici. Le
      mot « en ligne » promettrait qu'on suit à son rythme — la fiche a déjà dû
      être corrigée pour cette raison.
    */
    format.push(
      texte(
        "En classe virtuelle, en direct et à heure fixe : vous suivez les séances depuis chez vous ou depuis votre bureau, avec le formateur et les autres participants.",
      ),
    );
  } else if (modes.size > 0) {
    const noms = {
      visio: "en classe virtuelle",
      presentiel: "en présentiel",
      "en-ligne": "en ligne",
    };
    format.push(
      texte(
        `Selon les sessions : ${[...modes].map((m) => noms[m]).join(", ")}. La fiche de chaque parcours précise la sienne.`,
      ),
    );
  }
  if (duree) format.push(texte(duree));
  if (format.length) {
    questions.push({
      id: "format",
      question: "Comment se déroulent les formations ?",
      reponse: format,
    });
  }

  /* ── La rentrée ────────────────────────────────────────────────────────── */

  const jours = [...new Set(aVenir.map((s) => s.debut.slice(0, 10)))].sort();
  questions.push({
    id: "rentree",
    question: "Quand commence la prochaine cohorte ?",
    reponse:
      jours.length === 0
        ? [
            texte(
              "Aucune date n'est publiée pour le moment. Laissez-nous vos coordonnées : nous vous prévenons à l'ouverture de la prochaine cohorte.",
            ),
            { type: "liens", liens: [{ libelle: "Être rappelé", href: "/contact" }] },
          ]
        : jours.length === 1
          ? [
              texte(
                `Les sessions ouvertes démarrent le ${JOUR.format(new Date(`${jours[0]}T12:00:00Z`))}. Le calendrier complet des séances est sur la fiche de chaque parcours.`,
              ),
            ]
          : [
              texte("Plusieurs dates sont ouvertes :"),
              { type: "liste", items: jours.map((j) => JOUR.format(new Date(`${j}T12:00:00Z`))) },
              texte("La fiche de chaque parcours donne la sienne."),
            ],
  });

  /* ── L'horaire ─────────────────────────────────────────────────────────── */

  const fuseaux = [...new Set(aVenir.map((s) => s.fuseau).filter(Boolean) as string[])];
  if (fuseaux.length) {
    questions.push({
      id: "horaire",
      question: "À quelle heure ont lieu les séances ?",
      reponse: [
        texte(
          `L'horaire exact figure sur la fiche de chaque parcours, annoncé en ${fuseaux.map(libelleFuseau).join(" ou ")}. Si vous êtes dans un autre fuseau, pensez à le convertir avant de vous inscrire.`,
        ),
      ],
    });
  }

  /* ── Le prix ───────────────────────────────────────────────────────────── */

  const t = e.tarifs;
  const prix = (c: number) => formatPrix(c, t.devise);
  // Le premier plan du barème est le comptant : seuls les autres s'échelonnent.
  const echelonnes = t.plans.filter((p) => p.echeancesCentimes.length > 1);
  const plusCher = echelonnes.some((p) => p.totalCentimes > t.prixComptantCentimes);
  questions.push({
    id: "prix",
    question: "Combien coûte une formation ?",
    reponse: [
      texte(
        `Le tarif est le même pour tous les parcours : ${prix(t.prixComptantCentimes)} payés en une fois.`,
      ),
      ...(echelonnes.length
        ? ([
            texte("Vous pouvez aussi régler en plusieurs fois :"),
            {
              type: "liste",
              items: echelonnes.map(
                (p) =>
                  `${p.libelle} : ${prix(p.totalCentimes)} au total (${p.echeancesCentimes.map(prix).join(" + ")})`,
              ),
            },
          ] satisfies BlocFaq[])
        : []),
      /*
        ⚠️ L'écart se dit, parce que le barème le porte. L'annoncer ici plutôt
        que de le laisser découvrir au paiement est la règle de la fiche.
      */
      ...(plusCher
        ? [
            texte(
              "Régler en plusieurs fois coûte un peu plus cher ; l'écart est affiché sur chaque fiche.",
            ),
          ]
        : []),
    ],
  });

  /* ── Le règlement ──────────────────────────────────────────────────────── */

  questions.push({
    id: "paiement",
    question: "Comment puis-je payer ?",
    reponse: [
      { type: "liste", items: [...e.moyens] },
      texte(
        "Rien ne se paie sur le site. Une fois votre contrat signé et vérifié, nous vous envoyons par courriel les coordonnées qui correspondent au moyen que vous avez choisi.",
      ),
      /*
        ⚠️ La seule défense qu'on offre contre un faux message réclamant un
        virement : la date d'envoi, affichée sur le dossier. La taire ici
        laisserait la FAQ muette sur la question que pose un hameçonnage.
      */
      texte(
        "La date de cet envoi s'affiche sur la page de votre dossier : un message qui vous réclame un paiement sans correspondre à cette date ne vient pas de nous.",
      ),
    ],
  });

  /* ── L'engagement ──────────────────────────────────────────────────────── */

  questions.push({
    id: "engagement",
    question: "La pré-inscription m'engage-t-elle ?",
    reponse: [
      texte(
        `Non. Elle retient votre place sans rien encaisser, et votre place est tenue ${enLettres(e.joursTenue)} jours. Vous pouvez poser vos questions avant d'aller plus loin.`,
      ),
      texte(
        "Ce qui vous engage, c'est la signature du contrat de formation — que vous demandez quand vous êtes prêt.",
      ),
    ],
  });

  questions.push({
    id: "etapes",
    question: "Que se passe-t-il après la pré-inscription ?",
    reponse: [
      {
        type: "liste",
        items: [
          "Vous recevez une référence de dossier (CLX-…) qui ouvre votre page de suivi.",
          "Quand vous êtes prêt, vous demandez votre contrat et vous le signez en ligne.",
          "Nous le relisons et vous confirmons qu'il est accepté.",
          "Nous vous envoyons par courriel de quoi régler, selon le moyen choisi.",
          "Une fois le règlement reçu, votre inscription est confirmée.",
        ],
      },
      texte(
        "À chaque étape, la page de votre dossier dit ce qui reste à faire — et ce qui ne dépend que de nous.",
      ),
    ],
  });

  questions.push({
    id: "compte",
    question: "Faut-il créer un compte ?",
    reponse: [
      texte(
        "Non. Votre dossier s'ouvre avec la référence reçue à la pré-inscription. Un espace personnel existe pour retrouver vos dossiers plus facilement, mais il reste facultatif.",
      ),
    ],
  });

  /* ── Le certificat ─────────────────────────────────────────────────────── */

  const certifiantes = e.programmes.filter((p) => p.certification);
  questions.push({
    id: "certificat",
    question: "Reçoit-on un certificat ?",
    reponse: [
      texte(
        "Oui : un certificat professionnel nominatif, qui détaille les modules suivis, est délivré une fois le parcours terminé.",
      ),
      texte(
        "Il porte un code de vérification : un employeur ou une banque peut en contrôler l'authenticité en ligne.",
      ),
      { type: "liens", liens: [{ libelle: "Vérifier un certificat", href: "/verifier" }] },
      /*
        ⚠️ Préparer une certification n'est pas la délivrer. L'examen PMP® se
        passe chez PMI : le dire évite qu'un candidat croie l'obtenir de nous.
      */
      ...certifiantes.map((p) => {
        /*
          « PMP® — Project Management Institute » : le nom de la certification,
          puis l'organisme qui la délivre. Les séparer évite de réciter le titre
          du parcours et la certification l'un derrière l'autre.
        */
        const [nom, organisme] = String(p.certification).split(/\s+—\s+/);
        return texte(
          organisme
            ? `Pour « ${p.titre} », l'examen ${nom} se passe séparément, auprès de l'organisme certificateur : ${organisme}.`
            : `Pour « ${p.titre} », l'examen ${nom} se passe séparément, auprès de l'organisme qui délivre la certification.`,
        );
      }),
    ],
  });

  /* ── Le présentiel ─────────────────────────────────────────────────────── */

  const villes = [
    ...new Set(
      aVenir
        .filter((s) => s.mode === "presentiel")
        .map((s) => [s.ville, s.pays].filter(Boolean).join(", ")),
    ),
  ].filter(Boolean);
  questions.push({
    id: "presentiel",
    question: "Y a-t-il des sessions en présentiel ?",
    reponse: villes.length
      ? [
          texte(
            `Oui, à ${villes.join(" et à ")}. La fiche de chaque parcours précise où il se donne.`,
          ),
        ]
      : [
          /*
            ⚠️ Les mots de la direction, pas d'autres : Abidjan et Dakar sont
            « prochainement », jamais des campus ouverts. Le site entier a été
            corrigé en ce sens le 5 septembre 2026, le trailer le 13.
          */
          texte(
            "Pas pour l'instant : les parcours en cours se donnent en classe virtuelle. CLIXA Institute a son siège à Agadir ; Abidjan et Dakar ouvriront prochainement.",
          ),
        ],
  });

  /* ── Le contact ────────────────────────────────────────────────────────── */

  questions.push({
    id: "contact",
    question: "Comment vous joindre ?",
    reponse: [
      texte(
        `Par WhatsApp, au ${e.whatsapp.numeroAffiche} (admissions), ou par courriel à ${e.email}.`,
      ),
      {
        type: "liens",
        liens: [
          { libelle: "Écrire sur WhatsApp", href: e.whatsapp.url },
          { libelle: "Être rappelé", href: "/contact" },
        ],
      },
    ],
  });

  return questions;
}
