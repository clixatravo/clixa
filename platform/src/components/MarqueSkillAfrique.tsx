import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

/**
 * FE-21 — Le bloc de marque SkillAfrique.
 *
 * ── Pourquoi un cartouche clair ─────────────────────────────────────────────
 * Le logo porte du bleu marine — « SKILL » et « By CLIXA Institute » — sur fond
 * blanc. Posé tel quel sur le fond sombre du site, ce bleu disparaît ; détouré,
 * il disparaît davantage. On lui donne donc sa propre surface claire, comme on
 * le fait de toute marque dont les encres sont sombres. Le cartouche devient
 * l'objet, et le logo s'y lit sans compromis.
 *
 * Le jour où la direction fournira une version en blanc sur fond transparent,
 * elle pourra se poser à même le fond : ce sera un meilleur rendu, et il
 * suffira de remplacer le fichier.
 *
 * ── Pourquoi vérifier le fichier ────────────────────────────────────────────
 * Le logo n'est pas encore au dépôt. Plutôt que de casser la page ou d'afficher
 * un cadre vide, on retombe sur le monogramme qui tenait la place jusqu'ici.
 * Déposer le fichier suffit à basculer — aucune ligne à changer.
 */
const FICHIER = "/skillafrique.png";

export function MarqueSkillAfrique() {
  const present = existsSync(path.join(process.cwd(), "public", "skillafrique.png"));

  if (!present) {
    return (
      <div
        className="border-gold from-panel to-ink relative hidden aspect-square items-center justify-center bg-gradient-to-br lg:flex"
        aria-hidden="true"
      >
        <span className="border-line absolute inset-[18px] border" />
        <span className="font-display text-gold text-[5rem] opacity-90">SA</span>
      </div>
    );
  }

  return (
    /*
      La marque est large — deux fois et demie plus que haute. Un cartouche
      carré l'aurait noyée au milieu de deux bandes vides ; celui-ci suit sa
      forme, et le logo y respire sans être perdu.

      Visible à toutes les largeurs, contrairement au monogramme qu'il remplace :
      celui-ci n'était qu'un ornement, une marque ne l'est pas.
    */
    <div className="border-gold relative flex items-center justify-center border bg-white px-7 py-7 sm:px-9 sm:py-9">
      {/*
        Le filet intérieur reprend le motif des autres cartouches du site :
        la surface change, la grammaire non. En noir translucide plutôt qu'en
        or — sur une surface claire, l'or disparaîtrait.

        Le fond est blanc, pas ivoire : le logo porte le sien, et deux blancs
        voisins mais différents dessinaient un rectangle au milieu du cartouche.
      */}
      <span className="absolute inset-[13px] border border-black/10" />
      <Image
        src={FICHIER}
        alt="SkillAfrique, par CLIXA Institute"
        width={1100}
        height={464}
        priority
        sizes="(min-width: 1024px) 420px, 100vw"
        className="relative h-auto w-full max-w-[340px] object-contain sm:max-w-[380px]"
      />
    </div>
  );
}
