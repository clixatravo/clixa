"use client";

import React from "react";
import { useAllFormFields, useDocumentInfo, useField, useForm } from "@payloadcms/ui";
import { reduceFieldsToValues } from "payload/shared";

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

const JOUR = (v: string) =>
  new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

export function EtapesContrat() {
  const { id } = useDocumentInfo();
  const { submit } = useForm();
  const signe = useField<string>({ path: "contratSigneLe" });
  const verifie = useField<string>({ path: "contratVerifieLe" });
  const envoye = useField<string>({ path: "coordonneesEnvoyeesLe" });
  const reference = useField<string>({ path: "reference" });

  /*
    ⚠️ **L'échéancier se lit en entier, pas ligne par ligne.** Un tableau ne
    s'atteint pas par `useField` : ses lignes vivent en champs séparés
    (`echeances.0.statut`…), et leur nombre change. `reduceFieldsToValues` rend
    l'objet tel que le formulaire l'enverrait — édits non enregistrés compris,
    ce qui évite d'écraser ce que quelqu'un vient de saisir juste au-dessus.
  */
  const [champs] = useAllFormFields();
  const donnees = reduceFieldsToValues(champs, true) as {
    echeances?: { montant?: number; statut?: string; regleLe?: string | null }[];
  };
  const echeances = donnees.echeances ?? [];
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
      </div>
    </div>
  );
}
