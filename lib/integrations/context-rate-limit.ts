const WINDOW_MS = 60_000;
const MAX_REQUESTS = 6;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientKey(request: Request, route: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address = forwarded || request.headers.get('x-real-ip') || 'local';
  return `${route}:${address}`;
}

export function resetContextRateLimitForTests() {
  buckets.clear();
}

export function checkContextRateLimit(request: Request, route: string, now = Date.now()) {
  const key = clientKey(request, route);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true as const };
  }
  if (bucket.count >= MAX_REQUESTS) {
    return { ok: false as const, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  return { ok: true as const };
}
