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
    execFileSync(
      "psql",
      [
        url,
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
      ],
      {
        stdio: "pipe",
        /*
          `psql` cherche son autorité de certification dans `~/.postgresql/`,
          qui n'existe sur aucune machine de développeur. Depuis que la chaîne
          de connexion demande `verify-full`, il refusait donc de se connecter
          et le ménage échouait en silence — les dossiers d'épreuve
          s'accumulaient. `system` le renvoie au magasin du système, celui que
          le navigateur et le pilote Node utilisent déjà.
        */
        env: { ...process.env, PGSSLROOTCERT: "system" },
      },
    );
  } catch (e) {
    // Sans psql sous la main, on le dit plutôt que d'échouer la suite : les
    // épreuves ont déjà rendu leur verdict, le ménage n'en fait pas partie.
    console.warn("[épreuves] ménage impossible :", (e as Error).message);
  }
}
