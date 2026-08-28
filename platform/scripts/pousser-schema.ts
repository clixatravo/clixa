/**
 * Pousser le schéma sur une base, sans rien écrire d'autre.
 *
 * Payload aligne le schéma à l'initialisation, hors production. Ce script ne
 * fait que cela : il ouvre la connexion, compte les dossiers pour prouver que
 * la base répond, et s'arrête. Aucune écriture de contenu.
 *
 * ⚠️ La base passe avant le code. Un champ ajouté au modèle et poussé sans
 * cette étape fait échouer le build de production, qui interroge la base pour
 * pré-générer les pages et cherche une colonne qui n'existe pas encore.
 *
 *   set -a && . ./.env.prod && set +a && npx payload run scripts/pousser-schema.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });
const { totalDocs } = await payload.count({ collection: "inscriptions", overrideAccess: true });
console.log(`  schéma aligné · ${totalDocs} dossier(s) en base`);
