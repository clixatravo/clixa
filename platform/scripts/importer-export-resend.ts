/**
 * Faire entrer dans « Courriels envoyés » ce qui est parti avant le suivi.
 *
 *   npx payload run scripts/importer-export-resend.ts <export.csv> <nature>          # montre
 *   ECRIRE=1 npx payload run scripts/importer-export-resend.ts <export.csv> <nature> # écrit
 *
 * `<export.csv>` est l'export du tableau de bord de Resend (Emails → ⤓) ;
 * `<nature>` vaut `presentation` ou `demarrage` — tout l'export est rangé sous
 * elle, il faut donc n'exporter que les envois de cette nature.
 *
 * ── Pourquoi ce script existe ───────────────────────────────────────────────
 * Le 26 septembre 2026, la présentation est partie à soixante-huit prospects
 * **le matin**, et le suivi est arrivé l'après-midi. L'encart « Qui a reçu la
 * présentation » disait donc « aucun envoi suivi » sous un envoi que toute
 * l'équipe avait en tête. Demandé par la direction : « dakhelhom ».
 *
 * ── Ce qu'il fait, et ce qu'il ne fait pas ──────────────────────────────────
 * - **Il reconnaît une ligne à son identifiant Resend**, jamais à l'adresse :
 *   la même personne peut avoir reçu deux envois. Rejoué, il ne crée rien de
 *   plus.
 * - ⚠️ **Une ligne déjà là garde son état s'il est plus avancé.** Resend a pu
 *   écrire depuis l'export — un « retardé » devenu « remis ». Le rang décide,
 *   comme pour les appels (`statutApres`) : l'export est une photographie,
 *   l'appel est la dernière nouvelle.
 * - **Il pose la nature** sur les lignes existantes : créées par l'appel de
 *   Resend avant la colonne, elles sont nées « dossier ».
 * - Il écrit un événement « export » daté de l'envoi, pour que la fiche dise
 *   d'où vient l'état — pas un appel de Resend qui n'a jamais eu lieu.
 * - **Il n'invente pas de raison de rejet** : l'export n'en porte pas.
 */
import { readFileSync } from "node:fs";
import { getPayload } from "payload";
import config from "@payload-config";
import { sql } from "drizzle-orm";
import {
  adresseNue,
  statutApres,
  statutDeLEvenement,
  type NatureCourriel,
} from "@/lib/suivi-courriel";

const ECRIRE = process.env.ECRIRE === "1";
const [fichier, natureDemandee] = process.argv.slice(2).map(String);

if (!fichier || !["presentation", "demarrage"].includes(natureDemandee ?? "")) {
  console.log(
    "Usage : payload run scripts/importer-export-resend.ts <export.csv> <presentation|demarrage>",
  );
  process.exit(1);
}
const nature = natureDemandee as NatureCourriel;

/** Un CSV simple : guillemets doubles, virgules, pas de retour à la ligne dans un champ. */
function lireCsv(texte: string): Record<string, string>[] {
  const lignes = texte.trim().split(/\r?\n/);
  const decouper = (l: string) => {
    const champs: string[] = [];
    let c = "";
    let entre = false;
    for (let i = 0; i < l.length; i += 1) {
      const ch = l[i]!;
      if (ch === '"') {
        if (entre && l[i + 1] === '"') {
          c += '"';
          i += 1;
        } else entre = !entre;
      } else if (ch === "," && !entre) {
        champs.push(c);
        c = "";
      } else c += ch;
    }
    champs.push(c);
    return champs;
  };
  const entetes = decouper(lignes[0]!);
  return lignes.slice(1).map((l) => {
    const v = decouper(l);
    return Object.fromEntries(entetes.map((h, i) => [h, v[i] ?? ""]));
  });
}

/** « 2026-09-26 13:16:01.20555+00 » → ISO. */
const iso = (t: string) =>
  t ? new Date(t.replace(" ", "T").replace(/\+00$/, "Z")).toISOString() : undefined;

const lignes = lireCsv(readFileSync(fichier, "utf8"));
const payload = await getPayload({ config });

let crees = 0;
let misesAJour = 0;
let inchangees = 0;
const parEtat: Record<string, number> = {};

for (const l of lignes) {
  const idResend = l.id;
  if (!idResend) continue;
  const etat = statutDeLEvenement(`email.${l.last_event}`) ?? "envoye";
  parEtat[etat] = (parEtat[etat] ?? 0) + 1;
  const envoye = iso(l.created_at ?? "") ?? new Date().toISOString();
  const nouvelle = iso(l.sent_at ?? "") ?? envoye;

  const { docs } = await payload.find({
    collection: "courriels",
    where: { resendId: { equals: idResend } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const existante = docs[0] as { id: number; statut?: string; nature?: string } | undefined;

  if (!existante) {
    crees += 1;
    if (ECRIRE) {
      await payload.create({
        collection: "courriels",
        overrideAccess: true,
        depth: 0,
        data: {
          destinataire: adresseNue(l.to ?? ""),
          objet: (l.subject ?? "").slice(0, 300),
          statut: etat,
          nature,
          resendId: idResend,
          envoyeLe: envoye,
          derniereNouvelleLe: nouvelle,
          evenements: [
            { type: `export.${l.last_event}`, le: nouvelle, appel: `export:${idResend}` },
          ],
        },
      });
    }
    continue;
  }

  const statut = statutApres(existante.statut, etat) ?? etat;
  if (statut === existante.statut && existante.nature === nature) {
    inchangees += 1;
    continue;
  }
  misesAJour += 1;
  console.log(`  ~ ${l.to} : ${existante.statut} → ${statut} · ${existante.nature} → ${nature}`);
  if (ECRIRE) {
    await payload.db.drizzle.execute(sql`
      UPDATE courriels
      SET nature = ${nature}::enum_courriels_nature,
          statut = ${statut}::enum_courriels_statut,
          updated_at = now()
      WHERE id = ${existante.id}`);
  }
}

console.log(`\n${lignes.length} ligne(s) dans l'export — ${JSON.stringify(parEtat)}`);
console.log(`  ${crees} à créer · ${misesAJour} à mettre à jour · ${inchangees} déjà justes`);
console.log(ECRIRE ? "\n  Écrit.\n" : "\n  Rien n'est écrit. Relancer avec ECRIRE=1.\n");
