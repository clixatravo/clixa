/**
 * Resend prévient ici de ce qu'il advient de chaque courriel.
 *
 * Voir `lib/suivi-courriel.ts`. Le webhook se déclare dans le tableau de bord
 * de Resend (Webhooks → Add endpoint), sur
 * `https://www.clixa.africa/api/webhooks/resend`, et sa clef de signature
 * (`whsec_…`) se pose dans `RESEND_WEBHOOK_SECRET` sur Vercel.
 *
 * ⚠️ **Sans clef, la route répond 503 — elle ne s'ouvre pas.** C'est la règle
 * de `api/relances` : une garde qui s'efface quand on oublie de la régler
 * n'est pas une garde.
 *
 * ⚠️ **Un événement qu'on ne sait pas lire répond quand même 200.** Resend
 * réessaie tout ce qui n'est pas un succès, pendant des heures ; lui répondre
 * 400 pour un type inconnu ferait revenir le même appel indéfiniment.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { signatureResendValide } from "@/lib/signature-resend";
import { appliquerEvenement, type EvenementResend } from "@/lib/courriels-envoyes";

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ erreur: "Suivi des courriels non configuré." }, { status: 503 });
  }

  // Le texte brut : c'est lui qui est signé, pas le JSON qu'on en tirerait.
  const corps = await req.text();
  const appel = req.headers.get("svix-id");
  const valide = signatureResendValide(
    secret,
    {
      id: appel,
      horodatage: req.headers.get("svix-timestamp"),
      signature: req.headers.get("svix-signature"),
    },
    corps,
  );
  if (!valide || !appel) {
    return NextResponse.json({ erreur: "Signature invalide." }, { status: 401 });
  }

  let evenement: EvenementResend;
  try {
    evenement = JSON.parse(corps) as EvenementResend;
  } catch {
    return NextResponse.json({ ok: true, effet: "ignore" });
  }

  const payload = await getPayload({ config });
  const effet = await appliquerEvenement(payload, evenement, appel);
  return NextResponse.json({ ok: true, effet });
}
