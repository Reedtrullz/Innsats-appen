import { fetchKartverketSignals } from '@/lib/integrations/kartverket';
import { guardAllowedQuery, guardExternalContextSignals, guardLatLon } from '@/lib/integrations/route-guards';
import { contextGuardError, contextJson } from '../private-context-response';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const allowed = guardAllowedQuery(params, ['q', 'lat', 'lon']);
  if (!allowed.ok) return contextGuardError(allowed);
  const hasQ = params.has('q');
  const hasCoordinates = params.has('lat') || params.has('lon');
  if (hasQ && hasCoordinates) return contextJson({ error: 'Use either q or lat/lon, not both' }, { status: 400 });
  try {
    if (hasQ) {
      const q = allowed.value.q;
      if (!q) return contextJson({ error: 'q is required' }, { status: 400 });
      const signals = await fetchKartverketSignals({ q });
      const guarded = guardExternalContextSignals(signals);
      if (!guarded.ok) return contextGuardError(guarded);
      return contextJson(guarded.value);
    }
    const latLon = guardLatLon(params);
    if (!latLon.ok) return contextGuardError(latLon);
    const signals = await fetchKartverketSignals(latLon.value);
    const guarded = guardExternalContextSignals(signals);
    if (!guarded.ok) return contextGuardError(guarded);
    return contextJson(guarded.value);
  } catch (error) {
    return contextJson({ error: error instanceof Error ? error.message : 'geocode unavailable' }, { status: 502 });
  }
}
