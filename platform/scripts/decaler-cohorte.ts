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
 *   npx payload run scripts/decaler-cohorte.ts
 *   set -a && . ./.env.prod && set +a && npx payload run scripts/decaler-cohorte.ts
 *
 * ⚠️ **Rejouable, parce qu'il vise des dates et non un décalage.** Un script
 * qui ajoute « quatorze jours » déplace de vingt-huit si on le lance deux
 * fois — et rien ne le signale, la deuxième cohorte a l'air aussi plausible
 * que la première. Celui-ci ne touche que les sessions qui commencent
 * *exactement* aux dates de départ ; au second passage, il n'en trouve plus.
 *
 * ⚠️ L'intitulé porte la date, lui aussi (« … — Classe virtuelle — 19 sept.
 * 2026 »). Déplacer les dates sans le réécrire laisserait la fiche annoncer
 * octobre sous un titre qui dit septembre.
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
 * Le samedi part au samedi, le dimanche au dimanche : le rythme affiché
 * (« 8 samedis », « 8 dimanches ») reste vrai sans qu'on y touche. Quatorze
 * jours dans les deux cas — ce qui fait tomber le samedi sur le 3 octobre et
 * la fin sur le 21 novembre, exactement ce qu'annonce la campagne.
 */
const DEPLACEMENTS = [
  { de: "2026-09-19", vers: "2026-10-03", jour: "samedi" },
  { de: "2026-09-20", vers: "2026-10-04", jour: "dimanche" },
];

/** « 19 sept. 2026 » — la forme exacte que portent les intitulés existants. */
const COURT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
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
    L'intitulé se termine par la date de départ. On remplace ce qui suit le
    dernier tiret cadratin plutôt que de recomposer la ligne : le nom du
    parcours et la modalité restent tels que la direction les a saisis.
  */
  const ancienne = COURT.format(new Date(s.debut));
  const nouvelle = COURT.format(debut);
  const reference = (s.reference ?? "").replace(ancienne, nouvelle);

  await payload.update({
    collection: "sessions",
    id: s.id,
    locale: "fr",
    overrideAccess: true,
    data: {
      debut: debut.toISOString(),
      ...(fin ? { fin: fin.toISOString() } : {}),
      ...(reference ? { reference } : {}),
    } as never,
  });

  console.log(`  ✓ ${reference}`);
  console.log(
    `      ${ancienne} → ${nouvelle}${fin ? `  ·  fin ${COURT.format(fin)}` : ""}  (${plan.jour})`,
  );
  deplacees += 1;
}

console.log(
  deplacees === 0
    ? "\n  Rien à déplacer : aucune session ne part plus aux dates de septembre.\n"
    : `\n  ${deplacees} session(s) déplacée(s).\n`,
);
