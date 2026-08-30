"use client";

import React from "react";
import { useDocumentInfo, useField, useForm } from "@payloadcms/ui";

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
 * ⚠️ Une seule action est offerte à la fois, celle du moment. Les deux gestes
 * ne sont pas interchangeables et leur ordre porte du sens : on relit le
 * contrat avant d'appeler quelqu'un à payer. Afficher les deux boutons côte à
 * côte invitait à sauter la lecture.
 */

type Etat = "faite" | "courante" | "attente";

function Puce({ etat, rang }: { etat: Etat; rang: number }) {
  const fond =
    etat === "faite" ? "#2fa37d" : etat === "courante" ? "var(--theme-success-500)" : "transparent";
  const bord = etat === "attente" ? "1px solid var(--theme-elevation-200)" : "none";
  const encre = etat === "attente" ? "var(--theme-elevation-400)" : "#0b1220";

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: fond,
        border: bord,
        color: encre,
        fontSize: "0.72rem",
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {etat === "faite" ? "✓" : rang}
    </span>
  );
}

function Etape({
  rang,
  titre,
  detail,
  etat,
}: {
  rang: number;
  titre: string;
  detail?: string;
  etat: Etat;
}) {
  return (
    <li style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0" }}>
      <Puce etat={etat} rang={rang} />
      <span style={{ lineHeight: 1.4 }}>
        <span
          style={{
            fontSize: "0.88rem",
            fontWeight: etat === "courante" ? 700 : 500,
            color: etat === "attente" ? "var(--theme-elevation-400)" : "var(--theme-elevation-800)",
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

  if (!id) return null;

  const aSigne = Boolean(signe.value);
  const aVerifie = Boolean(verifie.value);
  const aEnvoye = Boolean(envoye.value);

  const etat = (faite: boolean, courante: boolean): Etat =>
    faite ? "faite" : courante ? "courante" : "attente";

  /*
    On pose la date puis on enregistre. Sans le `submit`, le champ paraîtrait
    rempli, rien n'irait en base, et aucun courriel ne partirait — l'équipe
    croirait avoir prévenu quelqu'un.
  */
  const poser = (champ: ReturnType<typeof useField<string>>) => () => {
    champ.setValue(new Date().toISOString());
    void submit();
  };

  return (
    <div className="field-type">
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
      </ol>

      {/* Une seule action, celle du moment. */}
      <div style={{ marginTop: 14 }}>
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
              onClick={poser(verifie)}
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
              onClick={poser(envoye)}
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

        {aEnvoye && (
          <p style={{ color: "var(--theme-elevation-500)", margin: 0, fontSize: "0.85rem" }}>
            Le dossier attend maintenant le versement.
          </p>
        )}
      </div>
    </div>
  );
}
