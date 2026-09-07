import { getPayload } from "payload";
import config from "@payload-config";
import { avancementDuDossier } from "@/lib/avancement";
import { classeur, type Valeur } from "@/lib/tableur";

/**
 * Le fichier des admissions, pour l'équipe.
 *
 * Il verse dans un tableur le nom, l'adresse, le téléphone, la session, le
 * statut et les montants réglés de **tous** les dossiers, plus toutes les
 * demandes de rappel. C'est le fichier clients entier, en un clic.
 *
 * ⚠️ Une session ne suffit pas : il faut une session **d'équipe**.
 *
 * La route se contentait de vérifier qu'un utilisateur était connecté. Or
 * `apprenants` est aussi une collection authentifiée : n'importe qui ouvre un
 * compte depuis /compte — ou se connecte par Google — et obtenait le fichier.
 * Reproduit avant d'être corrigé, avec un compte participant ordinaire : 200,
 * et le nom, l'adresse et le téléphone d'un autre inscrit dans le tableur.
 *
 * C'est le trou que `api/recu` ferme en toutes lettres, et qui était resté
 * ouvert ici. Les deux routes vérifient désormais la même chose, de la même
 * façon.
 *
 * ⚠️ Les en-têtes viennent de la requête, pas de `headers()` de Next. Ce n'est
 * pas un détail de style : hors contexte de requête, `headers()` lève, et la
 * route ne pouvait donc être éprouvée que par le réseau. `verifier-export.ts`
 * l'appelle maintenant directement, avec un vrai cookie de chaque sorte.
 *
 * ── ⚠️ Ce qu'il était, et pourquoi il a changé ──────────────────────────────
 * C'était un CSV, et il portait trois défauts que personne ne pouvait voir
 * sans l'ouvrir :
 *
 * 1. **La colonne « Programme / Session » disait « Session » sur chaque
 *    ligne.** Elle lisait `session.titre`, un champ qui n'existe pas — une
 *    session porte une `reference` et un `programme`. `"titre" in sessionObj`
 *    était donc toujours faux, et le repli s'écrivait tel quel. La colonne la
 *    plus utile du fichier ne disait rien, sans qu'aucun type ne s'en plaigne.
 * 2. **Deux tables étaient empilées dans une seule.** Une colonne « Type »
 *    les distinguait, et les autres changeaient de sens d'une ligne à
 *    l'autre : « Montant / Échéances » portait « 0 EUR réglé(s) » sur les
 *    inscriptions et « Pays : Maroc » sur les demandes.
 * 3. **Les statuts sortaient bruts** — `demandee`, `sans-suite` — quand
 *    /admin affiche « Demandée — en attente de paiement ». Le tableur était le
 *    seul endroit où l'équipe lisait le vocabulaire de la base.
 *
 * La direction l'a demandé « conçu, que n'importe qui le comprenne, chaque
 * chose à sa place ». C'est donc un vrai classeur, **une feuille par nature de
 * donnée** : `lib/tableur.ts` explique pourquoi il est écrit à la main.
 *
 * ⚠️ **Les montants et les dates sont des nombres et des dates**, pas du
 * texte. « 0 EUR réglé(s) » ne s'additionne pas, et « 2026-09-06 » ne se trie
 * pas dans un tableur français.
 */

/** Ce que /admin affiche, plutôt que ce que la base stocke. */
const STATUT_DOSSIER: Record<string, string> = {
  demandee: "Demandée — en attente de paiement",
  confirmee: "Confirmée — acompte reçu",
  payee: "Payée — solde reçu",
  terminee: "Terminée — parcours suivi",
  annulee: "Annulée",
};

const STATUT_DEMANDE: Record<string, string> = {
  nouvelle: "Nouvelle",
  rappelee: "Rappelée",
  devis: "Devis envoyé",
  inscrite: "Inscrite",
  "sans-suite": "Sans suite",
};

const MOYEN: Record<string, string> = {
  carte: "Carte bancaire",
  virement: "Virement",
  transfert: "Transfert (Western Union · Ria · MoneyGram)",
};

const PLAN: Record<string, string> = {
  P1: "En une fois",
  P2: "En deux fois",
  P3: "En trois fois",
};

/** Une date lisible par le tableur, ou rien — jamais une chaîne. */
const jour = (v: unknown): Valeur => (v ? new Date(String(v)) : undefined);

export async function GET(request: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });

  if (!user || user.collection !== "utilisateurs") {
    return new Response("Accès réservé à l'équipe CLIXA.", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  /*
    `depth: 2` : la session porte le programme en relation, et c'est le titre
    du programme qu'on veut lire — à une profondeur de 1, on n'aurait que son
    identifiant, et la colonne retomberait dans le défaut qu'on vient de
    corriger.
  */
  const { docs: inscriptions } = await payload.find({
    collection: "inscriptions",
    limit: 1000,
    depth: 2,
    sort: "-createdAt",
    overrideAccess: true,
  });

  const { docs: demandes } = await payload.find({
    collection: "demandes-rappel",
    limit: 1000,
    depth: 1,
    sort: "-createdAt",
    overrideAccess: true,
  });

  const maintenant = new Date();

  const lignesInscriptions: Valeur[][] = inscriptions.map((ins) => {
    const session = ins.session && typeof ins.session === "object" ? ins.session : undefined;
    const programme =
      session && session.programme && typeof session.programme === "object"
        ? session.programme
        : undefined;

    const echeances = Array.isArray(ins.echeances) ? ins.echeances : [];
    const regle = echeances
      .filter((e) => e?.statut === "regle")
      .reduce((total, e) => total + (typeof e?.montant === "number" ? e.montant : 0), 0);
    const du = echeances.reduce(
      (total, e) => total + (typeof e?.montant === "number" ? e.montant : 0),
      0,
    );

    /*
      ⚠️ La même lecture que la colonne « Où en est » de /admin, importée et
      non recopiée. Le tableur est justement ce qu'on emporte en réunion : il
      ne peut pas dire d'un dossier autre chose que l'écran d'à côté.
    */
    const { libelle } = avancementDuDossier(ins, maintenant);

    return [
      String(ins.reference ?? ""),
      jour(ins.createdAt),
      libelle,
      STATUT_DOSSIER[String(ins.statut)] ?? String(ins.statut ?? ""),
      String(ins.apprenantNom ?? ""),
      String(ins.apprenantEmail ?? ""),
      String(ins.apprenantWhatsapp ?? ""),
      String(ins.apprenantPays ?? ""),
      programme?.titre ? String(programme.titre) : "",
      session?.reference ? String(session.reference) : "",
      jour(session?.debut),
      PLAN[String(ins.planPaiement)] ?? String(ins.planPaiement ?? ""),
      MOYEN[String(ins.moyenSouhaite)] ?? String(ins.moyenSouhaite ?? ""),
      du || undefined,
      regle || undefined,
      jour(ins.contratDemandeLe),
      jour(ins.contratSigneLe),
      jour(ins.contratVerifieLe),
      jour(ins.coordonneesEnvoyeesLe),
      jour(ins.certificatEmisLe),
    ];
  });

  const lignesDemandes: Valeur[][] = demandes.map((dem) => {
    const programme =
      dem.programme && typeof dem.programme === "object" ? dem.programme : undefined;
    return [
      jour(dem.createdAt),
      STATUT_DEMANDE[String(dem.statut)] ?? String(dem.statut ?? ""),
      String(dem.nom ?? ""),
      String(dem.whatsapp ?? ""),
      String(dem.email ?? ""),
      String(dem.pays ?? ""),
      programme?.titre ? String(programme.titre) : "",
      PLAN[String(dem.planPaiement)] ?? String(dem.planPaiement ?? ""),
      String(dem.origine ?? ""),
      String(dem.notes ?? ""),
    ];
  });

  const fichier = classeur([
    {
      nom: "Inscriptions",
      colonnes: [
        { entete: "Référence", largeur: 15 },
        { entete: "Déposé le", largeur: 12 },
        { entete: "Où en est le dossier", largeur: 38 },
        { entete: "Statut", largeur: 30 },
        { entete: "Nom", largeur: 26 },
        { entete: "E-mail", largeur: 30 },
        { entete: "WhatsApp", largeur: 18 },
        { entete: "Pays", largeur: 16 },
        { entete: "Parcours", largeur: 34 },
        { entete: "Session", largeur: 40 },
        { entete: "Début", largeur: 12 },
        { entete: "Rythme de paiement", largeur: 18 },
        { entete: "Règlement souhaité", largeur: 34 },
        { entete: "Total dû", largeur: 13 },
        { entete: "Déjà réglé", largeur: 13 },
        { entete: "Contrat demandé", largeur: 15 },
        { entete: "Contrat signé", largeur: 14 },
        { entete: "Contrat vérifié", largeur: 14 },
        { entete: "Coordonnées envoyées", largeur: 18 },
        { entete: "Certificat émis", largeur: 14 },
      ],
      lignes: lignesInscriptions,
    },
    {
      nom: "Demandes de rappel",
      colonnes: [
        { entete: "Reçue le", largeur: 12 },
        { entete: "Statut", largeur: 16 },
        { entete: "Nom", largeur: 26 },
        { entete: "WhatsApp", largeur: 18 },
        { entete: "E-mail", largeur: 30 },
        { entete: "Pays", largeur: 18 },
        { entete: "Parcours demandé", largeur: 34 },
        { entete: "Rythme évoqué", largeur: 16 },
        { entete: "Page d'origine", largeur: 34 },
        { entete: "Notes internes", largeur: 46 },
      ],
      lignes: lignesDemandes,
    },
  ]);

  const dateFichier = new Date().toISOString().slice(0, 10);

  return new Response(new Uint8Array(fichier), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8",
      "Content-Disposition": `attachment; filename="clixa-admissions-${dateFichier}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
