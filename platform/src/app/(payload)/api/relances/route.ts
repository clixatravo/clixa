import { getPayload } from "payload";
import config from "@payload-config";
import { courrielBilanRelances, courrielRelance } from "@/lib/courriel";

/**
 * BE-17 — Relance des échéances.
 *
 * Appelée une fois par jour par le planificateur de Vercel (voir vercel.json).
 *
 * ── Ce qu'elle relance ──────────────────────────────────────────────────────
 * Une échéance non réglée, dont la date approche ou est passée, sur un dossier
 * encore vivant. Un dossier annulé ou soldé ne reçoit rien.
 *
 * ── Ce qu'elle ne fait pas ──────────────────────────────────────────────────
 * Elle ne relance pas deux fois la même semaine. Chaque envoi laisse une date
 * sur l'échéance ; sans cette trace, un dossier en retard recevrait un message
 * par jour, ce qui fait fuir plus sûrement qu'un impayé.
 *
 * ── Pourquoi une route et non un crochet ────────────────────────────────────
 * Rien ne déclenche une relance côté application : c'est le temps qui passe.
 * Il faut donc quelqu'un pour appeler, et ce quelqu'un est le planificateur.
 */

/** On prévient trois jours avant, puis on relance tous les sept jours. */
const JOURS_AVANT = 3;
const JOURS_ENTRE_DEUX = 7;

const JOUR_MS = 86400000;

export async function GET(request: Request) {
  /*
    La route est publique par nature — le planificateur l'appelle depuis
    l'extérieur. Le secret évite que n'importe qui déclenche une vague de
    courriels en visitant l'adresse.
  */
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const fourni = request.headers.get("authorization");
    if (fourni !== `Bearer ${secret}`) {
      return Response.json({ erreur: "non autorisé" }, { status: 401 });
    }
  }

  const payload = await getPayload({ config });
  const maintenant = Date.now();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://clixa-institute.vercel.app";

  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { statut: { in: ["demandee", "confirmee"] } },
    limit: 500,
    depth: 2,
    overrideAccess: true,
  });

  const bilan: string[] = [];
  let examinees = 0;

  for (const dossier of docs) {
    const echeances = dossier.echeances ?? [];
    let modifie = false;

    const suivantes = echeances.map((e) => {
      if (e.statut === "regle" || !e.dateLimite) return e;
      examinees++;

      const limite = new Date(e.dateLimite).getTime();
      const joursRestants = Math.floor((limite - maintenant) / JOUR_MS);
      if (joursRestants > JOURS_AVANT) return e;

      // Déjà relancée récemment : on laisse respirer.
      if (e.relanceeLe) {
        const depuis = Math.floor((maintenant - new Date(e.relanceeLe).getTime()) / JOUR_MS);
        if (depuis < JOURS_ENTRE_DEUX) return e;
      }

      const session = typeof dossier.session === "object" ? dossier.session : undefined;
      const programme =
        session && typeof session.programme === "object" ? session.programme : undefined;

      bilan.push(
        `${dossier.reference} · ${dossier.apprenantNom} · ${e.montant} € ` +
          `· échéance du ${String(e.dateLimite).slice(0, 10)}` +
          (joursRestants < 0 ? ` · ${-joursRestants} jour(s) de retard` : ""),
      );

      void courrielRelance(payload, {
        reference: String(dossier.reference),
        apprenantNom: String(dossier.apprenantNom),
        apprenantEmail: String(dossier.apprenantEmail),
        programmeTitre: programme?.titre ?? "votre parcours",
        montant: e.montant ?? 0,
        dateLimite: String(e.dateLimite),
        enRetard: joursRestants < 0,
        urlDossier: `${site}/inscription/${dossier.reference}`,
      });

      modifie = true;
      return { ...e, relanceeLe: new Date(maintenant).toISOString() };
    });

    if (!modifie) continue;

    await payload.update({
      collection: "inscriptions",
      id: dossier.id,
      overrideAccess: true,
      data: { echeances: suivantes },
    });
  }

  await courrielBilanRelances(payload, bilan);

  payload.logger.info(
    `[relances] ${docs.length} dossier(s), ${examinees} échéance(s) examinée(s), ${bilan.length} relance(s)`,
  );

  return Response.json({
    dossiers: docs.length,
    echeancesExaminees: examinees,
    relances: bilan.length,
  });
}
