/**
 * Écrire en base ce qui part, puis ce que Resend en dit. Voir `lib/suivi-courriel.ts`.
 */
import { randomBytes } from "node:crypto";
import type { Payload } from "payload";
import { sql } from "drizzle-orm";
import {
  adresseNue,
  GROUPES_ETAT,
  statutApres,
  statutDeLEvenement,
  type NatureCourriel,
  type SuiviDUneNature,
} from "./suivi-courriel";

/**
 * Note un envoi — réussi, avec l'identifiant de Resend ; ou manqué, avec la
 * raison.
 *
 * ⚠️ **Ne lève jamais.** Elle est appelée sur le chemin de chaque inscription,
 * juste après l'envoi : une base lente ou une contrainte violée ne doivent pas
 * transformer un courriel parti en « erreur technique » pour le participant.
 *
 * ⚠️ **Rien n'est noté sans expéditeur réel.** En développement, sans
 * `RESEND_API_KEY`, Payload écrit les messages dans la console et ne rend pas
 * d'identifiant : noter ces « envois » remplirait la liste de courriels qui ne
 * sont jamais partis. Et un échec n'est noté que si un expéditeur est
 * configuré — sinon ce serait la panne simulée d'une garde qu'on lirait.
 *
 * ⚠️ **L'appel de Resend peut arriver avant cette écriture.** Resend répond
 * puis prévient ; si « email.sent » est déjà passé, la ligne existe et la
 * contrainte d'unicité refuse la seconde. C'est le bon résultat : la ligne
 * écrite par l'appel porte déjà l'état le plus récent.
 */
export async function noterLEnvoi(
  payload: Payload,
  envoi: { to: string; subject: string; id?: string; erreur?: string; nature?: NatureCourriel },
): Promise<void> {
  const expediteurReel = Boolean(process.env.RESEND_API_KEY);
  if (!envoi.id && !(envoi.erreur && expediteurReel)) return;

  try {
    await payload.create({
      collection: "courriels",
      overrideAccess: true,
      depth: 0,
      data: {
        destinataire: adresseNue(envoi.to),
        objet: envoi.subject.slice(0, 300),
        statut: envoi.id ? "envoye" : "echec",
        nature: envoi.nature ?? "dossier",
        ...(envoi.id ? { resendId: envoi.id } : {}),
        envoyeLe: new Date().toISOString(),
        ...(envoi.erreur ? { detail: envoi.erreur.slice(0, 300) } : {}),
      },
    });
  } catch (e) {
    /*
      Le cas ordinaire ici est l'appel de Resend arrivé le premier : la ligne
      existe déjà. Une ligne de journal suffit, pas une pile d'appels.
    */
    /*
      ⚠️ Mais la ligne créée par l'appel ne sait pas ce qu'était le courriel :
      Resend ne le dit pas. La nature est la seule chose que l'envoi connaît
      et que l'appel ignore — on la pose, et rien d'autre : l'état, lui, est
      celui que Resend a écrit.
    */
    if (envoi.id && envoi.nature && envoi.nature !== "dossier") {
      try {
        await payload.db.drizzle.execute(
          sql`UPDATE courriels SET nature = ${envoi.nature}::enum_courriels_nature WHERE resend_id = ${envoi.id}`,
        );
        return;
      } catch {
        /* On retombe sur la ligne de journal ci-dessous. */
      }
    }
    payload.logger.warn(
      { to: envoi.to, raison: e instanceof Error ? e.message : String(e) },
      "[courriel] envoi non noté",
    );
  }
}

/** Ce que Resend envoie, pour ce qu'on en lit. */
export interface EvenementResend {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    subject?: string;
    created_at?: string;
    bounce?: { message?: string; type?: string; subType?: string };
  };
}

/**
 * Applique un événement de Resend au courriel qu'il désigne.
 *
 * Rend ce qui s'est passé, pour que la route le dise et que la garde le lise.
 *
 * - **Un appel rejoué ne compte qu'une fois** : Resend réessaie tant qu'on ne
 *   lui a pas répondu 200, et l'identifiant de l'appel (`svix-id`) est le même.
 * - **Un courriel inconnu est créé** : ceux partis avant ce suivi, ou dont
 *   l'appel a devancé `noterLEnvoi`. L'ignorer ferait perdre un rejet.
 *
 * ── ⚠️ Pourquoi du SQL, et un verrou ────────────────────────────────────────
 * Resend envoie « parti » et « remis » à quelques centaines de millisecondes
 * d'écart, souvent en même temps. Avec `payload.update`, les deux appels lisent
 * la ligne ensemble, chacun calcule son état, et le dernier à écrire gagne :
 * « parti » arrivé une milliseconde après « remis » réécrit « parti », et la
 * ligne ment pour toujours. `payload.update` réécrit d'ailleurs la ligne
 * entière, état compris, même quand on ne lui passe que le journal.
 *
 * On verrouille donc la ligne (`FOR UPDATE`) le temps de lire l'état, de
 * vérifier que l'appel n'a pas déjà été vu, et d'écrire les deux. Le second
 * appel attend le premier, puis lit ce qu'il a écrit.
 */
export async function appliquerEvenement(
  payload: Payload,
  evenement: EvenementResend,
  appel: string,
): Promise<"ignore" | "cree" | "mis-a-jour" | "deja-vu"> {
  const idResend = evenement.data?.email_id;
  const type = String(evenement.type ?? "");
  if (!idResend || !type.startsWith("email.")) return "ignore";

  const le = evenement.created_at ?? new Date().toISOString();
  const nouveau = statutDeLEvenement(type);
  const detail = evenement.data?.bounce?.message?.slice(0, 300) ?? null;

  const mettreAJour = () =>
    payload.db.drizzle.transaction(async (tx) => {
      const lignes = (await tx.execute(
        sql`SELECT id, statut FROM courriels WHERE resend_id = ${idResend} FOR UPDATE`,
      )) as unknown as { rows: { id: number; statut: string | null }[] };
      const ligne = lignes.rows[0];
      if (!ligne) return "absent" as const;

      const vu = (await tx.execute(
        sql`SELECT 1 FROM courriels_evenements WHERE _parent_id = ${ligne.id} AND appel = ${appel} LIMIT 1`,
      )) as unknown as { rows: unknown[] };
      if (vu.rows.length > 0) return "deja-vu" as const;

      await tx.execute(sql`
        INSERT INTO courriels_evenements (_order, _parent_id, id, type, le, appel)
        VALUES (
          (SELECT COALESCE(MAX(_order), 0) + 1 FROM courriels_evenements WHERE _parent_id = ${ligne.id}),
          ${ligne.id}, ${randomBytes(12).toString("hex")}, ${type}, ${le}, ${appel}
        )`);

      const statut = statutApres(ligne.statut, nouveau) ?? "envoye";
      await tx.execute(sql`
        UPDATE courriels
        SET statut = ${statut}::enum_courriels_statut,
            derniere_nouvelle_le = ${le},
            detail = COALESCE(${detail}, detail),
            updated_at = now()
        WHERE id = ${ligne.id}`);
      return "mis-a-jour" as const;
    });

  const effet = await mettreAJour();
  if (effet !== "absent") return effet;

  const to = evenement.data?.to;
  try {
    await payload.create({
      collection: "courriels",
      overrideAccess: true,
      depth: 0,
      data: {
        destinataire: adresseNue(Array.isArray(to) ? (to[0] ?? "") : (to ?? "")),
        objet: String(evenement.data?.subject ?? "").slice(0, 300),
        statut: nouveau ?? "envoye",
        /*
          Resend ne dit pas ce qu'était le courriel. « dossier » par défaut ;
          `noterLEnvoi`, s'il arrive après, pose la vraie nature.
        */
        nature: "dossier",
        resendId: idResend,
        envoyeLe: evenement.data?.created_at ?? le,
        derniereNouvelleLe: le,
        ...(detail ? { detail } : {}),
        evenements: [{ type, le, appel }],
      },
    });
    return "cree";
  } catch {
    /*
      Un autre appel — ou `noterLEnvoi` — a créé la ligne entre-temps : la
      contrainte d'unicité refuse la seconde. On repasse par la mise à jour,
      qui trouvera la ligne et prendra le verrou.
    */
    const repris = await mettreAJour();
    return repris === "absent" ? "ignore" : repris;
  }
}

/**
 * Combien de courriels de chaque nature ont été remis, sont en cours, ou
 * n'arriveront pas — pour l'encart « Qui l'a reçue » des blocs d'envoi.
 *
 * Six comptes, lancés ensemble : aucun ne dépend d'un autre. La nature
 * « dossier » n'y est pas — personne ne la regarde en bloc.
 */
export async function compterLesEnvois(
  payload: Payload,
): Promise<Record<"presentation" | "demarrage", SuiviDUneNature>> {
  const natures = ["presentation", "demarrage"] as const;
  const groupes = Object.keys(GROUPES_ETAT) as (keyof typeof GROUPES_ETAT)[];
  const comptes = await Promise.all(
    natures.flatMap((nature) =>
      groupes.map(async (groupe) => {
        const { totalDocs } = await payload.count({
          collection: "courriels",
          where: {
            and: [{ nature: { equals: nature } }, { statut: { in: [...GROUPES_ETAT[groupe]] } }],
          },
          overrideAccess: true,
        });
        return { nature, groupe, totalDocs };
      }),
    ),
  );
  const vide = (): SuiviDUneNature => ({ remis: 0, enCours: 0, perdus: 0 });
  const suivi = { presentation: vide(), demarrage: vide() };
  for (const c of comptes) suivi[c.nature][c.groupe] = c.totalDocs;
  return suivi;
}
