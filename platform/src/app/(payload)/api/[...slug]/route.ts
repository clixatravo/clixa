/* API REST de Payload — utilisée par le back-office, et disponible pour
   INT-01 quand src/lib/ basculera dessus. */
import config from "@payload-config";
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from "@payloadcms/next/routes";
import { appelant, cadenceDesPortesDeCompte, cadenceOk, tropVite } from "@/lib/cadence";

const POST_PAYLOAD = REST_POST(config);

export const GET = REST_GET(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);

/*
  Les portes de compte — connexion, mot de passe oublié, réinitialisation… —
  passent d'abord par le frein. Voir `cadenceDesPortesDeCompte` : elles
  n'en avaient aucun, et « mot de passe oublié » envoie un courriel à chaque
  appel.
*/
export const POST = async (...args: Parameters<typeof POST_PAYLOAD>): Promise<Response> => {
  const [request] = args;
  const regle = cadenceDesPortesDeCompte(new URL(request.url).pathname);
  if (regle && !cadenceOk(regle.registre, appelant(request), regle.plafond, regle.fenetreMs)) {
    return tropVite(Math.ceil(regle.fenetreMs / 1000));
  }
  return POST_PAYLOAD(...args);
};
