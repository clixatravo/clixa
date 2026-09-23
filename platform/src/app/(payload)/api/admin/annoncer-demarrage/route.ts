/**
 * Annoncer le démarrage de la cohorte, par lots.
 *
 * Demandé par la direction le 23 septembre 2026, à dix jours de la première
 * séance : prévenir les inscrits que le parcours commence, réclamer sa
 * signature à qui n'a pas signé et son versement à qui peut verser.
 *
 * ── ⚠️ Pourquoi une route, et non un script ────────────────────────────────
 * `RESEND_API_KEY` **ne vit qu'en production**, et c'est délibéré : le jour où
 * elle est arrivée dans `.env.local` — le 29 août 2026, par un `vercel env
 * pull` déclenché en sous-main — chaque série d'épreuves s'est mise à envoyer
 * de vrais messages à des adresses en `@epreuve.invalid`, qui rebondissent et
 * consomment le quota. Un script lancé depuis un poste de travail ne peut donc
 * pas envoyer, et il ne faut pas qu'il le puisse.
 *
 * ── ⚠️ Pourquoi par lots ───────────────────────────────────────────────────
 * **Cent quinze adresses pour un plafond de cent messages par jour.** Un envoi
 * d'un bloc dépasserait le quota en cours de route : les derniers ne
 * partiraient pas, et — c'est le vrai danger — on ne saurait pas lesquels.
 * La route envoie donc un lot, note ce qui est parti, et rend la main. Le
 * dossier qui n'a pas reçu son message n'a pas de trace, et le lot suivant le
 * reprend : c'est la même règle que `placeRappeleeLe` et les seuils de rappel.
 *
 * ⚠️ **Et le quota se partage.** Le tunnel envoie aussi ses propres messages —
 * confirmation, contrat, certificat — et ceux-là ne peuvent pas attendre. D'où
 * un lot par défaut volontairement bas : la place est laissée au trafic vivant.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { courrielDemarrageCohorte } from "@/lib/courriel";
import { annonceDuDemarrage, aQuiOnEcrit } from "@/lib/demarrage";

/**
 * Ce qui part en un appel, à défaut de précision.
 *
 * ⚠️ **Quarante, et le chiffre se calcule — il ne se choisit pas.** Mesuré le
 * 23 septembre 2026 : cent seize dossiers à prévenir, un plafond Resend de
 * cent messages par jour, et un tunnel qui consomme déjà sa part (confirmation,
 * contrat, certificat). Trois appels de quarante couvrent tout le monde en
 * trois jours et laissent soixante messages par jour au trafic vivant — qui,
 * lui, ne peut pas attendre : quelqu'un qui signe son contrat ce matin doit
 * recevoir sa confirmation ce matin.
 *
 * Le plafond de soixante n'est pas de la prudence : un `lot: 5000` posté à la
 * main viderait le quota en une requête et ferait tomber le tunnel entier pour
 * la journée, sans qu'aucune erreur ne le dise — les envois échouent en
 * silence et `envoyer()` rend `false`.
 */
const LOT_PAR_DEFAUT = 40;
const LOT_MAXIMUM = 60;

export async function POST(requete: Request): Promise<Response> {
  const payload = await getPayload({ config });

  /*
    ⚠️ Une session **d'équipe**, pas seulement une session. `apprenants` est
    authentifiée elle aussi : sans le second contrôle, n'importe quel
    participant connecté ferait partir cent quinze courriels au nom de la
    maison. C'est le trou trouvé sur `api/admin/export-admissions` le
    1er septembre 2026, et il se referme ici de la même façon.
  */
  const { user } = await payload.auth({ headers: requete.headers });
  if (!user || user.collection !== "utilisateurs") {
    return NextResponse.json({ erreur: "Réservé à l'équipe." }, { status: 401 });
  }

  let corps: { lot?: unknown; essai?: unknown; clefs?: unknown } = {};
  try {
    corps = (await requete.json()) as typeof corps;
  } catch {
    /* Un corps vide est légitime : on prend les valeurs par défaut. */
  }

  const lot = Math.min(
    LOT_MAXIMUM,
    Math.max(1, Number.isFinite(Number(corps.lot)) ? Number(corps.lot) : LOT_PAR_DEFAUT),
  );

  /*
    ⚠️ **Le mode essai n'envoie rien et ne note rien.** Un envoi de masse ne se
    rattrape pas : on veut pouvoir demander « à qui cela partirait, et que
    liraient-ils » avant de le faire, et non après. C'est l'`ECRIRE=1` de la
    maison, porté dans une route.
  */
  const essai = corps.essai === true;

  /*
    ── ⚠️ On n'écrit qu'aux listes choisies ──────────────────────────────────
    Décision de la direction, le 23 septembre 2026 : « maymchex l msg 3and nass
    kamlin li dayriin inscription […] brina hna nsstahdfo nass li barin ».

    Le premier jet envoyait à tout le monde, par lots, jusqu'à épuisement. Sur
    cent vingt-six dossiers c'est **cent vingt-six messages** — et le plafond
    Resend est de cent par jour, partagé avec le tunnel. Trois jours de quota
    dépensés d'un coup, dont l'essentiel à des dossiers dont on sait déjà qu'ils
    ne bougeront pas.

    ⚠️ **Aucune clef donnée ne vaut « toutes »**, et c'est délibéré : un corps
    de requête vide, une faute de frappe dans le nom du champ, et l'on
    retomberait dans l'envoi de masse sans que rien ne le dise. La route refuse
    plutôt que de deviner.
  */
  const clefs = Array.isArray(corps.clefs)
    ? corps.clefs.filter((x): x is string => typeof x === "string")
    : [];

  if (!essai && clefs.length === 0) {
    return NextResponse.json(
      { erreur: "Choisissez au moins une liste avant d'envoyer." },
      { status: 400 },
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.clixa.africa";

  /*
    `depth: 2` — et pas 1. La session porte le parcours par une relation ;
    à `depth: 1` elle rend un identifiant, et le courriel annoncerait
    « Votre parcours 17 commence le… ». Le journal compte deux occurrences de
    cette faute, dont une qui a coûté une demi-journée.
  */
  /*
    ⚠️ **En essai on balaie tout, à l'envoi on s'arrête au lot.** Compter les
    listes suppose de connaître l'état de chaque dossier, et l'état ne se
    déduit pas d'un `where` — il se calcule. Cinq cents au plus, comme les
    compteurs du tableau de bord ; au-delà, le décompte mentirait sans le dire.
  */
  const { docs } = await payload.find({
    collection: "inscriptions",
    limit: essai ? 500 : lot * 4,
    depth: 2,
    overrideAccess: true,
    sort: "createdAt",
    where: {
      and: [
        { statut: { not_equals: "annulee" } },
        { statut: { not_equals: "terminee" } },
        { annonceDemarrageLe: { exists: false } },
      ],
    },
  });

  const partis: string[] = [];
  const manques: string[] = [];
  const ignores: string[] = [];
  const apercu: { reference: string; nom: string; clef: string; objet: string }[] = [];

  for (const d of docs) {
    const reference = String(d.reference);

    if (!aQuiOnEcrit(String(d.statut))) {
      ignores.push(`${reference} · statut ${d.statut}`);
      continue;
    }

    const email = String(d.apprenantEmail ?? "").trim();
    if (!email) {
      ignores.push(`${reference} · pas d'adresse`);
      continue;
    }

    const session = d.session && typeof d.session === "object" ? d.session : null;
    const programme =
      session && typeof session.programme === "object" && session.programme
        ? session.programme
        : null;

    /*
      ⚠️ **Sans date de début, on n'écrit pas.** Tout le message tient sur
      « votre parcours commence le X » : sans X, il se réduirait à une relance
      de plus, et c'est précisément ce qu'on veut éviter en écrivant à cent
      seize personnes le même jour. Le dossier reste sans trace et sera repris
      le jour où sa session portera une date.
    */
    if (!session?.debut) {
      ignores.push(`${reference} · session sans date de début`);
      continue;
    }

    const annonce = annonceDuDemarrage({
      statut: String(d.statut),
      contratDemandeLe: d.contratDemandeLe as string | null | undefined,
      contratSigneLe: d.contratSigneLe as string | null | undefined,
      contratVerifieLe: d.contratVerifieLe as string | null | undefined,
      coordonneesEnvoyeesLe: d.coordonneesEnvoyeesLe as string | null | undefined,
      echeances: ((d.echeances ?? []) as Array<Record<string, unknown>>).map((e) => ({
        montantCentimes: Number(e.montantCentimes ?? 0),
        dateLimite: (e.dateLimite as string | null | undefined) ?? null,
        statut: (e.statut as "attendu" | "annonce" | "regle") ?? "attendu",
      })),
    });

    const titre = String(programme?.titre ?? session.reference ?? "votre parcours");

    if (essai) {
      apercu.push({
        reference,
        nom: String(d.apprenantNom ?? ""),
        clef: annonce.clef,
        objet: `${titre} — première séance`,
      });
      continue;
    }

    /*
      ⚠️ **Le dossier qui n'est pas dans une liste choisie est laissé
      intact** — pas de trace, pas de courriel. Il reparaîtra au comptage
      suivant, et l'équipe pourra le prendre un autre jour. C'est ce qui
      permet d'écrire aux dix qui peuvent régler sans toucher aux cent seize
      autres.
    */
    if (!clefs.includes(annonce.clef)) continue;

    /*
      ⚠️ Et l'on s'arrête au lot demandé. La lecture en ramène davantage —
      il faut bien parcourir pour trouver ceux de la liste — mais le nombre
      de **messages** reste borné : c'est lui qui consomme le quota.
    */
    if (partis.length + manques.length >= lot) break;

    const ok = await courrielDemarrageCohorte(payload, {
      reference,
      apprenantNom: String(d.apprenantNom ?? ""),
      apprenantEmail: email,
      programmeTitre: titre,
      ...(session.cadence ? { cadence: String(session.cadence) } : {}),
      debut: String(session.debut),
      ...(session.fin ? { fin: String(session.fin) } : {}),
      urlDossier: `${site}/inscription/${reference}`,
      annonce,
    });

    /*
      ⚠️ **La trace n'est écrite qu'après un envoi réussi.** La poser quoi qu'il
      arrive ferait passer pour prévenue une personne qui n'a rien reçu, et
      aucun lot suivant ne la reprendrait — le défaut corrigé sur `relanceeLe`
      le 30 août 2026, où un quota épuisé faisait taire les relances sept jours.
    */
    if (ok) {
      await payload.update({
        collection: "inscriptions",
        id: d.id,
        data: { annonceDemarrageLe: new Date().toISOString() },
        overrideAccess: true,
        context: { annonceDemarrage: true },
      });
      partis.push(reference);
    } else {
      manques.push(reference);
    }
  }

  const { totalDocs: restants } = await payload.find({
    collection: "inscriptions",
    limit: 0,
    depth: 0,
    overrideAccess: true,
    where: {
      and: [
        { statut: { not_equals: "annulee" } },
        { statut: { not_equals: "terminee" } },
        { annonceDemarrageLe: { exists: false } },
      ],
    },
  });

  /*
    ⚠️ **Le décompte par liste, et non un total.** « 126 restants » ne dit pas
    à qui l'on écrirait ; c'est le nombre par état qui permet de choisir, et
    c'est tout l'objet de cet écran.
  */
  const parListe: Record<string, number> = {};
  for (const a of apercu) parListe[a.clef] = (parListe[a.clef] ?? 0) + 1;

  return NextResponse.json({
    essai,
    lot,
    ...(essai ? { apercu, parListe } : { envoyes: partis.length, partis, clefs }),
    manques,
    ignores,
    /*
      ⚠️ Le reste **après** ce lot, recompté en base et non déduit. Un nombre
      déduit de `lot - partis.length` mentirait dès qu'un dossier est ignoré,
      et c'est ce nombre qui dit à l'équipe s'il faut rappeler la route demain.
    */
    restants: essai ? restants : restants,
  });
}
