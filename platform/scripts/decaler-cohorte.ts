/**
 * Décale la cohorte de septembre 2026 vers octobre.
 *
 * ── Pourquoi ────────────────────────────────────────────────────────────────
 * La campagne publicitaire lancée le 3 septembre 2026 annonce le parcours DAF
 * « du 03 octobre au 21 novembre 2026 », quand le catalogue affichait encore
 * « 19 sept. → 7 nov. ». Qui cliquait sur l'annonce tombait sur une fiche qui
 * ne disait pas la même chose que l'annonce — sur la page qui décide de son
 * achat.
 *
 * La direction a tranché : les douze parcours se décalent, pas seulement le
 * DAF, pour que la cohorte reste d'un seul tenant.
 *
 * Le script fait deux passes, et la seconde vaut pour elle-même : elle recale
 * les instants d'une session sur l'horaire que sa cadence annonce. Voir plus
 * bas — c'est ce qui a rattrapé une séance longue de zéro minute.
 *
 *   npx payload run scripts/decaler-cohorte.ts
 *   set -a && . ./.env.prod && set +a && npx payload run scripts/decaler-cohorte.ts
 *
 * ⚠️ **Rejouable, parce qu'il vise des dates et non un décalage.** Un script
 * qui ajoute « quatorze jours » déplace de vingt-huit si on le lance deux
 * fois — et rien ne le signale, la deuxième cohorte a l'air aussi plausible
 * que la première. Celui-ci ne touche que les sessions qui commencent
 * *exactement* aux dates de départ ; au second passage, il n'en trouve plus.
 *
 * ⚠️ L'intitulé porte la date, mais il n'est pas à réécrire ici : `Sessions.ts`
 * le recompose à chaque enregistrement. C'est la **cadence** qu'il faut suivre
 * — « 8 samedis · 9h00–13h00 » est saisi à la main, rien ne le recalcule, et
 * un dimanche déplacé au samedi laisserait la fiche annoncer « 8 dimanches »
 * sous une date qui tombe un samedi.
 *
 * ⚠️ Un script ne rafraîchit pas le site : `revalidatePath` exige le contexte
 * de requête de Next et les crochets le taisent. Après un passage sur la
 * production, redéployer — sinon les fiches servies restent celles du build
 * précédent.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });

/**
 * Les départs à déplacer, et leur nouvelle date.
 *
 * Les deux premières lignes ont sorti la cohorte de septembre ; la troisième
 * ramène les deux parcours du dimanche sur le samedi, pour que le catalogue
 * n'annonce plus qu'une seule date — celle de la campagne.
 *
 * L'heure de séance ne bouge jamais : le décalage se calcule en jours et
 * s'applique aux instants, si bien que le matin reste le matin et
 * l'après-midi l'après-midi.
 */
const DEPLACEMENTS = [
  { de: "2026-09-19", vers: "2026-10-03" },
  { de: "2026-09-20", vers: "2026-10-04" },
  /*
    ── Tout le monde le même jour ────────────────────────────────────────────
    La campagne n'annonce qu'une date, le 3 octobre. Les deux parcours du
    dimanche — ressources humaines et préparation PMP — la rejoignent donc,
    sur le créneau de l'après-midi qui est déjà le leur : deux cohortes le
    même samedi, l'une le matin, l'autre l'après-midi, ne se gênent pas.
  */
  { de: "2026-10-04", vers: "2026-10-03" },
];

/** Le jour de la semaine, au pluriel — « samedis », « dimanches ». */
const JOUR_SEMAINE = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" });
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** « 19 sept. 2026 » — la forme exacte que portent les intitulés existants. */
const COURT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** « 09:00 » — pour dire quelle heure était enregistrée, et laquelle la remplace. */
const HEURE = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const jourDe = (iso: string) => iso.slice(0, 10);

const { docs } = await payload.find({
  collection: "sessions",
  limit: 100,
  depth: 0,
  locale: "fr",
  sort: "debut",
  overrideAccess: true,
});

let deplacees = 0;

for (const s of docs as unknown as {
  id: number | string;
  reference?: string | null;
  cadence?: string | null;
  debut?: string | null;
  fin?: string | null;
}[]) {
  if (!s.debut) continue;
  const plan = DEPLACEMENTS.find((d) => d.de === jourDe(s.debut as string));
  if (!plan) continue;

  /*
    Le décalage se calcule sur les jours, puis s'applique aux instants : les
    horaires de séance (9h00–13h00 UTC) sont ainsi conservés tels quels.
  */
  const ecart = Date.parse(`${plan.vers}T00:00:00Z`) - Date.parse(`${plan.de}T00:00:00Z`);
  const debut = new Date(Date.parse(s.debut) + ecart);
  const fin = s.fin ? new Date(Date.parse(s.fin) + ecart) : undefined;

  /*
    ⚠️ L'intitulé ne se réécrit pas ici : `Sessions.ts` le recompose à chaque
    enregistrement, depuis le parcours, la modalité et la date. La première
    version de ce script le remplaçait à la main — du travail aussitôt écrasé
    par le crochet, et une ligne qui donnait l'illusion de faire quelque chose.

    ⚠️ La cadence, elle, porte le nom du jour en toutes lettres (« 8 samedis ·
    9h00–13h00 ») et **rien ne la recompose**. Déplacer un dimanche au samedi
    sans y toucher laisserait la fiche annoncer « 8 dimanches » sous une date
    qui tombe un samedi. Une donnée saisie à la main que le calcul contredit.
  */
  const nomDuJour = JOUR_SEMAINE.format(debut);
  const cadence = (s.cadence ?? "").replace(
    new RegExp(`\\b(${JOURS.join("|")})s?\\b`, "gi"),
    `${nomDuJour}s`,
  );

  await payload.update({
    collection: "sessions",
    id: s.id,
    locale: "fr",
    overrideAccess: true,
    data: {
      debut: debut.toISOString(),
      ...(fin ? { fin: fin.toISOString() } : {}),
      ...(cadence && cadence !== s.cadence ? { cadence } : {}),
    } as never,
  });

  console.log(`  ✓ ${s.reference}`);
  console.log(
    `      ${COURT.format(new Date(s.debut))} → ${COURT.format(debut)}` +
      `${fin ? `  ·  fin ${COURT.format(fin)}` : ""}  (${nomDuJour})`,
  );
  if (cadence !== s.cadence) console.log(`      cadence : « ${s.cadence} » → « ${cadence} »`);
  deplacees += 1;
}

console.log(
  deplacees === 0
    ? "\n  Rien à déplacer : aucune session ne part plus aux dates de septembre."
    : `\n  ${deplacees} session(s) déplacée(s).`,
);

/*
  ── Passe 2 : l'heure enregistrée doit être l'heure annoncée ────────────────
  ⚠️ Trouvé en regroupant les douze parcours sur une seule date : les ressources
  humaines portaient « 13h00–17h00 » en cadence et **12:00 en base**, avec une
  fin à 12:00 elle aussi — une séance longue de zéro minute. La cadence est
  saisie à la main, les instants sont saisis ailleurs, et rien ne les
  confrontait : chacun avait l'air juste tout seul.

  Ce n'est pas cosmétique. `HeureLocale` convertit `debut` et `fin` dans le
  fuseau du visiteur et affiche « 13h00–13h00 chez vous » sous une cadence qui
  promet quatre heures. Et `seancesHebdomadaires` compte les séances depuis ces
  mêmes instants.

  La cadence fait foi : c'est elle que le visiteur lit en premier, elle que
  porte la campagne, et elle qu'un membre de l'équipe corrigerait s'il voyait
  l'écart. Les instants se réalignent dessus.

  ⚠️ On ne touche qu'aux sessions en UTC. Ailleurs, la cadence est écrite dans
  le fuseau de la session et comparer des heures nues conclurait à un écart qui
  n'existe pas.

  ⚠️ Une cadence sans horaire n'est pas une faute : on passe, sans rien dire.
  Un script qui « corrige » ce qu'il n'a pas su lire fait plus de dégâts que
  celui qui s'abstient.
*/
const HORAIRES = /(\d{1,2})h(\d{2})\D+(\d{1,2})h(\d{2})/;

/** L'instant `iso`, ramené à `h:m` UTC le même jour. */
function aLHeure(iso: string, h: number, m: number): Date {
  const d = new Date(iso);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

const { docs: apres } = await payload.find({
  collection: "sessions",
  limit: 100,
  depth: 0,
  locale: "fr",
  sort: "debut",
  overrideAccess: true,
});

let recalees = 0;

for (const s of apres as unknown as {
  id: number | string;
  reference?: string | null;
  cadence?: string | null;
  fuseau?: string | null;
  debut?: string | null;
  fin?: string | null;
}[]) {
  if (!s.debut || !s.fin) continue;
  if ((s.fuseau ?? "UTC") !== "UTC") continue;

  const dit = HORAIRES.exec(s.cadence ?? "");
  if (!dit) continue;

  const debut = aLHeure(s.debut, Number(dit[1]), Number(dit[2]));
  const fin = aLHeure(s.fin, Number(dit[3]), Number(dit[4]));
  if (debut.toISOString() === s.debut && fin.toISOString() === s.fin) continue;

  await payload.update({
    collection: "sessions",
    id: s.id,
    locale: "fr",
    overrideAccess: true,
    data: { debut: debut.toISOString(), fin: fin.toISOString() } as never,
  });

  console.log(`  ✓ ${s.reference}`);
  console.log(
    `      heures : ${HEURE.format(new Date(s.debut))}–${HEURE.format(new Date(s.fin))}` +
      ` → ${HEURE.format(debut)}–${HEURE.format(fin)} UTC, d'après « ${s.cadence} »`,
  );
  recalees += 1;
}

console.log(
  recalees === 0
    ? "  Aucune heure à recaler : chaque session est enregistrée à l'heure qu'elle annonce.\n"
    : `  ${recalees} session(s) recalée(s) sur leur cadence.\n`,
);
