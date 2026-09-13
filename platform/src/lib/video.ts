/**
 * Un lien de vidéo devient un lecteur — ou rien du tout.
 *
 * ── ⚠️ Ce que ce module protège ─────────────────────────────────────────────
 * L'adresse vient d'une case de /admin, et elle finit dans le `src` d'une
 * `<iframe>`. C'est la seule donnée du site qui charge du code venu d'ailleurs
 * dans la page : une adresse recopiée de travers, et l'on encadre n'importe
 * quoi — un `javascript:`, un site tiers, une page qui imite la nôtre.
 *
 * La règle est donc l'inverse de « nettoyer ce qu'on reçoit » : **on ne
 * fabrique jamais une adresse à partir de ce qui est saisi.** On en extrait un
 * identifiant, on vérifie qu'il a la forme attendue, et l'on recompose
 * l'adresse à partir d'un hôte écrit ici, en dur. Ce qui n'entre pas dans ce
 * moule ne rend rien — et la page se tait plutôt que d'encadrer l'inconnu.
 *
 * ⚠️ **Rien n'est deviné.** Une adresse qu'on ne reconnaît pas rend
 * `undefined` : mieux vaut une vignette absente qu'un lecteur qui charge autre
 * chose que ce que l'équipe croyait poser.
 */

/** Les deux hôtes qu'on sait encadrer. Rien d'autre n'est admis. */
export type Fournisseur = "youtube" | "vimeo";

export interface Video {
  fournisseur: Fournisseur;
  /** L'identifiant, tel qu'on l'a extrait — jamais l'adresse saisie. */
  id: string;
  /** L'adresse du lecteur, recomposée depuis un hôte écrit en dur. */
  embed: string;
  /** L'image d'attente, quand le fournisseur en publie une de devinable. */
  vignette?: string;
}

/*
  ⚠️ Onze caractères pour YouTube, et l'alphabet est fermé. Un identifiant plus
  permissif laisserait passer « ../ » ou un point d'interrogation, et l'adresse
  recomposée porterait alors autre chose que ce qu'on croit.
*/
const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;
const ID_VIMEO = /^\d{6,12}$/;

/**
 * Lit une adresse de vidéo et rend de quoi l'afficher.
 *
 * Les formes reconnues, parce que ce sont celles qu'on copie réellement :
 *
 * | Ce qu'on colle | D'où cela vient |
 * |---|---|
 * | `youtube.com/watch?v=ID` | la barre d'adresse, sur ordinateur |
 * | `youtu.be/ID` | le bouton « Partager » |
 * | `youtube.com/embed/ID` | un code d'intégration déjà copié |
 * | `youtube.com/shorts/ID` | une vidéo verticale, prise au téléphone |
 * | `vimeo.com/ID` | l'adresse d'une page Vimeo |
 *
 * ⚠️ Les paramètres qui suivent sont **jetés**, pas recopiés : `?t=42`,
 * `&list=…`, `&si=…` que YouTube ajoute au partage. Les garder ferait démarrer
 * la vidéo au milieu, ou enchaîner sur une playlist qui n'est pas la nôtre.
 */
export function lireLaVideo(adresse: unknown): Video | undefined {
  const brut = typeof adresse === "string" ? adresse.trim() : "";
  if (!brut) return undefined;

  let url: URL;
  try {
    /*
      ⚠️ On exige http(s) explicitement. `new URL("javascript:alert(1)")` est
      une adresse parfaitement valide pour le navigateur — c'est le protocole
      qui la rend dangereuse, pas sa forme. Et le préfixe n'est ajouté que si
      l'adresse ne porte aucun schéma : le coller devant « javascript: »
      donnerait « https://javascript: », qui ne ressemble plus à rien.
    */
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(brut) ? brut : `https://${brut}`);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;

  const hote = url.hostname.replace(/^www\./, "").toLowerCase();
  const morceaux = url.pathname.split("/").filter(Boolean);

  if (hote === "youtu.be") {
    return youtube(morceaux[0]);
  }

  if (hote === "youtube.com" || hote === "m.youtube.com" || hote === "youtube-nocookie.com") {
    if (morceaux[0] === "embed" || morceaux[0] === "shorts" || morceaux[0] === "v") {
      return youtube(morceaux[1]);
    }
    return youtube(url.searchParams.get("v"));
  }

  if (hote === "vimeo.com" || hote === "player.vimeo.com") {
    // player.vimeo.com/video/ID — le premier morceau est alors « video ».
    return vimeo(morceaux[0] === "video" ? morceaux[1] : morceaux[0]);
  }

  return undefined;
}

function youtube(id: string | null | undefined): Video | undefined {
  if (!id || !ID_YOUTUBE.test(id)) return undefined;
  return {
    fournisseur: "youtube",
    id,
    /*
      ⚠️ `youtube-nocookie.com` plutôt que `youtube.com` : le domaine sans
      cookie ne dépose rien tant que le visiteur n'a pas lancé la lecture. Le
      site porte un bandeau de consentement et n'allume aucune mesure sans
      accord ; encadrer un lecteur qui trace à l'affichage le contredirait.
    */
    embed: `https://www.youtube-nocookie.com/embed/${id}`,
    vignette: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

function vimeo(id: string | null | undefined): Video | undefined {
  if (!id || !ID_VIMEO.test(id)) return undefined;
  return {
    fournisseur: "vimeo",
    id,
    embed: `https://player.vimeo.com/video/${id}`,
    /*
      Vimeo ne publie pas d'adresse de vignette devinable : elle se demande à
      son API. On s'abstient plutôt que de composer une adresse qui rendrait
      404 — l'affiche déposée dans /admin prend alors le relais.
    */
  };
}
