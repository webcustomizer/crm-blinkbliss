import { useEffect, useState, useCallback } from 'react';
import { staleWhileRevalidate } from '@/lib/cache-strategy';

interface UseSWROptions {
  ttl?: number;
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  dedupingInterval?: number;
}

interface UseSWRReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  mutate: (data?: T) => Promise<void>;
}

/**
 * Stale-While-Revalidate hook
 * Returns cached data immediately, fetches fresh in background
 */
export function useSWR<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: UseSWROptions = {}
): UseSWRReturn<T> {
  const {
    ttl = 5 * 60 * 1000,
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    dedupingInterval = 1000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const mutate = useCallback(
    async (newData?: T) => {
      if (newData !== undefined) {
        setData(newData);
      } else {
        try {
          setLoading(true);
          const fresh = await fetcher();
          setData(fresh);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
          setLoading(false);
        }
      }
    },
    [fetcher]
  );

  useEffect(() => {
    if (!key) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await staleWhileRevalidate(key, fetcher, ttl);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    // Deduping: don't fetch if already fetched recently
    const now = Date.now();
    if (now - lastFetch < dedupingInterval) return;

    setLastFetch(now);
    fetchData();
  }, [key, fetcher, ttl, lastFetch, dedupingInterval]);

  // Revalidate on focus
  useEffect(() => {
    if (!revalidateOnFocus || !key) return;

    const handleFocus = () => {
      mutate();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [key, revalidateOnFocus, mutate]);

  // Revalidate on reconnect
  useEffect(() => {
    if (!revalidateOnReconnect || !key) return;

    const handleOnline = () => {
      mutate();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [key, revalidateOnReconnect, mutate]);

  return { data, loading, error, mutate };
}
