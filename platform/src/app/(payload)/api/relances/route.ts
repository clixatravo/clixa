import { rendreLesPlacesExpirees } from "@/lib/places";
import { timingSafeEqual } from "node:crypto";
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

/**
 * Compare le jeton reçu au secret, en temps constant.
 *
 * `!==` s'arrête au premier caractère qui diffère : le temps de réponse dit
 * alors combien de caractères étaient justes, et un jeton se devine caractère
 * par caractère. `timingSafeEqual` compare toujours toute la longueur.
 *
 * Elle exige deux tampons de même taille : on écarte donc les longueurs
 * différentes d'abord, ce qui ne révèle rien de plus que la taille du secret.
 */
function jetonValide(recu: string | null, secret: string): boolean {
  const attendu = Buffer.from(`Bearer ${secret}`);
  const fourni = Buffer.from(recu ?? "");
  if (fourni.length !== attendu.length) return false;
  return timingSafeEqual(fourni, attendu);
}

/** On prévient trois jours avant, puis on relance tous les sept jours. */
const JOURS_AVANT = 3;
const JOURS_ENTRE_DEUX = 7;

const JOUR_MS = 86400000;

export async function GET(request: Request) {
  /*
    La route est joignable de l'extérieur par nature — c'est le planificateur qui
    l'appelle. Le secret est donc la seule chose qui sépare le monde d'une vague
    de courriels envoyée à tous les participants.

    ── Pourquoi elle refuse quand le secret manque ────────────────────────────
    La garde était écrite `if (secret) { ...vérifier... }` : sans `CRON_SECRET`,
    elle ne s'exécutait pas et l'adresse répondait 200 à n'importe qui. Un
    contrôle d'accès qui se désactive tout seul quand la configuration manque
    fait exactement l'inverse de ce qu'on lui demande — et il le fait en silence,
    au moment précis où l'on croit être protégé.

    Elle refuse maintenant. Le planificateur de Vercel pose l'en-tête
    `Authorization: Bearer $CRON_SECRET` de lui-même dès que la variable existe :
    tant qu'elle manque, la tâche échoue visiblement plutôt que de laisser la
    porte ouverte.
  */
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error(
      "[relances] CRON_SECRET absent : la route refuse plutôt que de s'ouvrir. " +
        "Définir la variable sur Vercel, puis redéployer.",
    );
    return Response.json({ erreur: "non configuré" }, { status: 503 });
  }

  if (!jetonValide(request.headers.get("authorization"), secret)) {
    return Response.json({ erreur: "non autorisé" }, { status: 401 });
  }

  const payload = await getPayload({ config });
  const maintenant = Date.now();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.clixa.africa";

  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { statut: { in: ["demandee", "confirmee"] } },
    limit: 500,
    depth: 2,
    overrideAccess: true,
  });

  const bilan: string[] = [];
  const manques: string[] = [];
  let examinees = 0;

  for (const dossier of docs) {
    const echeances = dossier.echeances ?? [];
    let modifie = false;

    /*
      ⚠️ Une boucle, pas un `map`. Il faut attendre chaque envoi pour savoir
      s'il est parti, et un `map` ne sait pas attendre — il rendait des
      promesses qu'on jetait aussitôt.
    */
    const suivantes: typeof echeances = [];

    for (const e of echeances) {
      if (e.statut === "regle" || !e.dateLimite) {
        suivantes.push(e);
        continue;
      }
      examinees++;

      const limite = new Date(e.dateLimite).getTime();
      const joursRestants = Math.floor((limite - maintenant) / JOUR_MS);
      if (joursRestants > JOURS_AVANT) {
        suivantes.push(e);
        continue;
      }

      // Déjà relancée récemment : on laisse respirer.
      if (e.relanceeLe) {
        const depuis = Math.floor((maintenant - new Date(e.relanceeLe).getTime()) / JOUR_MS);
        if (depuis < JOURS_ENTRE_DEUX) {
          suivantes.push(e);
          continue;
        }
      }

      const session = typeof dossier.session === "object" ? dossier.session : undefined;
      const programme =
        session && typeof session.programme === "object" ? session.programme : undefined;

      const ligne =
        `${dossier.reference} · ${dossier.apprenantNom} · ${e.montant} € ` +
        `· échéance du ${String(e.dateLimite).slice(0, 10)}` +
        (joursRestants < 0 ? ` · ${-joursRestants} jour(s) de retard` : "");

      /*
        ── On attend l'envoi, et on n'écrit la trace que s'il est parti ───────

        ⚠️ Deux défauts tenaient dans l'ancienne ligne `void courrielRelance(…)`.

        Le premier : la date `relanceeLe` était posée sans savoir si le courriel
        était parti. Un envoi manqué — quota épuisé, ce qui est arrivé le
        29 août 2026 — et l'échéance passait pour relancée : plus rien pendant
        sept jours, sans que personne ne l'apprenne. Le participant en retard
        n'entendait jamais parler de son retard.

        Le second : `void` n'attend pas. Sur une fonction serverless, ce qui
        n'est pas attendu avant la réponse peut ne jamais s'exécuter — le
        processus est gelé dès que la réponse part.

        Laisser l'échéance intacte quand l'envoi échoue la fait reprendre au
        passage du lendemain : la relance est retardée d'un jour, pas perdue.
      */
      const parti = await courrielRelance(payload, {
        reference: String(dossier.reference),
        apprenantNom: String(dossier.apprenantNom),
        apprenantEmail: String(dossier.apprenantEmail),
        programmeTitre: programme?.titre ?? "votre parcours",
        montant: e.montant ?? 0,
        dateLimite: String(e.dateLimite),
        enRetard: joursRestants < 0,
        urlDossier: `${site}/inscription/${dossier.reference}`,
      });

      if (!parti) {
        // Le bilan de l'équipe dit la vérité : elle saura qui n'a rien reçu.
        manques.push(ligne);
        suivantes.push(e);
        continue;
      }

      bilan.push(ligne);
      modifie = true;
      suivantes.push({ ...e, relanceeLe: new Date(maintenant).toISOString() });
    }

    if (!modifie) continue;

    await payload.update({
      collection: "inscriptions",
      id: dossier.id,
      overrideAccess: true,
      data: { echeances: suivantes },
    });
  }

  /*
    ── Rendre les places que le temps a libérées ─────────────────────────────
    Une inscription tient sa place sept jours sans versement. Passé ce délai
    elle la rend — mais le temps n'écrit rien : sans repasser, une place
    expirée resterait retenue jusqu'à ce qu'un hasard touche à sa session.

    On recompte donc chaque session en cours, une fois par jour. C'est le seul
    endroit du système où quelque chose change parce qu'un délai s'est écoulé
    et non parce que quelqu'un a agi.
  */
  const rendues = await rendreLesPlacesExpirees(payload);

  /*
    Le bilan porte aussi ce qui n'est pas parti. Une tâche qui échoue à moitié
    en silence est pire qu'une tâche qui échoue : l'équipe croit les relances
    faites. Ces échéances seront reprises demain, mais quelqu'un doit savoir
    que le service de courriel a refusé aujourd'hui.
  */
  await courrielBilanRelances(
    payload,
    manques.length === 0
      ? bilan
      : [...bilan, "", `⚠️ ${manques.length} envoi(s) impossible(s), repris demain :`, ...manques],
  );

  const alerte = manques.length > 0 ? `, ${manques.length} envoi(s) IMPOSSIBLE(S)` : "";
  payload.logger.info(
    `[relances] ${docs.length} dossier(s), ${examinees} échéance(s) examinée(s), ` +
      `${bilan.length} relance(s)${alerte}`,
  );

  return Response.json({
    dossiers: docs.length,
    echeancesExaminees: examinees,
    relances: bilan.length,
    // Ce que le planificateur verra dans son journal si le courriel flanche.
    envoisImpossibles: manques.length,
    placesRendues: rendues,
  });
}
