import { fetchKartverketSignals } from '@/lib/integrations/kartverket';
import { checkContextRateLimit } from '@/lib/integrations/context-rate-limit';
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
      const rateLimit = checkContextRateLimit(request, 'geocode');
      if (!rateLimit.ok) {
        return contextJson({ error: 'rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } });
      }
      const signals = await fetchKartverketSignals({ q });
      const guarded = guardExternalContextSignals(signals);
      if (!guarded.ok) return contextGuardError(guarded);
      return contextJson(guarded.value);
    }
    const latLon = guardLatLon(params);
    if (!latLon.ok) return contextGuardError(latLon);
    const rateLimit = checkContextRateLimit(request, 'geocode');
    if (!rateLimit.ok) {
      return contextJson({ error: 'rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } });
    }
    const signals = await fetchKartverketSignals(latLon.value);
    const guarded = guardExternalContextSignals(signals);
    if (!guarded.ok) return contextGuardError(guarded);
    return contextJson(guarded.value);
  } catch {
    return contextJson({ error: 'geocode unavailable' }, { status: 502 });
  }
}
