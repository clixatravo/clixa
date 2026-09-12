/**
 * Qui a relancé — nommé, et lisible par toute l'équipe.
 *
 * ── ⚠️ Le défaut que cette garde protège ────────────────────────────────────
 * Le journal des relances portait une **relation** vers le compte auteur, et
 * l'écran affichait « vous » ou « un collègue ». Or `comptesLecture` ne laisse
 * lire que son propre compte : seule la direction résout la relation, et
 * l'administration lisait donc « un collègue » sur une ligne écrite par le
 * directeur. Elle n'apprenait rien, et reprenait la conversation sur un autre
 * WhatsApp — ce que ce journal existe précisément pour éviter.
 *
 * ⚠️ **Le contrôle qui compte est celui du compte non-direction** : c'est lui
 * qui échouait, et lui seul. Un contrôle écrit avec une session de direction
 * serait resté vert des deux côtés du défaut.
 *
 *   npx payload run scripts/verifier-signature-relance.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { libelleDuCompte, nomDeLAuteur } from "@/lib/equipe";
import { dernierSuivi } from "@/lib/suivi";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  Qui a relancé\n");

/* ── Comment on nomme un compte ──────────────────────────────────────────── */

dire("un nom est un nom", libelleDuCompte({ nom: "Mounir", email: "m@clixa.africa" }) === "Mounir");
dire(
  "sans nom, le rôle",
  libelleDuCompte({ email: "admin@clixa.africa", role: "direction" }) === "Direction",
  libelleDuCompte({ email: "admin@clixa.africa", role: "direction" }),
);
/*
  ⚠️ L'adresse entière ferait déborder la colonne, et le domaine n'apprend rien.
*/
dire(
  "à défaut, ce qui précède l'arobase",
  libelleDuCompte({ email: "mounir@clixa.africa" }) === "mounir",
);
dire("un compte vide ne s'invente pas", libelleDuCompte({}) === "");
dire("ni un compte absent", libelleDuCompte(null) === "");

/* ── Ce que l'écran affiche ──────────────────────────────────────────────── */

console.log("\n  Ce que la ligne dit\n");

dire("le nom recopié l'emporte", nomDeLAuteur({ parNom: "Mounir", par: 3 }) === "Mounir");
/*
  ⚠️ Le cas d'une ligne d'avant le 12 septembre 2026, ouverte par la direction :
  la relation est résolue, on s'en sert plutôt que de dire « un collègue ».
*/
dire(
  "sans nom recopié, la relation résolue sert de repli",
  nomDeLAuteur({ par: { id: 3, nom: "Rida" } }) === "Rida",
);
/*
  ⚠️ **Et c'est ici que le défaut vivait.** Pour un compte non-direction, la
  relation n'est pas résolue : elle arrive en identifiant nu. Sans instantané,
  il n'y a rien à afficher — c'est ce qui donnait « un collègue ».
*/
dire("un identifiant nu ne nomme personne", nomDeLAuteur({ par: 3 }) === "");
dire("ni une ligne sans auteur — c'est la tâche de 8 h", nomDeLAuteur({ le: "x" } as never) === "");

/* ── La colonne de la liste ──────────────────────────────────────────────── */

console.log("\n  La colonne de la liste\n");

const maintenant = new Date("2026-09-12T12:00:00.000Z");
const hier = new Date("2026-09-11T09:00:00.000Z").toISOString();

const avecNom = dernierSuivi(
  [{ quoi: "signature", le: hier, par: 3, parNom: "Mounir" }],
  maintenant,
);
dire("elle nomme l'auteur du dernier geste", avecNom.auteur === "Mounir", avecNom.auteur);
dire("et dit toujours quand", avecNom.libelle === "Relance signature · hier", avecNom.libelle);

/*
  ⚠️ Le **dernier**, pas le premier : c'est la personne à qui parler avant de
  composer le numéro. Les lignes sont données à l'envers exprès — le journal
  s'écrit en ajoutant à la fin, mais une correction depuis /admin peut les
  réordonner.
*/
const deux = dernierSuivi(
  [
    { quoi: "signature", le: hier, parNom: "Mounir" },
    { quoi: "paiement", le: new Date("2026-09-12T08:00:00.000Z").toISOString(), parNom: "Rida" },
  ],
  maintenant,
);
dire("celui du dernier geste, pas du premier", deux.auteur === "Rida", deux.auteur);

const auto = dernierSuivi([{ quoi: "rappel", le: hier }], maintenant);
dire("une ligne de la tâche de 8 h n'a pas d'auteur", auto.auteur === "");

const jamais = dernierSuivi([], maintenant);
dire("un dossier jamais relancé non plus", jamais.auteur === "" && jamais.ton === "jamais");

/* ── En base : la relance de l'équipe porte son nom ──────────────────────── */

const payload = await getPayload({ config });
const { docs: comptes } = await payload.find({
  collection: "utilisateurs",
  limit: 5,
  depth: 0,
  overrideAccess: true,
});

if (comptes.length === 0) {
  console.log("\n  · Aucun compte d'équipe : la partie en base est sautée.\n");
} else {
  console.log("\n  Les comptes réels se nomment tous\n");
  const sansNom = comptes.filter((c) => libelleDuCompte(c as never) === "");
  dire(
    "⚠️ chacun a de quoi être nommé à l'écran",
    sansNom.length === 0,
    sansNom.length > 0
      ? `${sansNom.length} sans nom, ni rôle, ni adresse`
      : comptes.map((c) => libelleDuCompte(c as never)).join(", "),
  );
}

/* ── La porte du bouton WhatsApp ─────────────────────────────────────────── */
/*
  ── ⚠️ Le trou que cette porte ferme ────────────────────────────────────────
  Les quatre boutons de la fiche notaient qui a relancé ; le bouton WhatsApp de
  la **liste** était un simple lien. Or c'est le chemin qu'on prend réellement
  pour joindre quelqu'un : le directeur écrivait au client, l'administration
  lisait « jamais relancé », et écrivait par-dessus. La plainte du 12 septembre
  2026, par la porte qu'on avait oubliée.
*/
console.log("\n  Le clic sur WhatsApp\n");

const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 1,
  depth: 0,
  overrideAccess: true,
  where: { fin: { greater_than: new Date().toISOString() } },
});

if (!sessions[0] || comptes.length === 0) {
  console.log("  · Pas de session ou pas de compte : la porte n'est pas éprouvée.");
} else {
  const { ouvrirSession } = await import("@/lib/session");
  const { POST } = await import("../src/app/(payload)/api/admin/journal/route.js");

  const COMME_UN_NAVIGATEUR = {
    "content-type": "application/json",
    origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "sec-fetch-site": "same-origin",
  };

  const membre = await payload.create({
    collection: "utilisateurs",
    overrideAccess: true,
    data: {
      email: `journal.${Date.now()}@epreuve.invalid`,
      password: `mp-${Math.random().toString(36).slice(2)}`,
      nom: "Hajar El Khadiri",
      role: "direction",
    } as never,
  });
  const cookieEquipe = await ouvrirSession(payload, "utilisateurs", membre.id);

  const dossier = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: sessions[0].id,
      statut: "demandee",
      apprenantNom: "Épreuve Journal",
      apprenantEmail: `journal.${Math.random().toString(36).slice(2)}@epreuve.invalid`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      echeances: [{ montant: 423, statut: "attendu" }],
    } as never,
  });

  /*
    ⚠️ Un plantage n'est pas un refus. On rend l'exception comme un 500, que les
    contrôles distinguent — la clef étrangère n'est pas une garde.
  */
  const poster = async (corps: unknown, cookie?: string) => {
    try {
      return await POST(
        new Request("http://localhost/api/admin/journal", {
          method: "POST",
          headers: { ...COMME_UN_NAVIGATEUR, ...(cookie ? { cookie: cookie.split(";")[0]! } : {}) },
          body: JSON.stringify(corps),
        }),
      );
    } catch (e) {
      return { status: 500, json: async () => ({ erreur: String(e).slice(0, 80) }) } as Response;
    }
  };

  const relire = async () =>
    ((
      await payload.findByID({
        collection: "inscriptions",
        id: dossier.id,
        depth: 0,
        overrideAccess: true,
      })
    ).echanges ?? []) as { quoi?: string | null; parNom?: string | null }[];

  try {
    const anonyme = await poster({ id: dossier.id, quoi: "whatsapp" });
    dire("⚠️ sans session, la porte refuse", anonyme.status === 401, `reçu ${anonyme.status}`);
    dire("et rien n'est écrit", (await relire()).length === 0);

    /*
      ⚠️ Seul `whatsapp` passe : les gestes de la fiche ont leurs propres portes,
      qui envoient des courriels. Une liste ouverte laisserait écrire « rappel »
      sans qu'aucun message ne parte — une trace qui ment.
    */
    const invente = await poster({ id: dossier.id, quoi: "rappel" }, cookieEquipe);
    dire("⚠️ un geste que la liste ne fait pas est refusé", invente.status === 400);

    const premier = await poster({ id: dossier.id, quoi: "whatsapp" }, cookieEquipe);
    dire("l'équipe note son clic", premier.status === 200, `reçu ${premier.status}`);

    const apres = await relire();
    dire(
      "⚠️ et la ligne porte son nom",
      apres[0]?.parNom === "Hajar El Khadiri",
      apres[0]?.parNom ?? "—",
    );
    dire("le geste est « whatsapp »", apres[0]?.quoi === "whatsapp");

    /*
      ⚠️ On rouvre WhatsApp pour relire, pour corriger, parce que l'onglet s'est
      fermé. Trois lignes à la minute rendraient la colonne illisible et
      fausseraient le compte d'échanges, que l'équipe lit pour décider s'il faut
      insister.
    */
    const second = await poster({ id: dossier.id, quoi: "whatsapp" }, cookieEquipe);
    dire("⚠️ un second clic dans la fenêtre n'ajoute rien", second.status === 200);
    dire("le journal n'a toujours qu'une ligne", (await relire()).length === 1);

    /*
      ⚠️ **Le témoin.** La fenêtre vaut *par personne* : si le directeur ouvre
      WhatsApp et que l'administration l'ouvre trois minutes plus tard, ce sont
      deux gestes réels — et c'est ce que la colonne existe pour montrer. Sans ce
      contrôle, une garde trop large passerait au vert en avalant le second.
    */
    const autre = await payload.create({
      collection: "utilisateurs",
      overrideAccess: true,
      data: {
        email: `journal2.${Date.now()}@epreuve.invalid`,
        password: `mp-${Math.random().toString(36).slice(2)}`,
        nom: "Mounir MOUKHTARI",
        role: "direction",
      } as never,
    });
    const cookieAutre = await ouvrirSession(payload, "utilisateurs", autre.id);
    await poster({ id: dossier.id, quoi: "whatsapp" }, cookieAutre);
    const deux = await relire();
    dire(
      "⚠️ (témoin) un collègue qui ouvre à son tour est noté aussi",
      deux.length === 2 && deux[1]?.parNom === "Mounir MOUKHTARI",
      deux.map((l) => l.parNom).join(" puis "),
    );
    await payload.delete({ collection: "utilisateurs", id: autre.id, overrideAccess: true });
  } finally {
    await payload
      .delete({ collection: "inscriptions", id: dossier.id, overrideAccess: true })
      .catch(() => {});
    await payload
      .delete({ collection: "utilisateurs", id: membre.id, overrideAccess: true })
      .catch(() => {});
  }
}

console.log(
  manques === 0 ? "\n  On sait qui a parlé au client.\n" : `\n  ${manques} contrôle(s) au rouge.\n`,
);
process.exit(manques > 0 ? 1 : 0);
