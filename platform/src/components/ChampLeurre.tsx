import { NOM_DU_LEURRE } from "@/lib/leurre";

/**
 * Le champ piège, tel que chaque formulaire public le porte. Voir `lib/leurre.ts`.
 *
 * `data-1p-ignore`, `data-lpignore` et `data-form-type` disent aux
 * gestionnaires de mots de passe de ne pas y toucher ; `autoComplete="off"`
 * le dit aux navigateurs qui l'écoutent. L'`id` varie quand une page porte
 * plusieurs formulaires.
 */
export function ChampLeurre({ id = NOM_DU_LEURRE }: { id?: string }) {
  return (
    <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
      <label htmlFor={id}>Laisser vide</label>
      <input
        id={id}
        name={NOM_DU_LEURRE}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        data-1p-ignore=""
        data-lpignore="true"
        data-form-type="other"
      />
    </div>
  );
}
