/**
 * components/author/json-ld.tsx
 *
 * Structured data for a public page. "<" is escaped so nothing an author
 * typed (a title, a bio) can close the script element early.
 */

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
