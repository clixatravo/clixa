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
const dire = (q: string, v: boolean) => {
  console.log(`  ${v ? "✓" : "✗"} ${q}`);
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
} finally {
  payload.sendEmail = expediteur;
  if (dossierId !== undefined) {
    await payload.delete({ collection: "inscriptions", id: dossierId, overrideAccess: true });
    console.log("  · dossier d'épreuve supprimé");
  }
}

console.log(manques === 0 ? "\nRelances : tout tient." : `\nRelances : ${manques} manque(s).`);
process.exit(manques === 0 ? 0 : 1);
