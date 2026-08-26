import { RESEAUX_CLIXA } from "@/lib/reseaux";

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
    lien: RESEAUX_CLIXA.whatsapp.url,
    titre: `${RESEAUX_CLIXA.whatsapp.label} (${RESEAUX_CLIXA.whatsapp.numeroAffiche})`,
    aria: "Contacter les admissions sur WhatsApp",
    libelle: "WhatsApp",
    // WhatsApp est un moyen de nous joindre, pas un compte à suivre : il garde
    // le vert de l'action plutôt que le gris des autres.
    style:
      "border-emerald/40 bg-emerald/10 text-emerald-bright hover:border-emerald-bright hover:bg-emerald-bright/20 hover:text-emerald-bright hover:shadow-[0_4px_16px_rgba(47,163,125,0.35)]",
    trace: true,
    chemin:
      "M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21 M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1",
  },
  {
    cle: "linkedin",
    lien: RESEAUX_CLIXA.linkedin.url,
    titre: RESEAUX_CLIXA.linkedin.titre,
    aria: "Suivre CLIXA Institute sur LinkedIn",
    libelle: "LinkedIn",
    style:
      "bg-panel/70 text-ivory/80 border-white/10 hover:border-[#0077b5]/70 hover:bg-[#0077b5]/15 hover:text-[#38bdf8] hover:shadow-[0_4px_16px_rgba(0,119,181,0.3)]",
    trace: false,
    chemin:
      "M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.68 1.68 0 1 0-.02-3.36 1.68 1.68 0 0 0 .02 3.36m1.39 9.74v-8.37H5.07v8.37h2.78z",
  },
  {
    cle: "facebook",
    lien: RESEAUX_CLIXA.facebook.url,
    titre: RESEAUX_CLIXA.facebook.titre,
    aria: "Rejoindre SkillAfrique sur Facebook",
    libelle: "Facebook",
    style:
      "bg-panel/70 text-ivory/80 border-white/10 hover:border-[#1877f2]/70 hover:bg-[#1877f2]/15 hover:text-[#60a5fa] hover:shadow-[0_4px_16px_rgba(24,119,242,0.3)]",
    trace: false,
    chemin:
      "M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z",
  },
  {
    cle: "instagram",
    lien: RESEAUX_CLIXA.instagram.url,
    titre: RESEAUX_CLIXA.instagram.titre,
    aria: "Suivre SkillAfrique sur Instagram",
    libelle: "Instagram",
    style:
      "bg-panel/70 text-ivory/80 border-white/10 hover:border-[#e1306c]/70 hover:bg-[#e1306c]/15 hover:text-[#f472b6] hover:shadow-[0_4px_16px_rgba(225,48,108,0.3)]",
    trace: false,
    chemin:
      "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9a3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16m0 5.68a4.16 4.16 0 1 0 0 8.32 4.16 4.16 0 0 0 0-8.32m0 6.86a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4m5.3-7.02a.97.97 0 1 1-1.94 0 .97.97 0 0 1 1.94 0",
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
          <svg
            viewBox="0 0 24 24"
            {...(reseau.trace
              ? {
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: 1.8,
                  strokeLinecap: "round" as const,
                  strokeLinejoin: "round" as const,
                }
              : { fill: "currentColor" })}
            className={`${iconSize} shrink-0 transition-transform duration-200 group-hover:scale-110`}
            aria-hidden="true"
          >
            <path d={reseau.chemin} />
          </svg>
          {avecLibelle && <span className="tracking-wide">{reseau.libelle}</span>}
        </a>
      ))}
    </div>
  );
}
