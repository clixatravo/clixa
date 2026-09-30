/**
 * Les candidatures de formateurs — ce que la route accepte, et ce qu'elle refuse.
 *
 *   npx tsx scripts/verifier-candidatures.ts
 *
 * Aucune base, aucun réseau : `lib/candidatures.ts` est pur. Ce qui est gardé,
 * c'est ce que la validation **refuse** — un lien qui imite LinkedIn, une
 * candidature sans CV ni profil, un domaine inventé — et, avec son témoin, ce
 * qu'elle laisse passer : une garde qui refuserait tout passerait aussi au vert
 * sur les refus.
 */
import {
  EXPERIENCES_FORMATION,
  MESSAGES_CANDIDATURE,
  OPTIONS_SPECIALITE,
  SPECIALITES,
  TAILLE_MAX_CV,
  estTypeCv,
  lienLinkedin,
  validerCandidature,
  type SaisieCandidature,
} from "@/lib/candidatures";

let manques = 0;
const dire = (q: string, v: boolean, detail = "") => {
  console.log(`  ${v ? "✓" : "✗"} ${q}${detail ? ` — ${detail}` : ""}`);
  if (!v) manques += 1;
};

const bonne: SaisieCandidature = {
  nom: "Awa Diallo",
  email: "awa.diallo@exemple.sn",
  whatsapp: "+221770000000",
  pays: "Sénégal",
  specialite: "finance",
  experience: "5-10",
  linkedin: "",
  message: "",
  consentement: "oui",
  aUnCv: true,
};
const avec = (m: Partial<SaisieCandidature>) => validerCandidature({ ...bonne, ...m });
const refus = (m: Partial<SaisieCandidature>) => {
  const r = avec(m);
  return r.ok ? "accepté" : r.erreur;
};

console.log("\n  Le témoin : une candidature complète passe\n");

const r = validerCandidature(bonne);
dire("avec un CV et sans LinkedIn", r.ok, r.ok ? "" : r.erreur);
const r2 = avec({ aUnCv: false, linkedin: "linkedin.com/in/awa-diallo" });
dire(
  "avec LinkedIn et sans CV, le lien remis en forme",
  r2.ok && r2.linkedin === "https://linkedin.com/in/awa-diallo",
  r2.ok ? String(r2.linkedin) : r2.erreur,
);

console.log("\n  Le CV ou le lien LinkedIn, au moins l'un des deux\n");

dire(
  "ni CV ni LinkedIn : refusé",
  refus({ aUnCv: false }) === "cv-ou-linkedin",
  refus({ aUnCv: false }),
);
dire(
  "un lien mal formé est refusé même avec un CV",
  refus({ linkedin: "mon profil" }) === "linkedin",
  refus({ linkedin: "mon profil" }),
);

console.log("\n  Un lien qui imite LinkedIn ne passe pas\n");

for (const faux of [
  "https://linkedin.com.attaquant.test/in/x",
  "https://attaquant.test/linkedin.com/in/x",
  "javascript:alert(1)//linkedin.com",
  "https://user:pass@linkedin.com/in/x",
  "ftp://linkedin.com/in/x",
]) {
  dire(`refusé : ${faux}`, lienLinkedin(faux) === undefined);
}
dire(
  "www et sous-domaines de LinkedIn acceptés",
  lienLinkedin("https://www.linkedin.com/in/x?trk=abc") === "https://www.linkedin.com/in/x" &&
    lienLinkedin("fr.linkedin.com/in/x") === "https://fr.linkedin.com/in/x",
);
dire(
  "les paramètres de suivi sont retirés",
  !String(lienLinkedin("linkedin.com/in/x?trk=1")).includes("trk"),
);

console.log("\n  Les champs\n");

dire("nom manquant", refus({ nom: "" }) === "champs");
dire("adresse sans domaine", refus({ email: "awa@" }) === "email");
dire("numéro sans indicatif", refus({ whatsapp: "0770000000" }) === "indicatif");
dire("domaine inventé", refus({ specialite: "astrologie" }) === "specialite");
dire("« Autre domaine » accepté", avec({ specialite: "autre" }).ok);
dire("expérience inventée", refus({ experience: "20" }) === "experience");
dire("sans consentement", refus({ consentement: "" }) === "consentement");
dire("message de plus de 2000 caractères", refus({ message: "x".repeat(2001) }) === "long");

console.log("\n  Le fichier\n");

dire("PDF et Word acceptés", estTypeCv("application/pdf") && estTypeCv("application/msword"));
dire(
  "image et SVG refusés",
  !estTypeCv("image/jpeg") && !estTypeCv("image/svg+xml") && !estTypeCv("text/html"),
);
dire("la borne tient sous la limite de Vercel (4,5 Mo)", TAILLE_MAX_CV < 4.5 * 1024 * 1024);

console.log("\n  Les listes\n");

const valeurs = SPECIALITES.map((s) => s.valeur);
dire("aucun domaine en double", new Set(valeurs).size === valeurs.length);
dire("« Autre domaine » reste en dernier", valeurs[valeurs.length - 1] === "autre");
dire(
  "le menu de /admin porte les mêmes valeurs que le formulaire",
  OPTIONS_SPECIALITE.map((o) => o.value).join() === valeurs.join(),
);
dire(
  "l'expérience commence par « pas encore animé »",
  EXPERIENCES_FORMATION[0]?.valeur === "debutant",
);
dire(
  "chaque refus a sa phrase",
  [
    "champs",
    "email",
    "indicatif",
    "specialite",
    "experience",
    "linkedin",
    "cv-ou-linkedin",
    "consentement",
    "long",
    "format",
    "lourd",
    "stockage",
    "technique",
  ].every((e) => ((MESSAGES_CANDIDATURE as Record<string, string>)[e] ?? "").length > 20),
);

console.log(manques === 0 ? "\n  Tout tient.\n" : `\n  ${manques} contrôle(s) au rouge.\n`);
process.exit(manques === 0 ? 0 : 1);
