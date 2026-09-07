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
import { finDuBattement } from "@/lib/places";

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
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
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

    /*
      ── ⚠️ Ce que le message dit, et **quand il le dit** ────────────────────
      Le premier jet annonçait « Votre place est tenue jusqu'au 6 septembre »
      dans un courriel envoyé le 7 : la tâche ne passe qu'à 8 h, et seulement
      une fois le délai écoulé, si bien que la date promise était **toujours
      dans le passé**, sujet compris. Le participant lisait une échéance déjà
      expirée présentée comme à venir — le défaut que tout le reste du système
      existe pour empêcher, revenu par la porte du courrier.

      On garde donc le message lui-même, et pas seulement le fait qu'il parte.
    */
    /*
      ⚠️ **Le même passage envoie aussi le bilan à l'équipe**, et il part en
      dernier. Ne garder que le dernier message mesurait donc le bilan interne
      en croyant lire ce que reçoit le participant : le premier jet a échoué sur
      « aucune date nommée », alors que le courriel en portait une.
    */
    const partis: { to: string; subject: string; text: string }[] = [];
    payload.sendEmail = (async (m: { to?: string; subject?: string; text?: string }) => {
      partis.push({
        to: String(m.to ?? ""),
        subject: String(m.subject ?? ""),
        text: String(m.text ?? ""),
      });
      return {};
    }) as typeof payload.sendEmail;

    const revenu = await (await appeler({ authorization: `Bearer ${SECRET}` })).json();
    payload.sendEmail = expediteur;
    dire("une fois l'expéditeur revenu, l'annonce part", revenu.placesAnnoncees >= 1);
    dire("⚠️ et la date est enfin posée", Boolean(await rappelDe()));

    const message = partis.find((m) => m.to === vieux.apprenantEmail);
    dire("⚠️ le message part au participant, pas seulement à l'équipe", Boolean(message));
    const lu = `${message?.subject ?? ""}\n${message?.text ?? ""}`;

    /*
      ⚠️ **Celle-ci ne garde pas le défaut d'aujourd'hui, et il faut le dire.**
      Remise à l'essai avec la phrase fautive, elle est restée verte : la tâche
      ne passe qu'une fois le délai écoulé, si bien que la date nommée est
      *toujours* dans le passé. Ce n'était pas une date future, c'était une date
      passée présentée comme à venir — un temps de verbe, pas un calcul.

      Elle garde le défaut **suivant** : une réécriture bien intentionnée qui,
      pour adoucir le message, offrirait un nouveau délai. Celui-là serait une
      promesse, et ce courriel n'a rien à promettre.
    */
    const MOIS = [
      "janvier",
      "février",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "août",
      "septembre",
      "octobre",
      "novembre",
      "décembre",
    ];
    const datesNommees = [...lu.matchAll(/(\d{1,2}) ([a-zû^éûà]+) (\d{4})/gi)]
      .filter((m) => MOIS.includes(m[2]!.toLowerCase()))
      .map((m) => Date.UTC(Number(m[3]), MOIS.indexOf(m[2]!.toLowerCase()), Number(m[1])));

    dire("le courriel nomme bien une date", datesNommees.length >= 1);
    dire(
      "⚠️ aucune date nommée n'est dans le futur : rien n'y est promis",
      datesNommees.length >= 1 && datesNommees.every((t) => t <= Date.now()),
      datesNommees.length
        ? new Date(Math.max(...datesNommees)).toISOString().slice(0, 10)
        : "aucune date",
    );

    /*
      ⚠️ **Le battement de deux jours ne se promet nulle part.** Une échéance
      qu'on annonce plus longue est une échéance qu'on repousse : le délai gardé
      en réserve sert à ne pas punir un retard d'un jour, pas à être offert.
      C'est le seul endroit du système où il pourrait fuir vers le participant.
    */
    const relu = await payload.findByID({
      collection: "inscriptions",
      id: vieux.id,
      overrideAccess: true,
      depth: 0,
    });
    const battement = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(finDuBattement(String(relu.createdAt)));
    dire("⚠️ et le battement de deux jours n'y figure pas", !lu.includes(battement), battement);

    /*
      ⚠️ Et il doit dire ce qui est vrai au moment où on le lit — mot pour mot
      ce qu'affiche la page du dossier dans la même fenêtre, que le participant
      ouvrira juste après. Deux lectures du même état finissent toujours par
      diverger si on les écrit deux fois.
    */
    /*
      ⚠️ **C'est ce contrôle-ci qui attrape la faute d'origine**, et il a été
      prouvé en la remettant : « Votre place est tenue jusqu'au 6 septembre »,
      lue le 7. La date était juste, le verbe ne l'était pas.
    */
    dire(
      "⚠️ il ne présente pas un délai écoulé comme encore ouvert",
      !/tenue jusqu'au|tenue jusqu\u2019au/.test(lu),
    );
    dire("⚠️ il dit que la place n'est pas encore repartie", /n'est pas encore repartie/.test(lu));
    dire("et il ne réclame aucun versement", !/transfert|versement|régler vos/i.test(lu));

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

  /*
    ── ⚠️ Une annonce en retard laisse quand même ses deux jours ─────────────
    Le battement courait depuis le **terme annoncé**, sur l'hypothèse que
    l'annonce part le jour du terme. Elle ne part pas toujours — c'est tout
    l'objet de `placeRappeleeLe`, écrite seulement après un envoi réussi. Une
    annonce retardée de deux jours par une panne d'expédition trouvait donc le
    battement déjà consommé, et **le même passage de 8 h envoyait le courriel
    puis rendait la place**.

    Reproduit avant d'être corrigé, sur un dossier de douze jours : le
    participant lit « votre place n'est pas encore repartie » à 8 h 00, elle est
    repartie à 8 h 00, et le bilan annonce à l'équipe « leur place part dans
    deux jours ». La garde tenait sa promesse à la lettre — un courriel partait
    bien d'abord — et la trahissait entièrement.

    ⚠️ **Douze jours, pas dix.** À dix, le battement n'est pas encore écoulé au
    moment de l'annonce et le contrôle passerait au vert avec le défaut présent.
  */
  const tardif = await payload.create({
    collection: "inscriptions",
    overrideAccess: true,
    data: {
      session: sessions[0]!.id,
      statut: "demandee",
      apprenantNom: "Épreuve Annonce Tardive",
      apprenantEmail: `tardive.${Date.now()}@epreuve.invalid`,
      apprenantWhatsapp: "+212600000000",
      apprenantPays: "Maroc",
      planPaiement: "P1",
      echeances: [{ montant: 423, statut: "attendu" }],
    } as never,
  });
  await payload.db.drizzle.execute(
    `UPDATE inscriptions SET created_at = now() - interval '12 days' WHERE id = ${tardif.id}` as never,
  );

  try {
    const placesDe = async (): Promise<number> =>
      Number(
        (
          await payload.findByID({
            collection: "sessions",
            id: sessions[0]!.id,
            overrideAccess: true,
            depth: 0,
          })
        ).placesReservees ?? 0,
      );

    const avant = await placesDe();
    const bilan = await (await appeler({ authorization: `Bearer ${SECRET}` })).json();
    const apres = await placesDe();

    const relu = await payload.findByID({
      collection: "inscriptions",
      id: tardif.id,
      overrideAccess: true,
      depth: 0,
    });
    const annoncee = Boolean((relu as { placeRappeleeLe?: string | null }).placeRappeleeLe);

    dire("l'annonce en retard part quand même", annoncee && bilan.placesAnnoncees >= 1);
    dire(
      "⚠️ et sa place ne repart PAS dans le même passage",
      apres >= avant,
      `${avant} → ${apres} place(s) réservée(s)`,
    );
  } finally {
    await payload.delete({ collection: "inscriptions", id: tardif.id, overrideAccess: true });
    console.log("  · dossier d'annonce tardive supprimé");
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
