import { fetchNveHazardSignals, normalizeNveDateRange } from '@/lib/integrations/nve';
import { guardAllowedQuery, jsonGuardError } from '@/lib/integrations/route-guards';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const allowed = guardAllowedQuery(params, ['municipality', 'start', 'end']);
  if (!allowed.ok) return jsonGuardError(allowed);
  const municipality = params.get('municipality');
  if (!municipality || !/^(?!0000$)\d{4}$/.test(municipality)) return Response.json({ error: 'municipality must be a valid four-digit Norwegian municipality code' }, { status: 400 });
  const start = params.get('start') ?? undefined;
  const end = params.get('end') ?? undefined;
  try {
    const defaultStart = new Date().toISOString().slice(0, 10);
    const defaultEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (start || end) normalizeNveDateRange(start ?? defaultStart, end ?? defaultEnd);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'invalid date range' }, { status: 400 });
  }
  try {
    return Response.json(await fetchNveHazardSignals({ municipality, start, end }), { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=7200' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'hazards unavailable' }, { status: 502 });
  }
}
