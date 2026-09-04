/**
 * L'heure enregistrée est l'heure annoncée.
 *
 * ── Ce que cette épreuve garde ──────────────────────────────────────────────
 * L'horaire d'une séance était déclaré **deux fois** : en toutes lettres dans
 * la cadence (« 8 samedis · 13h00–17h00 ») et en silence dans les instants
 * `debut` / `fin`. Rien ne les confrontait. Le 4 septembre 2026, les ressources
 * humaines se sont révélées enregistrées à **12:00** sous une cadence qui
 * promettait 13h00 — et leur fin à 12:00 elle aussi, soit une séance longue de
 * zéro minute, en production, depuis on ne sait quand.
 *
 * ⚠️ **Midi n'est pas un hasard.** `debut` et `fin` sont en
 * `pickerAppearance: "dayOnly"` : le sélecteur du back-office ne montre pas
 * d'heure et enregistre midi UTC. Toucher à la date d'une session depuis
 * /admin efface donc son horaire, sans rien afficher qui le laisse deviner.
 * C'est la troisième épreuve ci-dessous, et c'est le vrai scénario.
 *
 * ⚠️ Et depuis que `HeureLocale` a été retiré, **plus rien à l'écran ne
 * trahirait l'écart** : la fiche n'affiche que les jours et la cadence. Une
 * heure fausse ne laisse aucune trace visible. D'où ce crochet, et d'où cette
 * épreuve — la règle ne peut plus se vérifier à l'œil.
 *
 *   npx payload run scripts/verifier-horaires.ts
 *
 * ⚠️ Elle crée puis supprime ses sessions. Ne pas la lancer pendant que
 * `next dev` tourne : les deux écriraient sur les mêmes lignes.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const HEURE = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));

const aSupprimer: (string | number)[] = [];

/** Ce qu'écrit le sélecteur « dayOnly » du back-office : midi UTC. */
const MIDI = (jour: string) => `${jour}T12:00:00.000Z`;

try {
  const { docs: programmes } = await payload.find({
    collection: "programmes",
    limit: 1,
    depth: 0,
    locale: "fr",
    overrideAccess: true,
  });
  const programme = programmes[0];
  if (!programme) throw new Error("Aucun programme au catalogue : rien à quoi rattacher.");

  const creer = async (cadence: string | undefined, fuseau = "UTC") => {
    const s = await payload.create({
      collection: "sessions",
      locale: "fr",
      overrideAccess: true,
      data: {
        programme: programme.id,
        mode: "visio",
        debut: MIDI("2027-03-06"),
        fin: MIDI("2027-04-24"),
        capacite: 10,
        placesReservees: 0,
        prix: 470,
        devise: "EUR",
        fuseau,
        ...(cadence ? { cadence } : {}),
      } as never,
    });
    aSupprimer.push(s.id);
    return s as unknown as { id: string | number; debut: string; fin: string };
  };

  console.log("\n  L'heure annoncée fait foi\n");

  // ── 1. À la création ──────────────────────────────────────────────────────
  const a = await creer("8 samedis · 13h00–17h00");
  dire(
    "une session créée à midi prend l'heure de sa cadence",
    HEURE(a.debut) === "13:00" && HEURE(a.fin) === "17:00",
    `${HEURE(a.debut)}–${HEURE(a.fin)}`,
  );

  // ── 2. Le matin, pour que l'épreuve ne passe pas sur une seule valeur ─────
  const b = await creer("8 samedis · 9h00–13h00");
  dire(
    "et une cadence du matin donne bien le matin",
    HEURE(b.debut) === "09:00" && HEURE(b.fin) === "13:00",
    `${HEURE(b.debut)}–${HEURE(b.fin)}`,
  );

  /*
    ── 3. Le vrai scénario ──────────────────────────────────────────────────
    Quelqu'un décale la session d'une semaine depuis /admin. Le sélecteur
    n'affiche pas d'heure et renvoie midi : sans le crochet, l'horaire de la
    session est effacé par un geste qui ne prétendait toucher qu'à la date.
  */
  const c = await payload.update({
    collection: "sessions",
    id: a.id,
    locale: "fr",
    overrideAccess: true,
    data: { debut: MIDI("2027-03-13"), fin: MIDI("2027-05-01") } as never,
  });
  const apres = c as unknown as { debut: string; fin: string };
  dire(
    "⚠️ déplacer la date depuis /admin n'efface pas l'horaire",
    HEURE(apres.debut) === "13:00" && HEURE(apres.fin) === "17:00",
    `${HEURE(apres.debut)}–${HEURE(apres.fin)} le ${apres.debut.slice(0, 10)}`,
  );

  /*
    ── 4. Ce que le crochet ne doit surtout pas faire ───────────────────────
    Une cadence sans horaire n'est pas une faute, et un fuseau autre que UTC
    écrit sa cadence dans ce fuseau : comparer des heures nues y conclurait à
    un écart qui n'existe pas. Dans les deux cas, on n'y touche pas.
  */
  const d = await creer("5 jours consécutifs");
  dire(
    "une cadence sans horaire laisse l'instant intact",
    HEURE(d.debut) === "12:00",
    HEURE(d.debut),
  );

  const e = await creer("8 samedis · 13h00–17h00", "Africa/Casablanca");
  dire(
    "une session hors UTC n'est pas recalée",
    HEURE(e.debut) === "12:00",
    `${HEURE(e.debut)} · ${"Africa/Casablanca"}`,
  );

  const f = await creer(undefined);
  dire("une session sans cadence n'est pas recalée", HEURE(f.debut) === "12:00", HEURE(f.debut));

  /*
    ── 5. Et le catalogue réel s'y tient ────────────────────────────────────
    Les épreuves ci-dessus fabriquent leurs cas ; celle-ci regarde les vraies
    sessions. C'est la seule qui aurait attrapé les ressources humaines.
  */
  const { docs: vraies } = await payload.find({
    collection: "sessions",
    limit: 100,
    depth: 0,
    locale: "fr",
    overrideAccess: true,
  });
  const ecarts = (
    vraies as unknown as {
      reference?: string;
      cadence?: string;
      fuseau?: string;
      debut: string;
      fin: string;
    }[]
  )
    .filter((s) => !aSupprimer.includes((s as unknown as { id: string | number }).id))
    .filter((s) => (s.fuseau ?? "UTC") === "UTC")
    .map((s) => {
      const dits = /(\d{1,2})h(\d{2})\D+(\d{1,2})h(\d{2})/.exec(s.cadence ?? "");
      if (!dits) return undefined;
      const attendu = `${dits[1]!.padStart(2, "0")}:${dits[2]} → ${dits[3]!.padStart(2, "0")}:${dits[4]}`;
      const reel = `${HEURE(s.debut)} → ${HEURE(s.fin)}`;
      return attendu === reel ? undefined : `${s.reference} : ${reel} au lieu de ${attendu}`;
    })
    .filter(Boolean);
  dire(
    "aucune session du catalogue ne contredit sa cadence",
    ecarts.length === 0,
    ecarts.length === 0 ? `${vraies.length - aSupprimer.length} session(s)` : ecarts.join(" · "),
  );
} finally {
  for (const id of aSupprimer) {
    await payload.delete({ collection: "sessions", id, overrideAccess: true }).catch(() => {});
  }
}

console.log(
  manques === 0 ? "\n  L'heure enregistrée est l'heure annoncée.\n" : `\n  ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
