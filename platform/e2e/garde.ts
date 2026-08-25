import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Le garde-fou : ces épreuves écrivent en base.
 *
 * Elles créent des inscriptions, les mènent jusqu'au bout, puis les retirent.
 * Sur la base de production, cela ferait des dossiers avec de vraies références
 * dans la collection que l'équipe consulte — et un décompte de places qui bouge
 * sous ses yeux sans raison.
 *
 * On refuse donc de courir si l'adresse de la base ressemble à celle de
 * production. La comparaison porte sur l'hôte seul : le mot de passe change
 * quand on le régénère, l'hôte non.
 */
function hote(chaine: string | undefined): string | undefined {
  if (!chaine) return undefined;
  const m = chaine.match(/@([^/:?]+)/);
  return m?.[1];
}

function depuis(fichier: string): string | undefined {
  const chemin = path.join(process.cwd(), fichier);
  if (!existsSync(chemin)) return undefined;
  const ligne = readFileSync(chemin, "utf8")
    .split("\n")
    .find((l) => l.startsWith("DATABASE_URL="));
  return ligne
    ?.slice("DATABASE_URL=".length)
    .trim()
    .replace(/^["']|["']$/g, "");
}

export default function verifierLaBase(): void {
  const production = hote(depuis(".env.prod"));
  // Pas de .env.prod sous la main — en intégration continue, par exemple. Rien
  // à comparer, et le secret qui y sert pointe la branche de développement.
  if (!production) return;

  const utilisee = hote(depuis(".env.local") ?? process.env.DATABASE_URL);
  if (utilisee && utilisee === production) {
    throw new Error(
      [
        "",
        "Les épreuves visent la base de PRODUCTION. Elles n'ont pas été lancées.",
        "",
        `  hôte : ${production}`,
        "",
        "Elles créent puis suppriment des inscriptions : sur la production, cela",
        "laisserait des dossiers et ferait bouger le décompte de places.",
        "Remettre DATABASE_URL sur la branche « dev » dans platform/.env.local.",
        "",
      ].join("\n"),
    );
  }
}
