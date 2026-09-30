import { appelant, cadenceOk, tropVite } from "@/lib/cadence";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { MINIMUM_LETTRES, assainirPays } from "@/lib/pays";
import { paysDeLIndicatif } from "@/lib/indicatifs";
import {
  TAILLE_MAX_CV,
  estTypeCv,
  libelleExperienceFormation,
  libelleSpecialite,
  validerCandidature,
} from "@/lib/candidatures";
import { deposerCv, stockageCvConfigure } from "@/lib/cv";
import { courrielCandidatureFormateur } from "@/lib/courriel";

/**
 * Recevoir une candidature de formateur.
 *
 * ── Dans cet ordre ──────────────────────────────────────────────────────────
 * 1. La cadence et le leurre : une boucle ou un robot s'arrêtent là.
 * 2. Les champs, par `validerCandidature` — la règle que la page affiche.
 * 3. Le CV, s'il y en a un : type et taille, puis dépôt dans le magasin privé.
 * 4. La fiche, puis le courriel à l'équipe. La fiche d'abord : un service de
 *    courriel indisponible ne doit jamais faire perdre une candidature.
 *
 * ── Un doublon ne crée pas de seconde fiche ─────────────────────────────────
 * Le formulaire est natif : pendant l'aller-retour rien ne bouge à l'écran, et
 * l'on reclique. Une candidature de la même adresse encore « nouvelle » et de
 * moins de dix minutes suffit : on répond comme si c'était enregistré — ça
 * l'est — sans écrire une seconde ligne ni envoyer un second courriel.
 */

const LEURRE = "site_web";
const PAGE = "/devenir-formateur";

export async function POST(request: Request) {
  if (!cadenceOk("candidature", appelant(request), 10, 60_000)) return tropVite(60);

  const form = await request.formData();
  const texte = (cle: string) => (form.get(cle) ?? "").toString().trim();
  const echec = (erreur: string): never => redirect(`${PAGE}?erreur=${erreur}#formulaire` as Route);

  if (texte(LEURRE) !== "") redirect(`${PAGE}?envoye=1` as Route);

  const fichier = form.get("cv");
  const aUnCv = fichier instanceof File && fichier.size > 0;

  const whatsapp = texte("whatsapp");
  const paysSaisi = assainirPays(texte("pays"));
  const pays =
    paysSaisi.length >= MINIMUM_LETTRES ? paysSaisi : whatsapp ? paysDeLIndicatif(whatsapp) : "";

  const saisie = {
    nom: texte("nom"),
    email: texte("email").toLowerCase(),
    whatsapp,
    pays,
    specialite: texte("specialite"),
    experience: texte("experience"),
    linkedin: texte("linkedin"),
    message: texte("message"),
    consentement: texte("consentement"),
    aUnCv,
  };

  const verdict = validerCandidature(saisie);
  if (!verdict.ok) echec(verdict.erreur);
  if (!verdict.ok) return; // pour le typage : `echec` a déjà redirigé

  /*
    Le type est lu dans le fichier tel que le navigateur l'annonce, jamais
    déduit du nom : une extension se renomme. La taille est bornée ici, avant
    tout dépôt — la limite de Vercel n'existe pas en développement, et une règle
    qui ne s'applique qu'en production se découvre en production.
  */
  if (aUnCv) {
    if (!estTypeCv(fichier.type)) echec("format");
    if (fichier.size > TAILLE_MAX_CV) echec("lourd");
  }

  const payload = await getPayload({ config });

  const dixMinutes = new Date(Date.now() - 10 * 60_000).toISOString();
  const { totalDocs: dejaLa } = await payload.count({
    collection: "candidatures-formateurs",
    where: {
      and: [
        { email: { equals: saisie.email } },
        { statut: { equals: "nouvelle" } },
        { createdAt: { greater_than: dixMinutes } },
      ],
    },
    overrideAccess: true,
  });
  if (dejaLa > 0) redirect(`${PAGE}?envoye=1` as Route);

  let cv: { chemin: string; taille: number; type: string } | undefined;
  if (aUnCv) {
    /*
      Sans magasin, on ne fait pas semblant : une fiche qui annoncerait un CV
      jamais déposé enverrait l'équipe chercher un fichier qui n'existe pas.
      Le candidat peut renvoyer avec son profil LinkedIn, et la page le lui dit.
    */
    if (!stockageCvConfigure()) {
      payload.logger.error("[candidature] BLOB_READ_WRITE_TOKEN absent : CV non déposé");
      echec("stockage");
    }
    try {
      cv = await deposerCv(fichier);
    } catch (e) {
      payload.logger.error({ err: e }, "[candidature] dépôt du CV impossible");
      echec("stockage");
    }
  }

  let id: number | string;
  try {
    const cree = await payload.create({
      collection: "candidatures-formateurs",
      overrideAccess: true,
      data: {
        statut: "nouvelle",
        nom: saisie.nom,
        email: saisie.email,
        whatsapp: saisie.whatsapp,
        pays: saisie.pays,
        specialite: verdict.specialite,
        experience: verdict.experience,
        linkedin: verdict.linkedin,
        message: saisie.message,
        ...(cv && aUnCv
          ? {
              cvChemin: cv.chemin,
              cvNom: fichier.name.slice(0, 120),
              cvType: cv.type,
              cvTaille: cv.taille,
            }
          : {}),
      },
    });
    id = cree.id;
  } catch (e) {
    payload.logger.error({ err: e }, "[candidature] enregistrement impossible");
    echec("technique");
    return;
  }

  await courrielCandidatureFormateur(payload, {
    id,
    nom: saisie.nom,
    email: saisie.email,
    whatsapp: saisie.whatsapp,
    pays: saisie.pays,
    specialite: libelleSpecialite(verdict.specialite),
    experience: libelleExperienceFormation(verdict.experience),
    linkedin: verdict.linkedin,
    avecCv: Boolean(cv),
    message: saisie.message,
  });

  redirect(`${PAGE}?envoye=1` as Route);
}
