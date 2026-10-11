import { MOYENS_AFFICHES } from "@/lib/moyens";
import { RESEAUX_CLIXA } from "@/lib/reseaux";
import { DEVISE_CLIXA } from "@/lib/marque";
import {
  placesRestantes,
  type Programme,
  type Session,
  type Specialisation,
  type Tarifs,
} from "@/lib/types";

/**
 * L'assistant IA du site : ce qu'il sait, ce qu'il a le droit de dire, et à qui
 * il le demande.
 *
 * ── Ce qu'il sait ───────────────────────────────────────────────────────────
 * Le catalogue tel que le site l'affiche, lu par les mêmes fonctions que les
 * fiches (`lib/catalogue`) et avec le même cache. Il ne connaît donc ni plus ni
 * moins que la page : une session ajoutée dans le back-office lui est connue à
 * la revalidation suivante, sans qu'on touche à ce fichier.
 *
 * ── ⚠️ Ce qu'il ne reçoit jamais ─────────────────────────────────────────────
 * `lienVisio`, qui ouvre la classe aux seuls inscrits, et le bénéficiaire des
 * transferts. Ce dernier n'est pas un secret, mais la page du dossier l'annonce
 * au participant au bon moment, pour qu'il reconnaisse notre message d'un
 * hameçonnage : un robot qui le récite à n'importe qui défait cette précaution.
 *
 * ── ⚠️ Ce qu'il n'a pas le droit de faire ────────────────────────────────────
 * La règle de `lib/orientation.ts`, pour la même raison : inventer. Un prix,
 * une date, une place. Ne pas savoir est une réponse ; il renvoie alors vers
 * WhatsApp ou le formulaire de rappel.
 *
 * ── À qui il le demande ─────────────────────────────────────────────────────
 * Gemini, sur l'offre gratuite de Google AI Studio (`GEMINI_API_KEY`). Google
 * peut se servir des échanges de cette offre pour entraîner ses modèles :
 * l'assistant ne demande donc aucune donnée personnelle.
 */

const euros = (centimes: number, devise: string) => `${Math.round(centimes / 100)} ${devise}`;

const jour = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(iso));

const MODE: Record<Session["mode"], string> = {
  visio: "Classe virtuelle (en direct)",
  "en-ligne": "En ligne",
  presentiel: "Présentiel",
};

const decrireSession = (s: Session): string =>
  [
    `  - ${MODE[s.mode]}${s.mode === "presentiel" ? ` — ${[s.ville, s.pays].filter(Boolean).join(", ")}` : ""}`,
    `du ${jour(s.debut)} au ${jour(s.fin)}`,
    s.cadence ? `rythme : ${s.cadence}${s.fuseau ? ` (${s.fuseau})` : ""}` : "",
    `places restantes : ${placesRestantes(s)}`,
  ]
    .filter(Boolean)
    .join(" · ");

const liste = (titre: string, valeurs?: string[]) =>
  valeurs?.length ? `${titre} : ${valeurs.join(" ; ")}` : "";

function decrireProgramme(
  p: Programme,
  specialisation: string | undefined,
  sessions: Session[],
  site: string,
): string {
  return [
    `## ${p.titre}`,
    `Page : ${site}/formations/${p.slug}`,
    `Plaquette PDF (programme détaillé) : ${site}/formations/${p.slug}/plaquette`,
    `Pré-inscription : ${site}/inscription?formation=${p.slug}`,
    specialisation ? `Spécialisation : ${specialisation}` : "",
    p.certification ? `Certification préparée : ${p.certification}` : "",
    p.accroche ? `En bref : ${p.accroche}` : "",
    p.positionnement ? `Positionnement : ${p.positionnement}` : "",
    `Durée : ${p.dureeHeures} heures`,
    p.rythme ? `Format : ${p.rythme}` : "",
    `Langue : ${p.langue}`,
    `Objectifs : ${p.objectifs}`,
    liste("Public visé", p.publicVise),
    p.prerequis ? `Prérequis : ${p.prerequis}` : "",
    liste("Compétences", p.competences),
    liste("Livrables", p.livrables),
    liste("Outils fournis", p.outils),
    liste("Pédagogie", p.approche),
    liste("Bénéfices", p.debouches),
    p.mentionsLegales ? `Mention obligatoire : ${p.mentionsLegales}` : "",
    p.modules.length
      ? `Programme :\n${p.modules.map((m) => `  - ${m.titre}${m.objectif ? ` — ${m.objectif}` : ""}`).join("\n")}`
      : "",
    sessions.length
      ? `Sessions à venir :\n${sessions.map(decrireSession).join("\n")}`
      : "Sessions à venir : aucune date publiée pour le moment.",
  ]
    .filter(Boolean)
    .join("\n");
}

function decrireTarifs(t: Tarifs): string {
  return [
    "# Tarifs (identiques pour tous les parcours)",
    `Payé comptant : ${euros(t.prixComptantCentimes, t.devise)}`,
    ...t.plans.map(
      (p) =>
        `- ${p.libelle} : ${euros(p.totalCentimes, t.devise)} au total (${p.echeancesCentimes
          .map((c) => euros(c, t.devise))
          .join(" + ")}) — ${p.conditions}`,
    ),
    /*
      ⚠️ **La liste vraie est celle du code, pas celle du CMS.** `moyensPaiement`
      du global `tarifs` porte encore « Western Union · Ria · MoneyGram » — la
      liste d'avant le 28 août, masquée dans /admin et retirée de la fiche le
      1er septembre 2026 pour cette raison même. L'assistant la récitait : à qui
      demandait s'il pouvait payer par carte, il répondait que non. C'est le
      défaut qui a coûté un vrai prospect, réapparu une porte plus loin.
    */
    `Moyens de paiement acceptés : ${MOYENS_AFFICHES.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Comment se déroulent les formations, et quand on accède à la classe.
 *
 * ⚠️ **Dicté par la direction le 7 octobre 2026**, comme réponses types de
 * l'équipe aux prospects : le programme se lit dans la plaquette, les séances
 * se donnent en direct, elles sont enregistrées dans l'espace Classroom, on y
 * accède douze mois, et l'accès s'ouvre une fois le contrat signé **et** la
 * première tranche payée. Ce sont des faits de la maison, que le catalogue ne
 * porte pas : ils vivent ici, une seule fois, et l'assistant les lit comme le
 * reste.
 *
 * ⚠️ **Ni le lien ni le code de la classe** : ils ouvrent la classe aux seuls
 * inscrits (voir `lienVisio`, jamais transmis).
 */
export const DEROULEMENT = [
  "# Déroulement des formations (faits établis par la direction)",
  "- Toutes les formations se suivent en ligne, en direct (live), avec un formateur, à heure fixe : l'horaire de chaque formation figure dans ses sessions ci-dessous.",
  "- Chaque séance est enregistrée et mise à disposition dans l'espace Classroom du participant.",
  "- Le participant garde l'accès à Classroom pendant 12 mois.",
  "- L'accès à Classroom s'ouvre une fois le contrat de formation signé ET la première tranche payée — pas avant. Ne donne jamais de lien ni de code d'accès à Classroom.",
  "- Le programme détaillé de chaque formation est expliqué dans sa plaquette PDF.",
  "- Les étapes : 1) se pré-inscrire en ligne (gratuit, n'engage à rien) ; 2) demander son contrat depuis la page de son dossier ; 3) le signer en ligne ; 4) recevoir par courriel les coordonnées de règlement selon le moyen choisi ; 5) payer la première tranche ; 6) accéder à Classroom.",
  "- Aucun paiement ne se fait sur le site : les coordonnées de règlement arrivent par courriel, après la signature du contrat.",
].join("\n");

/** Le catalogue en texte, tel que le modèle le lit. */
export function connaissancesCatalogue(entree: {
  programmes: Programme[];
  specialisations: Specialisation[];
  sessions: Session[];
  tarifs: Tarifs;
  site: string;
  maintenant?: Date;
}): string {
  const noms = new Map(entree.specialisations.map((s) => [s.slug as string, s.nom]));
  const maintenant = (entree.maintenant ?? new Date()).toISOString();
  const aVenir = (slug: string) =>
    entree.sessions
      .filter((s) => s.programmeSlug === slug && s.fin > maintenant)
      .sort((a, b) => a.debut.localeCompare(b.debut));

  return [
    `# CLIXA Institute — ${entree.programmes.length} formations au catalogue`,
    `Catalogue complet : ${entree.site}/formations`,
    `Emploi du temps de toutes les formations : ${entree.site}/emploi-du-temps`,
    DEROULEMENT,
    decrireTarifs(entree.tarifs),
    ...entree.programmes.map((p) =>
      decrireProgramme(p, noms.get(p.specialisation), aVenir(p.slug), entree.site),
    ),
  ].join("\n\n");
}

/**
 * Où se trouve le visiteur, pour que la conversation parte de là.
 *
 * ⚠️ **Le chemin vient du navigateur, donc de n'importe qui.** Il n'est jamais
 * recopié dans la consigne : seule une fiche **qui existe au catalogue** donne
 * une phrase, écrite par nous, avec son titre lu dans le catalogue. Un chemin
 * inconnu, ou fabriqué pour glisser une instruction au modèle, ne rend rien.
 */
export function contextePage(
  chemin: unknown,
  programmes: Pick<Programme, "slug" | "titre">[],
): string | undefined {
  if (typeof chemin !== "string" || chemin.length > 200) return undefined;
  const fiche = /^\/formations\/([a-z0-9-]+)\/?$/.exec(chemin);
  if (fiche) {
    const p = programmes.find((x) => x.slug === fiche[1]);
    return p
      ? `Le visiteur consulte en ce moment la fiche de la formation « ${p.titre} ».`
      : undefined;
  }
  if (chemin === "/formations") return "Le visiteur parcourt le catalogue des formations.";
  if (chemin === "/emploi-du-temps")
    return "Le visiteur consulte l'emploi du temps des formations.";
  return undefined;
}

export function consignesAssistant(
  catalogue: string,
  site: string,
  maintenant = new Date(),
  contexte?: string,
): string {
  return `Tu es l'assistant IA du site ${site}, CLIXA Institute : formations exécutives et certifiantes pour cadres et dirigeants en Afrique. Tu conseilles comme un conseiller d'admission expérimenté : chaleureux, professionnel, précis, au vouvoiement.${contexte ? `\n\n${contexte} Pars de cette formation si la question ne précise pas laquelle.` : ""}

CLIXA se développe en « ${DEVISE_CLIXA} ». Si on te demande ce que le sigle veut dire, réponds-le — c'est un fait de la maison, pas une information à chercher dans le catalogue. Et c'est la seule phrase que tu peux donner sans qu'elle figure dans les données ci-dessous.

Règles, sans exception :
1. Réponds UNIQUEMENT à partir du catalogue ci-dessous. N'invente jamais un prix, une date, une durée, une place disponible ou un engagement. Si l'information n'y est pas, dis-le et oriente vers un conseiller.
2. Réponds dans la langue et l'alphabet du visiteur. S'il écrit en darija (même en lettres latines, ex. « wach kayn », « ch7al »), réponds en darija dans le même alphabet ; en arabe, en arabe ; en anglais, en anglais ; sinon en français.
2 bis. UNE SEULE LANGUE PAR RÉPONSE, du premier mot au dernier — y compris les intitulés, les listes et la phrase qui oriente vers un conseiller. Ne commence pas en darija pour finir en français. Si le visiteur mélange lui-même deux langues, choisis celle de sa question et tiens-la. Seuls les noms propres ne se traduisent pas : le titre exact d'une formation, « CLIXA Institute », « WhatsApp », les montants et les adresses web.
3. Mène une vraie conversation, comme un conseiller : réponds d'abord à la question, clairement (3 à 8 phrases, ou une courte liste ; davantage seulement si on te le demande), puis propose UNE suite utile — une question pour mieux comprendre le besoin (le poste occupé, l'objectif, la formation visée, le rythme de paiement souhaité) ou l'étape suivante (la plaquette, l'emploi du temps, la pré-inscription). Une seule question à la fois. Ne répète pas ce que tu as déjà dit plus haut dans la conversation.
3 bis. Réponses types de l'équipe, à suivre :
   - « Quel est le programme ? » → donne le lien de la plaquette PDF de la formation, dis que le programme détaillé y est expliqué, et cite en deux lignes les grands thèmes du programme.
   - « Comment se déroule la formation ? » → en ligne, en direct (live), à heure fixe ; donne l'horaire de la session ; les séances sont enregistrées dans l'espace Classroom, accessible 12 mois.
   - « Comment accéder à Classroom ? » → une fois le contrat signé et la première tranche payée.
   - « Quels sont vos prix ? » → les trois formules du barème (comptant, 2 tranches, 3 tranches), avec leurs montants et le total de chacune.
   - Quand le visiteur montre de l'intérêt (« je suis intéressé », « comment m'inscrire »), propose la pré-inscription avec son lien : elle est gratuite, en ligne, et n'engage à rien.
4. Quand tu cites une formation, donne le lien de sa page.
5. Pour s'inscrire, poser une question sur son dossier, ou tout cas particulier : oriente vers la page de la formation (bouton d'inscription), WhatsApp Admissions ${RESEAUX_CLIXA.whatsapp.url}, ou la page ${site}/contact pour nous écrire.
6. IMPORTANT — il n'existe plus de formulaire pour demander à être rappelé sans s'inscrire. Ne promets jamais qu'un conseiller rappellera quelqu'un qui laisse son numéro : la page de contact ne recueille rien. Pour être rappelé, il faut d'abord se pré-inscrire — cela n'engage à rien — puis cliquer « Être rappelé par un conseiller » sur la page de son dossier. Qui veut parler tout de suite écrit sur WhatsApp.
6 bis. Ne demande jamais de données personnelles (nom, téléphone, email) dans la conversation. Demander le poste occupé ou l'objectif professionnel est permis : cela sert à conseiller.
7. Hors sujet (autre que CLIXA Institute et ses formations) : décline poliment en une phrase.
7 bis. Tu es un assistant IA, pas une personne de l'équipe. Ne prétends jamais le contraire ; si on te le demande, dis-le simplement, et propose WhatsApp pour parler à un conseiller.
8. Mise en forme : texte simple, **gras** pour l'essentiel, listes avec « - ». Écris les liens en adresse brute (https://…), sans crochets. Pas de titres, pas de tableaux.

Nous sommes le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "Africa/Casablanca" }).format(maintenant)}.

=== CATALOGUE ===
${catalogue}`;
}

/* ─────────────────────────────  GEMINI  ───────────────────────────── */

export type MessageAssistant = { role: "user" | "assistant"; content: string };

export class ErreurAssistant extends Error {
  constructor(
    message: string,
    readonly status: number,
    /*
      ⚠️ Distinct du statut. Gemini répond lui-même 503 quand un modèle est
      surchargé : confondre les deux faisait annoncer au visiteur un assistant
      « en cours de mise en service » alors qu'il l'était depuis longtemps.
    */
    readonly nonConfigure = false,
  ) {
    super(message);
  }
}

const reessayable = (status: number) => status === 404 || status === 429 || status >= 500;

/*
  ⚠️ Plusieurs modèles, essayés dans l'ordre. Google renomme et retire les siens
  régulièrement : un nom en dur qui disparaît rendrait l'assistant muet du jour
  au lendemain. Un 404 (modèle inconnu), un 429 (quota épuisé) ou une erreur 5xx
  (modèle surchargé, fréquent aux heures de pointe) fait passer au suivant ;
  une autre erreur est remontée.

  Flash d'abord : Flash-Lite répondait en français à une question posée en
  anglais et mêlait les alphabets en darija. Son quota gratuit est plus large,
  il prend donc le relais quand celui de Flash est épuisé pour la journée —
  l'assistant perd en finesse, il ne se tait pas.
*/
const MODELES = [
  process.env.GEMINI_MODEL,
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash-lite",
].filter((m): m is string => Boolean(m));

/** Le texte de la réponse, au fil de l'eau. */
export async function repondreEnFlux(
  systeme: string,
  messages: MessageAssistant[],
): Promise<ReadableStream<Uint8Array>> {
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) throw new ErreurAssistant("GEMINI_API_KEY absente", 503, true);

  const corps = JSON.stringify({
    systemInstruction: { parts: [{ text: systeme }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
  });

  let derniere: ErreurAssistant | undefined;
  for (const modele of MODELES) {
    const reponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modele}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": cle },
        body: corps,
        signal: AbortSignal.timeout(45_000),
      },
    );
    if (reponse.ok && reponse.body) return extraireTexte(reponse.body);

    derniere = new ErreurAssistant(
      `${modele} → ${reponse.status} ${await reponse.text()}`,
      reponse.status,
    );
    if (!reessayable(reponse.status)) break;
  }
  throw derniere ?? new ErreurAssistant("aucun modèle", 502);
}

/** Des événements SSE de Gemini au texte seul. */
export function extraireTexte(flux: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decodeur = new TextDecoder();
  const encodeur = new TextEncoder();
  let tampon = "";
  /*
    ── ⚠️ Une réponse coupée ne doit pas passer pour une réponse ─────────────
    Mesuré en production : « Cette information ne figure pas dans notre
    catalogue. Notre formation constitue un accompagnement complet à la
    préparation de » — et c'est tout. Le flux s'arrête en plein mot, la fenêtre
    affiche la moitié d'une phrase, et rien ne dit au visiteur qu'il lui manque
    quelque chose. Il repart avec un renseignement tronqué, ce qui est pire que
    pas de renseignement.

    Gemini annonce pourtant comment il termine (`finishReason`) : « STOP » est
    une fin normale, tout le reste — plafond de jetons atteint, filtre, arrêt du
    modèle — ne l'est pas. On le dit alors, en une ligne, avec quoi faire.
  */
  let finPropre = false;
  let duTexte = false;

  const lignes = (fin: boolean, sortie: TransformStreamDefaultController<Uint8Array>) => {
    let i: number;
    while ((i = tampon.indexOf("\n")) !== -1 || (fin && tampon)) {
      const ligne = (i === -1 ? tampon : tampon.slice(0, i)).trim();
      tampon = i === -1 ? "" : tampon.slice(i + 1);
      if (!ligne.startsWith("data:")) continue;
      try {
        const donnees = JSON.parse(ligne.slice(5)) as {
          candidates?: {
            finishReason?: string;
            content?: { parts?: { text?: string; thought?: boolean }[] };
          }[];
        };
        const candidat = donnees.candidates?.[0];
        if (candidat?.finishReason) finPropre = candidat.finishReason === "STOP";
        const texte = (candidat?.content?.parts ?? [])
          .map((p) => (p.thought ? "" : (p.text ?? "")))
          .join("");
        if (texte) {
          duTexte = true;
          sortie.enqueue(encodeur.encode(texte));
        }
      } catch {
        // Ligne partielle ou événement sans texte.
      }
    }
  };

  return flux.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(morceau, sortie) {
        tampon += decodeur.decode(morceau, { stream: true });
        lignes(false, sortie);
      },
      flush(sortie) {
        lignes(true, sortie);
        if (duTexte && !finPropre) {
          sortie.enqueue(
            encodeur.encode(
              `\n\n_(Réponse interrompue. Reposez la question, ou écrivez-nous : ${RESEAUX_CLIXA.whatsapp.url})_`,
            ),
          );
        }
      },
    }),
  );
}
