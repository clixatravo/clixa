"use client";

import { useState } from "react";

/**
 * Envoyer la présentation de l'institut à une liste choisie.
 *
 * ── ⚠️ Trois temps, comme l'annonce de démarrage, et pour une raison de plus
 * Celle-là écrit à des gens qui ont un dossier chez nous. Celle-ci écrit à des
 * gens qui n'en ont pas : l'adresse vient d'un copier-coller, et un collage de
 * travers — la colonne d'à côté dans un tableur — donne des adresses
 * parfaitement formées qui ne sont pas celles qu'on croit.
 *
 * Le temps « regarder » **montre donc les adresses lues**, pas leur nombre.
 * « 38 destinataires » ne dit rien ; la liste, si.
 */
interface Reponse {
  essai: boolean;
  objet?: string;
  combien?: number;
  destinataires?: string[];
  envoyes?: number;
  partis?: string[];
  manques?: string[];
  enTrop?: number;
  rentree?: string | null;
  erreur?: string;
}

type Etat =
  | { quoi: "saisie" }
  | { quoi: "occupe" }
  | { quoi: "vu"; reponse: Reponse; arme: boolean }
  | { quoi: "parti"; reponse: Reponse }
  | { quoi: "erreur"; dit: string };

export function PresenterInstitut() {
  const [liste, setListe] = useState("");
  const [etat, setEtat] = useState<Etat>({ quoi: "saisie" });

  const appeler = async (essai: boolean): Promise<Reponse | null> => {
    try {
      const r = await fetch("/api/admin/presenter", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
        body: JSON.stringify({ destinataires: liste, essai }),
      });
      const rep = (await r.json()) as Reponse;
      if (!r.ok) {
        setEtat({ quoi: "erreur", dit: rep.erreur ?? `Refus (${r.status}).` });
        return null;
      }
      return rep;
    } catch {
      setEtat({ quoi: "erreur", dit: "Le serveur n’a pas répondu. Rien n’a été envoyé." });
      return null;
    }
  };

  const regarder = async () => {
    setEtat({ quoi: "occupe" });
    const rep = await appeler(true);
    if (rep) setEtat({ quoi: "vu", reponse: rep, arme: false });
  };

  const envoyer = async () => {
    setEtat({ quoi: "occupe" });
    const rep = await appeler(false);
    if (rep) setEtat({ quoi: "parti", reponse: rep });
  };

  if (etat.quoi === "occupe") {
    return (
      <div className="clixa-annonce">
        <div className="clixa-annonce__tete">Présenter l’institut</div>
        <p className="clixa-annonce__texte">En cours…</p>
      </div>
    );
  }

  if (etat.quoi === "parti") {
    const r = etat.reponse;
    return (
      <div className="clixa-annonce">
        <div className="clixa-annonce__tete">Présenter l’institut</div>
        <p className="clixa-annonce__bilan">
          <strong>{r.envoyes ?? 0}</strong> présentation(s) envoyée(s).
        </p>
        {(r.manques?.length ?? 0) > 0 && (
          <p className="clixa-annonce__refus">
            {r.manques!.length} envoi(s) manqué(s) : {r.manques!.join(", ")}.
          </p>
        )}
        <button
          type="button"
          className="btn btn--size-small btn--style-secondary"
          onClick={() => {
            setListe("");
            setEtat({ quoi: "saisie" });
          }}
        >
          Envoyer à une autre liste
        </button>
      </div>
    );
  }

  if (etat.quoi === "vu") {
    const r = etat.reponse;
    return (
      <div className="clixa-annonce">
        <div className="clixa-annonce__tete">Présenter l’institut</div>
        <p className="clixa-annonce__texte">
          Objet : <strong>{r.objet}</strong>
          {r.rentree ? ` · rentrée annoncée : ${r.rentree}` : ""}
        </p>
        <p className="clixa-annonce__texte">
          <strong>{r.destinataires?.length ?? 0}</strong> adresse(s) lue(s)
          {(r.enTrop ?? 0) > 0 ? ` — ${r.enTrop} au-delà du lot, à envoyer ensuite` : ""} :
        </p>
        <ul className="clixa-annonce__adresses">
          {(r.destinataires ?? []).map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <div className="clixa-annonce__ligne">
          <button
            type="button"
            className={`btn btn--size-small ${etat.arme ? "btn--style-primary" : "btn--style-secondary"}`}
            onClick={() =>
              etat.arme ? void envoyer() : setEtat({ quoi: "vu", reponse: r, arme: true })
            }
          >
            {etat.arme ? "Confirmer l’envoi" : "Envoyer la présentation"}
          </button>
          <button
            type="button"
            className="btn btn--size-small btn--style-secondary"
            onClick={() => setEtat({ quoi: "saisie" })}
          >
            Corriger la liste
          </button>
        </div>
        {etat.arme && (
          <p className="clixa-annonce__avis">
            Des courriels partiront chez de vraies personnes. C’est irréversible.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="clixa-annonce">
      <div className="clixa-annonce__tete">Présenter l’institut</div>
      <p className="clixa-annonce__texte">
        Les douze parcours, le déroulé, le certificat et les tarifs — composés depuis le catalogue,
        jamais recopiés. Collez les adresses : virgules, points-virgules ou une par ligne, avec ou
        sans nom devant.
      </p>
      <textarea
        className="clixa-annonce__zone"
        rows={5}
        value={liste}
        placeholder={"aicha@exemple.ma\nKouamé N'Guessan <kouame@exemple.ci>\nfatou@exemple.sn"}
        onChange={(e) => setListe(e.target.value)}
      />
      <div className="clixa-annonce__ligne">
        <button
          type="button"
          className="btn btn--size-small btn--style-secondary"
          disabled={liste.trim() === ""}
          onClick={() => void regarder()}
        >
          Relire la liste avant d’envoyer
        </button>
      </div>
      {etat.quoi === "erreur" && <p className="clixa-annonce__refus">{etat.dit}</p>}
    </div>
  );
}
