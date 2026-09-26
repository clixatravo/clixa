"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SuiviDUneNature } from "@/lib/suivi-courriel";
import { IconeBouton } from "./IconeBouton";
import { SuiviDesEnvois } from "./SuiviDesEnvois";

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
  /** Les adresses au-delà du lot — elles ne sont pas parties. */
  suite?: string[];
  erreur?: string;
}

type Etat =
  | { quoi: "saisie" }
  | { quoi: "occupe" }
  | { quoi: "vu"; reponse: Reponse; arme: boolean }
  | { quoi: "parti"; reponse: Reponse }
  | { quoi: "erreur"; dit: string };

export function PresenterInstitut({ suivi }: { suivi?: SuiviDUneNature }) {
  const [liste, setListe] = useState("");
  const [etat, setEtat] = useState<Etat>({ quoi: "saisie" });
  const router = useRouter();

  /*
    « Qui l'a reçue » est compté par le tableau de bord, côté serveur. Après un
    envoi, on lui redemande ses chiffres : sans cela l'encart afficherait ceux
    d'avant, juste sous le bilan qui annonce les nouveaux.
  */
  const suiviEnPied = (
    <SuiviDesEnvois nature="presentation" suivi={suivi} titre="Qui a reçu la présentation" />
  );

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
    if (rep) {
      setEtat({ quoi: "parti", reponse: rep });
      router.refresh();
    }
  };

  if (etat.quoi === "occupe") {
    return (
      <div className="clixa-envoi">
        <header className="clixa-envoi__tete">
          <span className="clixa-envoi__titre">Présenter l’institut</span>
        </header>
        <p className="clixa-envoi__texte clixa-envoi__texte--attente">En cours…</p>
        {suiviEnPied}
      </div>
    );
  }

  if (etat.quoi === "parti") {
    const r = etat.reponse;
    const suite = r.suite ?? [];
    return (
      <div className="clixa-envoi">
        <header className="clixa-envoi__tete">
          <span className="clixa-envoi__titre">Présenter l’institut</span>
        </header>
        <p className="clixa-envoi__bilan">
          <strong>{r.envoyes ?? 0}</strong> présentation(s) envoyée(s).
        </p>
        {(r.manques?.length ?? 0) > 0 && (
          <p className="clixa-envoi__refus">
            {r.manques!.length} envoi(s) manqué(s) : {r.manques!.join(", ")}.
          </p>
        )}
        {suite.length > 0 && (
          <p className="clixa-envoi__alerte">
            <strong>{suite.length}</strong> adresse(s) au-delà du lot ne sont <strong>pas</strong>{" "}
            parties. Elles sont gardées ci-dessous : envoyez-les un autre jour si le quota quotidien
            de Resend est entamé.
          </p>
        )}
        <div className="clixa-envoi__ligne">
          {suite.length > 0 && (
            <button
              type="button"
              className="clixa-bouton clixa-bouton--envoi"
              onClick={() => {
                setListe(suite.join("\n"));
                setEtat({ quoi: "saisie" });
              }}
            >
              <IconeBouton nom="suite" />
              Préparer les {suite.length} suivante(s)
            </button>
          )}
          <button
            type="button"
            className="clixa-bouton clixa-bouton--secondaire"
            onClick={() => {
              setListe("");
              setEtat({ quoi: "saisie" });
            }}
          >
            <IconeBouton nom="recommencer" />
            Envoyer à une autre liste
          </button>
        </div>
        {suiviEnPied}
      </div>
    );
  }

  if (etat.quoi === "vu") {
    const r = etat.reponse;
    return (
      <div className="clixa-envoi">
        <header className="clixa-envoi__tete">
          <span className="clixa-envoi__titre">Présenter l’institut</span>
        </header>
        <p className="clixa-envoi__texte">
          Objet : <strong>{r.objet}</strong>
          {r.rentree ? ` · rentrée annoncée : ${r.rentree}` : ""}
        </p>
        <p className="clixa-envoi__texte">
          <strong>{r.destinataires?.length ?? 0}</strong> adresse(s) lue(s)
          {(r.enTrop ?? 0) > 0 ? ` — ${r.enTrop} au-delà du lot, à envoyer ensuite` : ""} :
        </p>
        <ul className="clixa-envoi__adresses">
          {(r.destinataires ?? []).map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <div className="clixa-envoi__ligne">
          <button
            type="button"
            className={`clixa-bouton ${etat.arme ? "clixa-bouton--principal" : "clixa-bouton--envoi"}`}
            onClick={() =>
              etat.arme ? void envoyer() : setEtat({ quoi: "vu", reponse: r, arme: true })
            }
          >
            <IconeBouton nom="envoyer" />
            {etat.arme
              ? `Confirmer — ${r.destinataires?.length ?? 0} envoi(s)`
              : "Envoyer la présentation"}
          </button>
          <button
            type="button"
            className="clixa-bouton clixa-bouton--discret"
            onClick={() => setEtat({ quoi: "saisie" })}
          >
            <IconeBouton nom="corriger" />
            Corriger la liste
          </button>
        </div>
        {etat.arme && (
          <p className="clixa-envoi__avis clixa-envoi__avis--fort">
            Des courriels partiront chez de vraies personnes. C’est irréversible.
          </p>
        )}
        {suiviEnPied}
      </div>
    );
  }

  return (
    <div className="clixa-envoi">
      <header className="clixa-envoi__tete">
        <span className="clixa-envoi__titre">Présenter l’institut</span>
      </header>
      <p className="clixa-envoi__texte">
        Les douze parcours, le déroulé, le certificat et les tarifs — composés depuis le catalogue,
        jamais recopiés. Collez les adresses : virgules, points-virgules ou une par ligne, avec ou
        sans nom devant.
      </p>
      <textarea
        className="clixa-envoi__zone"
        rows={5}
        value={liste}
        placeholder={"aicha@exemple.ma\nKouamé N'Guessan <kouame@exemple.ci>\nfatou@exemple.sn"}
        onChange={(e) => setListe(e.target.value)}
      />
      <div className="clixa-envoi__ligne">
        <button
          type="button"
          className="clixa-bouton clixa-bouton--secondaire"
          disabled={liste.trim() === ""}
          onClick={() => void regarder()}
        >
          <IconeBouton nom="relire" />
          Relire la liste avant d’envoyer
        </button>
      </div>
      {etat.quoi === "erreur" && <p className="clixa-envoi__refus">{etat.dit}</p>}
      {suiviEnPied}
    </div>
  );
}
