import { ExternalApiError, retryAfterSecondsFromHeaders } from './source-health';

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface FetchJsonWithTimeoutOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  init?: RequestInit;
  allowNotModified?: boolean;
  errorMessage?: (response: Response) => string;
}

export async function fetchJsonWithTimeout<T = unknown>(
  url: string,
  {
    fetchImpl = fetch,
    timeoutMs = 6000,
    init,
    allowNotModified = false,
    errorMessage,
  }: FetchJsonWithTimeoutOptions = {},
): Promise<T | null> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Upstream request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetchImpl(url, { ...(init ?? {}), signal: controller.signal }),
      timeoutPromise,
    ]);

    if (response.status === 304 && allowNotModified) return null;
    if (!response.ok) {
      throw new ExternalApiError(
        errorMessage?.(response) ?? `Upstream returned ${response.status}`,
        response.status,
        retryAfterSecondsFromHeaders(response.headers),
      );
    }
    return await response.json() as T;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
