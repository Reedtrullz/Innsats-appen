/**
 * Source-citation display helpers. Field users must never see raw technical
 * source IDs like `src-sjekkliste-fig-og-figp` (P1-3). Resolve IDs to their
 * human source titles where available, and strip the `src-` prefix as a safe
 * fallback when a title is missing.
 */

export function buildSourceTitleById(sources: ReadonlyArray<{ id: string; title: string }>): Record<string, string> {
  return Object.fromEntries(sources.map((source) => [source.id, source.title]));
}

export function formatSourceList(
  ids: readonly string[] | undefined,
  sourceTitleById: Record<string, string> = {},
): string {
  if (!ids || ids.length === 0) return '';
  return ids.map((id) => sourceTitleById[id] ?? id.replace(/^src-/, '')).join(', ');
}
