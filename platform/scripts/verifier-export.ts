/**
 * L'export CSV sort-il seulement pour l'équipe ?
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
 * On ne le décrit pas : on monte une vraie session de participant, une vraie
 * session d'équipe, et l'on appelle la route.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { ouvrirSession } from "../src/lib/session.js";
import { GET } from "../src/app/(payload)/api/admin/export-admissions/route.js";

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
} finally {
  for (const { collection, id } of aSupprimer) {
    await payload.delete({ collection, id, overrideAccess: true }).catch(() => {});
  }
}

console.log(
  manques === 0
    ? "\n✓ Le fichier clients ne sort que pour l'équipe.\n"
    : `\n✗ ${manques} manque(s).\n`,
);
process.exit(manques === 0 ? 0 : 1);
