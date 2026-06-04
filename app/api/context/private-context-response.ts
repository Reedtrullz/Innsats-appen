import type { GuardResult } from '@/lib/integrations/types';

export const PRIVATE_CONTEXT_HEADERS = { 'Cache-Control': 'private, no-store' } as const;

function privateHeaders(headers?: HeadersInit) {
  const next = new Headers(headers);
  next.set('Cache-Control', PRIVATE_CONTEXT_HEADERS['Cache-Control']);
  return next;
}

export function contextJson<T>(body: T, init: ResponseInit = {}) {
  return Response.json(body, { ...init, headers: privateHeaders(init.headers) });
}

export function contextGuardError(error: GuardResult<unknown>) {
  if (error.ok) throw new Error('contextGuardError called with ok guard');
  return contextJson({ error: error.error }, { status: error.status });
}
