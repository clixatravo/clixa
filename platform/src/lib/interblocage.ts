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

/** Cinq tentatives — voir `TEMPS_D_ATTENTE` pour ce que cela coûte au pire. */
export const TENTATIVES = 5;

/**
 * L'attente avant la tentative `essai + 1`, en millisecondes.
 *
 * ── ⚠️ Le budget saturait à six inscriptions simultanées ────────────────────
 * Trois tentatives, espacées de `essai * 120 + hasard(120)`, tenaient « deux
 * personnes et une annonce qui circule » — le cas que ce module documente. Au
 * delà, un visiteur recevait une vraie erreur technique sur une inscription
 * parfaitement valide. C'était noté comme un défaut de capacité distinct,
 * laissé ouvert depuis le 7 septembre 2026.
 *
 * Deux choses ont changé, et la seconde compte plus que la première :
 *
 * 1. **Cinq tentatives au lieu de trois.**
 * 2. ⚠️ **L'attente part de zéro** (« full jitter »), au lieu d'un plancher qui
 *    croît. L'ancienne formule gardait les transactions **groupées** : à la
 *    deuxième tentative, toutes repartaient entre 240 et 360 ms, c'est-à-dire
 *    dans la même fenêtre de 120 ms — elles se retrouvaient donc, et se
 *    tuaient de nouveau. Tirer uniformément dans `[0, plafond]` les étale : plus
 *    il y a de concurrents, plus la fenêtre est large, et c'est exactement ce
 *    qu'il faut.
 *
 * Le plafond double à chaque essai — 120, 240, 480, 960 ms — et l'attente
 * cumulée au pire vaut donc moins de deux secondes, sur un formulaire qui en
 * met déjà une à répondre. Une inscription qui aboutit en 1,5 s vaut mieux
 * qu'une erreur technique en 300 ms.
 */
export function TEMPS_D_ATTENTE(essai: number): number {
  const PLAFOND_INITIAL = 120;
  const plafond = PLAFOND_INITIAL * 2 ** (essai - 1);
  return Math.floor(Math.random() * plafond);
}

/**
 * Exécute `travail`, et le rejoue si Postgres a signalé un interblocage.
 *
 * ⚠️ **Rejouer reste sans risque ici** : la transaction perdante est
 * *entièrement* annulée, rien n'a été écrit, et aucun doublon ne peut naître
 * d'un second passage. Ce n'est pas un échec au milieu du travail, c'est un
 * travail qui n'a pas eu lieu.
 */
export async function malgreUnInterblocage<T>(
  travail: () => Promise<T>,
  journaliser?: (message: string) => void,
): Promise<T> {
  for (let essai = 1; essai <= TENTATIVES; essai += 1) {
    try {
      return await travail();
    } catch (e) {
      if (!estUnInterblocage(e) || essai === TENTATIVES) throw e;

      const attente = TEMPS_D_ATTENTE(essai);
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

/* ── Une écriture à la fois, par session ─────────────────────────────────── */

/**
 * ⚠️ **Réessayer ne suffisait pas, et c'est la mesure qui l'a dit.**
 *
 * Six `payload.create` lancés ensemble sur la même session : **cinq perdues**,
 * toutes en `40P01`, malgré cinq tentatives et une attente décorrélée. Le
 * raisonnement qui promettait mieux était faux, et le journal notait déjà le
 * défaut comme ouvert depuis le 7 septembre 2026.
 *
 * La raison tient à la forme de l'interblocage : chaque transaction prend un
 * verrou **partagé** sur la ligne de `sessions` en insérant, puis demande
 * l'**exclusif** pour recompter. À six, la probabilité qu'une seule y parvienne
 * avant les autres est faible — et la rejouer la remet dans la même situation.
 * Élargir le budget ne fait que retarder l'échec.
 *
 * On empêche donc les écritures **de ce processus** de se croiser : une à la
 * fois par session, mises en file. Elles ne se disputent plus rien, et le
 * rattrapage ne sert plus qu'aux instances concurrentes — deux ou trois au
 * plus, exactement le cas qu'il tient déjà.
 *
 * ⚠️ **Ce n'est pas un verrou distribué, et il ne prétend pas l'être.** Vercel
 * démarre plusieurs instances : deux d'entre elles peuvent encore se croiser, et
 * c'est `malgreUnInterblocage` qui rattrape. Un vrai verrou demanderait de tenir
 * la transaction nous-mêmes autour de `payload.create`, par des rouages internes
 * de l'adaptateur que rien ne garantit d'une version à l'autre — sur le chemin
 * d'écriture de *chaque* inscription. La réserve posée le 30 août 2026 tient
 * toujours.
 *
 * ⚠️ **La file est nettoyée quand elle se vide**, sinon la carte grandirait
 * d'une entrée par session pour la vie du processus.
 */
const filesParSession = new Map<string, Promise<unknown>>();

export async function enFileParSession<T>(
  cle: string | number,
  travail: () => Promise<T>,
): Promise<T> {
  const clef = String(cle);
  /*
    On s'accroche à la fin de ce qui est déjà en cours. Les deux branches de
    `then` appellent `travail` : une écriture qui échoue ne doit pas bloquer la
    suivante, et son erreur remonte quand même par le `await` de celui qui l'a
    lancée.
  */
  const precedent = filesParSession.get(clef) ?? Promise.resolve();
  const suivant = precedent.then(travail, travail);
  const trace = suivant.then(
    () => undefined,
    () => undefined,
  );
  filesParSession.set(clef, trace);

  try {
    return await suivant;
  } finally {
    // Personne derrière nous : la clef s'en va.
    if (filesParSession.get(clef) === trace) filesParSession.delete(clef);
  }
}

/**
 * Écrire sans se bloquer : une à la fois dans ce processus, rejouée si une
 * autre instance nous a devancés.
 *
 * C'est la porte que le tunnel d'inscription doit prendre — les deux moitiés
 * séparément ne suffisent pas, et la mesure le montre.
 */
export function ecrireSurLaSession<T>(
  session: string | number,
  travail: () => Promise<T>,
  journaliser?: (message: string) => void,
): Promise<T> {
  return enFileParSession(session, () => malgreUnInterblocage(travail, journaliser));
}
