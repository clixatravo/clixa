/**
 * Réessayer ce que Postgres a refusé pour cause d'interblocage.
 *
 * ── D'où vient l'interblocage ───────────────────────────────────────────────
 * Deux personnes s'inscrivent au même instant à la même session. Chaque
 * transaction commence par insérer une ligne dans `inscriptions`, ce qui pose
 * sur la ligne de `sessions` un verrou **partagé** — Postgres garantit ainsi
 * que la session pointée ne disparaîtra pas sous la clef étrangère. Les deux
 * peuvent le prendre en même temps.
 *
 * Puis le crochet `recompter` met à jour le décompte de places sur cette même
 * ligne, ce qui demande cette fois un verrou **exclusif**. Chacune attend donc
 * que l'autre lâche son verrou partagé — et aucune ne le lâchera avant d'avoir
 * fini. Postgres tranche en tuant l'une des deux :
 *
 *     deadlock detected · while locking tuple in relation "sessions"
 *
 * Le participant voyait alors « erreur technique » sur une inscription
 * parfaitement valide. Observé en série d'épreuves le 30 août 2026 ; en
 * production il suffit de deux personnes et d'une annonce qui circule.
 *
 * ── Pourquoi réessayer, et non verrouiller plus tôt ─────────────────────────
 * On pourrait prendre le verrou exclusif avant l'insertion, ce qui sérialise
 * proprement les deux inscriptions. Cela demande de tenir la transaction
 * nous-mêmes autour de `payload.create`, en passant par des rouages internes de
 * l'adaptateur que rien ne garantit d'une version à l'autre — sur le chemin
 * d'écriture de **chaque** inscription.
 *
 * Réessayer est ce que Postgres lui-même recommande : un interblocage est par
 * nature transitoire, et la transaction perdante est **entièrement annulée**.
 * Rien n'a été écrit, rien n'est à défaire, et la seconde tentative trouve la
 * voie libre. Aucun risque de doublon : ce n'est pas un échec au milieu du
 * travail, c'est un travail qui n'a pas eu lieu.
 *
 * ⚠️ Ne réessaie **que** l'interblocage. Une contrainte violée, une session
 * absente, une base injoignable : ce sont des refus qui se reproduiront à
 * l'identique, et les répéter ne ferait que retarder le message d'erreur.
 */

/** Le code que Postgres donne à un interblocage, et lui seul. */
const INTERBLOCAGE = "40P01";

function estUnInterblocage(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const err = e as { code?: unknown; cause?: unknown };
  if (err.code === INTERBLOCAGE) return true;
  // Payload et drizzle enveloppent l'erreur du pilote ; le code vit dessous.
  return typeof err.cause === "object" && err.cause !== null
    ? (err.cause as { code?: unknown }).code === INTERBLOCAGE
    : false;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Exécute `travail`, et le rejoue si Postgres a signalé un interblocage.
 *
 * Trois tentatives, espacées d'une attente croissante et **irrégulière** : deux
 * transactions tuées au même instant qui repartiraient après le même délai se
 * bloqueraient de nouveau, et indéfiniment.
 */
export async function malgreUnInterblocage<T>(
  travail: () => Promise<T>,
  journaliser?: (message: string) => void,
): Promise<T> {
  const TENTATIVES = 3;

  for (let essai = 1; essai <= TENTATIVES; essai += 1) {
    try {
      return await travail();
    } catch (e) {
      if (!estUnInterblocage(e) || essai === TENTATIVES) throw e;

      const attente = essai * 120 + Math.floor(Math.random() * 120);
      journaliser?.(
        `[interblocage] tentative ${essai}/${TENTATIVES} refusée par Postgres, ` +
          `nouvel essai dans ${attente} ms`,
      );
      await dormir(attente);
    }
  }

  // Inatteignable : la dernière tentative relance ou rend un résultat.
  throw new Error("interblocage : sortie de boucle impossible");
}
