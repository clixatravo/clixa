import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";

/**
 * Route d'export CSV sécurisée pour l'équipe administrative et de direction.
 * Génère un tableur complet des inscriptions et demandes de rappel au format Excel UTF-8.
 */
export async function GET() {
  const headersList = await headers();
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: headersList });

  if (!user) {
    return new Response("Accès réservé aux administrateurs connectés.", {
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
