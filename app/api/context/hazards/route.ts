import { fetchNveHazardSignals, normalizeNveDateRange } from '@/lib/integrations/nve';
import { guardAllowedQuery, guardExternalContextSignals } from '@/lib/integrations/route-guards';
import { contextGuardError, contextJson } from '../private-context-response';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const allowed = guardAllowedQuery(params, ['municipality', 'start', 'end']);
  if (!allowed.ok) return contextGuardError(allowed);
  const municipality = params.get('municipality');
  if (!municipality || !/^(?!0000$)\d{4}$/.test(municipality)) return contextJson({ error: 'municipality must be a valid four-digit Norwegian municipality code' }, { status: 400 });
  const start = params.get('start') ?? undefined;
  const end = params.get('end') ?? undefined;
  try {
    const defaultStart = new Date().toISOString().slice(0, 10);
    const defaultEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (start || end) normalizeNveDateRange(start ?? defaultStart, end ?? defaultEnd);
  } catch {
    return contextJson({ error: 'invalid date range' }, { status: 400 });
  }
  try {
    const signals = await fetchNveHazardSignals({ municipality, start, end });
    const guarded = guardExternalContextSignals(signals);
    if (!guarded.ok) return contextGuardError(guarded);
    return contextJson(guarded.value);
  } catch {
    return contextJson({ error: 'hazards unavailable' }, { status: 502 });
  }
}
