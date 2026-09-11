"use client";

import React from "react";
import { useAllFormFields, useAuth, useDocumentInfo, useField, useForm } from "@payloadcms/ui";
import { reduceFieldsToValues } from "payload/shared";
import { useRouter } from "next/navigation";
import { dernierSuivi, type Echange, type NatureEchange } from "@/lib/suivi";
import { JOURS_DE_BATTEMENT } from "@/lib/places";

/**
 * Les trois temps du dossier, dans l'ordre, sur une seule ligne.
 *
 * ── Ce que ce composant remplace ────────────────────────────────────────────
 * Deux boutons posés l'un sous l'autre au milieu d'une vingtaine de champs.
 * Chacun disait ce qu'il faisait ; aucun ne disait **où l'on en est**, ni
 * lequel venait après. Dans une journée où l'on ouvre vingt dossiers, c'est
 * cette question-là qu'on se pose en premier — et y répondre demandait de lire
 * trois dates éparpillées.
 *
 * ⚠️ Une seule action est offerte à la fois, celle du moment. Les gestes ne
 * sont pas interchangeables et leur ordre porte du sens : on relit le contrat
 * avant d'appeler quelqu'un à payer. Afficher les boutons côte à côte invitait
 * à sauter la lecture.
 *
 * ── ⚠️ La quatrième étape manquait, et c'était la seule qui compte ──────────
 * Le fil s'arrêtait sur « Le dossier attend maintenant le versement », sans
 * rien à cliquer. L'argent arrivait, et il fallait ouvrir l'échéancier, plier
 * la bonne ligne, changer un menu, poser une date, enregistrer — cinq gestes,
 * exactement ce qui a fait ajouter les deux boutons précédents. Signalé par la
 * direction le 7 septembre 2026 : « quand le client paie, il n'y a aucun
 * bouton pour lui dire qu'il a payé et que sa place est garantie ».
 *
 * Le bouton fait donc les deux : il marque l'échéance réglée **et** le
 * participant en est prévenu — le crochet d'`Inscriptions` s'en charge, comme
 * pour le contrat vérifié. Un geste d'équipe dont le participant n'apprend
 * rien est la moitié d'un geste.
 */

type Etat = "faite" | "courante" | "attente";

/*
  ── L'or pour ce qui appelle, le vert pour ce qui est fait ──────────────────
  ⚠️ `--theme-success-*` n'est pas l'accent de la marque. Chez Payload il veut
  dire « réussi » — bandeaux « enregistré », pastilles d'état. L'employer pour
  l'étape *en cours* dirait « c'est fait » là où l'interface veut dire « c'est
  ici qu'il faut agir ». L'or de la maison porte l'appel ; le vert ne signe que
  l'accompli.
*/
const OR = "#c9a24c";
const OR_CLAIR = "#e9cd84";
const FAIT = "#2fa37d";

/** Le rail qui relie les pastilles : sans lui, ce sont trois lignes, pas un fil. */
const RAIL = 11; // moitié de la pastille, pour tomber en son centre

function Puce({ etat, rang }: { etat: Etat; rang: number }) {
  const style: React.CSSProperties =
    etat === "faite"
      ? { background: FAIT, color: "#08130f", border: "none" }
      : etat === "courante"
        ? { background: OR, color: "#1a1206", border: "none", boxShadow: `0 0 0 3px ${OR}33` }
        : {
            background: "var(--theme-elevation-0)",
            color: "var(--theme-elevation-400)",
            border: "1px solid var(--theme-elevation-200)",
          };

  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        zIndex: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: RAIL * 2,
        height: RAIL * 2,
        borderRadius: "50%",
        fontSize: "0.7rem",
        fontWeight: 700,
        flexShrink: 0,
        ...style,
      }}
    >
      {etat === "faite" ? "\u2713" : rang}
    </span>
  );
}

function Etape({
  rang,
  titre,
  detail,
  etat,
  dernier,
}: {
  rang: number;
  titre: string;
  detail?: string;
  etat: Etat;
  dernier?: boolean;
}) {
  return (
    <li style={{ position: "relative", display: "flex", gap: 12, paddingBottom: dernier ? 0 : 18 }}>
      {/* Le rail descend derrière les pastilles, jamais sous la dernière. */}
      {!dernier && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: RAIL - 1,
            top: RAIL * 2,
            bottom: 0,
            width: 2,
            background: etat === "faite" ? FAIT : "var(--theme-elevation-150)",
          }}
        />
      )}

      <Puce etat={etat} rang={rang} />

      <span style={{ lineHeight: 1.45, paddingTop: 1 }}>
        <span
          style={{
            display: "block",
            fontSize: "0.9rem",
            fontWeight: etat === "courante" ? 700 : 500,
            color:
              etat === "attente"
                ? "var(--theme-elevation-400)"
                : etat === "courante"
                  ? OR_CLAIR
                  : "var(--theme-elevation-800)",
          }}
        >
          {titre}
        </span>
        {detail && (
          <span
            style={{
              display: "block",
              fontSize: "0.78rem",
              color: "var(--theme-elevation-500)",
              marginTop: 1,
            }}
          >
            {detail}
          </span>
        )}
      </span>
    </li>
  );
}

/*
  Les mêmes mots que la colonne de la liste et que le menu du champ. Trois
  écritures d'un même libellé finissent par se contredire — c'est ce qui est
  arrivé au numéro d'admissions et aux moyens de paiement.
*/
const OBJETS: Record<string, string> = {
  signature: "Relance signature",
  paiement: "Relance paiement",
  rappel: "Rappel par courriel",
  appel: "Appelé",
};

/**
 * « vous » ou « un collègue » — jamais un nom, qu'on n'a pas ici.
 *
 * ⚠️ La relation arrive sous deux formes selon la porte : l'identifiant seul
 * depuis l'état du formulaire, l'objet entier depuis l'API avec `depth`.
 * Comparer sans les réduire rendrait « [object Object] » à côté de son propre
 * nom, c'est-à-dire « un collègue » pour soi-même — l'inverse de ce qu'on
 * cherche à savoir.
 */
function auteur(par: Echange["par"], moi: number | string | undefined): string {
  const id = par && typeof par === "object" ? par.id : par;
  if (id === undefined || id === null || moi === undefined) return "";
  return String(id) === String(moi) ? "vous" : "un collègue";
}

const JOUR = (v: string) =>
  new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

/**
 * Les trois portes qui agissent hors du formulaire.
 *
 * ⚠️ Elles ne se confondent pas avec les deux boutons qui notent un appel : ces
 * derniers écrivent une ligne dans le journal et rien de plus. Celles-ci font
 * partir un courriel chez le participant, ou rendent sa place — des gestes
 * qu'on ne rattrape pas, d'où l'armement en deux temps.
 */
type Porte = "signature" | "paiement" | "place";

type EtatPorte =
  | { etat: "pret" | "arme" | "envoi" }
  | { etat: "fait"; dit: string }
  | { etat: "erreur"; dit: string };

interface Reponse {
  erreur?: string;
  jours?: number;
  quoi?: string;
  montant?: number;
  enRetard?: boolean;
  reference?: string;
}

/**
 * Le bouton en deux temps : armer, puis confirmer.
 *
 * ⚠️ Un clic de trop ici n'est pas une case cochée de travers — c'est un
 * message chez le participant, ou une place rendue. L'armement coûte un geste
 * et évite ce qu'on ne peut pas défaire.
 */
function BoutonAgir({
  etat,
  libelle,
  confirmation,
  avis,
  note,
  onArmer,
  onAgir,
}: {
  etat: EtatPorte;
  libelle: string;
  confirmation: string;
  avis: string;
  /** Un fait, jamais un calcul sur l'heure courante — voir plus bas. */
  note?: string;
  onArmer: () => void;
  onAgir: () => void;
}) {
  /*
    ── ⚠️ Une rangée par action, et non des boutons côte à côte ──────────────
    Le premier jet les alignait tous dans une même bande, chacun laissant
    tomber son message à côté de lui. Deux actions armées donnaient
    « Confirmer l'envoi · Un courriel partira… · Rendre la place au
    catalogue » sur une seule ligne : on ne savait plus quel avertissement
    portait sur quel bouton — devant un geste qu'on ne rattrape pas.

    Chaque action tient donc sa rangée, avec ce qui la concerne dessous.
  */
  if (etat.etat === "fait") {
    return (
      <div className="clixa-agir clixa-agir--fait">
        <span aria-hidden="true" className="clixa-agir__coche">
          ✓
        </span>
        <p className="clixa-relances__parti">{etat.dit}</p>
      </div>
    );
  }

  const arme = etat.etat === "arme";

  return (
    <div className={`clixa-agir${arme ? "clixa-agir--arme" : ""}`}>
      <div className="clixa-agir__ligne">
        <button
          type="button"
          className={`btn btn--size-small clixa-relances__bouton ${
            arme ? "btn--style-primary" : "btn--style-secondary"
          }`}
          disabled={etat.etat === "envoi"}
          onClick={() => (arme ? onAgir() : onArmer())}
        >
          {etat.etat === "envoi" ? "En cours…" : arme ? confirmation : libelle}
        </button>
        {arme && <span className="clixa-relances__avis">{avis}</span>}
      </div>
      {note && <p className="clixa-agir__note">{note}</p>}
      {etat.etat === "erreur" && <p className="clixa-relances__refus">{etat.dit}</p>}
    </div>
  );
}

export function EtapesContrat() {
  const { id } = useDocumentInfo();
  const { submit } = useForm();
  const signe = useField<string>({ path: "contratSigneLe" });
  const verifie = useField<string>({ path: "contratVerifieLe" });
  const envoye = useField<string>({ path: "coordonneesEnvoyeesLe" });
  const reference = useField<string>({ path: "reference" });
  /*
    ⚠️ Lu depuis le formulaire, pas recalculé : c'est cette date que la route
    lit pour décider si la place peut être rendue. Deux lectures d'un même fait
    finiraient par ne plus dire le même jour, et celle de l'écran serait la
    fausse.
  */
  const rappeleeLe = useField<string>({ path: "placeRappeleeLe" });

  /*
    ⚠️ Qui appelle est la moitié de la réponse. « Ce dossier a été appelé hier »
    ne suffit pas à un collègue : il a besoin de savoir si c'était lui. La
    relation est posée depuis la session, jamais choisie dans une liste — un
    champ qu'on remplit à la main finit rempli de travers.
  */
  const { user } = useAuth();
  const router = useRouter();

  /*
    ⚠️ **L'échéancier se lit en entier, pas ligne par ligne.** Un tableau ne
    s'atteint pas par `useField` : ses lignes vivent en champs séparés
    (`echeances.0.statut`…), et leur nombre change. `reduceFieldsToValues` rend
    l'objet tel que le formulaire l'enverrait — édits non enregistrés compris,
    ce qui évite d'écraser ce que quelqu'un vient de saisir juste au-dessus.
  */
  /*
    ⚠️ Deux temps avant d'envoyer. Les autres boutons de ce bloc notent ce qui
    s'est dit au téléphone ; celui-ci fait **partir un courriel** chez le
    participant. Un clic de trop y est donc d'une autre nature — d'où l'armement,
    qui coûte un geste et évite un message qu'on ne rattrape pas.
  */
  const [portes, setPortes] = React.useState<Record<Porte, EtatPorte>>({
    signature: { etat: "pret" },
    paiement: { etat: "pret" },
    place: { etat: "pret" },
  });

  const [champs] = useAllFormFields();
  const donnees = reduceFieldsToValues(champs, true) as {
    echeances?: unknown;
    echanges?: unknown;
  };

  /*
    ⚠️ **Un champ `array` vide ne rend pas `[]` ici, mais `0`.**
    `reduceFieldsToValues` rend le *nombre* de lignes quand il n'y en a aucune,
    et `?? []` ne rattrape que `null`/`undefined` — pas un zéro. Le `.filter`
    du journal a fait tomber la fiche entière, sur tout dossier qu'on n'avait
    jamais appelé, c'est-à-dire tous.

    `echeances` portait le même piège depuis toujours : il ne s'est jamais
    déclenché parce qu'un dossier a toujours au moins une échéance. Les deux
    passent désormais par la même porte, plutôt que d'attendre le jour où un
    échéancier sera vide.
  */
  const lignesDe = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const echeances = lignesDe<{ montant?: number; statut?: string; regleLe?: string | null }>(
    donnees.echeances,
  );
  const echanges = lignesDe<Echange>(donnees.echanges);
  const rangDue = echeances.findIndex((e) => e?.statut !== "regle");
  const due = rangDue >= 0 ? echeances[rangDue] : undefined;
  const annonce = due?.statut === "annonce";
  const toutRegle = echeances.length > 0 && rangDue < 0;

  if (!id) return null;

  const aSigne = Boolean(signe.value);
  const aVerifie = Boolean(verifie.value);
  const aEnvoye = Boolean(envoye.value);

  const etat = (faite: boolean, courante: boolean): Etat =>
    faite ? "faite" : courante ? "courante" : "attente";

  /*
    ── La date part dans la soumission, pas seulement dans l'état ────────────
    ⚠️ `setValue` puis `submit()` dans la même foulée ne marche pas : `setValue`
    passe par l'état de React, qui n'est pas propagé au moment où l'on soumet.
    L'enregistrement partait donc **sans la date** — la requête réussissait, la
    page se rechargeait, et il ne s'était rien passé. Aucune erreur nulle part :
    le champ restait vide, le courriel ne partait pas, et l'étape suivante ne
    s'ouvrait jamais. Observé en production le 30 août 2026.

    `overrides` porte la valeur directement dans le corps envoyé. On garde
    `setValue` pour que l'écran suive sans attendre la réponse.
  */
  const poser = (chemin: string, champ: ReturnType<typeof useField<string>>) => () => {
    const maintenant = new Date().toISOString();
    champ.setValue(maintenant);
    void submit({ overrides: { [chemin]: maintenant } });
  };

  /*
    ⚠️ **L'échéancier part en entier**, pas en chemins pointés. Les surcharges
    de `submit` sont fusionnées à plat dans le corps envoyé : `echeances.0.statut`
    y resterait une clef littérale, que rien ne lirait — l'enregistrement
    réussirait et il ne se serait rien passé, exactement le défaut du bouton
    « Contrat vérifié » du 30 août.

    ⚠️ On ne marque que **la première échéance non réglée**. Tout solder d'un
    clic ferait passer pour encaissé de l'argent qu'on n'a pas vu, sur un
    dossier en deux ou trois fois — et c'est le statut du dossier qui commande
    la place et les relances.
  */
  const encaisser = () => {
    if (rangDue < 0) return;
    const maintenant = new Date().toISOString();
    const suivantes = echeances.map((e, i) =>
      i === rangDue ? { ...e, statut: "regle", regleLe: maintenant } : e,
    );
    void submit({ overrides: { echeances: suivantes } });
  };

  /*
    ── ⚠️ Noter l'appel, sans rien envoyer à personne ────────────────────────
    Le journal s'écrit **en entier**, comme l'échéancier : les surcharges de
    `submit` sont fusionnées à plat, et `echanges.3.quoi` y resterait une clef
    littérale que rien ne lirait — l'enregistrement réussirait et il ne se
    serait rien passé, le défaut du bouton « Contrat vérifié » du 30 août.

    ⚠️ **On ajoute, on ne remplace pas.** Une case « dernier appel » aurait
    perdu combien de fois on a relancé, et c'est précisément ce qu'on veut
    savoir avant de composer un numéro pour la quatrième fois.

    ⚠️ **Aucun courriel ne part.** C'est la différence avec les quatre étapes
    au-dessus : celles-là annoncent au participant quelque chose qui le
    concerne, celle-ci note ce qui s'est dit au téléphone. Lui écrire « nous
    vous avons appelé » n'apprendrait rien à quelqu'un qui vient de raccrocher.
  */
  /*
    ── ⚠️ Une seule fonction pour les trois portes ────────────────────────────
    Chacune appelle une route qui envoie ou qui écrit ; ce qui les distingue
    tient à l'adresse et à la phrase de succès. Trois copies de ce bloc auraient
    fini par diverger sur ce qui compte : montrer **ce que dit la route**, mot
    pour mot, plutôt qu'« une erreur est survenue » — qui fait recliquer sans
    rien apprendre.
  */
  const declencher = async (porte: Porte, adresse: string, dire: (c: Reponse) => string) => {
    setPortes((p) => ({ ...p, [porte]: { etat: "envoi" } }));
    try {
      const r = await fetch(adresse, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
        body: JSON.stringify({ id }),
      });
      const corps = (await r.json()) as Reponse;
      if (!r.ok) {
        setPortes((p) => ({
          ...p,
          [porte]: { etat: "erreur", dit: corps.erreur ?? `Refus (${r.status}).` },
        }));
        return;
      }
      setPortes((p) => ({ ...p, [porte]: { etat: "fait", dit: dire(corps) } }));
      // Le journal, l'échéancier ou le statut viennent de changer : la fiche doit le montrer.
      router.refresh();
    } catch {
      setPortes((p) => ({
        ...p,
        [porte]: { etat: "erreur", dit: "Le serveur n'a pas répondu. Rien n'a été fait." },
      }));
    }
  };

  const noter = (quoi: NatureEchange) => () => {
    const ligne: Echange & { par?: number | string } = {
      quoi,
      le: new Date().toISOString(),
      ...(user?.id ? { par: user.id } : {}),
    };
    void submit({ overrides: { echanges: [...echanges, ligne] } });
  };

  const suivi = dernierSuivi(echanges, new Date());

  /*
    Un cadre plutôt qu'une liste nue. Ce bloc n'est pas un champ parmi vingt :
    c'est la réponse à la question qu'on se pose en ouvrant un dossier — où en
    est-il, et qu'est-ce qui m'attend. Il doit se distinguer du formulaire,
    sinon l'œil le traverse.
  */
  return (
    <div className="field-type" style={{ marginBottom: 4 }}>
      <div
        style={{
          border: "1px solid var(--theme-elevation-150)",
          borderRadius: 6,
          background: "var(--theme-elevation-50)",
          padding: "18px 20px",
          maxWidth: 760,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 18,
            paddingBottom: 12,
            borderBottom: "1px solid var(--theme-elevation-100)",
          }}
        >
          <span
            aria-hidden="true"
            style={{ width: 3, height: 13, background: OR, borderRadius: 2 }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.67rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--theme-elevation-600)",
            }}
          >
            Où en est ce dossier
          </span>
        </div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          <Etape
            rang={1}
            titre="Contrat signé"
            detail={signe.value ? `Le ${JOUR(signe.value)}` : "En attente du participant"}
            etat={etat(aSigne, false)}
          />
          <Etape
            rang={2}
            titre="Contrat vérifié"
            detail={
              verifie.value
                ? `Le ${JOUR(verifie.value)} — le participant en a été prévenu`
                : aSigne
                  ? "À relire, puis prévenir le participant"
                  : undefined
            }
            etat={etat(aVerifie, aSigne && !aVerifie)}
          />
          <Etape
            rang={3}
            titre="Instructions de paiement envoyées"
            detail={
              envoye.value
                ? `Le ${JOUR(envoye.value)} — le participant voit cette date`
                : aVerifie
                  ? "Envoyer le lien, le RIB ou les coordonnées, puis l'indiquer ici"
                  : undefined
            }
            etat={etat(aEnvoye, aVerifie && !aEnvoye)}
          />
          <Etape
            rang={4}
            titre={toutRegle ? "Formation intégralement réglée" : "Versement reçu"}
            detail={
              toutRegle
                ? "Sa place est acquise, et son attestation devient officielle"
                : annonce
                  ? "Il annonce un transfert : à vérifier sur le compte, puis à confirmer"
                  : aEnvoye
                    ? "À cliquer quand l'argent est sur le compte"
                    : undefined
            }
            etat={etat(toutRegle, aEnvoye && !toutRegle)}
            dernier
          />
        </ol>

        {/* Une seule action, celle du moment. */}
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid var(--theme-elevation-100)",
          }}
        >
          {!aSigne && (
            <p style={{ color: "var(--theme-elevation-500)", margin: 0, fontSize: "0.85rem" }}>
              Rien à faire tant que le participant n&apos;a pas signé.
            </p>
          )}

          {aSigne && !aVerifie && (
            <>
              {reference.value && (
                <p style={{ margin: "0 0 10px" }}>
                  <a
                    className="btn btn--style-secondary btn--size-small"
                    style={{ margin: 0 }}
                    href={`/inscription/${reference.value}/contrat`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Lire le contrat
                  </a>
                </p>
              )}
              <button
                type="button"
                className="btn btn--style-primary btn--size-small"
                style={{ margin: 0 }}
                onClick={poser("contratVerifieLe", verifie)}
              >
                Contrat vérifié — prévenir le participant
              </button>
            </>
          )}

          {aVerifie && !aEnvoye && (
            <>
              <button
                type="button"
                className="btn btn--style-primary btn--size-small"
                style={{ margin: 0 }}
                onClick={poser("coordonneesEnvoyeesLe", envoye)}
              >
                J&apos;ai envoyé les instructions de paiement
              </button>
              <p
                style={{
                  color: "var(--theme-elevation-500)",
                  fontSize: "0.8rem",
                  margin: "8px 0 0",
                  maxWidth: 460,
                }}
              >
                ⚠️ À cliquer <strong>après</strong> avoir envoyé le message. La date part au
                participant : c&apos;est elle qui lui permet de reconnaître notre courriel d&apos;un
                hameçonnage.
              </p>
            </>
          )}

          {aEnvoye && !toutRegle && (
            <>
              <button
                type="button"
                className="btn btn--style-primary btn--size-small"
                style={{ margin: 0 }}
                onClick={encaisser}
              >
                {annonce
                  ? "Transfert vérifié — versement reçu"
                  : due
                    ? `Versement de ${due.montant ?? 0} € reçu`
                    : "Versement reçu"}
              </button>
              <p
                style={{
                  color: "var(--theme-elevation-500)",
                  fontSize: "0.8rem",
                  margin: "8px 0 0",
                  maxWidth: 460,
                }}
              >
                ⚠️ À cliquer <strong>après</strong> avoir vu l&apos;argent sur le compte. Le
                participant est prévenu que sa place est acquise, et son attestation devient
                officielle.
              </p>
            </>
          )}

          {toutRegle && (
            <p style={{ color: "var(--theme-elevation-500)", margin: 0, fontSize: "0.85rem" }}>
              Tout est réglé — il ne reste que la date de démarrage.
            </p>
          )}
        </div>

        {/*
          ── ⚠️ Les relances ne sont pas une cinquième étape ──────────────────
          Le fil au-dessus est une **suite** : on relit le contrat avant
          d'appeler quelqu'un à payer, et l'ordre porte du sens. Une relance,
          elle, se refait — la semaine suivante, et celle d'après. La glisser
          dans la suite lui aurait donné un rang qu'elle n'a pas, et rendu ses
          boutons indisponibles hors de « leur » moment.

          Elle vit donc dans son propre bloc, toujours ouvert.
        */}
        <section className="clixa-relances" aria-label="Relances">
          <header className="clixa-relances__entete">
            <span className="clixa-relances__titre">Relances</span>
            <span
              className={`clixa-relances__resume clixa-relances__resume--${
                suivi.nombre === 0 ? "vide" : suivi.ton
              }`}
            >
              {suivi.nombre === 0 ? "Aucune relance notée" : suivi.libelle}
            </span>
          </header>

          {/*
            ⚠️ Le journal se lit du plus récent au plus ancien : la question
            qu'on se pose en ouvrant le dossier est « quand l'a-t-on relancé la
            dernière fois », jamais « par quoi a-t-on commencé ».
          */}
          {echanges.length > 0 && (
            <ol className="clixa-relances__journal">
              {[...echanges]
                .map((e, i) => ({ e, i }))
                .sort((a, b) => new Date(b.e.le ?? 0).getTime() - new Date(a.e.le ?? 0).getTime())
                .map(({ e, i }) => (
                  <li key={i} className={`clixa-relances__ligne clixa-relances__ligne--${e.quoi}`}>
                    <span aria-hidden="true" className="clixa-relances__puce" />
                    <span className="clixa-relances__objet">
                      {OBJETS[String(e.quoi)] ?? "Relance"}
                    </span>
                    <span className="clixa-relances__quand">{e.le ? JOUR(String(e.le)) : "—"}</span>
                    {/*
                      ⚠️ On ne peut pas nommer l'auteur : l'état du formulaire ne
                      porte que son identifiant, pas son nom. Mais la question à
                      laquelle ce bloc répond n'est pas « qui », c'est « est-ce
                      moi ou quelqu'un d'autre » — et cela, l'identifiant le dit.
                    */}
                    <span className="clixa-relances__par">{auteur(e.par, user?.id)}</span>
                  </li>
                ))}
            </ol>
          )}

          <div className="clixa-relances__actions">
            {/*
              ⚠️ Les deux groupes portent leur intitulé plutôt qu'un simple
              trait. Un filet dit « ce n'est pas la même chose » ; il ne dit pas
              *quoi*. Sous des boutons dont l'un remplit un carnet et l'autre
              écrit à un client, la différence mérite d'être nommée.
            */}
            <span className="clixa-relances__groupe">Noter un appel</span>
            {/*
              ⚠️ Chaque bouton disparaît quand son objet est acquis. Relancer
              pour une signature déjà donnée, ou pour un règlement déjà soldé,
              ferait noter une conversation qui n'a pas pu avoir lieu — et
              gonflerait un compteur qui sert à décider s'il faut rappeler.
            */}
            {!aSigne && (
              <button
                type="button"
                className="btn btn--style-secondary btn--size-small clixa-relances__bouton"
                onClick={noter("signature")}
              >
                Relance pour signature de contrat
              </button>
            )}

            {/*
              ⚠️ Celui-ci ne s'efface **pas** avant l'envoi des coordonnées,
              bien que le participant ne puisse rien régler tant qu'il ne les a
              pas. La règle « on ne réclame rien qu'on n'ait rendu possible »
              vise ce qu'on demande au participant ; ici on note ce que
              l'équipe a dit au téléphone. Le champ étant en lecture seule, un
              bouton absent voudrait dire qu'un appel réel ne peut pas être
              inscrit — et le collègue suivant rappellerait, ce que ce bloc
              existe précisément pour éviter.
            */}
            {!toutRegle && (
              <button
                type="button"
                className="btn btn--style-secondary btn--size-small clixa-relances__bouton"
                onClick={noter("paiement")}
              >
                Relance pour paiement
              </button>
            )}
          </div>

          {/*
            ── ⚠️ Ce qui part vraiment, à part de ce qui note ─────────────────
            Les deux boutons ci-dessus écrivent une ligne dans le journal. Ceux
            d'ici font partir un courriel chez le participant, ou rendent sa
            place au catalogue : les confondre ferait envoyer un message en
            croyant remplir un carnet. D'où le cadre séparé, et l'armement.
          */}
          <div className="clixa-relances__envoi">
            <span className="clixa-relances__groupe clixa-relances__groupe--agir">
              Agir — ce qui sort d&apos;ici
            </span>
            {/*
              ⚠️ **Un seul bouton pour deux messages.** Avant le terme part
              « il vous reste N jours pour demander votre contrat » ; une fois
              le terme atteint, « le délai est passé, votre place n'est pas
              encore repartie — sous deux jours nous la remettrons au
              catalogue ». C'est la route qui choisit, parce que le dossier sait
              et que l'écran non : annoncer trois jours à qui n'en a plus ferait
              manquer sa place à quelqu'un qui fait ce qu'on lui a dit.
            */}
            {!aSigne && (
              <BoutonAgir
                etat={portes.signature}
                libelle="Relancer pour la signature — envoyer le courriel"
                confirmation="Confirmer l'envoi du courriel"
                avis="Un courriel partira chez le participant, avec le lien de son dossier."
                onArmer={() => setPortes((p) => ({ ...p, signature: { etat: "arme" } }))}
                onAgir={() =>
                  void declencher("signature", "/api/admin/rappel", (c) =>
                    c.quoi === "terme"
                      ? "Terme annoncé — sa place peut être rendue dans deux jours."
                      : `Rappel envoyé — il lui restait ${c.jours === 1 ? "un jour" : `${c.jours} jours`}.`,
                  )
                }
              />
            )}

            {/*
              ⚠️ Il ne paraît qu'une fois le contrat signé, et disparaît quand
              tout est réglé. La route refuse en plus tant que les coordonnées
              ne sont pas parties : réclamer de l'argent à qui n'a nulle part où
              l'envoyer est le défaut qui a coûté un vrai prospect le
              5 septembre 2026, et il se referme des deux côtés.
            */}
            {aSigne && !toutRegle && (
              <BoutonAgir
                etat={portes.paiement}
                libelle="Relancer pour le paiement — envoyer le courriel"
                confirmation="Confirmer l'envoi du courriel"
                avis="Un courriel réclamant le versement partira chez le participant."
                onArmer={() => setPortes((p) => ({ ...p, paiement: { etat: "arme" } }))}
                onAgir={() =>
                  void declencher(
                    "paiement",
                    "/api/admin/relance-paiement",
                    (c) => `Relance envoyée — ${c.montant} €${c.enRetard ? ", en retard" : ""}.`,
                  )
                }
              />
            )}

            {/*
              ── ⚠️ Le geste que le temps ne fait plus ───────────────────────
              La tâche de 8 h rendait la place d'un dossier périmé ; depuis le
              11 septembre 2026 elle ne rend plus rien. Le bouton ne paraît
              qu'une fois le terme annoncé — sans annonce il n'y a rien à
              rendre — et reste fermé jusqu'au bout du battement de deux jours :
              reprendre la place avant retirerait un délai promis par écrit.
            */}
            {!aSigne && rappeleeLe.value && (
              <BoutonAgir
                etat={portes.place}
                libelle="Rendre la place au catalogue"
                confirmation="Confirmer — la place repart"
                avis="Le dossier passe en « Annulée » et sa place revient au catalogue."
                /*
                  ⚠️ **Une date, pas un verrou calculé à l'instant du rendu.**
                  Comparer à `Date.now()` dans le corps d'un composant est un
                  appel impur que la règle de lint refuse — et la leçon est
                  ailleurs : c'est la route qui décide, elle seule connaît
                  l'heure du serveur. L'écran annonce le jour d'ouverture ; si
                  l'on clique avant, la route refuse et redit la même date.
                */
                note={`Annoncé le ${JOUR(String(rappeleeLe.value))} — la place peut être rendue à partir du ${JOUR(
                  new Date(
                    new Date(String(rappeleeLe.value)).getTime() + JOURS_DE_BATTEMENT * 86_400_000,
                  ).toISOString(),
                )}.`}
                onArmer={() => setPortes((p) => ({ ...p, place: { etat: "arme" } }))}
                onAgir={() =>
                  void declencher(
                    "place",
                    "/api/admin/rendre-la-place",
                    () => "Place rendue au catalogue — le dossier est annulé.",
                  )
                }
              />
            )}
          </div>

          {/*
            ⚠️ Cette note disait « rien n'est envoyé au participant » — vrai
            quand le bloc ne portait que le carnet d'appels, faux depuis qu'il
            porte des boutons qui envoient. Une phrase rassurante et fausse,
            juste sous eux, est pire qu'aucune phrase.

            Elle est courte maintenant : les deux intitulés disent l'essentiel,
            et un paragraphe sous des boutons ne se lit pas deux fois.
          */}
          <p className="clixa-relances__note">
            Tout est noté à votre nom, avec l&apos;heure, et se lit depuis la liste.
          </p>
        </section>
      </div>
    </div>
  );
}
