/**
 * L'annonce de démarrage dit-elle à chacun ce qui est vrai pour lui ?
 *
 * ── Pourquoi cette garde existe ─────────────────────────────────────────────
 * C'est le seul message de la maison qui parte à **tout le monde en même
 * temps** — cent seize dossiers, le 23 septembre 2026. Les quinze autres
 * gabarits suivent un geste : quelqu'un signe, quelqu'un verse, et le message
 * part à lui seul. Celui-ci ne suit rien ; il est décidé par nous, un matin,
 * pour tous. Une phrase fausse s'y multiplie par cent seize avant que
 * personne n'ait pu la relire, et un courriel parti ne se rattrape pas.
 *
 * Ce que la garde éprouve, dans l'ordre d'importance :
 *
 *  1. **personne ne s'entend réclamer de l'argent sans pouvoir en verser** —
 *     les coordonnées de règlement ne sont nulle part sur le site, elles
 *     partent par courriel après la signature. Sur les cent seize dossiers du
 *     jour, **dix** seulement les avaient reçues ;
 *  2. **les deux lectures d'un même dossier s'accordent** — `annonceDuDemarrage`
 *     et `prochaineEtape` répondent à la même question, l'une dans un courriel
 *     et l'autre sur la page. Deux lectures d'un même état finissent toujours
 *     par diverger ; ici l'écart se paierait sur un message qui contredit la
 *     page que le destinataire ouvre juste après ;
 *  3. **la porte est réservée à l'équipe** ;
 *  4. **la trace empêche le second envoi**, et ne s'écrit pas si rien n'est
 *     parti.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { annonceDuDemarrage, aQuiOnEcrit, type FaitsDuDemarrage } from "@/lib/demarrage";
import { prochaineEtape } from "@/lib/inscriptions";
import { ouvrirSession } from "../src/lib/session.js";
import { POST } from "../src/app/(payload)/api/admin/annoncer-demarrage/route.js";

const payload = await getPayload({ config });

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const COMME_UN_NAVIGATEUR = {
  origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  "sec-fetch-site": "same-origin",
  "content-type": "application/json",
};

const DUES = [
  { montantCentimes: 17_000, dateLimite: "2026-10-03T00:00:00.000Z", statut: "attendu" as const },
  { montantCentimes: 15_000, dateLimite: "2026-10-24T00:00:00.000Z", statut: "attendu" as const },
];
const HIER = new Date(Date.now() - 86_400_000).toISOString();

console.log("\n── 1. On ne réclame d'argent qu'à qui peut en verser ──");

/*
  ⚠️ **Le cas central, et il porte les quatre états réels de la production.**
  Seul le dernier a reçu les coordonnées ; les trois autres ne peuvent pas
  régler, et le message ne doit pas le leur demander.
*/
const etats: { nom: string; faits: FaitsDuDemarrage; peut: boolean }[] = [
  { nom: "pré-inscription seule", faits: { statut: "demandee", echeances: DUES }, peut: false },
  {
    nom: "contrat demandé, pas signé",
    faits: { statut: "demandee", contratDemandeLe: HIER, echeances: DUES },
    peut: false,
  },
  {
    nom: "signé, coordonnées PAS parties",
    faits: {
      statut: "demandee",
      contratDemandeLe: HIER,
      contratSigneLe: HIER,
      contratVerifieLe: HIER,
      echeances: DUES,
    },
    peut: false,
  },
  {
    nom: "coordonnées parties",
    faits: {
      statut: "demandee",
      contratDemandeLe: HIER,
      contratSigneLe: HIER,
      contratVerifieLe: HIER,
      coordonneesEnvoyeesLe: HIER,
      echeances: DUES,
    },
    peut: true,
  },
];

for (const e of etats) {
  const a = annonceDuDemarrage(e.faits);
  dire(`${e.nom} → peutRegler ${e.peut}`, a.peutRegler === e.peut, a.clef);
}

/*
  ⚠️ **Le témoin, sans quoi la garde ne prouverait rien.** Une fonction qui
  rendrait `peutRegler: false` partout passerait les quatre contrôles
  ci-dessus — et l'annonce ne réclamerait jamais rien à personne, ce qui est
  l'autre moitié du danger : cent seize messages envoyés pour rien.
*/
dire(
  "témoin : au moins un état réclame bien un versement",
  etats.some((e) => annonceDuDemarrage(e.faits).peutRegler),
);

/*
  ⚠️ Et la garde lit le **texte**, pas seulement le drapeau. Le drapeau ne
  commande que l'encadré sur l'hameçonnage ; c'est `geste` que le destinataire
  lit. Une phrase qui parlerait d'argent sous un drapeau à `false` passerait
  les contrôles d'au-dessus sans que rien ne bouge.
*/
const PARLE_D_ARGENT = /verse(r|ment)|transfert|régl(er|ement)|€/i;
for (const e of etats.filter((x) => !x.peut)) {
  const a = annonceDuDemarrage(e.faits);
  const texte = `${a.situation} ${a.geste ?? ""}`;
  /*
    « rien à régler » est une phrase de réassurance, pas une demande : on
    l'écarte avant de chercher une réclamation. Sans cette exception, le
    contrôle accuserait la phrase qui existe précisément pour rassurer.
  */
  const sansReassurance = texte.replace(/rien à régler[^.]*/gi, "");
  dire(`${e.nom} : le texte ne réclame pas d'argent`, !PARLE_D_ARGENT.test(sansReassurance));
}

console.log("\n── 2. Le courriel et la page du dossier s'accordent ──");

/*
  Les deux fonctions ne rendent pas les mêmes phrases — la page dit « votre
  place est retenue », le courriel « le parcours commence samedi ». Mais elles
  doivent classer le dossier au même endroit. On compare donc ce qui est
  comparable : est-ce qu'on réclame un versement, oui ou non.
*/
const commeDossier = (f: FaitsDuDemarrage) =>
  ({
    reference: "CLX-TEMOIN00",
    statut: f.statut,
    programmeTitre: "Parcours d'épreuve",
    sessionLibelle: "",
    sessionDetail: "",
    contratDemandeLe: f.contratDemandeLe ?? undefined,
    contratSigneLe: f.contratSigneLe ?? undefined,
    contratVerifieLe: f.contratVerifieLe ?? undefined,
    coordonneesEnvoyeesLe: f.coordonneesEnvoyeesLe ?? undefined,
    echeances: f.echeances.map((e) => ({
      montantCentimes: e.montantCentimes,
      dateLimite: e.dateLimite ?? undefined,
      statut: e.statut,
    })),
  }) as never;

for (const e of etats) {
  const page = prochaineEtape(commeDossier(e.faits));
  const pageReclame = /transfert de|Prochaine échéance/i.test(page);
  const courrielReclame = annonceDuDemarrage(e.faits).peutRegler;
  dire(
    `${e.nom} : page et courriel d'accord`,
    pageReclame === courrielReclame,
    `page=${pageReclame} courriel=${courrielReclame}`,
  );
}

console.log("\n── 3. Qui ne reçoit rien ──");
dire("un dossier annulé est écarté", !aQuiOnEcrit("annulee"));
dire("un dossier terminé est écarté", !aQuiOnEcrit("terminee"));
dire("un dossier en cours reçoit", aQuiOnEcrit("demandee"));

console.log("\n── 4. La porte, la trace et le lot (contre la base) ──");

const marque = Date.now();
const aSupprimer: {
  collection: "utilisateurs" | "apprenants" | "inscriptions";
  id: string | number;
}[] = [];

const appeler = async (cookie: string | undefined, corps: Record<string, unknown>) =>
  POST(
    new Request("http://localhost:3000/api/admin/annoncer-demarrage", {
      method: "POST",
      headers: new Headers({
        ...COMME_UN_NAVIGATEUR,
        ...(cookie ? { cookie: cookie.split(";")[0] ?? "" } : {}),
      }),
      body: JSON.stringify(corps),
    }),
  );

try {
  const membre = await payload.create({
    collection: "utilisateurs",
    data: {
      email: `demarrage-${marque}@epreuve.invalid`,
      password: `Ep-${marque}-xY`,
      nom: "Épreuve démarrage",
      role: "direction",
    },
    overrideAccess: true,
  });
  aSupprimer.push({ collection: "utilisateurs", id: membre.id });

  const participant = await payload.create({
    collection: "apprenants",
    data: {
      email: `part-demarrage-${marque}@epreuve.invalid`,
      password: `Ep-${marque}-zW`,
      nom: "Participant d'épreuve",
      _verified: true,
    } as never,
    overrideAccess: true,
  });
  aSupprimer.push({ collection: "apprenants", id: participant.id });

  const cookieEquipe = await ouvrirSession(payload, "utilisateurs", membre.id);
  const cookieParticipant = await ouvrirSession(payload, "apprenants", participant.id);

  dire("sans session : refusé", (await appeler(undefined, { essai: true })).status === 401);
  dire(
    "avec un compte participant : refusé",
    (await appeler(cookieParticipant, { essai: true })).status === 401,
  );

  const reponseEquipe = await appeler(cookieEquipe, { essai: true, lot: 3 });
  dire("l'équipe passe la garde", reponseEquipe.status === 200);

  const essai = (await reponseEquipe.json()) as {
    essai: boolean;
    apercu?: unknown[];
    restants: number;
  };
  dire("le mode essai le dit", essai.essai === true);
  dire("le mode essai rend un aperçu, pas un compte d'envois", Array.isArray(essai.apercu));

  /*
    ⚠️ **Le mode essai n'écrit rien.** C'est toute sa raison d'être : on
    demande « à qui cela partirait » avant d'envoyer, pas après. S'il posait la
    trace, le vrai envoi sauterait exactement les dossiers qu'on vient de
    regarder — et personne ne s'en apercevrait avant la première réclamation.
  */
  const avant = essai.restants;
  const essai2 = (await (await appeler(cookieEquipe, { essai: true, lot: 3 })).json()) as {
    restants: number;
  };
  dire(
    "un second essai ne change rien en base",
    essai2.restants === avant,
    `${avant} → ${essai2.restants}`,
  );

  /*
    ⚠️ Le lot est **borné**. Sans plafond, un `lot: 5000` posté à la main
    viderait le quota Resend en une requête et emporterait avec lui les
    courriels du tunnel — confirmation, contrat, certificat — pour le reste de
    la journée.
  */
  const enorme = (await (await appeler(cookieEquipe, { essai: true, lot: 5000 })).json()) as {
    lot: number;
  };
  dire("un lot démesuré est ramené au plafond", enorme.lot <= 60, `lot=${enorme.lot}`);

  console.log("\n── 5. L'envoi pour de vrai : la trace, et la panne ──");

  /*
    ── ⚠️ Le chemin d'écriture, éprouvé pour de bon ──────────────────────────
    Tout ce qui précède tourne en mode essai, qui n'écrit rien. Or c'est
    l'écriture qui porte le risque : `payload.update` rejoue les crochets de la
    collection, et le journal compte un cas où un validateur ajouté après coup
    a **gelé** des dossiers existants — la tâche de 8 h ne pouvait plus les
    toucher, sur un champ qu'elle ne touchait pas. Un envoi de masse qui
    lèverait à la quarantième ligne aurait envoyé trente-neuf courriels sans
    en noter un seul, et le lot suivant les renverrait tous.

    ⚠️ Aucun courriel ne part d'ici : sans `RESEND_API_KEY`, Payload écrit les
    messages dans la console. C'est exactement ce qu'on veut — le chemin entier
    est parcouru, la trace est écrite, et rien n'atteint personne.
  */
  const session = (
    await payload.find({ collection: "sessions", limit: 1, depth: 0, overrideAccess: true })
  ).docs[0];

  if (!session) {
    dire("une session existe pour éprouver l'envoi", false, "base sans session");
  } else {
    const dossier = await payload.create({
      collection: "inscriptions",
      data: {
        apprenantNom: "Témoin Démarrage",
        apprenantEmail: `demarrage-dossier-${marque}@epreuve.invalid`,
        apprenantWhatsapp: "+212600000000",
        apprenantPays: "Maroc",
        session: session.id,
        statut: "demandee",
        moyenSouhaite: "transfert",
      } as never,
      overrideAccess: true,
    });
    aSupprimer.push({ collection: "inscriptions", id: dossier.id });

    /*
      ⚠️ **La panne d'abord.** On remplace `payload.sendEmail` — et non
      `payload.email` : sans adaptateur, Payload ne délègue pas, et un
      remplacement posé sur l'adaptateur mesurerait le chemin nominal en
      croyant éprouver la panne. C'est la faute que `verifier-relances.ts`
      documente déjà.
    */
    const vrai = payload.sendEmail.bind(payload);
    payload.sendEmail = (async () => {
      throw new Error("panne d'expédition, pour l'épreuve");
    }) as typeof payload.sendEmail;

    const enPanne = (await (await appeler(cookieEquipe, { lot: 60 })).json()) as {
      envoyes: number;
      manques: string[];
    };
    payload.sendEmail = vrai;

    const apresPanne = await payload.findByID({
      collection: "inscriptions",
      id: dossier.id,
      depth: 0,
      overrideAccess: true,
    });
    dire(
      "envoi manqué : rien n'est noté",
      !apresPanne.annonceDemarrageLe,
      `manques=${enPanne.manques.length}`,
    );
    dire("et l'envoi manqué est nommé", enPanne.manques.includes(String(dossier.reference)));

    // Puis l'envoi qui aboutit.
    const abouti = (await (await appeler(cookieEquipe, { lot: 60 })).json()) as {
      envoyes: number;
      partis: string[];
    };
    const apres = await payload.findByID({
      collection: "inscriptions",
      id: dossier.id,
      depth: 0,
      overrideAccess: true,
    });
    dire("envoi réussi : la trace est posée", Boolean(apres.annonceDemarrageLe));
    dire("et le dossier est compté parti", abouti.partis.includes(String(dossier.reference)));

    /*
      ⚠️ **Le second lot ne le reprend pas.** C'est la garde qui empêche le
      message de partir deux fois — et un message identique reçu deux fois se
      signale, ce qui coûte la réputation de `envoi.clixa.africa`, donc tout le
      tunnel.
    */
    const second = (await (await appeler(cookieEquipe, { lot: 60 })).json()) as {
      partis: string[];
    };
    dire("un second lot ne lui réécrit pas", !second.partis.includes(String(dossier.reference)));

    /*
      ⚠️ **Et l'écriture n'a rien cassé d'autre.** Un `payload.update` rejoue
      les crochets : le statut, la session et l'échéancier doivent être
      exactement ce qu'ils étaient.
    */
    dire(
      "l'écriture de la trace ne touche à rien d'autre",
      apres.statut === "demandee" &&
        String((apres.session as { id?: unknown })?.id ?? apres.session) === String(session.id),
    );
  }
} finally {
  for (const quoi of aSupprimer.reverse()) {
    await payload
      .delete({ collection: quoi.collection, id: quoi.id, overrideAccess: true })
      .catch(() => undefined);
  }
}

console.log(
  manques === 0
    ? "\n✅ L'annonce de démarrage ne promet que ce que le dossier permet.\n"
    : `\n❌ ${manques} point(s) à regarder.\n`,
);
process.exit(manques === 0 ? 0 : 1);
