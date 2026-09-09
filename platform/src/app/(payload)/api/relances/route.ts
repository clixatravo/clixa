import {
  finDeLaTenue,
  JOURS_DE_GRACE,
  rendreLesPlacesExpirees,
  SEUILS_DE_RAPPEL,
} from "@/lib/places";
import { sansLeParcours } from "@/lib/inscriptions";
import { timingSafeEqual } from "node:crypto";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  courrielBilanRelances,
  courrielPlaceBientotRendue,
  courrielRappelAvantTerme,
  courrielRelance,
} from "@/lib/courriel";

/**
 * BE-17 — Relance des échéances.
 *
 * Appelée une fois par jour par le planificateur de Vercel (voir vercel.json).
 *
 * ── Ce qu'elle relance ──────────────────────────────────────────────────────
 * Une échéance non réglée, dont la date approche ou est passée, sur un dossier
 * encore vivant. Un dossier annulé ou soldé ne reçoit rien.
 *
 * ── Ce qu'elle ne fait pas ──────────────────────────────────────────────────
 * Elle ne relance pas deux fois la même semaine. Chaque envoi laisse une date
 * sur l'échéance ; sans cette trace, un dossier en retard recevrait un message
 * par jour, ce qui fait fuir plus sûrement qu'un impayé.
 *
 * ── Pourquoi une route et non un crochet ────────────────────────────────────
 * Rien ne déclenche une relance côté application : c'est le temps qui passe.
 * Il faut donc quelqu'un pour appeler, et ce quelqu'un est le planificateur.
 */

/**
 * Compare le jeton reçu au secret, en temps constant.
 *
 * `!==` s'arrête au premier caractère qui diffère : le temps de réponse dit
 * alors combien de caractères étaient justes, et un jeton se devine caractère
 * par caractère. `timingSafeEqual` compare toujours toute la longueur.
 *
 * Elle exige deux tampons de même taille : on écarte donc les longueurs
 * différentes d'abord, ce qui ne révèle rien de plus que la taille du secret.
 */
function jetonValide(recu: string | null, secret: string): boolean {
  const attendu = Buffer.from(`Bearer ${secret}`);
  const fourni = Buffer.from(recu ?? "");
  if (fourni.length !== attendu.length) return false;
  return timingSafeEqual(fourni, attendu);
}

/** On prévient trois jours avant, puis on relance tous les sept jours. */
const JOURS_AVANT = 3;
const JOURS_ENTRE_DEUX = 7;

const JOUR_MS = 86400000;

export async function GET(request: Request) {
  /*
    La route est joignable de l'extérieur par nature — c'est le planificateur qui
    l'appelle. Le secret est donc la seule chose qui sépare le monde d'une vague
    de courriels envoyée à tous les participants.

    ── Pourquoi elle refuse quand le secret manque ────────────────────────────
    La garde était écrite `if (secret) { ...vérifier... }` : sans `CRON_SECRET`,
    elle ne s'exécutait pas et l'adresse répondait 200 à n'importe qui. Un
    contrôle d'accès qui se désactive tout seul quand la configuration manque
    fait exactement l'inverse de ce qu'on lui demande — et il le fait en silence,
    au moment précis où l'on croit être protégé.

    Elle refuse maintenant. Le planificateur de Vercel pose l'en-tête
    `Authorization: Bearer $CRON_SECRET` de lui-même dès que la variable existe :
    tant qu'elle manque, la tâche échoue visiblement plutôt que de laisser la
    porte ouverte.
  */
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error(
      "[relances] CRON_SECRET absent : la route refuse plutôt que de s'ouvrir. " +
        "Définir la variable sur Vercel, puis redéployer.",
    );
    return Response.json({ erreur: "non configuré" }, { status: 503 });
  }

  if (!jetonValide(request.headers.get("authorization"), secret)) {
    return Response.json({ erreur: "non autorisé" }, { status: 401 });
  }

  const payload = await getPayload({ config });
  const maintenant = Date.now();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.clixa.africa";

  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { statut: { in: ["demandee", "confirmee"] } },
    limit: 500,
    depth: 2,
    overrideAccess: true,
  });

  const bilan: string[] = [];
  const manques: string[] = [];
  /** Ceux qu'on ne relance pas parce qu'ils ne peuvent pas encore payer. */
  const enAttenteDeNous: string[] = [];
  let examinees = 0;

  for (const dossier of docs) {
    const echeances = dossier.echeances ?? [];
    let modifie = false;

    /*
      ── ⚠️ On ne réclame pas de l'argent à qui n'a nulle part où l'envoyer ───
      Cette tâche ne regardait que le statut du dossier et la date de
      l'échéance. Or les coordonnées de règlement — RIB, lien bancaire ou
      bénéficiaire du transfert — **ne figurent nulle part sur le site** : elles
      partent par courriel, composées par l'équipe, après la signature du
      contrat. Un participant qui n'a pas reçu ce message n'a aucun moyen de
      payer.

      Le 6 septembre 2026, dix des douze dossiers de production étaient dans ce
      cas, et leur première échéance tombait toute le 3 octobre. La tâche
      relance trois jours avant : le 30 septembre, dix personnes auraient reçu
      « nous attendons votre versement de 224 € » sans savoir où l'envoyer —
      dont sept qui n'avaient même pas demandé leur contrat.

      C'est exactement le défaut que `prochaineEtape` a corrigé pour le texte de
      la page, et le formulaire d'annonce pour le geste : « on ne réclame rien
      qu'on n'ait rendu possible ». La troisième porte était restée ouverte.

      ⚠️ **La condition n'est pas « pas de coordonnées » seule.** Un dossier
      dont une échéance est réglée a manifestement trouvé le chemin — l'équipe
      a pu tout mener de vive voix. Lui taire sa seconde échéance serait une
      faute symétrique. Même règle que `prochaineEtape`, et pour la même raison.
    */
    const rienDeRegle = echeances.every((e) => e.statut !== "regle");
    if (rienDeRegle && !dossier.coordonneesEnvoyeesLe) {
      /*
        ⚠️ **On se tait pour lui, pas pour l'équipe.** Ne rien envoyer et ne
        rien dire laisserait ces dossiers dormir : la place est tenue sans
        terme tant que la balle est chez nous (`lib/places.ts`), donc rien ne
        les ferait jamais remonter. Le bilan les nomme — c'est là que le
        rattrapage se fait.
      */
      enAttenteDeNous.push(
        `${dossier.reference} · ${dossier.apprenantNom} · ` +
          (dossier.contratSigneLe
            ? "contrat signé, coordonnées jamais envoyées"
            : dossier.contratDemandeLe
              ? "contrat demandé, jamais signé"
              : "pré-inscription seule"),
      );
      continue;
    }

    /*
      ⚠️ Une boucle, pas un `map`. Il faut attendre chaque envoi pour savoir
      s'il est parti, et un `map` ne sait pas attendre — il rendait des
      promesses qu'on jetait aussitôt.
    */
    const suivantes: typeof echeances = [];

    for (const e of echeances) {
      if (e.statut === "regle" || !e.dateLimite) {
        suivantes.push(e);
        continue;
      }
      examinees++;

      const limite = new Date(e.dateLimite).getTime();
      const joursRestants = Math.floor((limite - maintenant) / JOUR_MS);
      if (joursRestants > JOURS_AVANT) {
        suivantes.push(e);
        continue;
      }

      // Déjà relancée récemment : on laisse respirer.
      if (e.relanceeLe) {
        const depuis = Math.floor((maintenant - new Date(e.relanceeLe).getTime()) / JOUR_MS);
        if (depuis < JOURS_ENTRE_DEUX) {
          suivantes.push(e);
          continue;
        }
      }

      const session = typeof dossier.session === "object" ? dossier.session : undefined;
      const programme =
        session && typeof session.programme === "object" ? session.programme : undefined;

      const ligne =
        `${dossier.reference} · ${dossier.apprenantNom} · ${e.montant} € ` +
        `· échéance du ${String(e.dateLimite).slice(0, 10)}` +
        (joursRestants < 0 ? ` · ${-joursRestants} jour(s) de retard` : "");

      /*
        ── On attend l'envoi, et on n'écrit la trace que s'il est parti ───────

        ⚠️ Deux défauts tenaient dans l'ancienne ligne `void courrielRelance(…)`.

        Le premier : la date `relanceeLe` était posée sans savoir si le courriel
        était parti. Un envoi manqué — quota épuisé, ce qui est arrivé le
        29 août 2026 — et l'échéance passait pour relancée : plus rien pendant
        sept jours, sans que personne ne l'apprenne. Le participant en retard
        n'entendait jamais parler de son retard.

        Le second : `void` n'attend pas. Sur une fonction serverless, ce qui
        n'est pas attendu avant la réponse peut ne jamais s'exécuter — le
        processus est gelé dès que la réponse part.

        Laisser l'échéance intacte quand l'envoi échoue la fait reprendre au
        passage du lendemain : la relance est retardée d'un jour, pas perdue.
      */
      const parti = await courrielRelance(payload, {
        reference: String(dossier.reference),
        apprenantNom: String(dossier.apprenantNom),
        apprenantEmail: String(dossier.apprenantEmail),
        programmeTitre: programme?.titre ?? "votre parcours",
        montant: e.montant ?? 0,
        dateLimite: String(e.dateLimite),
        enRetard: joursRestants < 0,
        urlDossier: `${site}/inscription/${dossier.reference}`,
      });

      if (!parti) {
        // Le bilan de l'équipe dit la vérité : elle saura qui n'a rien reçu.
        manques.push(ligne);
        suivantes.push(e);
        continue;
      }

      bilan.push(ligne);
      modifie = true;
      suivantes.push({ ...e, relanceeLe: new Date(maintenant).toISOString() });
    }

    if (!modifie) continue;

    await payload.update({
      collection: "inscriptions",
      id: dossier.id,
      overrideAccess: true,
      data: { echeances: suivantes },
    });
  }

  /*
    ── ⚠️ Prévenir pendant qu'il reste du temps ──────────────────────────────
    Le seul message partait **au terme** : le participant apprenait que son
    délai était écoulé, jamais qu'il courait. La direction l'a demandé le
    9 septembre 2026 — prévenir à quatre, trois puis deux jours de la fin —
    le jour où la cohorte portée par l'annonce était complète à 30/30 : une
    place perdue ne se retrouvait pas.

    ⚠️ **Le plus grand seuil encore valable, et un seul par passage.** À J-3,
    les seuils 4 et 3 conviennent tous deux ; prendre le plus petit brûlerait le
    dernier rappel trop tôt. Et `dernierRappelAvantTerme` empêche de renvoyer :
    sans lui, la tâche répéterait le même message chaque matin, et sept
    relances en cinq jours font signaler l'expéditeur.

    ⚠️ **Même population que l'annonce du terme** : pré-inscriptions seules.
    Un contrat signé n'attend pas le même geste, et n'a pas le même délai.
  */
  const rappeles: string[] = [];
  const rappelsManques: string[] = [];

  const { docs: aRappeler } = await payload.find({
    collection: "inscriptions",
    where: {
      and: [
        { statut: { equals: "demandee" } },
        { contratSigneLe: { exists: false } },
        { placeRappeleeLe: { exists: false } },
        /*
          Entrés dans la fenêtre — le premier seuil — et pas encore au terme :
          celui-là a son propre message, juste en dessous.
        */
        {
          createdAt: {
            less_than: new Date(
              maintenant - (JOURS_DE_GRACE - SEUILS_DE_RAPPEL[0]) * JOUR_MS,
            ).toISOString(),
          },
        },
        {
          createdAt: {
            greater_than: new Date(maintenant - JOURS_DE_GRACE * JOUR_MS).toISOString(),
          },
        },
      ],
    },
    limit: 200,
    depth: 2,
    overrideAccess: true,
  });

  for (const dossier of aRappeler) {
    const terme = finDeLaTenue(String(dossier.createdAt));
    const jours = Math.ceil((terme.getTime() - maintenant) / JOUR_MS);

    /*
      Le plus grand seuil encore atteint, et qu'on n'a pas déjà servi. `null`
      veut dire « aucun rappel parti » : tous les seuils sont ouverts.
      Le champ arrive de Postgres en `null`, jamais en `undefined`.
    */
    const dejaEnvoye = dossier.dernierRappelAvantTerme;
    const seuil = SEUILS_DE_RAPPEL.find(
      (s) => jours <= s && (dejaEnvoye === null || dejaEnvoye === undefined || s < dejaEnvoye),
    );
    if (seuil === undefined) continue;

    const session = typeof dossier.session === "object" ? dossier.session : undefined;
    const programme =
      session && typeof session.programme === "object" ? session.programme : undefined;
    const ligne = `${dossier.reference} · ${dossier.apprenantNom} — J-${seuil}`;

    const parti = await courrielRappelAvantTerme(payload, {
      reference: String(dossier.reference),
      apprenantNom: String(dossier.apprenantNom),
      apprenantEmail: String(dossier.apprenantEmail),
      programmeTitre: programme?.titre ?? "votre parcours",
      sessionDetail: sansLeParcours(session?.reference, programme?.titre),
      tenueJusquau: terme.toISOString(),
      urlDossier: `${site}/inscription/${dossier.reference}`,
      /*
        ⚠️ Les jours réellement restants, pas le seuil. Un passage manqué peut
        trouver le dossier à J-2 avec le seuil 3 encore ouvert : annoncer
        « il vous reste 3 jours » quand il en reste 2 lui ferait manquer sa
        place en faisant exactement ce qu'on lui a dit.
      */
      jours,
    });

    if (!parti) {
      // Rien n'est noté : le passage de demain reprendra ce dossier.
      rappelsManques.push(ligne);
      continue;
    }

    await payload.update({
      collection: "inscriptions",
      id: dossier.id,
      overrideAccess: true,
      data: { dernierRappelAvantTerme: seuil },
    });
    rappeles.push(ligne);
  }

  /*
    ── ⚠️ Prévenir avant de reprendre une place ──────────────────────────────
    Une pré-inscription retient une place sept jours, puis la tâche la rend au
    catalogue. Elle le faisait **en silence** : le participant ne l'apprenait
    qu'en rouvrant sa page, c'est-à-dire à peu près jamais. Sur les quatorze
    dossiers de production du 6 septembre 2026, neuf étaient dans ce cas.

    Décision de la direction, le 7 septembre : on prévient, et **la place ne
    part pas tant que le message n'est pas parti**. `placeRappeleeLe` n'est
    écrite qu'après un envoi réussi — même règle que `relanceeLe`, et pour la
    même raison : une trace posée sur un envoi manqué perd le message en
    silence, sauf qu'ici elle ferait en plus rendre la place.

    ⚠️ **On prévient au terme annoncé, pas avant.** Le battement de deux jours
    (`JOURS_DE_BATTEMENT`) court à partir de là : le participant reçoit le
    message le jour où sa place devait partir, et il lui reste deux jours pour
    agir. Prévenir plus tôt ferait lire une date qui n'est pas encore la sienne.

    ⚠️ **Aucune coordonnée de règlement n'y figure**, et le message ne réclame
    rien : une pré-inscription n'a jamais reçu de quoi payer. Lui demander de
    l'argent serait le défaut corrigé la veille, une porte plus loin.
  */
  const { docs: aPrevenir } = await payload.find({
    collection: "inscriptions",
    where: {
      and: [
        { statut: { equals: "demandee" } },
        { contratSigneLe: { exists: false } },
        { placeRappeleeLe: { exists: false } },
        { createdAt: { less_than: new Date(maintenant - JOURS_DE_GRACE * JOUR_MS).toISOString() } },
      ],
    },
    limit: 200,
    depth: 2,
    overrideAccess: true,
  });

  const prevenus: string[] = [];
  const prevenusManques: string[] = [];

  for (const dossier of aPrevenir) {
    const session = typeof dossier.session === "object" ? dossier.session : undefined;
    const programme =
      session && typeof session.programme === "object" ? session.programme : undefined;
    const ligne = `${dossier.reference} · ${dossier.apprenantNom}`;

    const parti = await courrielPlaceBientotRendue(payload, {
      reference: String(dossier.reference),
      apprenantNom: String(dossier.apprenantNom),
      apprenantEmail: String(dossier.apprenantEmail),
      programmeTitre: programme?.titre ?? "votre parcours",
      /*
        ⚠️ La même composition que la page du dossier, importée plutôt que
        recopiée : la référence d'une session s'écrit « Parcours — Mode —
        Date », et la répéter sous un titre qui nomme déjà le parcours donne
        « Directeur X — Directeur X — Classe virtuelle ».
      */
      sessionDetail: sansLeParcours(session?.reference, programme?.titre),
      tenueJusquau: finDeLaTenue(String(dossier.createdAt)).toISOString(),
      urlDossier: `${site}/inscription/${dossier.reference}`,
    });

    if (!parti) {
      /*
        ⚠️ Sans date posée, la place reste tenue : c'est la garde. On réessaiera
        demain, et le bilan dit à l'équipe qui n'a rien reçu.
      */
      prevenusManques.push(ligne);
      continue;
    }

    await payload.update({
      collection: "inscriptions",
      id: dossier.id,
      overrideAccess: true,
      data: { placeRappeleeLe: new Date(maintenant).toISOString() },
    });
    prevenus.push(ligne);
  }

  /*
    ── Rendre les places que le temps a libérées ─────────────────────────────
    Une inscription tient sa place sept jours sans versement. Passé ce délai
    elle la rend — mais le temps n'écrit rien : sans repasser, une place
    expirée resterait retenue jusqu'à ce qu'un hasard touche à sa session.

    On recompte donc chaque session en cours, une fois par jour. C'est le seul
    endroit du système où quelque chose change parce qu'un délai s'est écoulé
    et non parce que quelqu'un a agi.
  */
  const rendues = await rendreLesPlacesExpirees(payload);

  /*
    Le bilan porte aussi ce qui n'est pas parti. Une tâche qui échoue à moitié
    en silence est pire qu'une tâche qui échoue : l'équipe croit les relances
    faites. Ces échéances seront reprises demain, mais quelqu'un doit savoir
    que le service de courriel a refusé aujourd'hui.
  */
  await courrielBilanRelances(payload, [
    ...bilan,
    ...(manques.length === 0
      ? []
      : ["", `⚠️ ${manques.length} envoi(s) impossible(s), repris demain :`, ...manques]),
    /*
      ⚠️ Ceux-là ne sont pas un incident : c'est la file de travail de
      l'équipe. Ils attendent un geste de notre côté, et tant qu'il n'est pas
      fait leur place reste tenue sans terme — donc rien d'autre ne les
      signalera.
    */
    ...(enAttenteDeNous.length === 0
      ? []
      : [
          "",
          `${enAttenteDeNous.length} dossier(s) non relancé(s) : ils attendent de nous de quoi payer.`,
          ...enAttenteDeNous,
        ]),
    /*
      ⚠️ Les rappels avant terme viennent avant l'annonce du terme, comme dans
      le temps : le bilan se lit dans l'ordre où les choses arrivent au
      participant.
    */
    ...(rappeles.length === 0
      ? []
      : [
          "",
          `${rappeles.length} rappel(s) avant terme : il leur reste quelques jours pour demander leur contrat.`,
          ...rappeles,
        ]),
    ...(rappelsManques.length === 0
      ? []
      : [
          "",
          `⚠️ ${rappelsManques.length} rappel(s) avant terme non parti(s), repris demain :`,
          ...rappelsManques,
        ]),
    ...(prevenus.length === 0
      ? []
      : [
          "",
          `${prevenus.length} pré-inscription(s) prévenue(s) : leur place part dans deux jours.`,
          ...prevenus,
        ]),
    /*
      ⚠️ Ceux-là gardent leur place tant qu'on n'a pas su les prévenir. Sans
      cette ligne, une panne d'expédition ferait dormir des places sans que
      personne le sache.
    */
    ...(prevenusManques.length === 0
      ? []
      : [
          "",
          `⚠️ ${prevenusManques.length} pré-inscription(s) non prévenue(s) : leur place reste tenue, repris demain.`,
          ...prevenusManques,
        ]),
  ]);

  const alerte = manques.length > 0 ? `, ${manques.length} envoi(s) IMPOSSIBLE(S)` : "";
  payload.logger.info(
    `[relances] ${docs.length} dossier(s), ${examinees} échéance(s) examinée(s), ` +
      `${bilan.length} relance(s), ${rappeles.length} rappel(s) avant terme, ` +
      `${enAttenteDeNous.length} en attente de nous, ` +
      `${prevenus.length} place(s) annoncée(s)${alerte}`,
  );

  return Response.json({
    dossiers: docs.length,
    echeancesExaminees: examinees,
    relances: bilan.length,
    // Ceux qu'on n'a pas relancés faute de leur avoir envoyé de quoi payer.
    enAttenteDeNous: enAttenteDeNous.length,
    // Les pré-inscriptions prévenues que leur place arrive au terme annoncé.
    placesAnnoncees: prevenus.length,
    placesNonAnnoncees: prevenusManques.length,
    // Ce que le planificateur verra dans son journal si le courriel flanche.
    envoisImpossibles: manques.length,
    placesRendues: rendues,
  });
}
