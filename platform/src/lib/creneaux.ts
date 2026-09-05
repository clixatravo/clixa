/**
 * Les créneaux qu'on peut proposer à un prospect.
 *
 * ── Pourquoi une fonction pure, à part ──────────────────────────────────────
 * C'est le seul endroit qui décide de ce qu'on promet à quelqu'un. Le robot
 * l'appelle, le back-office pourrait l'appeler, et une épreuve peut la
 * dérouler sur trois mois sans toucher ni base ni réseau — comme
 * `prochaineEtape` pour la page du dossier.
 *
 * ── ⚠️ Tout est en UTC ──────────────────────────────────────────────────────
 * Les heures d'ouverture, les rendez-vous déjà pris, l'instant présent. Mêler
 * un second fuseau ici referait la faute qui a produit une séance de zéro
 * minute sur les sessions : deux façons de dire une heure, et rien qui les
 * confronte. La conversion pour le prospect se fait au moment de lui écrire,
 * une seule fois, et jamais dans ce calcul.
 */

/** Une plage d'ouverture hebdomadaire : « lundi, de 09:00 à 12:00 ». */
export type Plage = {
  /** Le numéro de `getUTCDay()` : dimanche vaut 0. */
  jour: string;
  debut: string;
  fin: string;
};

export type Reglages = {
  actif?: boolean | null;
  dureeMinutes?: number | null;
  delaiMinimumHeures?: number | null;
  semaine?: Plage[] | null;
  fermetures?: { jour?: string | null }[] | null;
};

/** Un rendez-vous déjà convenu, qui occupe la place. */
export type Occupe = { debut: string; dureeMinutes?: number | null };

const MINUTE = 60_000;

/** « 09:30 » → 570 minutes depuis minuit, ou `undefined` si ce n'est pas une heure. */
function enMinutes(heure: unknown): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(heure ?? "").trim());
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return h * 60 + min;
}

/** Le jour d'un instant, en `AAAA-MM-JJ` UTC — la forme des fermetures. */
const jourDe = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Les prochains créneaux libres, au plus `combien`.
 *
 * ⚠️ **Rien n'est proposé si `actif` est faux**, même avec des heures
 * renseignées. C'est l'interrupteur : tant que l'équipe n'a pas relu son
 * agenda, le robot invite à écrire plutôt que de promettre un appel que
 * personne n'attend. Une fonctionnalité qui s'allume toute seule dès que la
 * donnée existe surprend toujours quelqu'un.
 *
 * ⚠️ **Un créneau ne chevauche jamais un rendez-vous convenu.** On compare des
 * intervalles, pas des heures de début : un appel de vingt minutes commencé à
 * 09:10 occupe aussi 09:20, et proposer 09:20 mettrait deux personnes au même
 * téléphone.
 *
 * ⚠️ **Un rendez-vous annulé ne réserve rien** — c'est à l'appelant de ne pas
 * les passer ici. « Absent » en revanche occupe toujours : l'heure est passée,
 * elle ne se propose plus de toute façon, et la reproposer à quelqu'un
 * d'autre n'aurait aucun sens.
 */
export function prochainsCreneaux(
  reglages: Reglages,
  occupes: Occupe[],
  maintenant: Date,
  combien = 3,
  joursExplores = 14,
): Date[] {
  if (!reglages.actif) return [];

  const duree = reglages.dureeMinutes ?? 20;
  if (duree <= 0) return [];

  const plages = (reglages.semaine ?? []).filter(Boolean);
  if (plages.length === 0) return [];

  const fermes = new Set(
    (reglages.fermetures ?? [])
      .map((f) => (f?.jour ? jourDe(new Date(f.jour)) : undefined))
      .filter(Boolean) as string[],
  );

  /*
    Le plancher : on ne propose rien avant que le prospect ait eu le temps de
    s'organiser. Sans lui, le robot offrirait « dans dix minutes » à quelqu'un
    qui écrit à 23h58.
  */
  const plancher = new Date(
    maintenant.getTime() + (reglages.delaiMinimumHeures ?? 2) * 60 * MINUTE,
  );

  const pris = occupes
    .map((o) => {
      const d = new Date(o.debut).getTime();
      return Number.isNaN(d) ? undefined : { d, f: d + (o.dureeMinutes ?? duree) * MINUTE };
    })
    .filter(Boolean) as { d: number; f: number }[];

  const libre = (debut: number) => !pris.some((p) => debut < p.f && debut + duree * MINUTE > p.d);

  const trouves: Date[] = [];
  const jour = new Date(
    Date.UTC(
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth(),
      maintenant.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  for (let i = 0; i < joursExplores && trouves.length < combien; i += 1) {
    const ceJour = new Date(jour.getTime() + i * 24 * 60 * MINUTE);
    if (fermes.has(jourDe(ceJour))) continue;

    const numero = String(ceJour.getUTCDay());
    for (const plage of plages.filter((p) => String(p.jour) === numero)) {
      const ouvre = enMinutes(plage.debut);
      const ferme = enMinutes(plage.fin);
      /*
        ⚠️ Une plage illisible ou à l'envers est ignorée, pas devinée. Une
        heure saisie « 9h » ou une fin avant le début sont des fautes de
        saisie ; en tirer un créneau proposerait un appel à une heure que
        personne n'a voulue.
      */
      if (ouvre === undefined || ferme === undefined || ferme <= ouvre) continue;

      for (let m = ouvre; m + duree <= ferme && trouves.length < combien; m += duree) {
        const debut = ceJour.getTime() + m * MINUTE;
        if (debut < plancher.getTime()) continue;
        if (!libre(debut)) continue;
        trouves.push(new Date(debut));
      }
    }
  }

  return trouves;
}
