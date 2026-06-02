import { fetchMetSignals } from '@/lib/integrations/met';
import { guardAllowedQuery, guardLatLon, jsonGuardError } from '@/lib/integrations/route-guards';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const allowed = guardAllowedQuery(params, ['lat', 'lon']);
  if (!allowed.ok) return jsonGuardError(allowed);
  const latLon = guardLatLon(params);
  if (!latLon.ok) return jsonGuardError(latLon);
  try {
    return Response.json(await fetchMetSignals(latLon.value), { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=3600' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'weather unavailable' }, { status: 502 });
  }
}
