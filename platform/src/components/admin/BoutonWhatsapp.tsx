"use client";

import React from "react";
import type { DefaultCellComponentProps } from "payload";
import { useRouter } from "next/navigation";

/**
 * Ouvrir WhatsApp depuis la liste des inscriptions — et des demandes de rappel.
 *
 * ── Ce que ça remplace ──────────────────────────────────────────────────────
 * Ouvrir le dossier, copier le numéro, basculer sur WhatsApp, coller, écrire
 * le message depuis le début. Cinq gestes par candidat, plusieurs fois par
 * jour, et le message n'est jamais tout à fait le même d'une fois sur l'autre.
 *
 * ── Ce que le message dit, et ce qu'il ne dit pas ───────────────────────────
 * Il annonce que la demande est reçue et rappelle la référence. Rien d'autre :
 * ni date de séance, ni montant. La date vit dans une relation que la liste ne
 * charge pas toujours, et un message qui annoncerait la mauvaise date coûterait
 * plus cher que celui qu'on écrit à la main.
 *
 * C'est un brouillon, pas un envoi : WhatsApp s'ouvre avec le texte prérempli,
 * et c'est la personne qui décide de l'envoyer.
 */

/** Le prénom seul : « Bonjour Aïcha » se lit mieux que « Bonjour Aïcha Benali ». */
function prenom(nom: unknown): string {
  const complet = String(nom ?? "").trim();
  return complet.split(/\s+/)[0] || "";
}

/**
 * Le numéro au format international, ou rien.
 *
 * Le formulaire demande l'indicatif du pays, mais on ne peut pas s'y fier : un
 * numéro saisi « 0689… » n'a pas de pays, et le déduire de la fiche reviendrait
 * à tenir une table des indicatifs qui vieillirait dans son coin. Mieux vaut le
 * dire que d'ouvrir une conversation avec un numéro inventé.
 */
function international(brut: unknown): string | undefined {
  let chiffres = String(brut ?? "").replace(/\D/g, "");
  if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);
  if (!chiffres || chiffres.startsWith("0")) return undefined;
  return chiffres.length >= 8 ? chiffres : undefined;
}

export function BoutonWhatsapp(props: DefaultCellComponentProps) {
  const { cellData, rowData, collectionSlug } = props;
  const router = useRouter();
  const numero = international(cellData);
  const affiche = String(cellData ?? "").trim();

  if (!affiche) return <span className="clixa-wa__vide">—</span>;

  if (!numero) {
    return (
      <span
        className="clixa-wa__incomplet"
        title="Numéro sans indicatif international : à compléter dans la fiche pour pouvoir écrire."
      >
        {affiche}
      </span>
    );
  }

  /*
    ⚠️ **Le message doit dire ce que la personne a réellement fait.** Les deux
    collections ne portent pas les mêmes champs — `apprenantNom` et une
    référence d'un côté, `nom` seul de l'autre — et surtout pas le même geste :
    une demande de rappel n'est pas une inscription. Écrire « nous avons bien
    reçu votre demande d'inscription » à quelqu'un qui a seulement laissé son
    numéro le ferait se croire engagé, ou nous croire distraits.

    La référence est ce qui distingue les deux, et elle vient des données —
    rien à passer en propriété, rien à oublier de brancher.
  */
  const reference = rowData?.reference ? String(rowData.reference) : undefined;
  const nom = prenom(rowData?.apprenantNom ?? rowData?.nom);

  const texte = (
    reference
      ? [
          `Bonjour ${nom},`,
          "",
          "Ici l'équipe admissions de CLIXA Institute.",
          `Nous avons bien reçu votre demande d'inscription (référence ${reference}).`,
          "",
          "Nous restons à votre disposition pour toute question.",
        ]
      : [
          `Bonjour ${nom},`,
          "",
          "Ici l'équipe admissions de CLIXA Institute.",
          "Vous avez demandé à être rappelé : je reviens vers vous comme convenu.",
          "",
          "Quand vous conviendrait-il d'échanger quelques minutes ?",
        ]
  ).join("\n");

  /*
    ── ⚠️ Le clic laisse une trace, et n'attend pas ──────────────────────────
    Ce bouton était un simple lien : il ouvrait la conversation et n'écrivait
    rien. Or c'est le chemin qu'on prend réellement pour joindre quelqu'un — le
    directeur écrivait au client, l'administration lisait « jamais relancé » dans
    la colonne, et écrivait par-dessus. C'est la plainte du 12 septembre 2026,
    par la porte qu'on avait oubliée.

    ⚠️ **On n'attend pas la réponse.** WhatsApp doit s'ouvrir tout de suite ;
    faire patienter le temps d'une écriture en base rendrait le bouton lourd,
    et c'est précisément ce que ce bouton existe pour éviter. `keepalive` laisse
    la requête vivre après que l'onglet a changé de contexte.

    ⚠️ **Et l'échec est silencieux, exprès.** Si la note ne part pas, la
    conversation s'ouvre quand même : mieux vaut un journal incomplet qu'un
    bouton qui refuse d'écrire à un client parce qu'une écriture a échoué.

    ⚠️ **Seules les inscriptions ont un journal.** La même cellule sert aux
    demandes de rappel, aux conversations et aux rendez-vous : y poster
    écrirait dans le dossier d'un autre, ou ne ferait rien. Le `collectionSlug`
    tranche — pas la présence d'un champ, qui se ressemble d'une collection à
    l'autre.
  */
  const noter = () => {
    if (collectionSlug !== "inscriptions") return;
    const id = (rowData as { id?: unknown } | undefined)?.id;
    if (id === undefined || id === null) return;

    void fetch("/api/admin/journal", {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
      body: JSON.stringify({ id, quoi: "whatsapp" }),
    })
      .then(() => router.refresh())
      .catch(() => undefined);
  };

  return (
    <span className="clixa-wa">
      <a
        href={`https://wa.me/${numero}?text=${encodeURIComponent(texte)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="clixa-wa__bouton"
        onClick={(e) => {
          // Sans cela, un clic sur la cellule ouvrirait aussi la fiche derrière.
          e.stopPropagation();
          noter();
        }}
        title={`Écrire à ${nom} sur WhatsApp`}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="clixa-wa__icon"
          aria-hidden="true"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span>WhatsApp</span>
      </a>
      <span className="clixa-wa__numero">{affiche}</span>
    </span>
  );
}
