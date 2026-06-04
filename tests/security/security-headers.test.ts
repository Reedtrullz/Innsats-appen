import { describe, expect, it } from 'vitest';
import nextConfig from '@/next.config';

function headerMap(headers: Array<{ key: string; value: string }>) {
  return new Map(headers.map((header) => [header.key, header.value]));
}

describe('app-wide security headers', () => {
  it('defines conservative browser security headers for every route', async () => {
    expect(nextConfig.headers).toBeTypeOf('function');

    const rules = await nextConfig.headers?.();
    const globalRule = rules?.find((rule) => rule.source === '/(.*)');
    expect(globalRule).toBeDefined();

    const headers = headerMap(globalRule?.headers ?? []);
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');

    const csp = headers.get('Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain('https://api.met.no');
    expect(csp).toContain('https://api.kartverket.no');
    expect(csp).toContain('https://ws.geonorge.no');
    expect(csp).toContain('https://api01.nve.no');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).not.toContain('unsafe-eval');
  });
});
