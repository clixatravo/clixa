"use client";

import { useSyncExternalStore } from "react";

/**
 * FE-19 — L'horaire d'une séance dans le fuseau du visiteur.
 *
 * Les séances sont annoncées en UTC, comme dans les fiches de la direction.
 * Un participant à Abidjan (GMT) et un autre à Casablanca (GMT+1) ne lisent
 * donc pas la même heure, et les deux doivent faire la conversion de tête
 * avant de savoir s'ils seront disponibles.
 *
 * ── Pourquoi côté navigateur ────────────────────────────────────────────────
 * Le serveur ne sait pas où se trouve le visiteur, et deviner d'après son
 * adresse IP se trompe dès qu'il voyage ou passe par un VPN. Le navigateur, lui,
 * le sait de source sûre.
 *
 * ── Pourquoi rien au premier rendu ──────────────────────────────────────────
 * L'horaire n'est calculé qu'après l'hydratation. Rendre autre chose côté
 * serveur que côté navigateur la casserait, et l'heure UTC reste visible juste
 * à côté : personne ne se retrouve devant un vide.
 *
 * `useSyncExternalStore` est fait pour ça : une valeur que seul le navigateur
 * connaît, avec un instantané serveur explicite. Un `useState` rempli dans un
 * effet ferait la même chose en apparence, mais rendrait deux fois et déclenche
 * la règle react-hooks/set-state-in-effect.
 */
export function HeureLocale({ debut, fin }: { debut: string; fin: string }) {
  const zone = useSyncExternalStore(
    // Le fuseau ne change pas en cours de visite : rien à écouter.
    () => () => {},
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => undefined,
  );

  if (!zone) return null;

  const d = new Date(debut);
  const f = new Date(fin);
  if (Number.isNaN(d.getTime()) || Number.isNaN(f.getTime())) return null;

  const ici = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone,
  });
  const enUTC = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

  /*
    Rien à dire à quelqu'un déjà à l'heure UTC : répéter le même horaire
    ferait douter d'une erreur.
  */
  if (ici.format(d) === enUTC.format(d)) return null;

  /*
    « 10h00 » plutôt que « 10:00 » : la cadence saisie par l'équipe s'écrit
    « 9h00–13h00 », et deux notations côte à côte se lisent comme une erreur.
  */
  const enFrancais = (x: Date) => ici.format(x).replace(":", "h");

  return (
    <span className="text-gold-bright">
      {" · "}
      {enFrancais(d)}–{enFrancais(f)} chez vous
    </span>
  );
}
