import { expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { OCCUPE_UNE_PLACE_SQL } from "../src/lib/places";

/**
 * Retirer ce que les épreuves ont écrit.
 *
 * Les inscriptions créées portent toutes une adresse en `@epreuve.invalid` —
 * un domaine réservé, qui ne peut appartenir à personne. C'est à cette marque
 * qu'on les reconnaît.
 *
 * ⚠️ La seconde requête refait à la main ce que fait le crochet `recompter`
 * de `collections/Inscriptions.ts` : supprimer les lignes en SQL ne le
 * déclenche pas, et le décompte de places resterait gonflé. Les deux règles
 * doivent rester identiques — « toutes les inscriptions de la session qui ne
 * sont pas annulées ».
 *
 * Passer par `payload run` déclencherait le vrai crochet, mais Payload met près
 * d'une minute à démarrer contre Neon : à ce prix-là, personne ne lancerait les
 * épreuves.
 */
export const MARQUE = "@epreuve.invalid";

/**
 * La référence du dossier, lue dans l'adresse où la pré-inscription a mené.
 *
 * ⚠️ **Le chemin, jamais l'adresse entière.** La redirection porte
 * `?nouveau=1` — le marqueur qui dit à Meta qu'une pré-inscription vient
 * d'aboutir — et découper l'adresse brute rendait « CLX-XXXXXXXX?nouveau=1 ».
 * Six épreuves lisaient la référence ainsi, et dix sont tombées d'un coup le
 * jour où le paramètre est apparu. Elles le lisent maintenant d'ici.
 *
 * ⚠️ **Et la forme est vérifiée sur place.** Une extraction fautive ne se
 * voyait pas : elle ressortait douze lignes plus loin en « le contrat doit se
 * composer — reçu 404 », c'est-à-dire comme un dossier qui n'existe pas. Une
 * série a échoué ainsi sans qu'on puisse dire laquelle des deux causes
 * c'était, et sans jamais se reproduire. Si cela revient, l'épreuve dira
 * maintenant quelle adresse elle a lue.
 */
export function referenceDeLAdresse(url: string): string {
  const reference = new URL(url).pathname.split("/").pop() ?? "";
  expect(reference, `référence illisible dans « ${url} »`).toMatch(
    /^CLX-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/,
  );
  return reference;
}

/**
 * Combien de lignes répondent à cette condition, comptées en base.
 *
 * ⚠️ **Certaines règles ne se voient pas dans la réponse HTTP.** Une demande
 * de rappel répétée doit être écartée — mais le site répond « c'est
 * enregistré » dans les deux cas, et c'est voulu : annoncer un doublon
 * inquiéterait sans rien apprendre. Une épreuve qui ne regarde que la
 * redirection reste donc verte avec ou sans la garde. Éprouvé : le défaut a
 * été remis, et elle n'a rien vu.
 *
 * Il faut compter les lignes. C'est aussi ce que fait le ménage, par la même
 * porte : `psql` avec la chaîne de `.env.local`.
 */
/**
 * Le seul endroit qui lance `psql`.
 *
 * ⚠️ **Son erreur ne doit jamais remonter telle quelle.** `execFileSync` met
 * la commande entière dans le message — donc la chaîne de connexion, donc le
 * **mot de passe**. Une épreuve qui échoue en intégration continue l'écrirait
 * dans le journal de GitHub, où il resterait ; c'est arrivé une fois en local,
 * et le mot de passe de `dev` a déjà dû être régénéré pour cette raison.
 *
 * On garde ce que dit le serveur, on jette le reste.
 */
function psql(url: string, args: string[]): string {
  try {
    return execFileSync("psql", [url, ...args], {
      encoding: "utf8",
      env: { ...process.env, PGSSLROOTCERT: "system" },
    });
  } catch (e) {
    const dit = String((e as { stderr?: unknown }).stderr ?? "").trim();
    throw new Error(`psql a refusé : ${dit.split("\n").slice(0, 3).join(" · ") || "sans détail"}`);
  }
}

export function compterEnBase(table: string, condition: string): number {
  const url = adresseBase();
  if (!url) throw new Error("DATABASE_URL introuvable : impossible de compter.");
  return Number(
    psql(url, ["-t", "-A", "-c", `SELECT count(*) FROM ${table} WHERE ${condition};`]).trim(),
  );
}

/**
 * Exécute du SQL et rend la première colonne de la première ligne.
 *
 * ⚠️ Réservé aux épreuves qui doivent **mettre la base dans un état** que le
 * site ne sait pas produire — une session complète, par exemple : la remplir
 * par le tunnel demanderait trente inscriptions, et trente courriels.
 */
export function sqlUneValeur(sql: string): string {
  const url = adresseBase();
  if (!url) throw new Error("DATABASE_URL introuvable.");
  return psql(url, ["-t", "-A", "-c", sql]).trim();
}

export function adresseBase(): string | undefined {
  const chemin = path.join(process.cwd(), ".env.local");
  if (!existsSync(chemin)) return process.env.DATABASE_URL;
  const ligne = readFileSync(chemin, "utf8")
    .split("\n")
    .find((l) => l.startsWith("DATABASE_URL="));
  return ligne
    ?.slice("DATABASE_URL=".length)
    .trim()
    .replace(/^["']|["']$/g, "");
}

export default function menage(): void {
  const url = adresseBase();
  if (!url) return;

  try {
    psql(url, [
      "-q",
      "-c",
      `DELETE FROM inscriptions WHERE apprenant_email LIKE '%${MARQUE}';`,
      "-c",
      /*
          Les comptes participants aussi, depuis que `espace.spec.ts` en ouvre
          pour atteindre `/compte` — cette page réclame une session, et il n'y
          a pas d'autre façon d'y entrer.

          Leurs sessions partent avec eux : `apprenants_sessions` est déclarée
          en cascade par Payload. Sans cette ligne, chaque série laissait un
          compte de plus, et la table finissait par ne contenir que des
          fantômes d'épreuves.
        */
      `DELETE FROM apprenants WHERE email LIKE '%${MARQUE}';`,
      "-c",
      /*
          ⚠️ Même règle que le crochet `recompter` et que la tâche quotidienne :
          une place se prend en payant, pas en s'inscrivant. Ce recompte existe
          parce qu'une suppression en SQL ne déclenche aucun crochet.

          La condition n'est plus recopiée : elle vient de `lib/places.ts`.
          Elle l'était, et deux textes tenus à la main finissent par diverger —
          en silence, le décompte des places restant simplement faux.
        */
      `UPDATE sessions s SET places_reservees = (
           SELECT count(*) FROM inscriptions i
           WHERE i.session_id = s.id AND ${OCCUPE_UNE_PLACE_SQL}
         );`,
    ]);
  } catch (e) {
    // Sans psql sous la main, on le dit plutôt que d'échouer la suite : les
    // épreuves ont déjà rendu leur verdict, le ménage n'en fait pas partie.
    console.warn("[épreuves] ménage impossible :", (e as Error).message);
  }
}
