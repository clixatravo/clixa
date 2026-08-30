import { occupeUnePlace } from "@/lib/places";
import { randomBytes } from "crypto";
import type { CollectionConfig, PayloadRequest } from "payload";
import { connecte, reserveA } from "@/access/roles";
import { courrielContratVerifie, courrielInstructionsEnvoyees } from "@/lib/courriel";

/**
 * BE-14 — Les inscriptions.
 *
 * Décision n° 2 du contrat : l'inscription est le pivot, pas une ligne de
 * commande. Le paiement s'y accroche aujourd'hui ; la convocation, puis la
 * progression et le certificat quand le LMS viendra.
 *
 * ── Pourquoi aucune passerelle de paiement ──────────────────────────────────
 * Les règlements passent par Western Union, Ria et MoneyGram. Ce ne sont pas
 * des passerelles : on n'y paie pas un site, on transfère de l'argent à une
 * personne. Le tunnel s'arrête donc à la réservation, et l'équipe rapproche
 * ensuite le transfert de l'inscription à partir du numéro fourni.
 *
 * ── Pourquoi les échéances vivent ici ───────────────────────────────────────
 * Le contrat prévoyait une entité Paiement distincte. Elles restent un tableau
 * de l'inscription : l'équipe traite un dossier, pas des lignes de paiement
 * éparpillées, et tout se lit sur un écran. Le champ `prochaineEcheance` est
 * calculé à l'enregistrement — c'est lui qui permet de trier les relances sans
 * ouvrir chaque dossier.
 *
 * ── Pourquoi personne ne se connecte ────────────────────────────────────────
 * Pas de compte apprenant en V1. Un mot de passe à retenir avant même d'avoir
 * payé écarte des inscrits ; la référence du dossier suffit à y revenir.
 */
/**
 * Remet le décompte de places d'une session à la vérité.
 *
 * On recompte plutôt qu'on n'incrémente : un compteur qu'on ajuste dérive dès
 * la première annulation faite à la main, et la session annonce alors des
 * places qu'elle n'a plus.
 *
 * ── Une place se prend en payant, pas en s'inscrivant ───────────────────────
 * Un dossier « demandée » ne retient rien. Il en retenait une auparavant, et
 * l'intention était bonne : protéger celui qui vient de s'inscrire pendant
 * qu'il organise son transfert. Mais un transfert international prend des
 * jours, et beaucoup ne viennent jamais : la session affichait complet en
 * comptant des gens qui n'avaient rien versé, pendant que d'autres renonçaient
 * devant un « il ne reste plus de place » qui n'était pas vrai.
 *
 * ⚠️ Le revers est réel et assumé : deux personnes peuvent régler la dernière
 * place. À trente places, sur des transferts qui mettent des jours, cela reste
 * moins probable — et moins coûteux — qu'un catalogue qui se ferme tout seul.
 * Si cela arrive, c'est un appel à passer, pas une inscription perdue.
 *
 * `req` est passé aux deux appels — sans lui ils tournent hors de la
 * transaction en cours et ne voient pas le dossier qu'on vient d'écrire.
 */
async function recompter(docs: unknown[], req: PayloadRequest): Promise<void> {
  const ids = new Set<number>();
  for (const d of docs) {
    const s = (d as { session?: unknown })?.session;
    const id = typeof s === "object" && s !== null ? (s as { id?: unknown }).id : s;
    if (typeof id === "number") ids.add(id);
  }

  for (const id of ids) {
    const vivantes = await req.payload.count({
      collection: "inscriptions",
      /*
        La règle vit dans `lib/places.ts`, partagée avec la tâche quotidienne.
        Ici elle s'applique quand quelqu'un agit ; là-bas, quand le temps
        passe — et le temps, lui, n'écrit rien.
      */
      where: { and: [{ session: { equals: id } }, occupeUnePlace()] },
      overrideAccess: true,
      req,
    });
    await req.payload.update({
      collection: "sessions",
      id,
      overrideAccess: true,
      data: { placesReservees: vivantes.totalDocs },
      req,
    });
  }
}

/*
  L'alphabet exclut I, O, 0 et 1.

  Une référence se dicte au téléphone et se recopie d'un courriel : les quatre
  caractères qu'on confond à l'oral ou à l'œil coûtent plus qu'ils ne
  rapportent. Trente-deux symboles suffisent largement.
*/
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LONGUEUR = 8;

/**
 * Tirer une référence de dossier.
 *
 * ⚠️ `randomBytes`, pas `Math.random()`.
 *
 * La référence n'est pas un simple identifiant : c'est la seule clef qui
 * protège la fiche d'un dossier — nom, adresse, téléphone, échéancier — et
 * l'annonce d'un transfert. `Math.random()` est un générateur rapide, non
 * cryptographique : son état interne se reconstitue à partir de quelques
 * sorties, et qui a ouvert deux ou trois dossiers peut alors prédire ceux
 * qu'on délivrera ensuite.
 *
 * Huit symboles sur trente-deux valent quarante bits — mille milliards de
 * combinaisons, là où cinq caractères en base 36 en donnaient soixante
 * millions. Les références déjà émises restent valables : elles sont
 * enregistrées, pas recalculées.
 */
function tirage(): string {
  const octets = randomBytes(LONGUEUR);
  let sortie = "";
  for (let i = 0; i < LONGUEUR; i += 1) {
    // Le modulo est sans biais : 256 est un multiple de 32.
    sortie += ALPHABET[octets[i]! % ALPHABET.length];
  }
  return sortie;
}

export const Inscriptions: CollectionConfig = {
  slug: "inscriptions",
  labels: { singular: "Inscription", plural: "Inscriptions" },
  admin: {
    useAsTitle: "reference",
    defaultColumns: [
      "reference",
      "apprenantNom",
      "apprenantWhatsapp",
      "session",
      "statut",
      "moyenSouhaite",
      "prochaineEcheance",
    ],
    group: "Admissions",
    description:
      "Une ligne par place demandée. Le paiement arrive par transfert : c'est ici qu'on le rapproche.",
  },
  access: {
    // Un dossier contient des coordonnées : jamais de lecture publique.
    read: connecte,
    create: connecte,
    update: connecte,
    delete: reserveA(),
  },
  hooks: {
    /*
      Le décompte de places se recalcule, il ne s'incrémente pas.
      Un compteur qu'on ajuste dérive : une inscription annulée à la main, une
      suppression, un import — et la session annonce des places qu'elle n'a plus.
      On recompte les dossiers vivants, ce qui reste juste quoi qu'il arrive.
    */
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        await recompter([doc, previousDoc], req);

        /*
          ── Le contrat vient d'être déclaré vérifié ─────────────────────────
          On prévient le participant : entre sa signature et l'arrivée des
          coordonnées, il n'avait aucune nouvelle, au moment précis où il vient
          de s'engager.

          Le courriel part d'ici et non du bouton, pour qu'une date saisie à la
          main dans le champ produise exactement le même effet qu'un clic —
          deux chemins pour un même fait finissent toujours par diverger.

          ⚠️ La comparaison porte sur « vide avant, rempli maintenant ». Sans
          elle, chaque enregistrement du dossier renverrait le message : une
          échéance corrigée, une note ajoutée, et le participant reçoit deux
          fois la même annonce.
        */
        const session = typeof doc.session === "object" ? doc.session : undefined;
        const programme =
          session && typeof session.programme === "object" ? session.programme : undefined;
        const commun = {
          reference: String(doc.reference ?? ""),
          apprenantNom: String(doc.apprenantNom ?? ""),
          apprenantEmail: String(doc.apprenantEmail ?? ""),
          programmeTitre: String(programme?.titre ?? "votre parcours"),
          ...(doc.moyenSouhaite ? { moyenSouhaite: doc.moyenSouhaite } : {}),
        };

        if (doc.contratVerifieLe && !previousDoc?.contratVerifieLe) {
          await courrielContratVerifie(req.payload, commun);
        }

        /*
          ── Les instructions viennent de partir ────────────────────────────
          Ce message ne porte aucune coordonnée : celles-ci partent à la main,
          dans un courriel que l'équipe compose. Il fait autre chose — il
          **date** l'envoi, et dit au participant d'aller comparer cette date
          sur la page de son dossier.

          ⚠️ C'est la garde contre l'hameçonnage, et elle ne tenait qu'à
          moitié : la date s'affichait depuis le début, mais personne ne disait
          au participant qu'il devait la regarder.
        */
        if (doc.coordonneesEnvoyeesLe && !previousDoc?.coordonneesEnvoyeesLe) {
          await courrielInstructionsEnvoyees(req.payload, {
            ...commun,
            envoyeLe: String(doc.coordonneesEnvoyeesLe),
          });
        }

        return doc;
      },
    ],
    // Une suppression libère une place autant qu'une annulation.
    afterDelete: [
      async ({ doc, req }) => {
        await recompter([doc], req);
        return doc;
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        /*
          ── Un reçu ne survit pas à son dossier ───────────────────────────
          La clef étrangère de `recus.dossier_id` est en « SET NULL », et la
          colonne est obligatoire : Postgres refuse donc de vider le lien, et
          c'est la suppression entière qui échoue. Un dossier accompagné d'un
          justificatif devenait indestructible — ni par script, ni depuis
          /admin, et le message parlait de contrainte, pas de reçu.

          On les retire d'abord, par l'API : le crochet `afterDelete` de
          `Recus` en profite pour effacer aussi le fichier dans le magasin. Une
          suppression en SQL laisserait le fichier derrière, facturé et toujours
          lisible par qui détient le jeton.
        */
        const { docs } = await req.payload.find({
          collection: "recus",
          where: { dossier: { equals: id } },
          limit: 100,
          depth: 0,
          overrideAccess: true,
        });

        for (const recu of docs) {
          await req.payload.delete({ collection: "recus", id: recu.id, overrideAccess: true });
        }
      },
    ],
    beforeChange: [
      ({ data }) => {
        /*
          La référence sert au participant à retrouver son dossier sans compte.
          Elle est tirée une fois, à la création, et ne bouge plus : elle circule
          par WhatsApp et par courriel.
        */
        if (!data.reference) {
          data.reference = `CLX-${tirage()}`;
        }

        // La prochaine échéance impayée, pour trier les relances sans ouvrir les dossiers.
        const echeances: { statut?: string; dateLimite?: string }[] = data.echeances ?? [];
        const dues = echeances
          .filter((e) => e.statut !== "regle" && e.dateLimite)
          .map((e) => e.dateLimite as string)
          .sort();
        data.prochaineEcheance = dues[0] ?? null;

        /*
          ── L'argent reçu se lit sur le dossier, pas seulement sur la ligne ───
          Le statut du dossier et celui de ses échéances vivaient séparément :
          on pouvait marquer un acompte « réglé » et laisser le dossier
          « demandée ». C'était sans conséquence tant qu'une inscription
          retenait sa place indéfiniment ; depuis qu'elle ne la tient que sept
          jours, cela rendait au catalogue la place de quelqu'un qui avait payé.
          La tâche quotidienne ne lit que le statut du dossier — et elle avait
          raison de le croire suffisant.

          Deux passages, dans cet ordre : un acompte reçu confirme, tout régler
          solde. Le second l'emporte, sinon un dossier entièrement payé
          redescendrait à « confirmée » au prochain enregistrement.

          ⚠️ On ne redescend jamais un statut : « annulée » et « terminée » ne
          sont pas des états qu'un calcul doit défaire.
        */
        const regle = echeances.some((e) => e.statut === "regle");
        if (regle && data.statut === "demandee") data.statut = "confirmee";

        if (echeances.length > 0 && echeances.every((e) => e.statut === "regle")) {
          if (data.statut === "confirmee" || data.statut === "demandee") data.statut = "payee";
        }

        return data;
      },
    ],
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "reference",
          type: "text",
          label: "Référence",
          unique: true,
          admin: {
            width: "30%",
            readOnly: true,
            description: "Attribuée à la création.",
          },
        },
        {
          name: "statut",
          // Le tableau de bord et le recompte des places filtrent là-dessus,
          // ce dernier à chaque écriture.
          index: true,
          type: "select",
          label: "Statut",
          required: true,
          defaultValue: "demandee",
          options: [
            { label: "Demandée — en attente de paiement", value: "demandee" },
            { label: "Confirmée — acompte reçu", value: "confirmee" },
            { label: "Payée — solde reçu", value: "payee" },
            { label: "Terminée — parcours suivi", value: "terminee" },
            { label: "Annulée", value: "annulee" },
          ],
          admin: { width: "40%" },
        },
        {
          name: "prochaineEcheance",
          type: "date",
          label: "Prochaine échéance",
          admin: {
            width: "30%",
            readOnly: true,
            description: "Calculée. Trier dessus pour les relances.",
            date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
          },
        },
      ],
    },
    {
      /*
        Rattaché au compte quand il en existe un, laissé vide sinon. Le tunnel
        n'exige pas de compte : ce champ se remplit après coup, quand la
        personne en crée un avec la même adresse.
      */
      name: "apprenant",
      type: "relationship",
      relationTo: "apprenants",
      label: "Compte du participant",
      admin: {
        description: "Rempli automatiquement à la création du compte, par l'adresse e-mail.",
      },
    },
    {
      name: "session",
      type: "relationship",
      relationTo: "sessions",
      label: "Session",
      required: true,
      admin: { description: "La place demandée. C'est elle qui porte les dates et le tarif." },
    },

    /* ── L'apprenant ────────────────────────────────────────────────── */
    {
      type: "collapsible",
      label: "Le participant",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "apprenantNom",
              type: "text",
              label: "Nom complet",
              required: true,
              admin: { width: "50%" },
            },
            {
              name: "apprenantEmail",
              // Interrogée à chaque connexion Google, qui rattache les dossiers
              // portant l'adresse confirmée.
              index: true,
              type: "email",
              label: "E-mail",
              required: true,
              admin: { width: "50%" },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "apprenantWhatsapp",
              type: "text",
              label: "WhatsApp",
              required: true,
              admin: {
                width: "50%",
                description: "Avec l'indicatif du pays.",
                /*
                  Dans la liste, la cellule devient un lien qui ouvre WhatsApp avec un
                  message prérempli. C'est le geste que l'équipe répète le plus : sans
                  lui, il faut ouvrir le dossier, copier le numéro, changer
                  d'application, et écrire depuis le début.

                  Le numéro reste affiché à côté : on doit pouvoir le lire et le
                  recopier ailleurs sans passer par WhatsApp.
                */
                components: {
                  Cell: "@/components/admin/BoutonWhatsapp#BoutonWhatsapp",
                },
              },
            },
            {
              name: "apprenantPays",
              type: "text",
              label: "Pays",
              required: true,
              admin: { width: "50%" },
            },
          ],
        },
      ],
    },

    /* ── Le payeur ──────────────────────────────────────────────────── */
    {
      type: "collapsible",
      label: "Le payeur",
      admin: {
        description:
          "Décision n° 7 : le payeur reste distinct du participant, même quand c'est la même personne. C'est ce qui permettra d'ajouter l'offre entreprise sans refaire le tunnel.",
      },
      fields: [
        {
          name: "payeurType",
          type: "select",
          label: "Qui règle",
          required: true,
          defaultValue: "particulier",
          options: [
            { label: "Le participant lui-même", value: "particulier" },
            { label: "Un employeur ou une organisation", value: "organisation" },
          ],
        },
        {
          type: "row",
          admin: { condition: (data) => data?.payeurType === "organisation" },
          fields: [
            {
              name: "payeurNom",
              type: "text",
              label: "Nom de l'organisation",
              admin: { width: "50%" },
            },
            {
              name: "payeurEmail",
              type: "email",
              label: "E-mail de facturation",
              admin: { width: "50%" },
            },
          ],
        },
      ],
    },

    /* ── Le règlement ───────────────────────────────────────────────── */
    {
      type: "collapsible",
      label: "Le règlement",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "planPaiement",
              type: "select",
              label: "Rythme choisi",
              required: true,
              defaultValue: "P1",
              options: [
                { label: "En une fois", value: "P1" },
                { label: "En deux fois", value: "P2" },
                { label: "En trois fois", value: "P3" },
              ],
              admin: { width: "35%" },
            },
            {
              /*
                ── Ce que le participant a demandé, pas ce qu'il a fait ──────
                Le `moyen` porté par chaque échéance dit par quoi l'argent est
                arrivé : l'équipe le renseigne après coup. Celui-ci dit ce que
                le participant a choisi au moment de s'inscrire, avant qu'aucun
                argent n'existe. Les confondre ferait écraser sa demande par le
                premier versement, et l'équipe ne saurait plus quoi lui envoyer
                pour le suivant.

                Aucun paiement ne se fait sur le site : le choix décide
                seulement de ce qu'on lui adresse par courriel — un lien
                bancaire, un RIB, ou des coordonnées de transfert.
              */
              name: "moyenSouhaite",
              type: "select",
              label: "Règlement souhaité",
              required: true,
              defaultValue: "transfert",
              options: [
                { label: "Carte bancaire — lien de paiement à envoyer", value: "carte" },
                { label: "Virement bancaire — RIB à envoyer", value: "virement" },
                {
                  label: "Western Union · Ria · MoneyGram — coordonnées à envoyer",
                  value: "transfert",
                },
              ],
              admin: {
                width: "35%",
                description: "Ce que le participant a demandé à recevoir.",
              },
            },
            {
              /*
                ── Le jour où il a demandé son contrat ──────────────────────
                La demande est un geste, pas une case à cocher par l'équipe :
                c'est le participant qui décide de passer de « je me renseigne »
                à « je m'engage ». Beaucoup s'arrêtent avant, et c'est très bien
                — la pré-inscription ne coûte rien et n'engage à rien.

                Elle marque aussi le moment où l'équipe doit agir : appeler,
                orienter, puis envoyer les instructions de paiement une fois le
                contrat signé.
              */
              name: "contratDemandeLe",
              type: "date",
              label: "Contrat demandé le",
              admin: {
                width: "35%",
                readOnly: true,
                description: "Renseigné par le participant depuis son dossier.",
                date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
              },
            },
            {
              /*
                ── La signature électronique, et ce qui la prouve ────────────
                Le participant signe depuis sa page, en recopiant « Lu et
                approuvé » comme le contrat l'exige. C'est une signature
                électronique *simple* : recevable, mais contestable — une
                signature qualifiée demanderait un tiers de confiance et un
                abonnement.

                ⚠️ Ce qui la rend défendable n'est pas la case cochée, c'est ce
                qu'on garde autour : la date, l'adresse IP, le navigateur, et
                l'empreinte du contrat tel qu'il était au moment de signer. Sans
                l'empreinte, rien n'empêcherait de prétendre que le document a
                changé depuis — et c'est la première chose qu'on objecterait.
              */
              name: "contratSigneLe",
              type: "date",
              label: "Contrat signé le",
              admin: {
                width: "35%",
                readOnly: true,
                date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
              },
            },
            {
              name: "contratSignataire",
              type: "text",
              label: "Nom du signataire",
              admin: { width: "30%", readOnly: true },
            },
            {
              /*
                Le tracé, en PNG encodé. Quelques kilo-octets : un trait sur
                fond transparent se compresse bien, et le garder en base plutôt
                qu'au magasin évite un aller-retour pour composer le contrat.

                ⚠️ Il n'ajoute pas de force juridique — c'est l'empreinte des
                termes qui défend la signature. Il ajoute ce qu'un contrat doit
                avoir pour se lire comme un contrat : une signature qu'on voit.
              */
              name: "contratTrace",
              type: "textarea",
              label: "Tracé de la signature",
              admin: {
                readOnly: true,
                /*
                  ⚠️ Rendu par un composant, jamais par la zone de texte. Le
                  tracé est un PNG encodé : une centaine de milliers de
                  caractères, que le champ affichait tels quels. Ouvrir le
                  dossier depuis le courriel « Contrat signé » donnait un mur de
                  charabia — et la signature, la seule chose qu'on venait voir,
                  n'était nulle part.
                */
                components: { Field: "@/components/admin/SignatureVue#SignatureVue" },
              },
            },
            {
              name: "contratPreuve",
              type: "textarea",
              label: "Preuve de signature",
              admin: {
                readOnly: true,
                description:
                  "Horodatage, adresse IP, navigateur et empreinte du contrat au moment de la signature. À produire en cas de contestation.",
              },
            },
            {
              /*
                ── Le contrat a été relu, et le participant l'apprend ─────────
                Signer est son geste ; vérifier est le nôtre. Entre les deux, il
                attendait sans nouvelle : le courriel de signature annonce que
                l'équipe enverra de quoi payer, puis plus rien jusqu'à ce que
                quelqu'un s'en occupe. C'est le moment du tunnel où il s'est
                engagé et où il ne se passe rien de visible.

                Poser cette date envoie le message qui manquait — et c'est le
                crochet `afterChange` qui l'envoie, pas le bouton : une date
                renseignée à la main dans ce champ doit produire le même effet
                qu'un clic.
              */
              name: "contratVerifieLe",
              type: "date",
              label: "Contrat vérifié le",
              admin: {
                width: "35%",
                description: "Prévient le participant que son contrat est accepté.",
                date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
              },
            },
            {
              /*
                Les trois temps du dossier sur une seule ligne, et une seule
                action offerte : celle du moment. Deux boutons posés l'un sous
                l'autre disaient chacun ce qu'il faisait, mais aucun ne disait
                **où l'on en est** ni lequel venait après — et les afficher
                ensemble invitait à sauter la lecture du contrat.
              */
              name: "etapesContrat",
              type: "ui",
              label: "Où en est ce dossier",
              admin: {
                components: { Field: "@/components/admin/EtapesContrat#EtapesContrat" },
              },
            },
            {
              /*
                Le jour où l'équipe lui a envoyé de quoi payer.
                
                ⚠️ Ce n'est pas une trace pour nous : c'est ce que la page de
                son dossier lui affiche. Un lien bancaire reçu par courriel
                ressemble trait pour trait à un hameçonnage — le participant n'a
                aucun moyen de distinguer le nôtre d'un autre. Retrouver la même
                date sur une page qu'il a ouverte avec sa propre référence est
                la seule vérification qu'on puisse lui offrir sans mettre le
                lien en ligne, ce que la direction ne veut pas.
              */
              name: "coordonneesEnvoyeesLe",
              type: "date",
              label: "Coordonnées envoyées le",
              admin: {
                width: "30%",
                description: "À renseigner après l'envoi — le participant voit cette date.",
                date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
              },
            },
            {
              name: "montantTotal",
              type: "number",
              label: "Total dû",
              min: 0,
              admin: {
                width: "35%",
                description:
                  "Figé à l'inscription : un barème qui change ne rouvre pas un dossier.",
              },
            },
            {
              name: "devise",
              type: "select",
              label: "Devise",
              defaultValue: "EUR",
              options: [
                { label: "Euro (€)", value: "EUR" },
                { label: "Dirham (MAD)", value: "MAD" },
                { label: "Franc CFA (XOF)", value: "XOF" },
              ],
              admin: { width: "30%" },
            },
          ],
        },
        {
          name: "echeances",
          type: "array",
          label: "Échéances",
          labels: { singular: "Échéance", plural: "Échéances" },
          admin: {
            description:
              "Créées à l'inscription d'après le rythme choisi. Cocher « réglée » quand le transfert est vérifié.",
          },
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "montant",
                  type: "number",
                  label: "Montant",
                  required: true,
                  min: 0,
                  admin: { width: "25%" },
                },
                {
                  name: "dateLimite",
                  type: "date",
                  label: "À régler avant",
                  admin: {
                    width: "30%",
                    date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
                  },
                },
                {
                  name: "statut",
                  type: "select",
                  label: "État",
                  required: true,
                  defaultValue: "attendu",
                  options: [
                    { label: "Attendu", value: "attendu" },
                    { label: "Annoncé par le participant", value: "annonce" },
                    { label: "Réglé — transfert vérifié", value: "regle" },
                  ],
                  admin: { width: "45%" },
                },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "moyen",
                  type: "select",
                  label: "Moyen",
                  options: [
                    { label: "Western Union", value: "western-union" },
                    { label: "Ria", value: "ria" },
                    { label: "MoneyGram", value: "moneygram" },
                    { label: "Virement bancaire", value: "virement" },
                    { label: "Espèces", value: "especes" },
                  ],
                  admin: { width: "35%" },
                },
                {
                  name: "reference",
                  type: "text",
                  label: "Numéro de transfert",
                  admin: {
                    width: "35%",
                    description: "MTCN pour Western Union, PIN pour Ria.",
                  },
                },
                {
                  name: "relanceeLe",
                  type: "date",
                  label: "Relancée le",
                  admin: {
                    width: "30%",
                    readOnly: true,
                    description:
                      "Posé par la relance automatique. Empêche d'écrire deux fois la même semaine.",
                    date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
                  },
                },
                {
                  name: "regleLe",
                  type: "date",
                  label: "Vérifié le",
                  admin: {
                    width: "25%",
                    date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notes internes",
      admin: { description: "Jamais montré au participant." },
    },
  ],
};
