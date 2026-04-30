import { useCallback, useState } from "react";

type UseAsyncAction = {
  busyKey: string | null;
  error: string | null;
  isBusy: (key: string) => boolean;
  run: (key: string, fn: () => Promise<void>) => Promise<void>;
  clearError: () => void;
};

export function useAsyncAction(): UseAsyncAction {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (key: string, fn: () => Promise<void>) => {
    setBusyKey(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyKey(null);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { busyKey, isBusy: (key) => busyKey === key, error, run, clearError };
}
