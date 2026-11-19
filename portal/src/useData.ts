import { useCallback, useEffect, useState } from 'react';

/** Loads data on mount and exposes reload(), loading and error states. */
export function useData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await load());
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : String(exception));
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
