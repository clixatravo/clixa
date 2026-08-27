/**
 * Met les deux pages légales d'accord avec ce que le site fait vraiment.
 *
 * ── Ce que ce script fait, et ce qu'il ne fera jamais ───────────────────────
 * Il remplit ce qui se déduit d'un fait vérifiable : la juridiction découle du
 * siège déjà mentionné, les cookies et les traitements se lisent dans le code.
 *
 * Il ne remplit **pas** les identifiants de la société — raison sociale, forme
 * juridique, capital, registre du commerce, ICE, directeur de la publication,
 * récépissé CNDP. Ce sont des mentions officielles : les inventer ferait de ces
 * pages un faux, et un faux publié engage plus que des pages absentes.
 * Elles restent en brouillon tant que la direction ne les a pas fournies.
 *
 *   npx payload run scripts/completer-pages-legales.ts
 *
 * Rejouable : chaque paragraphe est repéré par son contenu, pas par son rang.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });

/** Un remplacement : on cherche un début de texte, on écrit le nouveau. */
interface Retouche {
  page: "mentions-legales" | "confidentialite";
  cherche: string;
  ecrit: string;
  pourquoi: string;
}

const RETOUCHES: Retouche[] = [
  {
    page: "mentions-legales",
    cherche: "Les présentes mentions sont régies par le droit marocain",
    ecrit:
      "Les présentes mentions sont régies par le droit marocain. Tout litige relatif à leur " +
      "interprétation ou à leur exécution relève des tribunaux compétents d'Agadir.",
    pourquoi: "la juridiction découle du siège, déjà mentionné dans la même page",
  },
  {
    /*
      « Un seul cookie » a cessé d'être vrai le jour où la connexion Google est
      arrivée : deux cookies temporaires l'accompagnent, sans lesquels un tiers
      pourrait faire atterrir le visiteur dans le compte de quelqu'un d'autre.
      Une politique qui sous-déclare est aussi fausse qu'une qui exagère.
    */
    page: "confidentialite",
    cherche: "Un seul cookie est déposé",
    ecrit:
      "Le site dépose un cookie de session lorsque vous vous connectez à votre espace : il vous " +
      "évite de vous identifier à chaque visite. Il est inaccessible aux scripts de la page et " +
      "expire au bout de trente jours. S'y ajoutent, si vous passez par la connexion Google, deux " +
      "cookies techniques qui vivent le temps de l'opération — quinze minutes — et servent à " +
      "vérifier que le retour depuis Google correspond bien au départ que vous avez déclenché.",
    pourquoi: "la connexion Google en dépose deux de plus ; « un seul cookie » était devenu faux",
  },
  {
    page: "confidentialite",
    cherche: "Nous ne recueillons que ce que vous nous confiez volontairement",
    ecrit:
      "Nous ne recueillons que ce que vous nous confiez volontairement. Aucune donnée n'est " +
      "achetée, ni collectée auprès de tiers. Si vous choisissez de vous connecter avec un compte " +
      "Google, Google nous transmet votre adresse e-mail, votre nom et un identifiant de compte " +
      "propre à Google ; c'est cet identifiant, et non l'adresse, qui rattache votre accès à votre " +
      "dossier. Aucun autre élément de votre compte Google ne nous est communiqué, et nous " +
      "n'écrivons rien chez Google.",
    pourquoi: "la connexion Google était un traitement non déclaré",
  },
  {
    /*
      Les durées sont une décision du responsable de traitement, pas une
      déduction. Celles-ci sont écrites pour être relues et validées : elles
      correspondent à ce que le site fait aujourd'hui, et le disent en clair
      plutôt que de laisser un crochet vide qui empêche toute publication.
    */
    page: "confidentialite",
    cherche: "[À COMPLÉTER : durée retenue",
    ecrit:
      "Un dossier d'inscription est conservé pendant toute la durée du parcours, puis pendant cinq " +
      "ans à compter de son terme, délai qui correspond à la prescription applicable en matière " +
      "commerciale. Une demande de rappel restée sans suite est effacée au bout de douze mois. Un " +
      "accès participant reste ouvert tant que vous l'utilisez ; il est supprimé sur simple " +
      "demande, et au plus tard trois ans après votre dernière connexion.",
    pourquoi: "à faire valider par la direction — voir l'avertissement en fin d'exécution",
  },
];

let faites = 0;
let introuvables = 0;

for (const r of RETOUCHES) {
  const { docs } = await payload.find({
    collection: "pages",
    where: { slug: { equals: r.page } },
    limit: 1,
    depth: 0,
    draft: true,
    overrideAccess: true,
  });

  const page = docs[0] as unknown as {
    id: string | number;
    contenu?: { blockType: string; texte?: string }[];
  };
  if (!page) {
    console.log(`  ✗ page « ${r.page} » introuvable`);
    introuvables += 1;
    continue;
  }

  const contenu = page.contenu ?? [];
  /*
    Deux repères de recherche subsistent dans le texte réécrit — la phrase
    conservée en tête. Sans la comparaison qui suit, chaque exécution déposait
    une version identique de plus dans l'historique de la page.
  */
  if (contenu.some((b) => b.texte === r.ecrit)) {
    console.log(`  · ${r.page} : déjà à jour — ${r.pourquoi}`);
    continue;
  }

  const cible = contenu.find((b) => typeof b.texte === "string" && b.texte.includes(r.cherche));

  if (!cible) {
    console.log(`  ✗ ${r.page} : « ${r.cherche.slice(0, 40)}… » introuvable`);
    introuvables += 1;
    continue;
  }

  cible.texte = r.ecrit;

  await payload.update({
    collection: "pages",
    id: page.id,
    draft: true,
    overrideAccess: true,
    data: { contenu } as never,
  });

  console.log(`  ✓ ${r.page} — ${r.pourquoi}`);
  faites += 1;
}

console.log(`\n${faites} paragraphe(s) mis à jour, ${introuvables} page(s) manquante(s).`);
console.log(`
⚠️ Ce qui reste vide ne peut pas être écrit sans la direction :
   raison sociale · forme juridique · capital · ville et numéro du registre
   du commerce · ICE · directeur de la publication · récépissé CNDP.

⚠️ Les durées de conservation viennent d'être écrites. Elles engagent la
   société vis-à-vis des personnes inscrites : à relire avant publication.

Les deux pages restent en brouillon. Les publier à trous mettrait en ligne un
document juridique incomplet, ce qui expose davantage que leur absence.`);
