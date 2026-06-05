const WINDOW_MS = 60_000;
const MAX_REQUESTS = 6;
const MAX_BUCKETS = 1_000;
const ADDRESS_PATTERN = /^[A-Za-z0-9.:_-]{1,64}$/;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function normalizedProxyAddress(value: string | null) {
  const address = value?.trim();
  if (!address || address.length > 64 || !ADDRESS_PATTERN.test(address)) return 'local';
  return address;
}

function clientKey(request: Request, route: string) {
  // Caddy overwrites X-Real-IP with {remote_host}; X-Forwarded-For is intentionally
  // ignored for rate-limit identity because clients can spoof it at the edge.
  const address = normalizedProxyAddress(request.headers.get('x-real-ip'));
  return `${route}:${address}`;
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function evictOldestBucketsUntilRoom() {
  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey === undefined) return;
    buckets.delete(oldestKey);
  }
}

export function resetContextRateLimitForTests() {
  buckets.clear();
}

export function checkContextRateLimit(request: Request, route: string, now = Date.now()) {
  pruneExpiredBuckets(now);
  const key = clientKey(request, route);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (!bucket) evictOldestBucketsUntilRoom();
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true as const };
  }
  if (bucket.count >= MAX_REQUESTS) {
    return { ok: false as const, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  return { ok: true as const };
}
