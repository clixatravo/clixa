import { CHEMINS, ROUTES } from "./chemins";

/**
 * Faire compiler les pages avant de les chronométrer.
 *
 * `next dev` compile une page à sa première visite. La première série a mis une
 * heure et demie et perdu douze épreuves : non parce qu'une page était fausse,
 * mais parce que la machine compilait pendant qu'on lui demandait de lancer un
 * navigateur — lequel expirait au bout de trois minutes.
 *
 * Une visite en amont, sans navigateur, suffit à payer cette dette une fois.
 */
export default async function chauffer(): Promise<void> {
  const base = "http://localhost:3000";
  const debut = Date.now();

  for (const chemin of [...CHEMINS, ...ROUTES]) {
    try {
      await fetch(base + chemin);
    } catch {
      // Le serveur répondra ou non aux épreuves : ce n'est pas ici qu'on juge.
    }
  }

  const secondes = Math.round((Date.now() - debut) / 1000);
  console.log(
    `[épreuves] ${CHEMINS.length} pages et ${ROUTES.length} routes compilées en ${secondes} s`,
  );
}
