/**
 * Éprouver ce qui tient lieu de preuve dans une signature électronique.
 *
 * ── Ce qu'on vérifie, et pourquoi ce n'est pas évident ──────────────────────
 * Une signature simple ne vaut que par l'empreinte qui l'accompagne. Or une
 * empreinte se casse en silence : elle continue de se calculer, elle a toujours
 * la bonne longueur, et rien ne dit qu'elle ne correspond plus. On ne s'en
 * aperçoit qu'au moment où il faudrait la produire — c'est-à-dire lors d'une
 * contestation, quand il est trop tard.
 *
 * Trois propriétés à tenir :
 *   1. Les mêmes termes rendent toujours la même empreinte.
 *   2. Le moindre terme changé en rend une autre.
 *   3. Deux dossiers différents n'ont jamais la même.
 *
 *   npx payload run scripts/verifier-signature.ts
 */
import {
  empreinteDesTermes,
  memeNom,
  mentionValable,
  preuve,
  traceValable,
  type TermesSignes,
} from "@/lib/signature";

let manques = 0;
const dire = (quoi: string, ok: boolean) => {
  console.log(`  ${ok ? "✓" : "✗"} ${quoi}`);
  if (!ok) manques += 1;
};

const TERMES: TermesSignes = {
  reference: "CLX-EPREUVE1",
  nom: "Aurélie AMBENGAT",
  email: "aurelie@exemple.test",
  programme: "Directeur Administratif et Financier",
  session: "DAF — Classe virtuelle — 19 sept. 2026",
  total: 448,
  echeances: [
    { montant: 224, dateLimite: "2026-09-19" },
    { montant: 224, dateLimite: "2026-10-17" },
  ],
  moyen: "virement",
};

const reference = empreinteDesTermes(TERMES);

dire("l'empreinte fait 64 caractères hexadécimaux", /^[0-9a-f]{64}$/.test(reference));
dire("les mêmes termes rendent la même empreinte", empreinteDesTermes(TERMES) === reference);

/*
  Chaque terme est modifié seul. Un champ oublié dans le calcul se verrait ici :
  son changement laisserait l'empreinte identique, et quelqu'un pourrait donc
  modifier ce terme après signature sans que rien ne le trahisse.
*/
const variations: [string, TermesSignes][] = [
  ["la référence", { ...TERMES, reference: "CLX-EPREUVE2" }],
  ["le nom", { ...TERMES, nom: "Aurélie AMBENGATT" }],
  ["l'adresse", { ...TERMES, email: "autre@exemple.test" }],
  ["le parcours", { ...TERMES, programme: "Directeur Audit Interne" }],
  ["la session", { ...TERMES, session: "DAF — Classe virtuelle — 20 sept. 2026" }],
  ["le total", { ...TERMES, total: 470 }],
  ["le moyen", { ...TERMES, moyen: "carte" }],
  [
    "un montant d'échéance",
    { ...TERMES, echeances: [{ montant: 300, dateLimite: "2026-09-19" }, TERMES.echeances[1]!] },
  ],
  [
    "une date d'échéance",
    { ...TERMES, echeances: [{ montant: 224, dateLimite: "2026-09-26" }, TERMES.echeances[1]!] },
  ],
  ["le nombre d'échéances", { ...TERMES, echeances: [{ montant: 448 }] }],
];

for (const [quoi, modifie] of variations) {
  dire(`changer ${quoi} change l'empreinte`, empreinteDesTermes(modifie) !== reference);
}

/*
  ⚠️ Le cas qui piège : deux échéances dont on échange l'ordre. Si les parties
  étaient concaténées sans séparateur, « 224 puis 448 » et « 22 puis 4448 »
  rendraient la même chaîne — et deux échéanciers différents, la même empreinte.
*/
const inverse: TermesSignes = { ...TERMES, echeances: [...TERMES.echeances].reverse() };
dire("l'ordre des échéances compte", empreinteDesTermes(inverse) !== reference);

console.log("");

dire("« Lu et approuvé » est accepté", mentionValable("Lu et approuvé"));
dire("la casse et les accents sont indulgents", mentionValable("LU ET APPROUVE"));
dire("les espaces en trop ne gênent pas", mentionValable("  lu   et  approuvé  "));
dire("une mention tronquée est refusée", !mentionValable("lu approuvé"));
dire("une mention vide est refusée", !mentionValable(""));

dire("le nom du dossier est reconnu malgré la casse", memeNom("aurelie ambengat", TERMES.nom));
dire("un nom abrégé est refusé", !memeNom("A. Ambengat", TERMES.nom));
dire("un autre nom est refusé", !memeNom("Quelqu'un d'autre", TERMES.nom));

console.log("");

const trace = preuve({
  empreinte: reference,
  ip: "196.200.0.1",
  navigateur: "Mozilla/5.0",
  nom: TERMES.nom,
  quand: "2026-08-29T05:00:00.000Z",
});

/*
  La trace doit être lisible par quelqu'un qui n'a pas le code sous les yeux :
  c'est ce qu'on produira devant un tiers, tel quel.
*/
for (const attendu of [reference, "196.200.0.1", "Mozilla/5.0", "Lu et approuvé", TERMES.nom]) {
  dire(
    `la trace porte « ${attendu.slice(0, 24)}${attendu.length > 24 ? "…" : ""} »`,
    trace.includes(attendu),
  );
}

/*
  ── La limite du champ doit suivre celle du code ────────────────────────────
  ⚠️ Payload borne un champ texte à 40 000 caractères par défaut. `traceValable`
  en accepte 300 000. Les deux limites ne se parlaient pas : le code disait oui,
  la base disait non — et la signature était refusée sans que rien ne l'explique
  au participant, au moment précis où il s'engageait.

  Les tracés déjà enregistrés pesaient 34 378, 35 598 et 35 910 caractères :
  tous passaient de justesse. Il a suffi d'un trait un peu plus appliqué, sur un
  iPhone, pour franchir le seuil.
*/
{
  const { Inscriptions } = await import("../src/collections/Inscriptions.js");

  const trouver = (champs: unknown[], nom: string): Record<string, unknown> | undefined => {
    for (const c of champs as Record<string, unknown>[]) {
      if (c.name === nom) return c;
      const dedans = (c.fields ?? c.tabs) as unknown[] | undefined;
      if (Array.isArray(dedans)) {
        const t = trouver(dedans, nom);
        if (t) return t;
      }
    }
    return undefined;
  };

  const champ = trouver(Inscriptions.fields as unknown[], "contratTrace");
  const borne = Number(champ?.maxLength ?? 0);

  dire("le champ du tracé existe", champ !== undefined);
  dire(`sa borne suit celle du code (${borne} \u2265 300 000)`, borne >= 300_000);

  /*
    Et la borne doit accepter ce que le code accepte : on fabrique un tracé de
    la taille maximale admise et on vérifie que le champ le laisserait passer.
  */
  const maximal = "data:image/png;base64," + "A".repeat(299_000 - 22);
  dire(
    "un tracé au plafond de `traceValable` tiendrait dans le champ",
    traceValable(maximal) && maximal.length <= borne,
  );
}

console.log(manques === 0 ? "\nSignature : tout tient." : `\nSignature : ${manques} manque(s).`);
process.exit(manques === 0 ? 0 : 1);
