import { RESEAUX_CLIXA } from "@/lib/reseaux";
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
    t.moyensPaiement.length ? `Moyens de paiement : ${t.moyensPaiement.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

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
    decrireTarifs(entree.tarifs),
    ...entree.programmes.map((p) =>
      decrireProgramme(p, noms.get(p.specialisation), aVenir(p.slug), entree.site),
    ),
  ].join("\n\n");
}

export function consignesAssistant(
  catalogue: string,
  site: string,
  maintenant = new Date(),
): string {
  return `Tu es l'assistant du site ${site}, CLIXA Institute : formations exécutives et certifiantes pour cadres et dirigeants en Afrique.

Règles, sans exception :
1. Réponds UNIQUEMENT à partir du catalogue ci-dessous. N'invente jamais un prix, une date, une durée, une place disponible ou un engagement. Si l'information n'y est pas, dis-le et oriente vers un conseiller.
2. Réponds dans la langue et l'alphabet du visiteur. S'il écrit en darija (même en lettres latines, ex. « wach kayn », « ch7al »), réponds en darija dans le même alphabet ; en arabe, en arabe ; en anglais, en anglais ; sinon en français.
3. Sois bref et concret : 2 à 6 phrases, ou une courte liste.
4. Quand tu cites une formation, donne le lien de sa page.
5. Pour s'inscrire, poser une question sur son dossier, ou tout cas particulier : oriente vers la page de la formation (bouton d'inscription), WhatsApp Admissions ${RESEAUX_CLIXA.whatsapp.url}, ou la page ${site}/contact pour être rappelé.
6. Ne demande jamais de données personnelles (nom, téléphone, email) dans la conversation.
7. Hors sujet (autre que CLIXA Institute et ses formations) : décline poliment en une phrase.
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
  ) {
    super(message);
  }
}

/*
  ⚠️ Plusieurs modèles, essayés dans l'ordre. Google renomme et retire les siens
  régulièrement : un nom en dur qui disparaît rendrait l'assistant muet du jour
  au lendemain. Un 404 (modèle inconnu) ou un 429 (quota du modèle épuisé) fait
  passer au suivant ; toute autre erreur est remontée. Les « -lite » d'abord :
  le quota gratuit y est le plus large.
*/
const MODELES = [
  process.env.GEMINI_MODEL,
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
].filter((m): m is string => Boolean(m));

/** Le texte de la réponse, au fil de l'eau. */
export async function repondreEnFlux(
  systeme: string,
  messages: MessageAssistant[],
): Promise<ReadableStream<Uint8Array>> {
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) throw new ErreurAssistant("GEMINI_API_KEY absente", 503);

  const corps = JSON.stringify({
    systemInstruction: { parts: [{ text: systeme }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
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
    if (reponse.status !== 404 && reponse.status !== 429) break;
  }
  throw derniere ?? new ErreurAssistant("aucun modèle", 502);
}

/** Des événements SSE de Gemini au texte seul. */
export function extraireTexte(flux: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decodeur = new TextDecoder();
  const encodeur = new TextEncoder();
  let tampon = "";

  const lignes = (fin: boolean, sortie: TransformStreamDefaultController<Uint8Array>) => {
    let i: number;
    while ((i = tampon.indexOf("\n")) !== -1 || (fin && tampon)) {
      const ligne = (i === -1 ? tampon : tampon.slice(0, i)).trim();
      tampon = i === -1 ? "" : tampon.slice(i + 1);
      if (!ligne.startsWith("data:")) continue;
      try {
        const donnees = JSON.parse(ligne.slice(5)) as {
          candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
        };
        const texte = (donnees.candidates?.[0]?.content?.parts ?? [])
          .map((p) => (p.thought ? "" : (p.text ?? "")))
          .join("");
        if (texte) sortie.enqueue(encodeur.encode(texte));
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
      },
    }),
  );
}
