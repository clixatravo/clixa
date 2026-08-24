import type { ReactNode } from "react";

/**
 * Le cadre des deux pages de compte.
 *
 * ── Pourquoi une colonne de plus ────────────────────────────────────────────
 * Le formulaire tenait seul au milieu d'une page vide. Un champ e-mail et un
 * mot de passe ne disent pas à quoi mène le compte, et personne n'en ouvre un
 * pour le plaisir : la moitié restée vide est précisément l'endroit où le dire.
 *
 * Ce qui y est annoncé est ce que `/compte` montre vraiment — le statut du
 * dossier, les échéances, les coordonnées déjà remplies au moment de se
 * réinscrire. Une promesse de plus serait une promesse à tenir.
 *
 * Connexion et création partagent ce cadre pour la même raison qu'elles
 * partagent leur formulaire : deux copies, et un jour l'une reçoit une
 * correction que l'autre n'a pas.
 */
export function CadreCompte({
  titre,
  intro,
  children,
  bas,
}: {
  titre: string;
  intro: string;
  children: ReactNode;
  /** Le renvoi vers l'autre page — « pas encore de compte », « déjà un compte ». */
  bas: ReactNode;
}) {
  return (
    <section className="px-8 py-13">
      <div className="mx-auto grid max-w-[1000px] gap-12 lg:grid-cols-[minmax(0,440px)_1fr] lg:gap-16">
        {/*
          Le formulaire d'abord dans le document : c'est ce qu'on est venu faire.

          Sa largeur est bornée partout, pas seulement quand les deux colonnes
          se rangent côte à côte. Sur une tablette il s'étirait sur 704 px pour
          deux champs — une ligne de saisie plus large que la phrase qui
          l'annonce se lit mal, et donne au formulaire un air d'accident.
        */}
        <div className="w-full max-w-[440px]">
          <span className="mono-label text-gold mb-3 block">Mon espace</span>
          <h1 className="mb-3 text-[clamp(1.4rem,2.6vw,1.9rem)]">{titre}</h1>
          <p className="text-ivory-dim mb-8 text-[0.92rem]">{intro}</p>
          {children}
          <p className="text-ivory-dim mt-6 text-[0.86rem]">{bas}</p>
        </div>

        <aside>
          <span className="mono-label text-gold mb-5 block">Ce que vous y trouvez</span>
          <dl className="border-line border-t">
            <Apport
              titre="Où en est votre dossier"
              texte="Son statut, et ce qu'il attend — de vous ou de nous. Écrit en clair, pas en jargon d'administration."
            />
            <Apport
              titre="Vos échéances"
              texte="Ce qui est réglé, ce qui reste, et la date du prochain versement."
            />
            <Apport
              titre="Une seconde inscription plus courte"
              texte="Vos coordonnées sont déjà là : il ne reste que la session et le rythme de paiement."
            />
          </dl>
        </aside>
      </div>
    </section>
  );
}

/**
 * `flex-col-reverse` : le titre reste avant sa description dans le document,
 * comme l'attend une liste de définitions, et s'affiche au-dessus. Même
 * traitement que les filets du reste du site — pas de cadre plein, qui ferait
 * de cette colonne un second formulaire.
 */
function Apport({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="border-line flex flex-col-reverse gap-1.5 border-b py-4">
      <dd className="text-ivory-dim text-[0.86rem] leading-relaxed">{texte}</dd>
      <dt className="font-display text-ivory text-[1.02rem]">{titre}</dt>
    </div>
  );
}
