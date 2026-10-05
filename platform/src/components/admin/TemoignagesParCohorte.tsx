import React from "react";
import type { BeforeListServerProps } from "payload";
import {
  filtreDeLAdresse,
  lienDesTemoignages,
  repartitionParCohorte,
  type CompteDeCohorte,
  type FiltreDesTemoignages,
} from "@/lib/temoignages";

/**
 * Le bandeau « Par cohorte », au-dessus de la liste des témoignages.
 *
 * Une carte par cohorte : combien attendent d'être relus, combien sont en
 * ligne. Un clic filtre la liste en dessous — la liste reste celle de Payload,
 * avec ses colonnes, sa recherche et ses boutons. Le calcul vit dans
 * `lib/temoignages.ts`, où il s'éprouve sans base.
 *
 * ⚠️ **De vrais liens, pas `<Link>`.** La liste de Payload garde sa requête
 * dans un état client : une navigation interne vers la même liste voit son
 * filtre aussitôt écrasé par cet état — l'adresse perd `where`, et la liste
 * entière revient sans un mot. Mesuré : par `<Link>`, « Octobre 2026 »
 * montrait les six témoignages ; par l'adresse chargée, aucun.
 *
 * ⚠️ **L'or ne sert qu'à « à relire »** : c'est la seule chose à faire sur cet
 * écran. Un témoignage publié n'appelle rien.
 */
export async function TemoignagesParCohorte({
  payload,
  user,
  searchParams,
}: BeforeListServerProps) {
  let docs: { cohorte?: string | null; _status?: string | null }[] = [];
  try {
    const res = await payload.find({
      collection: "temoignages",
      depth: 0,
      limit: 1000,
      pagination: false,
      select: { cohorte: true, _status: true },
      user,
      overrideAccess: false,
    });
    docs = res.docs;
  } catch {
    // Le bandeau est un raccourci : s'il ne peut pas compter, la liste reste.
    return null;
  }

  const r = repartitionParCohorte(docs);
  const actif = filtreDeLAdresse(searchParams as Record<string, unknown> | undefined);
  const estActif = (f: FiltreDesTemoignages) =>
    actif.genre === f.genre &&
    (f.genre !== "cohorte" || (actif.genre === "cohorte" && actif.cohorte === f.cohorte));

  const carte = (
    cle: string,
    filtre: FiltreDesTemoignages,
    titre: string,
    compte: CompteDeCohorte,
  ) => {
    const vide = compte.aRelire + compte.publies === 0;
    return (
      <a
        key={cle}
        href={lienDesTemoignages(filtre)}
        className={`clixa-cohorte ${estActif(filtre) ? "clixa-cohorte--actif" : ""} ${
          vide ? "clixa-cohorte--vide" : ""
        }`}
        aria-current={estActif(filtre) ? "true" : undefined}
      >
        <span className="clixa-cohorte__tag">Cohorte</span>
        <span className="clixa-cohorte__titre">{titre}</span>
        {vide ? (
          <span className="clixa-cohorte__vide">Aucun témoignage encore</span>
        ) : (
          <span className="clixa-cohorte__comptes">
            <span className={compte.aRelire > 0 ? "clixa-cohorte__arelire" : ""}>
              {compte.aRelire} à relire
            </span>
            <span>
              {compte.publies} publié{compte.publies > 1 ? "s" : ""}
            </span>
          </span>
        )}
      </a>
    );
  };

  return (
    <section className="clixa-cohortes" aria-label="Témoignages par cohorte">
      <div className="clixa-cohortes__entete">
        <div>
          <h2 className="clixa-cohortes__titre">Par cohorte</h2>
          <p className="clixa-cohortes__soustitre">
            {r.total === 0
              ? "Aucun témoignage pour l'instant. Ils arriveront ici, en brouillon, dès qu'un ancien participant en déposera un."
              : `${r.total} témoignage${r.total > 1 ? "s" : ""} au total. Cliquez sur une cohorte pour n'afficher que les siens.`}
          </p>
        </div>
        <div className="clixa-cohortes__raccourcis">
          {r.aRelire > 0 && (
            <a
              href={lienDesTemoignages({ genre: "a-relire" })}
              className={`clixa-cohortes__lien clixa-cohortes__lien--or ${
                estActif({ genre: "a-relire" }) ? "clixa-cohortes__lien--actif" : ""
              }`}
            >
              {r.aRelire} à relire →
            </a>
          )}
          {actif.genre !== "tous" && (
            <a href={lienDesTemoignages({ genre: "tous" })} className="clixa-cohortes__lien">
              Tout afficher
            </a>
          )}
        </div>
      </div>

      <div className="clixa-cohortes__grille">
        {r.cohortes.map((c) =>
          carte(c.valeur, { genre: "cohorte", cohorte: c.valeur }, c.libelle, c),
        )}
        {r.sansCohorte.aRelire + r.sansCohorte.publies > 0 &&
          carte("sans", { genre: "sans-cohorte" }, "Sans cohorte", r.sansCohorte)}
      </div>
    </section>
  );
}
