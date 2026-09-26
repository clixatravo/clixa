/**
 * Le suivi des courriels : l'ordre des états, et la signature des appels.
 *
 *   npx tsx scripts/verifier-suivi-courriel.ts
 *
 * Aucune base, aucun réseau. Deux choses se cassent ici sans que rien ne le
 * signale : un état qui recule — « retardé » écrit sur un courriel déjà remis —
 * et une signature qui accepte ce qu'elle devrait refuser. La seconde ferait de
 * la route un formulaire public. Chaque refus a son témoin : une vérification
 * qui refuserait tout passerait sinon au vert.
 */
import {
  adresseNue,
  statutApres,
  statutDeLEvenement,
  STATUTS_COURRIEL,
} from "@/lib/suivi-courriel";
import { signatureResendValide, signerCommeResend } from "@/lib/signature-resend";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

console.log("\n  L'état ne recule jamais\n");

dire("un premier événement fixe l'état", statutApres(undefined, "delivre") === "delivre");
dire("retardé, puis remis : remis", statutApres("differe", "delivre") === "delivre");
dire(
  "⚠️ remis, puis un « retardé » arrivé en retard : reste remis",
  statutApres("delivre", "differe") === "delivre",
);
dire(
  "⚠️ remis, puis « parti » en retard : reste remis",
  statutApres("delivre", "envoye") === "delivre",
);
dire("remis, puis rejeté plus tard : rejeté", statutApres("delivre", "rejete") === "rejete");
dire(
  "⚠️ signalé comme indésirable n'est jamais recouvert",
  statutApres("plainte", "delivre") === "plainte",
);
dire(
  "un événement sans état (ouverture) ne change rien",
  statutApres("delivre", undefined) === "delivre",
);
dire("« email.opened » n'annonce aucun état", statutDeLEvenement("email.opened") === undefined);
dire("« email.bounced » annonce un rejet", statutDeLEvenement("email.bounced") === "rejete");
dire(
  "chaque état a un rang",
  STATUTS_COURRIEL.every((s) => s.rang >= 1),
  STATUTS_COURRIEL.map((s) => `${s.valeur}:${s.rang}`).join(" "),
);

console.log("\n  La signature\n");

const SECRET = `whsec_${Buffer.from("une-clef-d-epreuve-de-32-octets!!").toString("base64")}`;
const MAINTENANT = Date.UTC(2026, 8, 26, 14, 0, 0);
const t = String(Math.floor(MAINTENANT / 1000));
const corps = JSON.stringify({ type: "email.delivered", data: { email_id: "abc" } });
const bonne = signerCommeResend(SECRET, "msg_1", t, corps);
const valide = (e: { id?: string; horodatage?: string; signature?: string }, c = corps) =>
  signatureResendValide(
    SECRET,
    { id: e.id ?? "msg_1", horodatage: e.horodatage ?? t, signature: e.signature ?? bonne },
    c,
    MAINTENANT,
  );

dire("témoin : un appel signé passe", valide({}));
dire(
  "⚠️ un corps modifié d'un caractère est refusé",
  !valide({}, corps.replace("delivered", "delivereD")),
);
dire(
  "⚠️ une autre clef est refusée",
  !signatureResendValide(
    `whsec_${Buffer.from("une-autre-clef-de-32-octets-!!!!").toString("base64")}`,
    { id: "msg_1", horodatage: t, signature: bonne },
    corps,
    MAINTENANT,
  ),
);
dire("un autre identifiant d'appel est refusé", !valide({ id: "msg_2" }));
const ilYADixMinutes = String(Number(t) - 600);
dire(
  "⚠️ un appel vieux de dix minutes est refusé (rejeu)",
  !valide({
    horodatage: ilYADixMinutes,
    signature: signerCommeResend(SECRET, "msg_1", ilYADixMinutes, corps),
  }),
);
/*
  ⚠️ Signé pour sa propre heure : le premier jet réutilisait la signature de
  « maintenant », si bien que ce contrôle affirmait l'inverse de son titre et
  restait vert — la signature ne correspondait simplement pas.
*/
const ilYAQuatreMinutes = String(Number(t) - 240);
dire(
  "témoin : un appel à quatre minutes passe",
  valide({
    horodatage: ilYAQuatreMinutes,
    signature: signerCommeResend(SECRET, "msg_1", ilYAQuatreMinutes, corps),
  }),
);

dire("sans signature : refusé", !valide({ signature: "" }));
dire(
  "une signature d'une autre version est refusée",
  !valide({ signature: bonne.replace("v1,", "v2,") }),
);
dire(
  "pendant une rotation, l'une des deux suffit",
  valide({ signature: `v1,${Buffer.from("faux").toString("base64")} ${bonne}` }),
);

console.log("\n  L'adresse\n");

dire(
  "« Nom <a@b.c> » devient a@b.c",
  adresseNue("Awa Diallo <Awa@Exemple.com>") === "awa@exemple.com",
);
dire("une adresse nue reste elle-même", adresseNue(" x@y.z ") === "x@y.z");

console.log(manques === 0 ? "\n  Tout tient.\n" : `\n  ${manques} contrôle(s) au rouge.\n`);
process.exit(manques === 0 ? 0 : 1);
