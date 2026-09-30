/**
 * Clôturer la cohorte d'octobre 2026 et ouvrir la cohorte de novembre.
 *
 *   npx payload run scripts/cohorte-novembre.ts            # montre, n'écrit rien
 *   ECRIRE=1 npx payload run scripts/cohorte-novembre.ts   # écrit
 *
 * Demandé par la direction le 30 septembre 2026. Trois créneaux, huit séances
 * hebdomadaires chacun :
 *
 *   samedi 9h00–13h00 UTC, dès le 31 octobre   DAF, audit interne, contrôle de gestion
 *   samedi 13h00–17h00 UTC, dès le 31 octobre  RH, commercial, marketing
 *   dimanche 13h00–17h00 UTC, dès le 1er novembre  les six parcours techniques
 *
 * ── Ce que le script fait, dans cet ordre ───────────────────────────────────
 * 1. Les sessions qui démarrent le 3 octobre 2026 passent « clôturées » : les
 *    inscriptions ferment, les dossiers déjà ouverts ne bougent pas.
 * 2. Le réglage « places libres à maintenir » est retiré de ces sessions. Il
 *    tient la cohorte DAF ouverte en faisant suivre le plafond ; laissé en
 *    place, il continuerait de le faire sur une cohorte clôturée.
 * 3. Une session de novembre est ouverte par parcours publié, dans son
 *    créneau.
 *
 * ⚠️ **Un parcours absent de la répartition fait renoncer le script.** Le
 * ranger dans un créneau par défaut, c'est annoncer au visiteur un horaire que
 * personne n'a décidé. La liste vient de la direction ; un parcours ajouté
 * depuis demande une décision, pas un repli.
 *
 * ⚠️ **Rejouable.** Une session de novembre déjà ouverte pour un parcours
 * n'est pas recréée, et une session déjà clôturée n'est pas réécrite.
 *
 * Les heures sont posées par le crochet de `Sessions.ts` à partir de la
 * cadence, qui fait foi : le script les écrit aussi, pour que la relecture
 * ci-dessous ne dépende pas de lui.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const ECRIRE = process.env.ECRIRE === "1";
const SEANCES = 8;
const OCTOBRE = "2026-10-03";

type Creneau = "samedi-matin" | "samedi-apres-midi" | "dimanche";

const CRENEAUX: Record<Creneau, { jour: string; debut: number; fin: number; cadence: string }> = {
  "samedi-matin": {
    jour: "2026-10-31",
    debut: 9,
    fin: 13,
    cadence: `${SEANCES} samedis · 9h00–13h00`,
  },
  "samedi-apres-midi": {
    jour: "2026-10-31",
    debut: 13,
    fin: 17,
    cadence: `${SEANCES} samedis · 13h00–17h00`,
  },
  dimanche: {
    jour: "2026-11-01",
    debut: 13,
    fin: 17,
    cadence: `${SEANCES} dimanches · 13h00–17h00`,
  },
};

const REPARTITION: Record<string, Creneau> = {
  "directeur-administratif-et-financier": "samedi-matin",
  "directeur-audit-interne": "samedi-matin",
  "directeur-controle-de-gestion": "samedi-matin",
  "directeur-des-ressources-humaines": "samedi-apres-midi",
  "directeur-commercial": "samedi-apres-midi",
  "directeur-marketing": "samedi-apres-midi",
  "directeur-de-production": "dimanche",
  "directeur-de-maintenance": "dimanche",
  "directeur-industriel": "dimanche",
  "directeur-qhse": "dimanche",
  "directeur-de-projets": "dimanche",
  "preparation-a-la-certification-pmp": "dimanche",
};

const aHeure = (jour: string, h: number) =>
  new Date(`${jour}T${String(h).padStart(2, "0")}:00:00.000Z`);
const plusJours = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

const payload = await getPayload({ config });

const { docs: programmes } = await payload.find({
  collection: "programmes",
  where: { _status: { equals: "published" } },
  limit: 200,
  locale: "fr",
  depth: 0,
  sort: "id",
  overrideAccess: true,
});

const orphelins = programmes.filter((p) => !REPARTITION[String(p.slug)]);
if (orphelins.length > 0) {
  console.log("\n  ✗ Parcours publiés sans créneau décidé :");
  for (const p of orphelins) console.log(`    · ${String(p.titre)} (${String(p.slug)})`);
  console.log("\n  Rien n'est écrit. Ajouter leur créneau dans REPARTITION.\n");
  process.exit(1);
}

console.log(
  `\n  ${ECRIRE ? "ÉCRITURE" : "Aperçu (rien n'est écrit)"} — ${programmes.length} parcours publiés\n`,
);

let cloturees = 0;
let ouvertes = 0;
let deja = 0;

for (const p of programmes) {
  const slug = String(p.slug);
  const creneau = CRENEAUX[REPARTITION[slug]!];

  const { docs: sessions } = await payload.find({
    collection: "sessions",
    where: { programme: { equals: p.id } },
    limit: 50,
    depth: 0,
    sort: "debut",
    overrideAccess: true,
  });

  // 1 et 2 — la cohorte d'octobre.
  for (const s of sessions.filter((s) => String(s.debut ?? "").slice(0, 10) === OCTOBRE)) {
    if (s.cloturee && s.placesLibresTenues == null) continue;
    console.log(
      `  ◼ clôture   ${String(p.titre).padEnd(42)} ${OCTOBRE}` +
        (s.placesLibresTenues != null
          ? `  (retire « ${s.placesLibresTenues} places tenues »)`
          : ""),
    );
    if (ECRIRE) {
      await payload.update({
        collection: "sessions",
        id: s.id,
        locale: "fr",
        overrideAccess: true,
        data: { cloturee: true, placesLibresTenues: null },
      });
    }
    cloturees += 1;
  }

  // 3 — la cohorte de novembre.
  const debut = aHeure(creneau.jour, creneau.debut);
  const fin = aHeure(
    plusJours(debut, 7 * (SEANCES - 1))
      .toISOString()
      .slice(0, 10),
    creneau.fin,
  );
  if (sessions.some((s) => String(s.debut ?? "").slice(0, 10) === creneau.jour)) {
    console.log(`  = novembre  ${String(p.titre).padEnd(42)} déjà ouverte`);
    deja += 1;
    continue;
  }

  const modele =
    sessions.find((s) => String(s.debut ?? "").slice(0, 10) === OCTOBRE) ?? sessions.at(-1);
  console.log(
    `  + novembre  ${String(p.titre).padEnd(42)} ${creneau.cadence.padEnd(28)} ` +
      `${debut.toISOString().slice(0, 10)} → ${fin.toISOString().slice(0, 10)}`,
  );
  if (ECRIRE) {
    await payload.create({
      collection: "sessions",
      locale: "fr",
      overrideAccess: true,
      data: {
        reference: `${slug}-${creneau.jour}`,
        programme: p.id,
        mode: "visio",
        debut: debut.toISOString(),
        fin: fin.toISOString(),
        cadence: creneau.cadence,
        fuseau: "UTC",
        capacite: 30,
        placesReservees: 0,
        prix: modele?.prix ?? 423,
        devise: modele?.devise ?? "EUR",
      },
    });
  }
  ouvertes += 1;
}

console.log(
  `\n  ${cloturees} session(s) d'octobre à clôturer, ${ouvertes} session(s) de novembre à ouvrir, ${deja} déjà ouverte(s).`,
);
if (!ECRIRE) console.log("  Relancer avec ECRIRE=1 pour écrire.\n");

if (ECRIRE) {
  // Relecture : ce que la base dit maintenant, pas ce qu'on a cru écrire.
  const { docs } = await payload.find({
    collection: "sessions",
    where: { debut: { greater_than: "2026-10-30T00:00:00.000Z" } },
    limit: 50,
    depth: 1,
    sort: "debut",
    overrideAccess: true,
  });
  console.log("\n  Relu en base — cohorte de novembre :");
  for (const s of docs) {
    const titre = typeof s.programme === "object" && s.programme ? String(s.programme.titre) : "?";
    console.log(
      `    ${titre.padEnd(42)} ${String(s.cadence).padEnd(28)} ${String(s.debut).slice(0, 16)} → ${String(s.fin).slice(0, 16)}  ${s.capacite} places`,
    );
  }
  console.log("");
}

process.exit(0);
