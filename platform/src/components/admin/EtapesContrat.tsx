"use client";

import React from "react";
import { useAllFormFields, useAuth, useDocumentInfo, useField, useForm } from "@payloadcms/ui";
import { reduceFieldsToValues } from "payload/shared";
import { useRouter } from "next/navigation";
import { dernierSuivi, type Echange, type NatureEchange } from "@/lib/suivi";

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

export function EtapesContrat() {
  const { id } = useDocumentInfo();
  const { submit } = useForm();
  const signe = useField<string>({ path: "contratSigneLe" });
  const verifie = useField<string>({ path: "contratVerifieLe" });
  const envoye = useField<string>({ path: "coordonneesEnvoyeesLe" });
  const reference = useField<string>({ path: "reference" });

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
  const [rappel, setRappel] = React.useState<
    | { etat: "pret" | "arme" | "envoi" }
    | { etat: "fait"; jours: number }
    | { etat: "erreur"; dit: string }
  >({ etat: "pret" });

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
  const envoyerLeRappel = async () => {
    setRappel({ etat: "envoi" });
    try {
      const r = await fetch("/api/admin/rappel", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
        body: JSON.stringify({ id }),
      });
      const corps = (await r.json()) as { jours?: number; erreur?: string };
      if (!r.ok) {
        /*
          ⚠️ On montre ce que dit la route, mot pour mot. Elle refuse pour des
          raisons qui se comprennent — délai atteint, contrat déjà signé, envoi
          manqué — et les remplacer par « une erreur est survenue » ferait
          recliquer sans rien apprendre.
        */
        setRappel({ etat: "erreur", dit: corps.erreur ?? `Refus (${r.status}).` });
        return;
      }
      setRappel({ etat: "fait", jours: corps.jours ?? 0 });
      // Le journal vient de gagner une ligne : la fiche doit la montrer.
      router.refresh();
    } catch {
      setRappel({ etat: "erreur", dit: "Le serveur n'a pas répondu. Rien n'a été envoyé." });
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
            ⚠️ Ce bouton-ci part **chez le participant**. Il est donc à part des
            deux autres, qui ne font que noter un appel : le confondre avec eux
            ferait envoyer un courriel en croyant remplir un carnet.
          */}
          {!aSigne && (
            <div className="clixa-relances__envoi">
              {rappel.etat === "fait" ? (
                <p className="clixa-relances__parti">
                  Rappel envoyé — il lui restait{" "}
                  {rappel.jours === 1 ? "un jour" : `${rappel.jours} jours`}.
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn--style-secondary btn--size-small clixa-relances__bouton"
                    disabled={rappel.etat === "envoi"}
                    onClick={() =>
                      rappel.etat === "arme" ? void envoyerLeRappel() : setRappel({ etat: "arme" })
                    }
                  >
                    {rappel.etat === "envoi"
                      ? "Envoi…"
                      : rappel.etat === "arme"
                        ? "Confirmer l'envoi du courriel"
                        : "Envoyer le rappel par courriel"}
                  </button>
                  {rappel.etat === "arme" && (
                    <span className="clixa-relances__avis">
                      Un courriel partira chez le participant, avec le lien de son dossier.
                    </span>
                  )}
                  {rappel.etat === "erreur" && (
                    <span className="clixa-relances__refus">{rappel.dit}</span>
                  )}
                </>
              )}
            </div>
          )}

          <p className="clixa-relances__note">
            Noté à votre nom, avec l&apos;heure. Rien n&apos;est envoyé au participant — c&apos;est
            une trace pour l&apos;équipe, lisible depuis la liste.
          </p>
        </section>
      </div>
    </div>
  );
}
