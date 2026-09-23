/**
 * Envoyer la présentation de l'institut à une liste que l'équipe choisit.
 *
 * Demandé par la direction le 23 septembre 2026 : « hna n thakmo fiih lemn
 * mabrina nsseftoh » — c'est nous qui décidons des destinataires, et ils ne
 * sont pas forcément dans la base.
 *
 * ── ⚠️ Ce que cette route ne peut pas savoir, et qu'il faut avoir en tête ──
 * Les seize autres messages partent à quelqu'un qui **a un dossier** : on sait
 * qu'il nous a écrit, ce qu'il a demandé, et quand. Ici, l'adresse vient d'un
 * copier-coller. La route ne peut donc vérifier qu'une chose — que l'adresse a
 * la forme d'une adresse. Elle ne sait pas si la personne a demandé à recevoir
 * quoi que ce soit.
 *
 * **C'est une décision de la direction, pas du code.** Ce que le code fait pour
 * la rendre tenable :
 *
 * - le message porte `List-Unsubscribe` **et** le dit en clair (voir
 *   `courrielPresentation`) ;
 * - les doublons d'un même envoi sont écartés — la faute de copier-coller la
 *   plus fréquente, et deux fois le même message le même jour est ce qui fait
 *   cliquer sur « indésirable » ;
 * - le lot est borné, comme pour l'annonce de démarrage.
 *
 * ⚠️ **Ce que le code ne fait pas** : il ne garde pas la liste de qui a déjà
 * reçu la présentation. Ces adresses n'ont pas de dossier où poser une trace,
 * et ouvrir une collection pour cela n'a pas été demandé. Deux envois à trois
 * semaines d'écart repartiront donc aux mêmes personnes si on recolle la même
 * liste — c'est à l'équipe de tenir la sienne.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { courrielPresentation } from "@/lib/courriel";
import { composerLaPresentation } from "@/lib/presentation";
import { catalogueSansCache, tarifsSansCache } from "@/lib/catalogue";

const LOT_MAXIMUM = 60;

/**
 * Les adresses d'un collage, dans l'ordre où elles arrivent.
 *
 * ⚠️ **On accepte le désordre exprès.** Ce champ reçoit ce que quelqu'un copie
 * depuis un tableur, un carnet d'adresses ou un fil WhatsApp : des virgules,
 * des points-virgules, des retours à la ligne, parfois « Nom <adresse> ».
 * Refuser un collage parce qu'il porte un point-virgule ferait recommencer à
 * la main une liste de quarante lignes — c'est-à-dire qu'on ne s'en servirait
 * pas.
 */
export function lireLesAdresses(brut: string): { email: string; nom?: string }[] {
  const vus = new Set<string>();
  const sortie: { email: string; nom?: string }[] = [];

  for (const morceau of brut.split(/[\n,;]+/)) {
    const t = morceau.trim();
    if (!t) continue;

    // « Aïcha Benali <aicha@exemple.ma> » — le nom devant, l'adresse entre chevrons.
    const avecNom = /^(.*?)<([^>]+)>$/.exec(t);
    const email = (avecNom ? avecNom[2] : t)!.trim().toLowerCase();
    const nom = avecNom?.[1]?.trim().replace(/^["']|["']$/g, "");

    /*
      ⚠️ Volontairement grossier. La seule vérification qui prouve une adresse
      est d'y écrire ; toute expression plus fine se met à refuser des adresses
      valides — c'est la règle déjà posée dans `lib/saisie.ts`.
    */
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    if (vus.has(email)) continue;

    vus.add(email);
    sortie.push({ email, ...(nom ? { nom } : {}) });
  }

  return sortie;
}

export async function POST(requete: Request): Promise<Response> {
  const payload = await getPayload({ config });

  const { user } = await payload.auth({ headers: requete.headers });
  if (!user || user.collection !== "utilisateurs") {
    return NextResponse.json({ erreur: "Réservé à l'équipe." }, { status: 401 });
  }

  let corps: { destinataires?: unknown; essai?: unknown; misEnAvant?: unknown };
  try {
    corps = (await requete.json()) as typeof corps;
  } catch {
    return NextResponse.json({ erreur: "Requête illisible." }, { status: 400 });
  }

  const brut = typeof corps.destinataires === "string" ? corps.destinataires : "";
  const tous = lireLesAdresses(brut);

  if (tous.length === 0) {
    return NextResponse.json(
      { erreur: "Aucune adresse lisible dans ce que vous avez collé." },
      { status: 400 },
    );
  }

  const essai = corps.essai === true;
  const destinataires = tous.slice(0, LOT_MAXIMUM);
  const enTrop = tous.length - destinataires.length;

  /*
    Le catalogue et le barème sont lus **une fois** pour tout le lot : le
    message est le même pour tout le monde, et soixante lectures du catalogue
    coûteraient soixante allers-retours à la base pour un contenu identique.
  */
  /*
    ⚠️ **Les lectures sans cache, exprès.** Les versions cachées passent par
    `unstable_cache`, qui exige le contexte de requête de Next : hors de ce
    contexte — une garde, un script — elles **lèvent** au lieu de rendre une
    valeur. Une route qui envoie soixante courriels et ne peut s'éprouver
    nulle part n'est pas une route qu'on garde. Voir `catalogueSansCache`.
  */
  const [{ specialisations, programmes, sessions }, tarifs] = await Promise.all([
    catalogueSansCache(),
    tarifsSansCache(),
  ]);

  const prochaine = [...sessions].sort((a, b) => a.debut.localeCompare(b.debut))[0];
  const presentation = composerLaPresentation({
    specialisations,
    programmes,
    tarifs,
    /*
      ⚠️ **Le parcours mis en avant se règle ici, et il a une valeur par
      défaut.** La direction a demandé le 23 septembre 2026 de mettre le DAF en
      avant : c'est celui que porte l'annonce Facebook, celui dont la cohorte
      est tenue ouverte, et le seul dont on possède un spécimen de certificat à
      montrer. Un slug inconnu ne met simplement rien en avant — le message se
      rend en liste, comme avant.
    */
    misEnAvant:
      typeof corps.misEnAvant === "string" && corps.misEnAvant.trim() !== ""
        ? corps.misEnAvant.trim()
        : "directeur-administratif-et-financier",
    ...(prochaine?.debut ? { prochaineRentree: new Date(prochaine.debut) } : {}),
    ...(prochaine?.fin ? { finDeCohorte: new Date(prochaine.fin) } : {}),
    site: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.clixa.africa",
  });

  if (essai) {
    return NextResponse.json({
      essai: true,
      objet: presentation.objet,
      combien: presentation.combien,
      enAvant: presentation.enAvant?.titre ?? null,
      /*
        ⚠️ On rend les adresses lues, pas seulement leur nombre. Un collage de
        travers — une colonne de tableur à côté de la bonne — donne des
        adresses parfaitement formées qui ne sont pas celles qu'on croit.
        « 38 adresses » ne le dirait pas ; la liste, si.
      */
      destinataires: destinataires.map((d) => d.email),
      enTrop,
      rentree: presentation.rentree ?? null,
    });
  }

  const partis: string[] = [];
  const manques: string[] = [];

  for (const d of destinataires) {
    const ok = await courrielPresentation(payload, { ...d, presentation });
    (ok ? partis : manques).push(d.email);
  }

  return NextResponse.json({
    essai: false,
    envoyes: partis.length,
    partis,
    manques,
    enTrop,
  });
}
