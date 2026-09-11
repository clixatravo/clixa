/**
 * Le délai se voit venir — et la vignette nomme ceux à qui le courriel partira.
 *
 * ── ⚠️ Le défaut que cette garde protège ────────────────────────────────────
 * « Où en est » ne parlait du délai qu'une fois **passé** : un dossier au
 * premier jour et un au sixième portaient la même phrase. L'équipe découvrait
 * le terme franchi, le lendemain du courriel qui prévient le participant que sa
 * place va repartir. Demandé par la direction le 9 septembre 2026.
 *
 * ⚠️ **Le contrôle qui compte est le dernier** : la vignette et la tâche de 8 h
 * doivent nommer les **mêmes** dossiers. Deux lectures des mêmes champs
 * finissent toujours par diverger, et l'équipe appellerait alors quelqu'un qui
 * ne reçoit rien — ou personne, pendant qu'un courriel part.
 *
 *   npx payload run scripts/verifier-delai.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import {
  JOURS_DE_PRESSE,
  conditionsDesPlacesAuTerme,
  delaiDuDossier,
  filtreDesPlacesAuTerme,
} from "@/lib/delai";
import { ouvrirSession } from "@/lib/session";
import { GET as REST } from "../src/app/(payload)/api/[...slug]/route.js";
import { JOURS_DE_GRACE } from "@/lib/places";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  Le délai, vu de la liste\n");

/*
  ⚠️ L'horloge est passée, jamais lue par le calcul : c'est ce qui permet
  d'éprouver « il reste deux jours » sans attendre cinq jours, et ce qui rend
  ce contrôle identique demain matin.
*/
const MAINTENANT = new Date("2026-09-09T14:00:00.000Z");
const ilYA = (jours: number) => new Date(MAINTENANT.getTime() - jours * 86_400_000).toISOString();

/* ── Ce que la colonne dit ────────────────────────────────────────────────── */

const neuf = delaiDuDossier({ createdAt: ilYA(0) }, MAINTENANT);
dire(
  "un dossier déposé aujourd'hui montre tout son délai",
  neuf.jours === JOURS_DE_GRACE && neuf.ton === "calme",
  neuf.libelle,
);

dire(
  "et il porte sa date de dépôt — ce que la direction réclamait",
  neuf.inscritLe?.toISOString().slice(0, 10) === MAINTENANT.toISOString().slice(0, 10),
);

/*
  ⚠️ **Le seuil est tout l'objet de la demande.** C'est le moment où l'on peut
  encore appeler avant que la tâche de 8 h n'écrive au participant.
*/
const veille = delaiDuDossier({ createdAt: ilYA(JOURS_DE_GRACE - JOURS_DE_PRESSE) }, MAINTENANT);
dire(
  `⚠️ à ${JOURS_DE_PRESSE} jours du terme, la colonne alerte`,
  veille.jours === JOURS_DE_PRESSE && veille.ton === "presse",
  veille.libelle,
);
dire(
  "un jour plus tôt, elle se tait encore",
  delaiDuDossier({ createdAt: ilYA(JOURS_DE_GRACE - JOURS_DE_PRESSE - 1) }, MAINTENANT).ton ===
    "calme",
);

dire(
  "au terme, elle le dit",
  delaiDuDossier({ createdAt: ilYA(JOURS_DE_GRACE) }, MAINTENANT).ton === "terme",
);

/*
  ⚠️ **Le terme n'est pas le départ de la place.** Elle ne part qu'au bout du
  battement, et seulement une fois l'annonce envoyée : dire « repartie » un jour
  trop tôt ferait renoncer à rappeler quelqu'un qui a encore sa place.
*/
dire(
  "⚠️ passé le terme sans annonce, la place n'est pas dite repartie",
  delaiDuDossier({ createdAt: ilYA(30) }, MAINTENANT).ton === "terme",
);
dire(
  "annoncée puis le battement écoulé, elle l'est",
  delaiDuDossier({ createdAt: ilYA(30), placeRappeleeLe: ilYA(5) }, MAINTENANT).ton === "passe",
);

/*
  ⚠️ **Un contrat signé qui attend nos coordonnées n'expire pas.** Annoncer un
  délai là ferait payer notre retard à quelqu'un qui s'est engagé par écrit.
*/
dire(
  "⚠️ un contrat signé sans coordonnées envoyées n'a pas de terme",
  delaiDuDossier({ createdAt: ilYA(30), contratSigneLe: ilYA(20) }, MAINTENANT).ton === "sansTerme",
);

/* ── ⚠️ Et la vignette nomme les mêmes que la tâche de 8 h ────────────────── */
/*
  C'est le contrôle qui compte. La vignette dit « appeler avant le courriel » :
  si elle comptait autre chose que ce que la tâche envoie, elle enverrait
  appeler quelqu'un qui ne reçoit rien — ou laisserait partir un message sur un
  dossier qu'elle n'a pas nommé.
*/
const payload = await getPayload({ config });

/*
  ⚠️ **Ici l'horloge est la vraie, et c'est délibéré.** Le calcul pur se déroule
  sur une horloge figée — c'est ce qui rend ses contrôles identiques demain
  matin. Mais la base, elle, vieillit ses lignes avec `now()` : comparer des
  `created_at` réels à un seuil figé fait tomber le cas limite du mauvais côté
  au gré des secondes qui séparent les deux. Le premier jet l'a montré, en
  rouge, sur le dossier posé pile sur la limite.
*/
const MAINTENANT_REEL = Date.now();
const seuilPresse = new Date(
  MAINTENANT_REEL - (JOURS_DE_GRACE - JOURS_DE_PRESSE) * 86_400_000,
).toISOString();
const seuilTache = new Date(MAINTENANT_REEL - JOURS_DE_GRACE * 86_400_000).toISOString();

const conditions = conditionsDesPlacesAuTerme;

const compter = async (avant: string) =>
  (
    await payload.find({
      collection: "inscriptions",
      where: conditions(avant) as never,
      limit: 0,
      depth: 0,
      overrideAccess: true,
    })
  ).totalDocs;

/*
  ⚠️ **On fabrique, sinon on mesure le néant.** Sur `dev`, que le ménage des
  épreuves vide à chaque série, ces deux comptages rendent zéro — et « 0 ≥ 0 »
  est trivialement vrai. Le premier jet de cette garde s'en est félicité. C'est
  la leçon de `verifier-veille.ts`, et son revers.

  Cinq dossiers, dont trois qu'aucun des deux comptages ne doit ramasser : sans
  eux, un filtre qui rendrait tout passerait au vert.
*/
const cas: [string, number, Record<string, unknown>, boolean, boolean][] = [
  // nom, âge en jours, champs, comptée par la vignette, comptée par la tâche
  ["frais", 1, {}, false, false],
  ["à deux jours du terme", JOURS_DE_GRACE - JOURS_DE_PRESSE, {}, true, false],
  ["terme dépassé", JOURS_DE_GRACE + 1, {}, true, true],
  ["déjà annoncé", JOURS_DE_GRACE + 1, { placeRappeleeLe: ilYA(1) }, false, false],
  ["contrat signé", JOURS_DE_GRACE + 1, { contratSigneLe: ilYA(2) }, false, false],
];

const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 1,
  depth: 0,
  overrideAccess: true,
  where: { fin: { greater_than: new Date().toISOString() } },
});

const fabriques: { nom: string; id: number | string; vignette: boolean; tache: boolean }[] = [];
let compteAsupprimer: string | number | undefined;
try {
  if (sessions[0]) {
    for (const [nom, age, champs, dansVignette, dansTache] of cas) {
      const d = await payload.create({
        collection: "inscriptions",
        overrideAccess: true,
        data: {
          session: sessions[0].id,
          statut: "demandee",
          apprenantNom: `Épreuve Délai ${nom}`,
          apprenantEmail: `delai.${Math.random().toString(36).slice(2)}@epreuve.invalid`,
          apprenantWhatsapp: "+212600000000",
          apprenantPays: "Maroc",
          planPaiement: "P1",
          echeances: [{ montant: 423, statut: "attendu" }],
          ...champs,
        } as never,
      });
      /*
        ⚠️ `createdAt` est posé par Payload : on ne peut pas le fabriquer à la
        création. On vieillit la ligne en SQL, comme `verifier-places.ts`.
      */
      /*
        ⚠️ Une demi-journée de marge : posé pile sur le seuil, le dossier bascule
        d'un côté ou de l'autre selon les secondes écoulées entre l'écriture et
        la lecture. Un contrôle qui échoue une fois sur deux ne dit plus rien.
      */
      await payload.db.drizzle.execute(
        `UPDATE inscriptions SET created_at = now() - interval '${age * 24 + 12} hours' WHERE id = ${d.id}` as never,
      );
      fabriques.push({ nom, id: d.id, vignette: dansVignette, tache: dansTache });
    }
  }

  const vignette = await compter(seuilPresse);
  const tache = await compter(seuilTache);

  dire(
    "⚠️ la vignette englobe ceux que la tâche enverra, jamais moins",
    vignette >= tache,
    `${vignette} annoncé(s) pour ${tache} envoi(s) au prochain passage`,
  );

  /*
  ⚠️ Et chacun de ceux que la vignette compte doit être vu « pressé » ou « au
  terme » par la colonne. Sans ce contrôle, le nombre et la couleur pourraient
  se contredire sur le même écran.
*/
  const { docs: nommes } = await payload.find({
    collection: "inscriptions",
    where: conditions(seuilPresse) as never,
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });
  /*
    ── ⚠️ L'horloge réelle, pas la figée ─────────────────────────────────────
    Ce contrôle lisait `MAINTENANT`, l'horloge figée des contrôles purs, sur des
    dossiers que la base vieillit avec `now()`. Les deux ne se sont séparées
    qu'avec le temps : trois jours après l'écriture du script, « à deux jours du
    terme » se lisait « reste 4 jours » et le contrôle passait au rouge sur un
    code parfaitement juste.

    C'est le piège que ce fichier documente déjà quinze lignes plus haut, et il
    y était tombé sur cette seule ligne. La règle tient en un mot : **une ligne
    venue de la base se lit à l'heure de la base.**
  */
  const discordants = nommes.filter((d) => {
    const { ton } = delaiDuDossier(d as never, new Date(MAINTENANT_REEL));
    return ton !== "presse" && ton !== "terme";
  });
  /*
    Nommer ce qu'on accuse : sans cela, le rouge donne une référence et il faut
    rouvrir la base pour savoir de quel cas il s'agit — or les fixtures sont
    supprimées à la fin du script.
  */
  for (const d of discordants) {
    const x = d as unknown as Record<string, unknown>;
    console.log(
      `    · ${String(x.reference)} inscrit le ${String(x.createdAt).slice(0, 10)} → ` +
        `« ${delaiDuDossier(d as never, new Date(MAINTENANT_REEL)).libelle} »`,
    );
  }
  dire(
    "⚠️ et la colonne les marque tous, sans exception",
    discordants.length === 0,
    discordants.length === 0
      ? `${nommes.length} dossier(s) confrontés`
      : discordants.map((d) => String(d.reference)).join(", "),
  );

  /*
  Un contrôle qui mesure les données n'est pas une garde : sur une base que le
  ménage des épreuves vide, il n'y a rien à compter. On imprime, on n'exige pas.
  Le revers de la leçon de `verifier-veille.ts`.
*/
  /*
    ⚠️ Le contrôle décisif : chaque dossier fabriqué doit tomber du bon côté.
    Un comptage global ne dirait pas si c'est le bon qu'on a ramassé.
  */
  const dansLaListe = new Set(nommes.map((d) => String(d.id)));
  const { docs: envois } = await payload.find({
    collection: "inscriptions",
    where: conditions(seuilTache) as never,
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });
  const dansLesEnvois = new Set(envois.map((d) => String(d.id)));

  for (const f of fabriques) {
    dire(
      `⚠️ « ${f.nom} » ${f.vignette ? "est annoncé" : "reste hors"} de la vignette`,
      dansLaListe.has(String(f.id)) === f.vignette,
    );
    dire(
      `et ${f.tache ? "recevra" : "ne recevra pas"} le courriel au prochain passage`,
      dansLesEnvois.has(String(f.id)) === f.tache,
    );
  }
  /*
    ── ⚠️ Et le lien de la vignette ramène bien ceux qu'elle compte ───────────
    Un filtre d'URL faux ne casse rien : Payload rend la liste, simplement sans
    le tri — ni erreur, ni type fautif, ni page blanche. Le nombre annoncerait
    alors un tri que le lien ne fait pas, et l'on tomberait sur le fichier
    entier, à retrouver soi-même. On tire donc vraiment la route, comme le
    ferait le navigateur au clic.
  */
  const membre = await payload.create({
    collection: "utilisateurs",
    overrideAccess: true,
    data: {
      email: `delai.${Date.now()}@epreuve.invalid`,
      password: `D${Math.random().toString(36).slice(2)}!5`,
      nom: "Épreuve Délai",
      role: "direction",
    } as never,
  });
  compteAsupprimer = membre.id;
  const cookie = await ouvrirSession(payload, "utilisateurs", membre.id);

  const requete = filtreDesPlacesAuTerme(seuilPresse).split("?")[1] ?? "";
  const reponse = await REST(
    new Request(`http://localhost/api/inscriptions?limit=100&depth=0&${requete}`, {
      headers: {
        cookie: cookie.split(";")[0] ?? "",
        origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "sec-fetch-site": "same-origin",
      },
    }),
    { params: Promise.resolve({ slug: ["inscriptions"] }) } as never,
  );
  const parLeLien = (await reponse.json()) as { docs?: { id: unknown }[] };
  const idsDuLien = new Set((parLeLien.docs ?? []).map((d) => String(d.id)));

  dire(
    "⚠️ le lien de la vignette ramène exactement ce qu'elle compte",
    reponse.status === 200 &&
      idsDuLien.size === dansLaListe.size &&
      [...dansLaListe].every((id) => idsDuLien.has(id)),
    `${idsDuLien.size} par le lien, ${dansLaListe.size} au comptage`,
  );
} finally {
  if (compteAsupprimer !== undefined) {
    await payload
      .delete({ collection: "utilisateurs", id: compteAsupprimer, overrideAccess: true })
      .catch(() => undefined);
  }
  for (const f of fabriques) {
    await payload
      .delete({ collection: "inscriptions", id: f.id, overrideAccess: true })
      .catch(() => undefined);
  }
  if (fabriques.length > 0) console.log(`\n  · ${fabriques.length} dossier(s) d'épreuve retirés`);
}

console.log(
  manques === 0
    ? "\n  On voit l'échéance venir, et qui recevra le courriel.\n"
    : `\n  ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
