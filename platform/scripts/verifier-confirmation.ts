/**
 * Éprouve la confirmation d'adresse, et surtout ce qu'elle ne doit pas casser.
 *
 * Deux chemins mènent à un compte, et ils n'ont pas les mêmes preuves :
 * le formulaire, qui n'en a aucune tant que le lien n'est pas suivi ; Google,
 * qui atteste déjà que la personne contrôle l'adresse. Exiger une confirmation
 * du second reviendrait à lui demander de prouver ce qu'il vient de prouver —
 * et sa connexion échouerait entre-temps.
 */
import { getPayload } from "payload";
import config from "@payload-config";

/*
  ⚠️ `Sec-Fetch-Site` : sans lui, la garde CSRF refuse le cookie.

  Depuis que `csrf` est réglé, l'extraction de jeton de Payload rejette une
  requête sans Origin ET sans Sec-Fetch-Site — le cas d'un script ou de curl,
  jamais celui d'un navigateur, qui envoie toujours l'un des deux. Sans cette
  en-tête, ces épreuves concluraient qu'une session valide n'authentifie pas,
  et l'on chercherait le défaut là où il n'est pas. J'y ai perdu une heure.
*/
const COMME_UN_NAVIGATEUR = { "Sec-Fetch-Site": "same-origin" };

const payload = await getPayload({ config });
const marque = Date.now();
const aSupprimer: (string | number)[] = [];
let manques = 0;
const dire = (q: string, v: boolean) => {
  console.log(`  ${v ? "✓" : "✗"} ${q}`);
  if (!v) manques += 1;
};

try {
  // ── Le chemin du formulaire ────────────────────────────────────────────
  const parFormulaire = await payload.create({
    collection: "apprenants",
    overrideAccess: true,
    data: {
      email: `form.${marque}@epreuve.invalid`,
      password: "epreuve-confirmation",
      nom: "Épreuve Formulaire",
    },
  });
  aSupprimer.push(parFormulaire.id);

  const brut = await payload.findByID({
    collection: "apprenants",
    id: parFormulaire.id,
    overrideAccess: true,
    showHiddenFields: true,
  });
  dire(
    "un compte du formulaire naît non vérifié",
    (brut as { _verified?: boolean })._verified !== true,
  );

  let refuse = false;
  try {
    await payload.login({
      collection: "apprenants",
      data: { email: `form.${marque}@epreuve.invalid`, password: "epreuve-confirmation" },
    });
  } catch {
    refuse = true;
  }
  dire("il ne peut pas se connecter avant confirmation", refuse);

  // ── Le chemin de Google ────────────────────────────────────────────────
  const parGoogle = await payload.create({
    collection: "apprenants",
    overrideAccess: true,
    data: {
      email: `google.${marque}@epreuve.invalid`,
      password: crypto.randomUUID(),
      nom: "Épreuve Google",
      googleId: `9${marque}`,
      emailVerifie: true,
      _verified: true,
    } as never,
  });
  aSupprimer.push(parGoogle.id);

  const relu = await payload.findByID({
    collection: "apprenants",
    id: parGoogle.id,
    overrideAccess: true,
    showHiddenFields: true,
  });
  dire("un compte Google naît vérifié", (relu as { _verified?: boolean })._verified === true);

  /*
    ⚠️ L'épreuve qui compte : la session s'ouvre-t-elle vraiment ? La connexion
    Google ne passe pas par `login` — elle écrit la session à la main — et
    `payload.auth()` refuse un compte non vérifié. Sans cette ligne, le bouton
    Google mènerait à une page de connexion en boucle.
  */
  const { ouvrirSession } = await import("../src/lib/session.js");
  const cookie = await ouvrirSession(payload, "apprenants", parGoogle.id);
  const { user } = await payload.auth({
    headers: new Headers({ cookie: cookie.split(";")[0] ?? "", ...COMME_UN_NAVIGATEUR }),
  });
  dire("la session Google authentifie malgré la confirmation exigée", Boolean(user));
} finally {
  for (const id of aSupprimer) {
    await payload.delete({ collection: "apprenants", id, overrideAccess: true });
  }
  console.log("  · comptes d'épreuve supprimés");
}

console.log(
  manques === 0 ? "\nConfirmation : tout tient." : `\nConfirmation : ${manques} manque(s).`,
);
process.exit(manques === 0 ? 0 : 1);
