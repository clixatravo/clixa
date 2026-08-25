import React from "react";
import { getPayload } from "payload";
import config from "@payload-config";

/**
 * Ce qui attend l'équipe, en tête du tableau de bord.
 *
 * ── Pourquoi ce bandeau ─────────────────────────────────────────────────────
 * Le tableau de bord de Payload est un sommaire : douze rectangles portant
 * chacun le nom d'une collection. Il dit où aller, jamais s'il faut y aller.
 * Or on ouvre un back-office le matin pour une seule raison — savoir ce qui a
 * bougé pendant la nuit.
 *
 * Les trois lignes retenues sont celles qui demandent un geste, pas celles qui
 * font un joli chiffre. Un transfert annoncé attend d'être vérifié ; une
 * échéance dépassée attend une relance ; une inscription sans premier versement
 * attend qu'on la suive. Le nombre de parcours au catalogue, lui, n'attend
 * personne : il n'est pas ici.
 *
 * ── Quand il n'y a rien ─────────────────────────────────────────────────────
 * On le dit en toutes lettres plutôt que d'aligner des zéros. Trois « 0 » se
 * lisent comme un compteur en panne ; « rien n'attend » se lit comme une
 * réponse.
 */

const JOUR = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

interface Echeance {
  statut?: string | null;
  dateLimite?: string | null;
}

export async function Veille() {
  const payload = await getPayload({ config });

  const { docs } = await payload.find({
    collection: "inscriptions",
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });

  const vivantes = docs.filter((d) => d.statut !== "annulee" && d.statut !== "terminee");
  const aujourdhui = new Date().toISOString().slice(0, 10);

  /*
    Un dossier ne compte qu'une fois, dans l'état qui appelle le geste le plus
    pressant. Trois filtres indépendants faisaient additionner quatre choses à
    faire pour trois dossiers : un même dossier peut être en retard ET sans
    premier versement, ou annoncé ET encore « demandé ». Le total ne voulait
    alors plus rien dire, et l'une des lignes menait à relancer quelqu'un qui
    venait de payer.

    L'ordre est celui de l'urgence : ce qui attend de nous d'abord, ce qui est
    en retard ensuite, ce qui suit son cours en dernier.
  */
  const echeancesDe = (d: (typeof vivantes)[number]) => (d.echeances ?? []) as Echeance[];

  let aVerifier = 0;
  let enRetard = 0;
  let sansPremierVersement = 0;

  for (const dossier of vivantes) {
    const echeances = echeancesDe(dossier);

    if (echeances.some((e) => e.statut === "annonce")) {
      aVerifier += 1;
    } else if (
      echeances.some(
        (e) => e.statut !== "regle" && e.dateLimite && e.dateLimite.slice(0, 10) < aujourdhui,
      )
    ) {
      enRetard += 1;
    } else if (dossier.statut === "demandee") {
      sansPremierVersement += 1;
    }
  }

  // La prochaine séance : ce qui fixe l'horizon de tout le reste.
  const { docs: sessions } = await payload.find({
    collection: "sessions",
    where: { debut: { greater_than_equal: aujourdhui } },
    sort: "debut",
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const prochaine = sessions[0]?.debut;

  const lignes = [
    {
      nombre: aVerifier,
      quoi: "transfert annoncé, à vérifier",
      pluriel: "transferts annoncés, à vérifier",
    },
    { nombre: enRetard, quoi: "échéance dépassée", pluriel: "échéances dépassées" },
    {
      nombre: sansPremierVersement,
      quoi: "dossier sans premier versement",
      pluriel: "dossiers sans premier versement",
    },
  ].filter((l) => l.nombre > 0);

  return (
    <section className="clixa-veille">
      <span className="clixa-veille__titre">Ce qui vous attend</span>

      {lignes.length === 0 ? (
        <p className="clixa-veille__calme">
          Rien n&apos;attend de geste de votre part. Les dossiers en cours sont à jour.
        </p>
      ) : (
        <ul className="clixa-veille__liste">
          {lignes.map((l) => (
            <li key={l.quoi} className="clixa-veille__item">
              <span className="clixa-veille__nombre">{l.nombre}</span>
              <span className="clixa-veille__quoi">{l.nombre > 1 ? l.pluriel : l.quoi}</span>
            </li>
          ))}
        </ul>
      )}

      {prochaine && (
        <p className="clixa-veille__horizon">
          Prochaine séance le {JOUR.format(new Date(prochaine))}.
        </p>
      )}
    </section>
  );
}
