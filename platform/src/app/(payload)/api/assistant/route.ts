import { appelant, cadenceOk, tropVite } from "@/lib/cadence";
import { getProgrammes, getSessions, getSpecialisations, getTarifs } from "@/lib/catalogue";
import {
  ErreurAssistant,
  connaissancesCatalogue,
  consignesAssistant,
  repondreEnFlux,
  type MessageAssistant,
} from "@/lib/assistant";
import { SITE_URL } from "@/lib/seo";

/**
 * L'assistant IA du site — voir `lib/assistant.ts` pour ce qu'il sait et ce
 * qu'il ne dit pas.
 *
 * Entrée : POST { messages: [{ role, content }] }
 * Sortie : le texte de la réponse en flux, ou une erreur JSON.
 */

const MAX_MESSAGES = 16;
const MAX_CARACTERES = 1500;

const erreur = (status: number, corps: Record<string, string>) =>
  Response.json(corps, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  /*
    Le quota gratuit de Gemini est partagé par tous les visiteurs du jour : un
    seul onglet qui boucle ne doit pas l'épuiser pour les autres.
  */
  if (!cadenceOk("assistant", appelant(request), 20, 10 * 60_000)) {
    return tropVite(60);
  }

  const corps = (await request.json().catch(() => null)) as { messages?: unknown } | null;
  const messages = (Array.isArray(corps?.messages) ? corps.messages : [])
    .slice(-MAX_MESSAGES)
    .filter(
      (m): m is MessageAssistant =>
        typeof m === "object" &&
        m !== null &&
        ((m as MessageAssistant).role === "user" || (m as MessageAssistant).role === "assistant") &&
        typeof (m as MessageAssistant).content === "string" &&
        (m as MessageAssistant).content.trim() !== "" &&
        (m as MessageAssistant).content.length <= MAX_CARACTERES,
    );

  // Gemini exige une conversation qui commence et finit par le visiteur.
  while (messages[0]?.role === "assistant") messages.shift();
  if (!messages.length || messages.at(-1)?.role !== "user") {
    return erreur(400, { error: "Message invalide." });
  }

  try {
    const [programmes, specialisations, tarifs] = await Promise.all([
      getProgrammes(),
      getSpecialisations(),
      getTarifs(),
    ]);
    const sessions = (await Promise.all(programmes.map((p) => getSessions(p.slug)))).flat();
    const catalogue = connaissancesCatalogue({
      programmes,
      specialisations,
      sessions,
      tarifs,
      site: SITE_URL,
    });

    const flux = await repondreEnFlux(consignesAssistant(catalogue, SITE_URL), messages);
    return new Response(flux, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    const status = e instanceof ErreurAssistant ? e.status : 500;
    console.error("assistant", status, e instanceof Error ? e.message : e);
    /*
      ⚠️ « Non configuré » ne se dit **que** si la clef manque : c'est le
      drapeau porté par l'erreur, pas son statut. Gemini rend lui aussi des 503
      quand ses modèles sont chargés — deux requêtes sur huit, mesuré en
      production le 14 septembre 2026 — et les confondre faisait annoncer au
      visiteur un assistant « en cours de mise en service » alors qu'il tourne.
    */
    if (e instanceof ErreurAssistant && e.nonConfigure) {
      return erreur(503, { code: "NOT_CONFIGURED", error: "Assistant non configuré." });
    }
    /*
      Une surcharge qui a épuisé tous les modèles se dit comme un quota : très
      sollicité, réessayez — et non « l'assistant ne répond pas », qui n'apprend
      rien et ne propose rien.
    */
    if (status === 429 || status === 503) {
      return erreur(429, {
        error:
          "L'assistant est très sollicité. Réessayez dans un instant ou écrivez-nous sur WhatsApp.",
      });
    }
    return erreur(502, { error: "L'assistant ne répond pas pour le moment." });
  }
}
