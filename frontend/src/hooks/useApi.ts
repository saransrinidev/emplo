import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Simple in-memory cache keyed by a string.
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Runs an async loader on mount. Uses a stale-while-revalidate strategy:
 * - If cached data exists and is fresh, returns it immediately (no loading state).
 * - If cached data is stale, returns it immediately then refreshes in the background.
 * - If no cache, shows loading state while fetching.
 *
 * Pass a unique `cacheKey` to enable caching. Without a key, behaves like before.
 * Returns a `refetch()` function to force re-fetch (invalidates cache).
 */
export function useApi<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  cacheKey?: string,
): State<T> {
  const cached = cacheKey ? cache.get(cacheKey) : undefined;
  const hasFreshCache = cached && Date.now() - cached.ts < CACHE_TTL;

  const [state, setState] = useState<State<T>>({
    data: cached ? (cached.data as T) : null,
    loading: !cached,
    error: null,
    refetch: () => { },
  });

  const activeRef = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const doFetch = useCallback(() => {
    activeRef.current = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    // Invalidate cache
    if (cacheKey) cache.delete(cacheKey);

    loaderRef.current()
      .then((data) => {
        if (!activeRef.current) return;
        if (cacheKey) cache.set(cacheKey, { data, ts: Date.now() });
        setState((prev) => ({ ...prev, data, loading: false, error: null }));
      })
      .catch((err) => {
        if (!activeRef.current) return;
        const msg = err instanceof ApiError ? err.message : "Failed to load data.";
        setState((prev) => ({ ...prev, loading: false, error: msg }));
      });
  }, [cacheKey]);

  useEffect(() => {
    activeRef.current = true;

    // If we have fresh cache, skip the fetch entirely.
    if (hasFreshCache) {
      setState({ data: cached!.data as T, loading: false, error: null, refetch: doFetch });
      return;
    }

    // If we have stale cache, show it but still fetch in background.
    if (cached) {
      setState({ data: cached.data as T, loading: false, error: null, refetch: doFetch });
    } else {
      setState({ data: null, loading: true, error: null, refetch: doFetch });
    }

    loaderRef.current()
      .then((data) => {
        if (!activeRef.current) return;
        if (cacheKey) cache.set(cacheKey, { data, ts: Date.now() });
        setState({ data, loading: false, error: null, refetch: doFetch });
      })
      .catch((err) => {
        if (!activeRef.current) return;
        if (cached) return;
        const msg = err instanceof ApiError ? err.message : "Failed to load data.";
        setState({ data: null, loading: false, error: msg, refetch: doFetch });
      });

    return () => {
      activeRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, refetch: doFetch };
}
