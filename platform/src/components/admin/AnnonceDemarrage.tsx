"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SuiviDUneNature } from "@/lib/suivi-courriel";
import { IconeBouton } from "./IconeBouton";
import { SuiviDesEnvois } from "./SuiviDesEnvois";

/**
 * Annoncer le démarrage — à des listes choisies, jamais à tout le monde.
 *
 * ── ⚠️ Pourquoi des listes, et non un envoi à tous ─────────────────────────
 * Décision de la direction, le 23 septembre 2026 : « maymchex l msg 3and nass
 * kamlin li dayriin inscription […] brina hna nsstahdfo nass li barin ».
 *
 * Le premier jet envoyait à tout le monde par lots. Sur cent vingt-six
 * dossiers c'est cent vingt-six messages, pour un plafond Resend de cent par
 * jour **partagé avec le tunnel** — trois jours de quota dépensés d'un coup,
 * dont l'essentiel à des dossiers dont on sait déjà qu'ils ne bougeront pas.
 *
 * ── ⚠️ Trois temps, et le premier n'est pas de la politesse ────────────────
 * **Regarder** montre les listes et leurs effectifs ; **cocher** choisit ;
 * **armer** puis envoyer. Qui n'a jamais vu la répartition croira écrire cent
 * vingt-six relances de paiement — alors que dix seulement peuvent régler.
 */
interface Apercu {
  reference: string;
  nom: string;
  clef: string;
  objet: string;
}

interface Reponse {
  essai: boolean;
  lot: number;
  apercu?: Apercu[];
  parListe?: Record<string, number>;
  envoyes?: number;
  partis?: string[];
  manques: string[];
  ignores: string[];
  restants: number;
  erreur?: string;
}

/**
 * Ce que chaque liste veut dire, en clair — jamais la clef brute à l'écran.
 *
 * ⚠️ L'ordre est celui du tunnel : on lit du plus loin au plus près de
 * l'argent. Et « chez nous » porte son intitulé à la première personne parce
 * que c'est **nous** qui devons agir : le mettre au même rang que les autres
 * ferait croire qu'on attend quelque chose du participant.
 */
const LISTES: { clef: string; libelle: string; note?: string }[] = [
  { clef: "a-demander", libelle: "N'ont pas encore demandé leur contrat" },
  { clef: "a-signer", libelle: "Ont demandé leur contrat, ne l'ont pas signé" },
  {
    clef: "chez-nous",
    libelle: "Ont signé — c'est à nous d'envoyer de quoi régler",
    note: "Le message ne leur demande rien.",
  },
  {
    clef: "a-regler",
    libelle: "Ont reçu de quoi régler, n'ont rien versé",
    note: "Les seuls à qui le message parle d'argent.",
  },
  { clef: "echeance-suivante", libelle: "Ont versé, il reste une échéance" },
  { clef: "en-verification", libelle: "Ont annoncé un transfert, nous le vérifions" },
  { clef: "en-regle", libelle: "Sont à jour" },
];

type Etat =
  | { quoi: "repos" }
  | { quoi: "occupe" }
  | { quoi: "vu"; reponse: Reponse; arme: boolean }
  | { quoi: "parti"; reponse: Reponse }
  | { quoi: "erreur"; dit: string };

export function AnnonceDemarrage({ suivi }: { suivi?: SuiviDUneNature }) {
  const [etat, setEtat] = useState<Etat>({ quoi: "repos" });
  const [choisies, setChoisies] = useState<string[]>([]);
  const router = useRouter();

  /* Voir `PresenterInstitut` : les chiffres se redemandent après un envoi. */
  const suiviEnPied = (
    <SuiviDesEnvois nature="demarrage" suivi={suivi} titre="Qui a reçu l’annonce" />
  );

  const appeler = async (corps: Record<string, unknown>): Promise<Reponse | null> => {
    try {
      const r = await fetch("/api/admin/annoncer-demarrage", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
        body: JSON.stringify(corps),
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
    const rep = await appeler({ essai: true });
    if (rep) setEtat({ quoi: "vu", reponse: rep, arme: false });
  };

  const envoyer = async () => {
    setEtat({ quoi: "occupe" });
    const rep = await appeler({ clefs: choisies });
    if (rep) {
      setEtat({ quoi: "parti", reponse: rep });
      router.refresh();
    }
  };

  if (etat.quoi === "occupe") {
    return (
      <section className="clixa-envoi">
        <header className="clixa-envoi__tete">
          <span className="clixa-envoi__titre">Annonce de démarrage</span>
        </header>
        <p className="clixa-envoi__texte clixa-envoi__texte--attente">En cours…</p>
        {suiviEnPied}
      </section>
    );
  }

  if (etat.quoi === "parti") {
    const r = etat.reponse;
    return (
      <section className="clixa-envoi">
        <header className="clixa-envoi__tete">
          <span className="clixa-envoi__titre">Annonce de démarrage</span>
        </header>
        <p className="clixa-envoi__bilan">
          <strong>{r.envoyes ?? 0}</strong> message(s) parti(s). Il reste{" "}
          <strong>{r.restants}</strong> dossier(s) sans annonce, toutes listes confondues.
        </p>
        {(r.manques?.length ?? 0) > 0 && (
          <p className="clixa-envoi__refus">
            {r.manques.length} envoi(s) manqué(s) : {r.manques.join(", ")}. Ils n’ont pas de trace
            et repartiront au prochain envoi.
          </p>
        )}
        <div className="clixa-envoi__ligne">
          <button
            type="button"
            className="clixa-bouton clixa-bouton--secondaire"
            onClick={() => {
              setChoisies([]);
              void regarder();
            }}
          >
            <IconeBouton nom="recommencer" />
            Revoir les listes
          </button>
        </div>
        {suiviEnPied}
      </section>
    );
  }

  if (etat.quoi === "vu") {
    const r = etat.reponse;
    const parListe = r.parListe ?? {};
    const presentes = LISTES.filter((l) => (parListe[l.clef] ?? 0) > 0);
    const total = choisies.reduce((n, c) => n + (parListe[c] ?? 0), 0);
    const partiront = Math.min(total, r.lot);

    if (presentes.length === 0) {
      return (
        <section className="clixa-envoi">
          <header className="clixa-envoi__tete">
            <span className="clixa-envoi__titre">Annonce de démarrage</span>
          </header>
          <p className="clixa-envoi__bilan">Tout le monde a déjà été prévenu.</p>
          {suiviEnPied}
        </section>
      );
    }

    return (
      <section className="clixa-envoi">
        <header className="clixa-envoi__tete">
          <span className="clixa-envoi__titre">Annonce de démarrage</span>
          <span className="clixa-envoi__compte">{r.restants} sans annonce</span>
        </header>

        <p className="clixa-envoi__texte">
          Cochez les listes à prévenir. Le message dit à chacun ce qui le concerne — et ne parle
          d’argent qu’à ceux qui peuvent régler.
        </p>

        <ul className="clixa-envoi__listes">
          {presentes.map((l) => {
            const n = parListe[l.clef] ?? 0;
            const coche = choisies.includes(l.clef);
            return (
              <li key={l.clef}>
                {/*
                  ⚠️ L'espace avant « --coche » n'est pas décoratif. Sans lui, la
                  liste cochée portait une seule classe inexistante,
                  « clixa-envoi__listeclixa-envoi__liste--coche », et perdait
                  tout son dessin au moment même où on la choisit — vu à
                  l'écran le 26 septembre 2026. Le même défaut que la première
                  barre des domaines, le même jour.
                */}
                <label className={`clixa-envoi__liste ${coche ? "clixa-envoi__liste--coche" : ""}`}>
                  <input
                    type="checkbox"
                    checked={coche}
                    onChange={() =>
                      setChoisies((c) =>
                        c.includes(l.clef) ? c.filter((x) => x !== l.clef) : [...c, l.clef],
                      )
                    }
                  />
                  <span className="clixa-envoi__nombre">{n}</span>
                  <span className="clixa-envoi__libelle">
                    {l.libelle}
                    {l.note && <em className="clixa-envoi__note">{l.note}</em>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="clixa-envoi__ligne">
          <button
            type="button"
            className={`clixa-bouton ${etat.arme ? "clixa-bouton--principal" : "clixa-bouton--envoi"}`}
            disabled={choisies.length === 0}
            onClick={() =>
              etat.arme ? void envoyer() : setEtat({ quoi: "vu", reponse: r, arme: true })
            }
          >
            <IconeBouton nom="envoyer" />
            {etat.arme
              ? `Confirmer — ${partiront} message(s)`
              : choisies.length === 0
                ? "Cochez une liste"
                : `Envoyer à ${partiront} personne(s)`}
          </button>
          {total > r.lot && !etat.arme && (
            <span className="clixa-envoi__avis">
              {total} sélectionné(s), {r.lot} par envoi — le reste demain, pour ne pas épuiser le
              quota du jour.
            </span>
          )}
          {etat.arme && (
            <span className="clixa-envoi__avis clixa-envoi__avis--fort">
              Des courriels partiront chez de vraies personnes. C’est irréversible.
            </span>
          )}
        </div>
        {suiviEnPied}
      </section>
    );
  }

  return (
    <section className="clixa-envoi">
      <header className="clixa-envoi__tete">
        <span className="clixa-envoi__titre">Annonce de démarrage</span>
      </header>
      <p className="clixa-envoi__texte">
        Prévenir des inscrits que leur parcours commence, et dire à chacun ce qu’il lui reste à
        faire. Vous choisissez les listes ; rien ne part avant.
      </p>
      <div className="clixa-envoi__ligne">
        <button
          type="button"
          className="clixa-bouton clixa-bouton--secondaire"
          onClick={() => void regarder()}
        >
          <IconeBouton nom="listes" />
          Voir les listes
        </button>
      </div>
      {etat.quoi === "erreur" && <p className="clixa-envoi__refus">{etat.dit}</p>}
      {suiviEnPied}
    </section>
  );
}
