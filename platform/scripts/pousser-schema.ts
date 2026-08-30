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
 * ⚠️ Sans `PAYLOAD_PUSH=1`, il ne pousse rien : l'adaptateur laisse le schéma
 * intact et le script se contente de prouver que la base répond. C'est voulu —
 * on ne modifie pas un schéma par accident.
 *
 *   # la base de développement
 *   PAYLOAD_PUSH=1 npx payload run scripts/pousser-schema.ts
 *
 *   # la production
 *   set -a && . ./.env.prod && set +a && PAYLOAD_PUSH=1 npx payload run scripts/pousser-schema.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });
const { totalDocs } = await payload.count({ collection: "inscriptions", overrideAccess: true });
const pousse = process.env.PAYLOAD_PUSH === "1";
console.log(
  pousse
    ? `  schéma aligné · ${totalDocs} dossier(s) en base`
    : `  schéma NON poussé (PAYLOAD_PUSH absent) · ${totalDocs} dossier(s) en base`,
);
