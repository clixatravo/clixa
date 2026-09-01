/**
 * Les portes réservées à l'équipe le sont-elles vraiment ?
 *
 * Le bouton « Exporter CSV » du tableau de bord verse dans un tableur le nom,
 * l'adresse, le téléphone, la session, le statut et les montants réglés de
 * **tous** les dossiers, plus toutes les demandes de rappel. C'est le fichier
 * clients entier.
 *
 * ⚠️ La route se contentait de vérifier qu'une session existe. Or `apprenants`
 * est aussi une collection authentifiée : un compte participant — que
 * n'importe qui ouvre depuis /compte, ou par Google — suffisait à télécharger
 * le fichier. C'est exactement le trou que `api/recu` ferme en toutes lettres,
 * resté ouvert ici.
 *
 * La même faute vivait sur `api/apercu`, qui ouvre les brouillons — les quatre
 * pages légales non relues, les témoignages dépubliés, les articles en
 * préparation. Son propre commentaire disait pourtant que « sans ce contrôle,
 * l'URL suffirait à lire n'importe quel brouillon ». Le contrôle existait ; il
 * ne regardait pas la bonne chose.
 *
 * On ne décrit rien : on monte une vraie session de participant, une vraie
 * session d'équipe, et l'on appelle les routes.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { ouvrirSession } from "../src/lib/session.js";
import { GET } from "../src/app/(payload)/api/admin/export-admissions/route.js";
import { GET as APERCU } from "../src/app/(payload)/api/apercu/route.js";

const payload = await getPayload({ config });

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

/*
  ⚠️ Sans ces deux en-têtes, l'extraction de jeton de Payload refuse la requête
  depuis que `csrf` est réglé : aucun navigateur n'omet les deux, mais tout
  script le fait. J'y avais perdu une heure la première fois.
*/
const COMME_UN_NAVIGATEUR = {
  origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  "sec-fetch-site": "same-origin",
};

const marque = Date.now();
const aSupprimer: { collection: "apprenants" | "utilisateurs"; id: string | number }[] = [];

/** Appelle la route comme le ferait le navigateur porteur de ce cookie. */
const appeler = async (cookie?: string) => {
  const entetes = new Headers({
    ...COMME_UN_NAVIGATEUR,
    ...(cookie ? { cookie: cookie.split(";")[0] ?? "" } : {}),
  });
  return GET(new Request("http://localhost/api/admin/export-admissions", { headers: entetes }));
};

try {
  console.log("\n▸ Sans session, rien ne sort\n");
  const anonyme = await appeler();
  dire("un visiteur anonyme est refusé", anonyme.status === 401, `reçu ${anonyme.status}`);

  console.log("\n▸ Une session de participant ne suffit pas\n");
  const participant = await payload.create({
    collection: "apprenants",
    overrideAccess: true,
    disableVerificationEmail: true,
    data: {
      email: `export.${marque}@epreuve.invalid`,
      password: `mp-${marque}-${Math.random().toString(36).slice(2)}`,
      nom: "Épreuve Participant",
      _verified: true,
    } as never,
  });
  aSupprimer.push({ collection: "apprenants", id: participant.id });
  const cookieParticipant = await ouvrirSession(payload, "apprenants", participant.id);

  const cote = await appeler(cookieParticipant);
  const corps = cote.status === 200 ? await cote.text() : "";
  dire("un compte participant connecté est refusé", cote.status === 401, `reçu ${cote.status}`);
  /*
    La preuve du dommage, et non seulement du code : si le fichier sort, il
    porte les adresses des autres.
  */
  if (corps) {
    dire(
      "et le fichier ne lui parvient pas",
      false,
      `${corps.split("\r\n").length - 1} ligne(s) de données lui ont été servies`,
    );
  }

  console.log("\n▸ Une session d'équipe sort le fichier\n");
  const membre = await payload.create({
    collection: "utilisateurs",
    overrideAccess: true,
    data: {
      email: `export.equipe.${marque}@epreuve.invalid`,
      password: `mp-${marque}-${Math.random().toString(36).slice(2)}`,
      nom: "Épreuve Export",
      role: "pedagogie",
    } as never,
  });
  aSupprimer.push({ collection: "utilisateurs", id: membre.id });
  const cookieEquipe = await ouvrirSession(payload, "utilisateurs", membre.id);

  const equipe = await appeler(cookieEquipe);
  dire("l'équipe obtient le fichier", equipe.status === 200, `reçu ${equipe.status}`);
  if (equipe.status === 200) {
    const texte = await equipe.text();
    dire("il porte l'en-tête des colonnes", texte.includes("Nom & Prénom"));
    dire(
      "il s'annonce comme un téléchargement",
      (equipe.headers.get("content-disposition") ?? "").includes("attachment"),
    );
    dire("il ne se garde pas en cache", equipe.headers.get("cache-control") === "no-store");
  }
  /*
    ── La prévisualisation des brouillons ─────────────────────────────────────
    ⚠️ Seul le refus s'éprouve ici. Passé la garde, la route appelle
    `draftMode()` puis `redirect()`, qui exigent tous deux le contexte de
    requête de Next : hors de lui, ils lèvent. Une session d'équipe se
    reconnaît donc à ce qu'elle **ne reçoit pas** 401 — ce qui suffit, puisque
    c'est le refus qui protège.
  */
  console.log("\n▸ Les brouillons ne s'ouvrent pas à un participant\n");

  const apercu = async (cookie?: string) => {
    const entetes = new Headers({
      ...COMME_UN_NAVIGATEUR,
      ...(cookie ? { cookie: cookie.split(";")[0] ?? "" } : {}),
    });
    const requete = new Request("http://localhost/api/apercu?chemin=/mentions-legales", {
      headers: entetes,
    });
    try {
      return (await APERCU(requete)).status;
    } catch {
      // Levée : la garde est franchie, et c'est tout ce qu'on veut savoir.
      return 0;
    }
  };

  dire("un visiteur anonyme est refusé", (await apercu()) === 401);
  dire("un compte participant connecté est refusé", (await apercu(cookieParticipant)) === 401);
  dire("l'équipe passe la garde", (await apercu(cookieEquipe)) !== 401);
  /*
    ── Les coordonnées du bénéficiaire ────────────────────────────────────────
    Le global `tarifs` est en lecture publique : c'est le barème que le site
    affiche. Il porte aussi, masqués dans /admin, le nom du bénéficiaire et les
    consignes de règlement.

    ⚠️ `admin.hidden` n'est pas un contrôle d'accès. Il retire la case du
    formulaire, et l'API REST continue de servir le champ à n'importe qui.
    Éprouvé en remplissant les quatre valeurs et en tirant
    `/api/globals/tarifs` sans session : le RIB sortait.

    On ne se fie donc pas au fait qu'ils soient vides aujourd'hui : on les
    remplit, on regarde ce que l'API rend, et on les remet à vide.
  */
  console.log("\n▸ Les coordonnées de règlement ne sortent jamais\n");

  const avant = await payload.findGlobal({ slug: "tarifs", locale: "fr", overrideAccess: true });
  const temoin = `NE-DOIT-PAS-SORTIR-${marque}`;
  try {
    await payload.updateGlobal({
      slug: "tarifs",
      locale: "fr",
      overrideAccess: true,
      data: {
        beneficiaireNom: temoin,
        beneficiaireVille: temoin,
        beneficiairePays: temoin,
        consignesPaiement: temoin,
      } as never,
    });

    const publique = (await payload.findGlobal({
      slug: "tarifs",
      locale: "fr",
      // Pas d'`overrideAccess` : on veut voir ce qu'un visiteur obtient.
      overrideAccess: false,
    })) as unknown as Record<string, unknown>;

    const fuites = Object.entries(publique)
      .filter(([, v]) => typeof v === "string" && v.includes(temoin))
      .map(([k]) => k);
    dire(
      "aucune coordonnée ne sort sans session",
      fuites.length === 0,
      fuites.length ? `sorties : ${fuites.join(", ")}` : "",
    );
    dire(
      "et le barème que le site affiche est intact",
      typeof publique.prixComptant === "number" && Array.isArray(publique.plans),
    );
  } finally {
    /*
      Remis exactement dans l'état d'avant, y compris s'il était rempli : ce
      script tourne aussi sur une base où la direction aurait saisi quelque
      chose.
    */
    const a = avant as unknown as Record<string, unknown>;
    await payload.updateGlobal({
      slug: "tarifs",
      locale: "fr",
      overrideAccess: true,
      data: {
        beneficiaireNom: a.beneficiaireNom ?? null,
        beneficiaireVille: a.beneficiaireVille ?? null,
        beneficiairePays: a.beneficiairePays ?? null,
        consignesPaiement: a.consignesPaiement ?? null,
      } as never,
    });
  }
} finally {
  for (const { collection, id } of aSupprimer) {
    await payload.delete({ collection, id, overrideAccess: true }).catch(() => {});
  }
}

console.log(
  manques === 0
    ? "\n✓ Les portes de l'équipe ne s'ouvrent qu'à elle.\n"
    : `\n✗ ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
