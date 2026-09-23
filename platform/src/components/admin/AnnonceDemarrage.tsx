"use client";

import { useState } from "react";

/**
 * Envoyer l'annonce de démarrage, par lots, depuis le tableau de bord.
 *
 * ── ⚠️ Deux temps, et ce n'est pas de la politesse ─────────────────────────
 * Les quatre boutons de la fiche d'un dossier envoient **un** courriel à
 * **une** personne. Celui-ci en envoie quarante d'un coup, et un courriel
 * parti ne se rattrape pas. Le geste est donc en trois mouvements :
 *
 *  1. **regarder** — la route rend, sans rien envoyer, combien de dossiers
 *     attendent et ce que chacun lira ;
 *  2. **armer** — le bouton change de couleur et d'intitulé ;
 *  3. **envoyer** — le lot part, et l'écran dit ce qui est parti.
 *
 * Le premier temps n'est pas décoratif : sur cent seize dossiers, dix
 * seulement s'entendent réclamer un versement. Qui n'a jamais vu la
 * répartition croira envoyer cent seize relances de paiement.
 */
type Clef = string;

interface Apercu {
  reference: string;
  nom: string;
  clef: Clef;
  objet: string;
}

interface Reponse {
  essai: boolean;
  lot: number;
  apercu?: Apercu[];
  envoyes?: number;
  partis?: string[];
  manques: string[];
  ignores: string[];
  restants: number;
  erreur?: string;
}

/** Ce que chaque état veut dire, en clair — jamais la clef brute à l'écran. */
const EN_CLAIR: Record<string, string> = {
  "a-demander": "n'a pas encore demandé son contrat",
  "a-signer": "doit signer son contrat",
  "chez-nous": "a signé — c'est à nous d'envoyer de quoi régler",
  "a-regler": "doit effectuer son versement",
  "en-verification": "a annoncé un transfert, nous le vérifions",
  "echeance-suivante": "a une échéance suivante",
  "en-regle": "est à jour",
};

type Etat =
  | { quoi: "repos" }
  | { quoi: "occupe" }
  | { quoi: "vu"; reponse: Reponse; arme: boolean }
  | { quoi: "parti"; reponse: Reponse }
  | { quoi: "erreur"; dit: string };

export function AnnonceDemarrage() {
  const [etat, setEtat] = useState<Etat>({ quoi: "repos" });

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
        /*
          ⚠️ On montre ce que dit la route, mot pour mot. « Une erreur est
          survenue » ferait recliquer sans rien apprendre — et recliquer, ici,
          c'est peut-être envoyer quarante courriels.
        */
        setEtat({ quoi: "erreur", dit: rep.erreur ?? `Refus (${r.status}).` });
        return null;
      }
      return rep;
    } catch {
      setEtat({ quoi: "erreur", dit: "Le serveur n'a pas répondu. Rien n'a été envoyé." });
      return null;
    }
  };

  const regarder = async () => {
    setEtat({ quoi: "occupe" });
    const rep = await appeler({ essai: true, lot: 60 });
    if (rep) setEtat({ quoi: "vu", reponse: rep, arme: false });
  };

  const envoyer = async () => {
    setEtat({ quoi: "occupe" });
    const rep = await appeler({});
    if (rep) setEtat({ quoi: "parti", reponse: rep });
  };

  if (etat.quoi === "repos" || etat.quoi === "erreur") {
    return (
      <div className="clixa-annonce">
        <div className="clixa-annonce__tete">Annonce de démarrage</div>
        <p className="clixa-annonce__texte">
          Prévenir les inscrits que leur parcours commence, et dire à chacun ce qu’il lui reste à
          faire. Rien ne part avant que vous ayez regardé.
        </p>
        <button
          type="button"
          className="btn btn--size-small btn--style-secondary"
          onClick={() => void regarder()}
        >
          Voir à qui l’annonce partirait
        </button>
        {etat.quoi === "erreur" && <p className="clixa-annonce__refus">{etat.dit}</p>}
      </div>
    );
  }

  if (etat.quoi === "occupe") {
    return (
      <div className="clixa-annonce">
        <div className="clixa-annonce__tete">Annonce de démarrage</div>
        <p className="clixa-annonce__texte">En cours…</p>
      </div>
    );
  }

  if (etat.quoi === "parti") {
    const r = etat.reponse;
    return (
      <div className="clixa-annonce">
        <div className="clixa-annonce__tete">Annonce de démarrage</div>
        <p className="clixa-annonce__bilan">
          <strong>{r.envoyes ?? 0}</strong> message(s) parti(s).
          {r.restants > 0
            ? ` Il en reste ${r.restants} — relancez l'envoi demain, pour ne pas épuiser le quota du jour.`
            : " Tout le monde a été prévenu."}
        </p>
        {r.manques.length > 0 && (
          <p className="clixa-annonce__refus">
            {r.manques.length} envoi(s) manqué(s) : {r.manques.join(", ")}. Ils n’ont pas de trace
            et repartiront au prochain lot.
          </p>
        )}
        {r.restants > 0 && (
          <button
            type="button"
            className="btn btn--size-small btn--style-secondary"
            onClick={() => void regarder()}
          >
            Revoir ce qu’il reste
          </button>
        )}
      </div>
    );
  }

  // etat.quoi === "vu"
  const r = etat.reponse;
  const parClef = new Map<string, number>();
  for (const a of r.apercu ?? []) parClef.set(a.clef, (parClef.get(a.clef) ?? 0) + 1);

  if (r.restants === 0) {
    return (
      <div className="clixa-annonce">
        <div className="clixa-annonce__tete">Annonce de démarrage</div>
        <p className="clixa-annonce__bilan">Tout le monde a déjà été prévenu.</p>
      </div>
    );
  }

  return (
    <div className="clixa-annonce">
      <div className="clixa-annonce__tete">Annonce de démarrage</div>
      <p className="clixa-annonce__texte">
        <strong>{r.restants}</strong> dossier(s) n’ont pas encore reçu l’annonce. Voici ce que les{" "}
        {r.apercu?.length ?? 0} premiers liraient :
      </p>
      <ul className="clixa-annonce__liste">
        {[...parClef.entries()].map(([clef, n]) => (
          <li key={clef}>
            <span className="clixa-annonce__nombre">{n}</span> {EN_CLAIR[clef] ?? clef}
          </li>
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
          {etat.arme ? "Confirmer l'envoi" : `Envoyer le prochain lot`}
        </button>
        {etat.arme && (
          <span className="clixa-annonce__avis">
            Des courriels partiront chez de vraies personnes. C’est irréversible.
          </span>
        )}
      </div>
    </div>
  );
}
