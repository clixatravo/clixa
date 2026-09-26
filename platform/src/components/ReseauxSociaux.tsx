import { LOGOS } from "@/lib/logos";
import { RESEAUX_CLIXA } from "@/lib/reseaux";
import { LogoSvg } from "./LogoSvg";

/**
 * Les réseaux, en une rangée.
 *
 * Quatre blocs presque identiques se recopiaient à la main ; le quatrième
 * réseau a fait pencher la balance vers une table. Chaque entrée garde ses
 * couleurs de survol, qui sont celles de la marque visitée — c'est ce qui
 * permet de reconnaître une icône avant de l'avoir lue.
 */
interface ReseauxSociauxProps {
  taille?: "compact" | "normal" | "large";
  avecLibelle?: boolean;
  className?: string;
}

const RESEAUX = [
  {
    cle: "whatsapp",
    logo: LOGOS.whatsapp,
    lien: RESEAUX_CLIXA.whatsapp.url,
    titre: RESEAUX_CLIXA.whatsapp.titre,
    aria: "Contacter les admissions sur WhatsApp",
    libelle: "WhatsApp",
    // WhatsApp est un moyen de nous joindre, pas un compte à suivre : il garde
    // le vert de l'action plutôt que le gris des autres.
    style:
      "border-emerald/40 bg-emerald/10 text-emerald-bright hover:border-emerald-bright hover:bg-emerald-bright/20 hover:text-emerald-bright hover:shadow-[0_4px_16px_rgba(47,163,125,0.35)]",
  },
  {
    cle: "linkedin",
    logo: LOGOS.linkedin,
    lien: RESEAUX_CLIXA.linkedin.url,
    titre: RESEAUX_CLIXA.linkedin.titre,
    aria: "Suivre CLIXA Institute sur LinkedIn",
    libelle: "LinkedIn",
    style:
      "bg-panel/70 text-ivory/80 border-white/10 hover:border-[#0077b5]/70 hover:bg-[#0077b5]/15 hover:text-[#38bdf8] hover:shadow-[0_4px_16px_rgba(0,119,181,0.3)]",
  },
  {
    cle: "facebook",
    logo: LOGOS.facebook,
    lien: RESEAUX_CLIXA.facebook.url,
    titre: RESEAUX_CLIXA.facebook.titre,
    aria: "Rejoindre CLIXA sur Facebook",
    libelle: "Facebook",
    style:
      "bg-panel/70 text-ivory/80 border-white/10 hover:border-[#1877f2]/70 hover:bg-[#1877f2]/15 hover:text-[#60a5fa] hover:shadow-[0_4px_16px_rgba(24,119,242,0.3)]",
  },
  {
    cle: "instagram",
    logo: LOGOS.instagram,
    lien: RESEAUX_CLIXA.instagram.url,
    titre: RESEAUX_CLIXA.instagram.titre,
    aria: "Suivre CLIXA sur Instagram",
    libelle: "Instagram",
    style:
      "bg-panel/70 text-ivory/80 border-white/10 hover:border-[#e1306c]/70 hover:bg-[#e1306c]/15 hover:text-[#f472b6] hover:shadow-[0_4px_16px_rgba(225,48,108,0.3)]",
  },
] as const;

export function ReseauxSociaux({
  taille = "normal",
  avecLibelle = false,
  className = "",
}: ReseauxSociauxProps) {
  const iconSize = taille === "compact" ? "size-3.5" : taille === "large" ? "size-5" : "size-4";

  const paddingBtn =
    taille === "compact"
      ? "p-1.5"
      : taille === "large"
        ? "px-4 py-2.5 gap-2.5 text-[0.84rem]"
        : avecLibelle
          ? "px-3 py-1.5 gap-2 text-[0.78rem]"
          : "p-2";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {RESEAUX.map((reseau) => (
        <a
          key={reseau.cle}
          href={reseau.lien}
          target="_blank"
          rel="noopener noreferrer"
          title={reseau.titre}
          aria-label={reseau.aria}
          /*
            `max-sm:size-11` : sur téléphone, la cible doit rester atteignable
            au pouce. Le pied de page les dessinait à 34 px — au-dessus du
            minimum exigé, sous les 44 px où l'on cesse de viser. La contrainte
            ne s'applique qu'en dessous de `sm`, pour ne pas alourdir une
            rangée d'icônes au bas d'un écran large.
          */
          className={`group rounded-clixa inline-flex items-center justify-center border font-mono font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 max-sm:min-h-11 max-sm:min-w-11 ${reseau.style} ${paddingBtn}`}
        >
          <LogoSvg
            logo={reseau.logo}
            className={`${iconSize} transition-transform duration-200 group-hover:scale-110`}
          />
          {avecLibelle && <span className="tracking-wide">{reseau.libelle}</span>}
        </a>
      ))}
    </div>
  );
}
