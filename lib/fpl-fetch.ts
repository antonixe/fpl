import { FPL_API_BASE } from '@/lib/constants';
import { logger } from '@/lib/logger';

const DEFAULT_TIMEOUT = 10_000; // 10 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY = 1_000; // 1 second

interface FetchOptions {
  /** Timeout in ms (default 10s) */
  timeout?: number;
  /** Max retries on failure (default 2) */
  retries?: number;
  /** Next.js fetch options (revalidate, cache, etc.) */
  next?: NextFetchRequestConfig;
  /** Override cache strategy */
  cache?: RequestCache;
}

/**
 * Fetch from the FPL API with timeout + retry logic.
 * Wraps native fetch with AbortController-based timeout
 * and exponential-ish backoff on transient failures.
 */
export async function fplFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES,
    ...fetchOpts
  } = options;

  const url = `${FPL_API_BASE}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        ...fetchOpts,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`FPL API ${res.status}: ${res.statusText}`);
      }

      return await res.json() as T;
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));

      if (lastError.name === 'AbortError') {
        lastError = new Error(`FPL API timeout after ${timeout}ms: ${path}`);
      }

      if (attempt < retries) {
        // Don't log during build-time static generation failures (expected)
        const isDynamicError = lastError.message.includes('Dynamic server usage');
        if (!isDynamicError) {
          logger.warn('fpl-fetch retry', { path, attempt: attempt + 1, error: lastError.message });
        }
        await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
      }
    }
  }

  // Only log actual failures, not expected build-time dynamic errors
  if (!lastError!.message.includes('Dynamic server usage')) {
    logger.error('fpl-fetch failed', { path, retries, error: lastError!.message });
  }
  throw lastError!;
}
