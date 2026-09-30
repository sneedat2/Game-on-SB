import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  /** Stable across renders - safe to use in effect deps. */
  reload: () => Promise<void>;
  setData: (updater: (prev: T | undefined) => T | undefined) => void;
}

/**
 * Minimal data-fetching hook: loads once on mount, `reload()` to refetch.
 * Swap for TanStack Query if caching/dedup needs grow.
 */
export function useAsync<T>(fn: () => Promise<T>): AsyncState<T> {
  const [data, setDataState] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  const mounted = useRef(true);

  useEffect(() => {
    fnRef.current = fn;
  });

  const settle = useCallback((promise: Promise<T>) => {
    return promise
      .then((result) => {
        if (mounted.current) setDataState(result);
      })
      .catch((e: unknown) => {
        if (mounted.current) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    void settle(fnRef.current());
    return () => {
      mounted.current = false;
    };
  }, [settle]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    await settle(fnRef.current());
  }, [settle]);

  const setData = useCallback((updater: (prev: T | undefined) => T | undefined) => setDataState(updater), []);

  return { data, error, loading, reload, setData };
}
