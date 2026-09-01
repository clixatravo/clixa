import { getPayload } from "payload";
import config from "@payload-config";

/**
 * Export CSV du fichier des admissions, pour l'équipe.
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
 */
export async function GET(request: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });

  if (!user || user.collection !== "utilisateurs") {
    return new Response("Accès réservé à l'équipe CLIXA.", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 1. Récupérer les inscriptions
  const { docs: inscriptions } = await payload.find({
    collection: "inscriptions",
    limit: 1000,
    depth: 1,
    sort: "-createdAt",
    overrideAccess: true,
  });

  // 2. Récupérer les demandes de rappel
  const { docs: demandes } = await payload.find({
    collection: "demandes-rappel",
    limit: 1000,
    depth: 1,
    sort: "-createdAt",
    overrideAccess: true,
  });

  const lignes: string[][] = [
    [
      "Type",
      "Date",
      "Référence / Dossier",
      "Nom & Prénom",
      "E-mail",
      "Téléphone / WhatsApp",
      "Programme / Session",
      "Statut",
      "Montant / Échéances",
    ],
  ];

  for (const ins of inscriptions) {
    const sessionObj = ins.session && typeof ins.session === "object" ? ins.session : null;
    const sessionTitre = sessionObj && "titre" in sessionObj ? String(sessionObj.titre) : "Session";
    const dateCreation = ins.createdAt ? String(ins.createdAt).slice(0, 10) : "—";
    const echeances = Array.isArray(ins.echeances) ? ins.echeances : [];
    const totalRegle = echeances
      .filter((e) => e && typeof e === "object" && "statut" in e && e.statut === "regle")
      .reduce((acc, cur) => acc + (typeof cur?.montant === "number" ? cur.montant : 0), 0);

    lignes.push([
      "Inscription",
      dateCreation,
      String(ins.reference || `CLX-${ins.id}`),
      String(ins.apprenantNom || "—"),
      String(ins.apprenantEmail || "—"),
      String(ins.apprenantWhatsapp || "—"),
      sessionTitre,
      String(ins.statut || "en_cours"),
      `${totalRegle} EUR réglé(s)`,
    ]);
  }

  for (const dem of demandes) {
    const progObj = dem.programme && typeof dem.programme === "object" ? dem.programme : null;
    const progTitre =
      progObj && "titre" in progObj ? String(progObj.titre) : String(dem.programme || "—");
    const dateCreation = dem.createdAt ? String(dem.createdAt).slice(0, 10) : "—";

    lignes.push([
      "Demande de rappel",
      dateCreation,
      `DEM-${dem.id}`,
      String(dem.nom || "—"),
      String(dem.email || "—"),
      String(dem.whatsapp || "—"),
      progTitre,
      String(dem.statut || "nouvelle"),
      `Pays : ${dem.pays || "—"}`,
    ]);
  }

  // Échappement CSV avec séparateur point-virgule (standard Excel européen/francophone)
  const csvContenu =
    "\uFEFF" +
    lignes
      .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");

  const dateFichier = new Date().toISOString().slice(0, 10);

  return new Response(csvContenu, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clixa-rapport-admissions-${dateFichier}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
