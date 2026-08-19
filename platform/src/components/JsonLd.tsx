/**
 * Injecte un bloc de données structurées.
 *
 * Sérialisation sûre : on neutralise « < » pour qu'une valeur de contenu — un
 * titre de programme, un extrait d'article — ne puisse pas refermer la balise
 * script et injecter du markup.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
