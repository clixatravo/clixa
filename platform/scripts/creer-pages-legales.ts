/**
 * Déposer les deux pages légales, en brouillon.
 *
 *   npx payload run scripts/creer-pages-legales.ts
 *
 * ── Pourquoi en brouillon ───────────────────────────────────────────────────
 * Ces textes engagent l'entreprise. Ce script décrit fidèlement ce que le site
 * fait — les données qu'il demande, où elles vivent, qui les traite — mais il
 * ne connaît ni la raison sociale exacte, ni le numéro de registre du commerce,
 * ni l'ICE, ni si une déclaration a été faite à la CNDP. Chaque endroit qui
 * attend cette information porte la marque « [À COMPLÉTER] ».
 *
 * La direction relit, complète, et publie depuis /admin. Rien ne paraît sur le
 * site tant qu'elle ne l'a pas fait.
 *
 * Rejouable : il met à jour la page si le slug existe déjà, sans toucher à son
 * état de publication.
 */
import { getPayload } from "payload";
import config from "@payload-config";

type Bloc =
  | { blockType: "intertitre"; texte: string }
  | { blockType: "paragraphe"; texte: string }
  | { blockType: "liste"; items: { valeur: string }[] };

const p = (texte: string): Bloc => ({ blockType: "paragraphe", texte });
const h = (texte: string): Bloc => ({ blockType: "intertitre", texte });
const l = (...items: string[]): Bloc => ({
  blockType: "liste",
  items: items.map((valeur) => ({ valeur })),
});

const MENTIONS: Bloc[] = [
  h("Éditeur du site"),
  p(
    "Le présent site est édité par [À COMPLÉTER : raison sociale exacte], [À COMPLÉTER : forme juridique] au capital de [À COMPLÉTER], immatriculée au registre du commerce de [À COMPLÉTER] sous le numéro [À COMPLÉTER], ICE [À COMPLÉTER].",
  ),
  p("Siège social : N° 1525, Bureau n° 5, Hay Essalam, Agadir, Maroc."),
  p("Téléphone : +212 6 69 30 34 67 — Courriel : contact@clixa.africa"),
  p("Directeur de la publication : [À COMPLÉTER : nom et qualité]."),

  h("Hébergement"),
  p(
    "Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis. Les fonctions qui servent les pages s'exécutent dans la région de Francfort, en Allemagne.",
  ),
  p(
    "Les données du site sont conservées dans une base PostgreSQL opérée par Neon Inc., également dans la région de Francfort, au sein de l'Union européenne.",
  ),

  h("Propriété intellectuelle"),
  p(
    "Les contenus de ce site — textes, descriptifs de parcours, programmes pédagogiques, identité visuelle — sont la propriété de l'éditeur, sauf mention contraire. Leur reproduction, même partielle, est soumise à autorisation écrite préalable.",
  ),
  p("Les marques et logos de tiers cités sur le site appartiennent à leurs détenteurs respectifs."),

  h("Formations et certifications"),
  p(
    "Les parcours présentés sont dispensés en classe virtuelle, à distance. Les dates, durées et tarifs affichés sont ceux en vigueur au moment de la consultation et peuvent évoluer pour les sessions non encore ouvertes.",
  ),
  p(
    "Une demande d'inscription déposée sur le site retient une place ; elle ne vaut pas paiement. La place est confirmée après réception et vérification du règlement.",
  ),

  h("Limitation de responsabilité"),
  p(
    "L'éditeur s'efforce de tenir les informations à jour, sans garantir qu'elles soient exemptes d'erreur. Les liens vers des sites tiers n'engagent pas sa responsabilité quant à leur contenu.",
  ),

  h("Droit applicable"),
  p(
    "Les présentes mentions sont régies par le droit marocain. Tout litige relatif à leur interprétation ou à leur exécution relève des tribunaux compétents de [À COMPLÉTER : ville].",
  ),
];

const CONFIDENTIALITE: Bloc[] = [
  p(
    "Cette page décrit les données que CLIXA Institute recueille sur ce site, l'usage qui en est fait, et les droits dont vous disposez.",
  ),

  h("Qui traite vos données"),
  p(
    "Le responsable du traitement est [À COMPLÉTER : raison sociale exacte], dont le siège est situé N° 1525, Bureau n° 5, Hay Essalam, Agadir, Maroc. Pour toute question relative à vos données : contact@clixa.africa.",
  ),
  p(
    "[À COMPLÉTER : mentionner ici la déclaration auprès de la CNDP — Commission nationale de contrôle de la protection des données à caractère personnel — et son numéro de récépissé, conformément à la loi 09-08.]",
  ),

  h("Ce que nous recueillons, et pourquoi"),
  p(
    "Nous ne recueillons que ce que vous nous confiez volontairement. Aucune donnée n'est achetée, ni collectée auprès de tiers.",
  ),
  p("Lorsque vous demandez une place dans un parcours :"),
  l(
    "votre nom, pour vous identifier et vous adresser correctement",
    "votre adresse électronique, pour vous transmettre votre référence de dossier et le suivi de votre inscription",
    "votre numéro WhatsApp, pour vous joindre au sujet de votre dossier",
    "votre pays, pour adapter les modalités de règlement",
    "le parcours, la session et le rythme de paiement que vous avez choisis",
  ),
  p("Lorsque vous créez un accès pour retrouver vos dossiers :"),
  l(
    "votre nom et votre adresse électronique",
    "un mot de passe, conservé sous forme chiffrée et jamais en clair",
    "votre téléphone et votre pays, pour préremplir vos futures demandes",
  ),
  p("Lorsque vous demandez à être rappelé :"),
  l("votre nom, votre adresse électronique, votre numéro, votre pays et votre message"),

  h("Ce que nous ne faisons pas"),
  l(
    "Nous ne vendons ni ne louons vos données.",
    "Nous ne les transmettons à aucun partenaire commercial.",
    "Nous n'utilisons aucun outil de mesure d'audience ni de publicité : ce site ne dépose aucun cookie de suivi.",
    "Nous ne demandons aucune information bancaire sur ce site. Aucun paiement n'y est effectué.",
  ),

  h("Cookies"),
  p(
    "Un seul cookie est déposé, et uniquement si vous créez un accès : il maintient votre session ouverte pour que vous n'ayez pas à vous identifier à chaque visite. Il est inaccessible aux scripts de la page et expire au bout de trente jours.",
  ),
  p("Aucun cookie publicitaire, de mesure ou de profilage n'est utilisé."),

  h("Où vos données sont conservées"),
  p(
    "Vos données sont enregistrées dans une base PostgreSQL opérée par Neon Inc., dans la région de Francfort, en Allemagne. Les pages du site sont servies par Vercel Inc., dont les fonctions s'exécutent dans la même région.",
  ),
  p(
    "Nos boîtes de courrier sont hébergées par Zoho Corporation. Les courriels automatiques du site sont acheminés par Resend Inc.",
  ),

  h("Combien de temps"),
  p(
    "[À COMPLÉTER : durée retenue. À titre indicatif, un dossier d'inscription est généralement conservé le temps du parcours puis pendant la durée de prescription applicable ; une demande de rappel restée sans suite peut être effacée au bout de douze mois.]",
  ),

  h("Vos droits"),
  p(
    "Conformément à la loi 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, vous disposez d'un droit d'accès, de rectification, d'opposition et de suppression.",
  ),
  p(
    "Pour l'exercer, écrivez à contact@clixa.africa depuis l'adresse que vous nous avez communiquée. Nous répondons dans un délai de trente jours.",
  ),
  p("Vous pouvez également saisir la CNDP si vous estimez que vos droits ne sont pas respectés."),

  h("Modifications"),
  p(
    "Cette page peut évoluer. La date de mise à jour figure en haut. Les changements substantiels sont signalés aux personnes concernées lorsque leurs coordonnées sont connues.",
  ),
];

const payload = await getPayload({ config });

const pages = [
  { slug: "mentions-legales", titre: "Mentions légales", contenu: MENTIONS },
  { slug: "confidentialite", titre: "Politique de confidentialité", contenu: CONFIDENTIALITE },
];

for (const page of pages) {
  const { docs } = await payload.find({
    collection: "pages",
    where: { slug: { equals: page.slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const data = { ...page, miseAJour: new Date().toISOString() };

  if (docs[0]) {
    await payload.update({
      collection: "pages",
      id: docs[0].id,
      data,
      draft: true,
      overrideAccess: true,
    });
    console.log(`  mise à jour : ${page.slug}`);
  } else {
    await payload.create({
      collection: "pages",
      data: { ...data, _status: "draft" },
      draft: true,
      overrideAccess: true,
    });
    console.log(`  créée       : ${page.slug}`);
  }
}

const restes = pages.flatMap((pg) =>
  pg.contenu.filter((b) => "texte" in b && b.texte.includes("[À COMPLÉTER")).map(() => pg.slug),
);
console.log(`\n${restes.length} passage(s) portent « [À COMPLÉTER] » — à relire dans /admin.`);
console.log("Les deux pages sont en BROUILLON : rien ne paraît sur le site avant publication.\n");

process.exit(0);
