// Platzhalter-Speaker (ehem. "AI Nights Speaker #01–#04") komplett von der
// Website fernhalten: keine Listen, keine Detailseiten, keine Verlinkung.
export function isPlaceholderSpeaker(s: { data: { slug: string } }): boolean {
  return s.data.slug.startsWith('ai-nights-speaker');
}
