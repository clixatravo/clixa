/**
 * La signature des appels de Resend. Séparée de `lib/suivi-courriel.ts` parce
 * qu'elle a besoin de `node:crypto`, et que l'autre est lue par un composant du
 * navigateur.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** Cinq minutes : au-delà, un appel est traité comme rejoué. */
export const TOLERANCE_SECONDES = 5 * 60;

/**
 * La signature d'un appel de Resend est-elle la bonne ?
 *
 * Resend signe à la manière de Svix : HMAC-SHA256 de
 * `<svix-id>.<svix-timestamp>.<corps brut>`, avec la clef du webhook
 * (`whsec_…`, en base64 après le préfixe). L'en-tête `svix-signature` porte une
 * ou plusieurs signatures `v1,<base64>` séparées par des espaces — plusieurs
 * pendant une rotation de clef.
 *
 * ⚠️ **Sans cette vérification, la route serait un formulaire public** qui
 * écrit « remis » ou « rejeté » sur n'importe quel courriel : il suffirait d'en
 * connaître l'identifiant. Et c'est sur ces états que l'équipe décidera qui
 * relancer par téléphone.
 *
 * ⚠️ **Le corps doit être le texte brut reçu**, jamais un JSON relu puis
 * réécrit : un espace déplacé change la signature, et l'on refuserait des
 * appels authentiques.
 *
 * ⚠️ **L'horodatage compte** : sans lui, un appel intercepté se rejouerait
 * indéfiniment. L'horloge est passée en paramètre pour que la garde soit la
 * même demain matin.
 */
export function signatureResendValide(
  secret: string,
  entetes: {
    id: string | null | undefined;
    horodatage: string | null | undefined;
    signature: string | null | undefined;
  },
  corps: string,
  maintenant: number = Date.now(),
): boolean {
  const { id, horodatage, signature } = entetes;
  if (!secret || !id || !horodatage || !signature) return false;

  const t = Number(horodatage);
  if (!Number.isFinite(t) || Math.abs(maintenant / 1000 - t) > TOLERANCE_SECONDES) return false;

  let cle: Buffer;
  try {
    cle = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  } catch {
    return false;
  }
  if (cle.length === 0) return false;

  const attendue = createHmac("sha256", cle).update(`${id}.${horodatage}.${corps}`).digest();

  return signature.split(" ").some((partie) => {
    const [version, valeur] = partie.split(",");
    if (version !== "v1" || !valeur) return false;
    const recue = Buffer.from(valeur, "base64");
    // `timingSafeEqual` lève sur deux longueurs différentes : on compare d'abord.
    return recue.length === attendue.length && timingSafeEqual(recue, attendue);
  });
}

/**
 * Signe comme Resend — pour les gardes, qui doivent fabriquer un appel
 * authentique sans passer par Resend.
 */
export function signerCommeResend(
  secret: string,
  id: string,
  horodatage: string,
  corps: string,
): string {
  const cle = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return `v1,${createHmac("sha256", cle).update(`${id}.${horodatage}.${corps}`).digest("base64")}`;
}
