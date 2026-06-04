import { fetchMetSignals } from '@/lib/integrations/met';
import { guardAllowedQuery, guardExternalContextSignals, guardLatLon } from '@/lib/integrations/route-guards';
import { contextGuardError, contextJson } from '../private-context-response';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const allowed = guardAllowedQuery(params, ['lat', 'lon']);
  if (!allowed.ok) return contextGuardError(allowed);
  const latLon = guardLatLon(params);
  if (!latLon.ok) return contextGuardError(latLon);
  try {
    const signals = await fetchMetSignals(latLon.value);
    const guarded = guardExternalContextSignals(signals);
    if (!guarded.ok) return contextGuardError(guarded);
    return contextJson(guarded.value);
  } catch {
    return contextJson({ error: 'weather unavailable' }, { status: 502 });
  }
}
