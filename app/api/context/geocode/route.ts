import { fetchKartverketSignals } from '@/lib/integrations/kartverket';
import { guardAllowedQuery, guardLatLon, jsonGuardError } from '@/lib/integrations/route-guards';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const allowed = guardAllowedQuery(params, ['q', 'lat', 'lon']);
  if (!allowed.ok) return jsonGuardError(allowed);
  const hasQ = params.has('q');
  const hasCoordinates = params.has('lat') || params.has('lon');
  if (hasQ && hasCoordinates) return Response.json({ error: 'Use either q or lat/lon, not both' }, { status: 400 });
  try {
    if (hasQ) {
      const q = params.get('q')?.trim();
      if (!q) return Response.json({ error: 'q is required' }, { status: 400 });
      return Response.json(await fetchKartverketSignals({ q }), { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } });
    }
    const latLon = guardLatLon(params);
    if (!latLon.ok) return jsonGuardError(latLon);
    return Response.json(await fetchKartverketSignals(latLon.value), { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'geocode unavailable' }, { status: 502 });
  }
}
