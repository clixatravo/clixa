/**
 * « Continuer avec Google » — le chemin d'entrée qu'on espère majoritaire.
 *
 * Placé *avant* le formulaire : la plupart des visiteurs n'ont aucune envie
 * d'inventer un mot de passe pour consulter un dossier trois fois dans l'année,
 * et le premier chemin offert est celui qu'on prend.
 *
 * Le composant ne s'affiche pas quand Google n'est pas configuré. Un bouton qui
 * mène à une page d'erreur vaut moins que pas de bouton du tout.
 */
import { googleConfigure } from "@/lib/google";

export function BoutonGoogle({ libelle }: { libelle: string }) {
  if (!googleConfigure()) return null;

  return (
    <div className="mb-6">
      {/*
        Une balise <a>, pas <Link> : la cible n'est pas une page mais un
        gestionnaire de route qui répond 303 vers Google. <Link> ferait une
        navigation côté client, qui ne peut pas quitter le site — le visiteur
        resterait sur place sans rien voir se passer.
      */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/api/auth/google"
        className="border-ivory/20 bg-ivory/5 text-ivory hover:border-gold/60 hover:bg-ivory/10 flex w-full items-center justify-center gap-3 rounded-md border px-4 py-3 text-sm font-medium transition-colors"
      >
        <LogoGoogle />
        {libelle}
      </a>

      <div className="text-ivory/40 mt-6 flex items-center gap-4 text-xs tracking-wider uppercase">
        <span className="bg-ivory/15 h-px flex-1" />
        ou
        <span className="bg-ivory/15 h-px flex-1" />
      </div>
    </div>
  );
}

/* Les quatre couleurs officielles. Un « G » monochrome n'est plus le logo. */
function LogoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C3 17 2.1 20.4 2.1 24s.9 7 2.4 9.9l7.3-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.3 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"
      />
    </svg>
  );
}
