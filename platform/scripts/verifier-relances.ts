/**
 * Éprouve la tâche quotidienne — et surtout ce qu'elle fait quand le courrier
 * ne part pas.
 *
 * ── Le défaut que ce script existe pour empêcher ────────────────────────────
 * La route posait `relanceeLe` sur l'échéance **sans savoir si le courriel
 * était parti** : l'envoi était lancé sans être attendu, et l'expéditeur avale
 * ses erreurs. Un quota épuisé — ce qui est arrivé le 29 août 2026 — et
 * l'échéance passait pour relancée : plus rien pendant sept jours, sans que
 * personne ne l'apprenne. Le participant en retard n'entendait jamais parler
 * de son retard.
 *
 * C'est une panne qu'aucun type ni aucun parcours ne voit : la route répond
 * 200, le journal dit « 1 relance », et la trace en base a l'air juste.
 *
 * Le script crée un dossier jetable en `@epreuve.invalid` (domaine réservé,
 * qui ne peut appartenir à personne) et le supprime à la fin, même en cas
 * d'échec.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });

/*
  ⚠️ On remplace `payload.sendEmail`, pas `payload.email`.

  C'est la méthode que `lib/courriel.ts` appelle. Remplacer l'adaptateur ne
  suffit pas : sans adaptateur configuré — le cas en développement — Payload
  n'y délègue pas du tout, il journalise « Email attempted without being
  configured » et rend la main sans erreur. L'épreuve croyait alors simuler une
  panne et mesurait le chemin nominal ; elle passait au vert en ne prouvant
  rien. C'est ce qu'elle a fait au premier essai.
*/
const expediteur = payload.sendEmail.bind(payload);

let manques = 0;
const dire = (q: string, v: boolean) => {
  console.log(`  ${v ? "✓" : "✗"} ${q}`);
  if (!v) manques += 1;
};

/** Le secret que la route exige ; posé ici pour pouvoir l'appeler. */
process.env.CRON_SECRET ??= "secret-d-epreuve";
const SECRET = process.env.CRON_SECRET;

const { GET } = await import("../src/app/(payload)/api/relances/route.js");

const appeler = (entetes: Record<string, string> = {}) =>
  GET(
    new Request("http://localhost:3000/api/relances", {
      headers: { authorization: `Bearer ${SECRET}`, ...entetes },
    }),
  );

const { docs: sessions } = await payload.find({
  collection: "sessions",
  limit: 1,
  depth: 0,
  overrideAccess: true,
  where: { fin: { greater_than: new Date().toISOString() } },
});

/** Une échéance déjà dépassée : elle appelle une relance à coup sûr. */
const hier = new Date(Date.now() - 86_400_000).toISOString();
let dossierId: string | number | undefined;

/** Relit la date de relance de la première échéance du dossier. */
const relanceeLe = async (): Promise<string | undefined> => {
  const d = await payload.findByID({
    collection: "inscriptions",
    id: dossierId!,
    overrideAccess: true,
    depth: 0,
  });
  const e = ((d as { echeances?: { relanceeLe?: string | null }[] }).echeances ?? [])[0];
  // ⚠️ Postgres rend `null` pour une colonne vide, jamais `undefined` : comparer
  // à `undefined` déclarait « pas de relance » quelle que soit la valeur.
  return e?.relanceeLe ?? undefined;
};

try {
  const d = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: sessions[0]!.id,
      statut: "demandee",
      apprenantNom: "Épreuve Relance",
      apprenantEmail: `relance.${Date.now()}@epreuve.invalid`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      /*
        ⚠️ **Les coordonnées de règlement sont parties**, et sans cette ligne
        rien de ce qui suit n'aurait de sens : depuis le 6 septembre 2026 la
        tâche ne relance pas quelqu'un qui n'a nulle part où envoyer son
        argent. Le dossier d'épreuve doit être celui d'un participant qui
        *peut* payer et ne l'a pas fait — c'est le seul qu'on ait le droit de
        relancer.
      */
      coordonneesEnvoyeesLe: hier,
      echeances: [{ montant: 423, statut: "attendu", dateLimite: hier }],
    } as never,
  });
  dossierId = d.id;

  dire("l'échéance n'a pas encore été relancée", !(await relanceeLe()));

  // ── Sans jeton, la route ne fait rien ────────────────────────────────────
  const sansJeton = await GET(new Request("http://localhost:3000/api/relances"));
  dire("sans jeton, la route refuse", sansJeton.status === 401);

  /*
    ── L'expéditeur tombe ───────────────────────────────────────────────────
    C'est le cœur de l'épreuve. La route doit continuer — refuser de rendre
    les places parce qu'un courriel n'est pas parti serait pire — mais elle ne
    doit pas écrire une trace qui fait taire l'échéance pendant sept jours.
  */
  payload.sendEmail = (async () => {
    throw new Error("expéditeur indisponible (simulé)");
  }) as typeof payload.sendEmail;

  const enPanne = await appeler();
  const bilanPanne = (await enPanne.json()) as {
    relances: number;
    envoisImpossibles: number;
    placesRendues: number;
  };

  dire("la route répond malgré la panne d'expédition", enPanne.status === 200);
  dire("elle compte l'envoi comme impossible", bilanPanne.envoisImpossibles >= 1);
  dire("elle ne le compte pas comme une relance", bilanPanne.relances === 0);
  dire("⚠️ l'échéance n'est PAS marquée relancée : demain on réessaiera", !(await relanceeLe()));

  /*
    ── L'expéditeur revient ─────────────────────────────────────────────────
    Le lendemain, au sens de la tâche. L'échéance doit cette fois être marquée,
    sinon on relancerait la même personne tous les jours.
  */
  payload.sendEmail = expediteur;

  const revenu = await appeler();
  const bilanRevenu = (await revenu.json()) as { relances: number; envoisImpossibles: number };

  dire("une fois l'expéditeur revenu, la relance part", bilanRevenu.relances >= 1);
  dire("et plus rien n'est impossible", bilanRevenu.envoisImpossibles === 0);
  dire("l'échéance porte enfin sa date de relance", Boolean(await relanceeLe()));

  // ── Et on ne relance pas deux fois la même semaine ───────────────────────
  const aussitot = await appeler();
  const bilanAussitot = (await aussitot.json()) as { relances: number };
  dire("un second passage le même jour ne relance pas", bilanAussitot.relances === 0);

  /*
    ── ⚠️ On ne réclame pas de l'argent à qui n'a nulle part où l'envoyer ─────
    Les coordonnées de règlement — RIB, lien bancaire, bénéficiaire du
    transfert — ne figurent nulle part sur le site : elles partent par
    courriel, composées par l'équipe, après la signature du contrat. Sans ce
    message, le participant n'a aucun moyen de payer.

    Le 6 septembre 2026, dix des douze dossiers de production étaient dans ce
    cas, première échéance au 3 octobre. La tâche relance trois jours avant :
    le 30 septembre, dix personnes auraient reçu « nous attendons votre
    versement » sans savoir où l'envoyer.

    ⚠️ **Le dossier d'épreuve est identique au précédent, aux coordonnées
    près.** C'est le seul moyen d'attribuer la différence à la garde et non à
    autre chose : même session, même montant, même échéance dépassée.
  */
  const sansCoordonnees = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: sessions[0]!.id,
      statut: "demandee",
      apprenantNom: "Épreuve Sans Coordonnées",
      apprenantEmail: `sans-coordonnees.${Date.now()}@epreuve.invalid`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      echeances: [{ montant: 423, statut: "attendu", dateLimite: hier }],
    } as never,
  });

  try {
    const bilanSans = await (await appeler({ authorization: `Bearer ${SECRET}` })).json();
    dire(
      "⚠️ un dossier sans coordonnées de règlement n'est pas relancé",
      bilanSans.relances === 0 && bilanSans.enAttenteDeNous >= 1,
    );

    const relu = await payload.findByID({
      collection: "inscriptions",
      id: sansCoordonnees.id,
      overrideAccess: true,
      depth: 0,
    });
    const e = ((relu as { echeances?: { relanceeLe?: string | null }[] }).echeances ?? [])[0];
    dire("son échéance ne porte aucune date de relance", !(e?.relanceeLe ?? undefined));

    /*
      ⚠️ **Se taire ne suffit pas.** La place d'un dossier signé est tenue
      *sans terme* tant que la balle est chez nous : si la tâche l'ignorait en
      silence, rien au monde ne le ferait plus jamais remonter. Le bilan de
      l'équipe doit le nommer — c'est là que le rattrapage se fait.
    */
    dire("mais le bilan de l'équipe le compte", bilanSans.enAttenteDeNous >= 1);

    /*
      ⚠️ Et la garde ne doit pas se refermer sur quelqu'un qui a déjà payé
      autrement : l'équipe peut avoir tout mené de vive voix. Un acompte réglé
      prouve qu'il a trouvé le chemin ; lui taire sa seconde échéance serait la
      faute symétrique.
    */
    await payload.update({
      collection: "inscriptions",
      id: sansCoordonnees.id,
      overrideAccess: true,
      data: {
        echeances: [
          { montant: 211, statut: "regle", dateLimite: hier },
          { montant: 212, statut: "attendu", dateLimite: hier },
        ],
      } as never,
    });
    const bilanAcompte = await (await appeler({ authorization: `Bearer ${SECRET}` })).json();
    dire(
      "⚠️ un acompte déjà réglé rouvre la relance, coordonnées ou pas",
      bilanAcompte.relances >= 1,
    );
  } finally {
    await payload.delete({
      collection: "inscriptions",
      id: sansCoordonnees.id,
      overrideAccess: true,
    });
    console.log("  · dossier sans coordonnées supprimé");
  }

  /*
    ── ⚠️ Une place ne part pas sans qu'on l'ait annoncé ─────────────────────
    Une pré-inscription retient une place sept jours, puis la tâche la rend au
    catalogue. Elle le faisait **en silence** : le participant ne l'apprenait
    qu'en rouvrant sa page. Sur les quatorze dossiers de production du
    6 septembre 2026, neuf étaient dans ce cas.

    Décision de la direction, le 7 septembre : on prévient, et la place ne part
    pas tant que le message n'est pas parti. `placeRappeleeLe` n'est écrite
    qu'après un envoi réussi — c'est elle qui autorise le départ.

    ⚠️ Le dossier d'épreuve est **vieilli en base**, `created_at` reculé de dix
    jours : sans cela il faudrait attendre une semaine pour éprouver une règle
    qui se joue en une semaine.
  */
  const vieux = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: sessions[0]!.id,
      statut: "demandee",
      apprenantNom: "Épreuve Place Ancienne",
      apprenantEmail: `place-ancienne.${Date.now()}@epreuve.invalid`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      echeances: [{ montant: 423, statut: "attendu", dateLimite: hier }],
    } as never,
  });
  await payload.db.drizzle.execute(
    `UPDATE inscriptions SET created_at = now() - interval '10 days' WHERE id = ${vieux.id}` as never,
  );

  const rappelDe = async (): Promise<string | undefined> => {
    const d = await payload.findByID({
      collection: "inscriptions",
      id: vieux.id,
      overrideAccess: true,
      depth: 0,
    });
    return (d as { placeRappeleeLe?: string | null }).placeRappeleeLe ?? undefined;
  };

  try {
    dire("la place n'a pas encore été annoncée", !(await rappelDe()));

    /*
      ⚠️ **L'expéditeur en panne, d'abord.** C'est la moitié qui compte : si la
      date se posait quand même, la place partirait alors que personne n'a rien
      reçu — exactement ce que la direction a demandé d'empêcher.
    */
    payload.sendEmail = async () => {
      throw new Error("expéditeur en panne (épreuve)");
    };
    const enPanne = await (await appeler({ authorization: `Bearer ${SECRET}` })).json();
    dire("la route répond malgré la panne", enPanne.placesAnnoncees === 0);
    dire("⚠️ et compte la place comme non annoncée", enPanne.placesNonAnnoncees >= 1);
    dire("⚠️ aucune date n'est posée : la place reste tenue", !(await rappelDe()));

    payload.sendEmail = expediteur;
    const revenu = await (await appeler({ authorization: `Bearer ${SECRET}` })).json();
    dire("une fois l'expéditeur revenu, l'annonce part", revenu.placesAnnoncees >= 1);
    dire("⚠️ et la date est enfin posée", Boolean(await rappelDe()));

    /*
      ⚠️ Et une seule fois : un second passage le même jour ne réécrit pas la
      date et ne renvoie pas le message. Sans cette garde, le participant
      recevrait le même courriel tous les matins jusqu'à ce que sa place parte.
    */
    const aussitot = await (await appeler({ authorization: `Bearer ${SECRET}` })).json();
    dire("⚠️ un second passage n'annonce pas deux fois", aussitot.placesAnnoncees === 0);
  } finally {
    await payload.delete({ collection: "inscriptions", id: vieux.id, overrideAccess: true });
    console.log("  · dossier de place ancienne supprimé");
  }
} finally {
  payload.sendEmail = expediteur;
  if (dossierId !== undefined) {
    await payload.delete({ collection: "inscriptions", id: dossierId, overrideAccess: true });
    console.log("  · dossier d'épreuve supprimé");
  }
}

console.log(manques === 0 ? "\nRelances : tout tient." : `\nRelances : ${manques} manque(s).`);
process.exit(manques === 0 ? 0 : 1);
