/**
 * One JSON-LD block for a server-rendered page.
 *
 * The `<` escape keeps a value from closing the script element; the JSON itself is unchanged.
 * Multiple blocks are valid, so callers can keep each schema node small and named.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
