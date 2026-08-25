import React from "react";

/**
 * Le mot posé sous le formulaire de connexion.
 *
 * « Mot de passe oublié ? » ne mène nulle part : aucun adaptateur d'e-mail
 * n'est configuré, et le lien existe parce que Payload le pose. Quelqu'un qui
 * perd son mot de passe cliquerait, ne recevrait rien, et attendrait.
 *
 * Le dire ici coûte trois lignes et évite une matinée perdue. Le jour où le
 * domaine et la clé Resend seront en place, ce bloc n'aura plus lieu d'être.
 */
export function AvantConnexion() {
  return (
    <p className="clixa-avis">
      Le lien « mot de passe oublié » n&apos;envoie encore aucun courriel — le domaine
      d&apos;expédition n&apos;est pas en place. En cas d&apos;oubli, demandez la réinitialisation à
      l&apos;équipe technique plutôt que d&apos;attendre un message.
    </p>
  );
}
