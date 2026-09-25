import type { SanitizedConfig } from "payload";
import { collectionDeLaClef, completerLesColonnes, type ColonnePreferee } from "@/lib/colonnes";

/**
 * Les préférences de liste ne gardent plus une liste de colonnes d'avant.
 *
 * Voir `lib/colonnes.ts` pour le défaut et la règle. Ici, deux crochets sur la
 * collection interne `payload-preferences` :
 *
 * - **`afterRead`** complète une préférence au moment où on la lit. Le compte
 *   qui ouvre la liste voit les nouvelles colonnes sans que rien n'ait été
 *   écrit, et sans script à lancer.
 * - **`beforeChange`** complète une préférence au moment où on l'écrit. Une
 *   liste d'avant — rejouée par un favori, un onglet ancien, une page de
 *   l'historique — ne peut plus retirer une colonne en s'enregistrant.
 *
 * ── ⚠️ Pourquoi après `buildConfig`, et pas dans la configuration ───────────
 * `payload-preferences` n'est pas une collection qu'on déclare : Payload
 * l'ajoute lui-même, **après** les greffons, pendant qu'il assainit la
 * configuration. Ni `collections` ni un greffon ne la voient. On l'atteint donc
 * dans la configuration assainie, une fois `buildConfig` résolu — le seul
 * endroit où elle existe. Si une version de Payload la renommait, la fonction
 * ne trouverait rien et laisserait la configuration intacte : on perdrait la
 * réparation, jamais le back-office. `verifier-colonnes.ts` le dirait.
 */
export function brancherLesColonnes(config: SanitizedConfig): SanitizedConfig {
  /* La source unique : ce que chaque collection déclare. */
  const attendues = new Map<string, string[]>();
  for (const c of config.collections) {
    const colonnes = c.admin?.defaultColumns;
    if (Array.isArray(colonnes) && colonnes.length > 0) attendues.set(c.slug, colonnes);
  }

  const completer = (clef: unknown, valeur: unknown): unknown => {
    const slug = collectionDeLaClef(clef);
    const liste = slug ? attendues.get(slug) : undefined;
    if (!liste || !valeur || typeof valeur !== "object") return valeur;
    const v = valeur as { columns?: unknown };
    if (!Array.isArray(v.columns)) return valeur;
    const { colonnes, ajoutees } = completerLesColonnes(v.columns as ColonnePreferee[], liste);
    return ajoutees.length > 0 ? { ...v, columns: colonnes } : valeur;
  };

  const preferences = config.collections.find((c) => c.slug === "payload-preferences");
  if (!preferences) return config;

  preferences.hooks.afterRead = [
    ...(preferences.hooks.afterRead ?? []),
    ({ doc }) => {
      if (!doc || typeof doc !== "object") return doc;
      const suite = completer(doc.key, doc.value);
      return suite === doc.value ? doc : { ...doc, value: suite };
    },
  ];

  preferences.hooks.beforeChange = [
    ...(preferences.hooks.beforeChange ?? []),
    ({ data, originalDoc }) => {
      /*
        ⚠️ « Absent » n'est pas « vidé » : une écriture partielle qui ne porte
        pas `value` ne doit pas en recevoir une. Même règle que le crochet des
        places tenues dans `Sessions.ts`.
      */
      if (!data || !("value" in data)) return data;
      const suite = completer(data.key ?? originalDoc?.key, data.value);
      return suite === data.value ? data : { ...data, value: suite };
    },
  ];

  return config;
}
