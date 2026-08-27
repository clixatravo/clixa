import { appelant, cadenceOk, tropVite } from "@/lib/cadence";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { fermerSession, ouvrirSession, participantConnecte } from "@/lib/session-apprenant";

/**
 * BE-19 — Création, connexion et sortie d'un compte participant.
 *
 * Une seule route pour les trois : le formulaire dit lequel par un champ caché.
 * POST puis redirection, sans JavaScript requis, comme le reste du site.
 *
 * ── Ce que la route ne fait jamais ──────────────────────────────────────────
 * Elle ne dit pas si une adresse est connue. « Identifiants incorrects » vaut
 * pour un mot de passe faux comme pour un compte absent : autrement, n'importe
 * qui pourrait savoir qui s'est inscrit chez CLIXA en essayant des adresses.
 */

const LEURRE = "site_web";

/**
 * Rattache un dossier au compte qui vient d'être créé.
 *
 * Trois conditions, toutes nécessaires : une référence est fournie, le dossier
 * existe, et son adresse est celle du compte. La dernière évite qu'une
 * référence aperçue serve à s'attribuer le dossier d'un autre.
 *
 * Silencieuse en cas d'échec : le compte, lui, est bien créé, et le refuser
 * parce qu'un rattachement n'a pas abouti serait pire que la page vide qu'on
 * cherchait à éviter.
 */
async function rattacher(
  payload: Awaited<ReturnType<typeof getPayload>>,
  reference: string,
  email: string,
  compteId: number,
): Promise<void> {
  if (!/^[A-Z0-9-]{4,24}$/i.test(reference)) return;

  const { docs } = await payload.find({
    collection: "inscriptions",
    where: { reference: { equals: reference.toUpperCase() } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const dossier = docs[0];
  if (!dossier || String(dossier.apprenantEmail).toLowerCase() !== email) return;

  await payload.update({
    collection: "inscriptions",
    id: dossier.id,
    overrideAccess: true,
    data: { apprenant: compteId },
  });
}

export async function POST(request: Request) {
  /*
    Le verrou de Payload compte les échecs de connexion sur un compte donné ; il
    ne voit pas celui qui essaie cent adresses différentes, ni celui qui ouvre
    des comptes à la chaîne. Cette cadence-ci regarde l'appelant — largement,
    pour la même raison qu'ailleurs : une adresse peut porter tout un bureau.
  */
  if (!cadenceOk("compte", appelant(request), 30, 60_000)) {
    return tropVite(60);
  }

  const form = await request.formData();
  const texte = (cle: string) => (form.get(cle) ?? "").toString().trim();
  const action = texte("action");

  /*
    Rattacher un dossier depuis « mon espace ». Sert à qui a créé son compte
    ailleurs que depuis sa fiche de dossier — la référence n'avait alors pas
    voyagé avec le lien.

    Mêmes conditions que sur le compte tout neuf : la référence doit exister et
    porter l'adresse du compte connecté. On ne dit pas laquelle des deux a
    manqué, faute de quoi la page servirait à savoir quelles références existent.
  */
  if (action === "rattacher") {
    const participant = await participantConnecte();
    if (!participant) redirect("/compte/connexion" as Route);

    const payloadClient = await getPayload({ config });
    const avant = await payloadClient.count({
      collection: "inscriptions",
      where: { apprenant: { equals: participant.id } },
      overrideAccess: true,
    });

    await rattacher(
      payloadClient,
      texte("dossier"),
      participant.email.toLowerCase(),
      Number(participant.id),
    );

    const apres = await payloadClient.count({
      collection: "inscriptions",
      where: { apprenant: { equals: participant.id } },
      overrideAccess: true,
    });

    redirect(
      (apres.totalDocs > avant.totalDocs ? "/compte" : "/compte?erreur=rattachement") as Route,
    );
  }

  if (action === "sortie") {
    await fermerSession();
    redirect("/" as Route);
  }

  if (texte(LEURRE) !== "") redirect("/compte/connexion" as Route);

  const email = texte("email").toLowerCase();
  const motDePasse = (form.get("motDePasse") ?? "").toString();
  const retour = action === "creation" ? "/compte/creer" : "/compte/connexion";

  if (!email || !motDePasse) redirect(`${retour}?erreur=champs` as Route);

  const payload = await getPayload({ config });

  if (action === "creation") {
    const nom = texte("nom");
    if (!nom) redirect("/compte/creer?erreur=champs" as Route);
    if (motDePasse.length < 8) redirect("/compte/creer?erreur=court" as Route);

    try {
      const compte = await payload.create({
        collection: "apprenants",
        overrideAccess: true,
        data: {
          email,
          password: motDePasse,
          nom,
          ...(texte("telephone") ? { telephone: texte("telephone") } : {}),
          ...(texte("pays") ? { pays: texte("pays") } : {}),
        },
      });

      /*
        ── Ce qu'une adresse ne prouve pas ───────────────────────────────────
        Cette route rattachait au compte tous les dossiers portant la même
        adresse. L'intention était juste — sans rattachement, qui s'est inscrit
        puis crée un compte trouve une page vide et croit son inscription
        perdue. Mais rien ne vérifiait que la personne détenait cette adresse :
        aucun courriel de confirmation ne part, et il n'en partira pas tant
        qu'aucun expéditeur n'est configuré.

        Il suffisait donc de connaître l'adresse de quelqu'un — un format
        d'entreprise se devine — et de créer un compte avec, pour voir son nom,
        son téléphone, son pays, son échéancier et la référence de son dossier.
        Cette référence ouvre à son tour l'annonce de transfert.

        Le rattachement demande maintenant la référence, que le participant a
        déjà : elle est dans son courriel et dans l'adresse de sa page. C'est la
        clef qui laisse déjà consulter un dossier sans compte — on n'ouvre donc
        rien de plus qu'avant, et l'adresse seule n'ouvre plus rien.

        Le jour où un expéditeur sera en place, `auth.verify` de Payload fera ce
        travail à la source, et ce détour n'aura plus lieu d'être.
      */
      await rattacher(payload, texte("dossier"), email, compte.id);
    } catch (e) {
      // Adresse déjà prise, mot de passe refusé, base indisponible : on ne
      // distingue pas, pour ne rien apprendre à qui essaie des adresses.
      payload.logger.error({ err: e }, "[compte] création impossible");
      redirect("/compte/creer?erreur=impossible" as Route);
    }
  }

  let jeton: string | undefined;
  let expiration: number | undefined;
  try {
    const r = await payload.login({
      collection: "apprenants",
      data: { email, password: motDePasse },
    });
    jeton = r.token;
    expiration = r.exp;
  } catch {
    redirect(`${retour}?erreur=identifiants` as Route);
  }

  if (!jeton) redirect(`${retour}?erreur=identifiants` as Route);

  await ouvrirSession(jeton, expiration);
  redirect("/compte" as Route);
}
